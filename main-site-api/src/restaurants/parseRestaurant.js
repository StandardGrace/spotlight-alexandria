import matter from "@11ty/gray-matter";
import path from "node:path";

// The filename becomes this restaurant's id and, later, its page URL
// (see "Grid landing view -> detail page per restaurant" in the ticket) -
// so it has to be URL-safe up front rather than slugified after the fact.
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

// js-yaml (which gray-matter parses frontmatter with) auto-converts an
// unquoted YYYY-MM-DD scalar into a real JS Date - see
// docs/restaurant-data-model.md. Accept that, or a plain quoted string in
// the same format, and normalize both to the YYYY-MM-DD string SQLite
// will store.
function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && DATE_RE.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return value;
  }
  return null;
}

// v2: every field that holds human-readable prose is bilingual - an
// object of shape { en: string, fr?: string } - per
// docs/restaurant-data-model.md. `en` is required whenever the field
// itself is present; `fr` is optional and falls back to `en` when
// omitted. That fallback is resolved right here, once, so nothing
// downstream (ingest.js, and eventually the API/frontend) ever needs to
// know a fallback happened - same pattern already used in
// main-site-api/src/services/weather.js
// (`forecastDaysFr[i]?.day.condition.text || d.day.condition.text`).
//
// Returns the resolved { en, fr } object, or null if the field is
// missing-but-optional or invalid (with an error already pushed either
// way) - callers should only trust a non-null return.
function resolveBilingual(value, fieldPath, required, errors) {
  if (value === undefined) {
    if (required) errors.push(`${fieldPath} is required`);
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push(`${fieldPath} must be an object with "en" (and optionally "fr")`);
    return null;
  }
  if (!isNonEmptyString(value.en)) {
    errors.push(`${fieldPath}.en is required`);
    return null;
  }
  if (value.fr !== undefined && !isNonEmptyString(value.fr)) {
    errors.push(`${fieldPath}.fr must be a non-empty string when present`);
    return null;
  }
  return { en: value.en, fr: isNonEmptyString(value.fr) ? value.fr : value.en };
}

// Per docs/restaurant-data-model.md: an item has *either* `price` *or*
// `variants`, never both, never neither.
function validateItem(item, itemPath, errors) {
  const name = resolveBilingual(item?.name, `${itemPath}.name`, true, errors);
  const description = resolveBilingual(
    item?.description,
    `${itemPath}.description`,
    false,
    errors
  );

  if (item?.photo !== undefined && typeof item.photo !== "string") {
    errors.push(`${itemPath}.photo must be a string`);
  }

  const hasPrice = item?.price !== undefined;
  const hasVariants = item?.variants !== undefined;

  let price = null;
  let variants = null;

  if (hasPrice && hasVariants) {
    errors.push(`${itemPath} must not have both "price" and "variants"`);
  } else if (!hasPrice && !hasVariants) {
    errors.push(`${itemPath} must have one of "price" or "variants"`);
  } else if (hasPrice) {
    if (isPositiveNumber(item.price)) {
      price = item.price;
    } else {
      errors.push(`${itemPath}.price must be a positive number`);
    }
  } else {
    if (!Array.isArray(item.variants) || item.variants.length === 0) {
      errors.push(`${itemPath}.variants must be a non-empty array`);
    } else {
      variants = [];
      item.variants.forEach((variant, vi) => {
        const label = resolveBilingual(
          variant?.label,
          `${itemPath}.variants[${vi}].label`,
          true,
          errors
        );
        const validPrice = isPositiveNumber(variant?.price);
        if (!validPrice) {
          errors.push(`${itemPath}.variants[${vi}].price must be a positive number`);
        }
        if (label && validPrice) {
          variants.push({ label, price: variant.price });
        }
      });
    }
  }

  return { name, description, photo: item?.photo ?? null, price, variants };
}

// Parses and validates one restaurant .md file. Returns either
// { id, errors: [] , restaurant } on success or { id, errors } (non-empty)
// on failure - callers decide what to do with a failed file, this just
// reports what's wrong with it.
export function parseRestaurantFile(filename, raw) {
  const errors = [];
  const id = path.basename(filename, path.extname(filename));

  if (!SLUG_RE.test(id)) {
    errors.push(
      `filename "${filename}" must be a URL-safe slug (lowercase letters, digits, hyphens only)`
    );
  }

  let parsed;
  try {
    parsed = matter(raw);
  } catch (err) {
    errors.push(`could not parse YAML frontmatter: ${err.message}`);
    return { id, errors };
  }

  const data = parsed.data || {};

  const name = resolveBilingual(data.name, "name", true, errors);
  const hours = resolveBilingual(data.hours, "hours", true, errors);
  const about = resolveBilingual(data.about, "about", false, errors);

  if (!isNonEmptyString(data.phone)) errors.push("phone is required");
  if (!isNonEmptyString(data.address)) errors.push("address is required");
  if (!isNonEmptyString(data.storefrontPhoto)) errors.push("storefrontPhoto is required");
  if (data.website !== undefined && !isNonEmptyString(data.website)) {
    errors.push("website must be a non-empty string when present");
  }

  const lastVerified = normalizeDate(data.lastVerified);
  if (!lastVerified) {
    errors.push("lastVerified is required and must be a valid YYYY-MM-DD date");
  }

  let menu = null;
  if (!Array.isArray(data.menu)) {
    errors.push("menu is required and must be an array");
  } else {
    menu = data.menu.map((category, ci) => {
      const categoryPath = `menu[${ci}]`;
      const categoryName = resolveBilingual(
        category?.category,
        `${categoryPath}.category`,
        true,
        errors
      );
      const note = resolveBilingual(category?.note, `${categoryPath}.note`, false, errors);

      let items = [];
      if (!Array.isArray(category?.items)) {
        errors.push(`${categoryPath}.items must be an array`);
      } else {
        items = category.items.map((item, ii) =>
          validateItem(item, `${categoryPath}.items[${ii}]`, errors)
        );
      }

      return { category: categoryName, note, items };
    });
  }

  if (errors.length > 0) {
    return { id, errors };
  }

  return {
    id,
    errors: [],
    restaurant: {
      id,
      name,
      phone: data.phone,
      address: data.address,
      website: data.website ?? null,
      hours,
      about,
      lastVerified,
      storefrontPhoto: data.storefrontPhoto,
      sourceFile: filename,
      menu,
    },
  };
}
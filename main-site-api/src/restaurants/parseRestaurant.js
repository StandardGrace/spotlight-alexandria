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
// unquoted YYYY-MM-DD scalar into a real JS Date - see docs/RESTAU~1.MD.
// Accept that, or a plain quoted string in the same format, and normalize
// both to the YYYY-MM-DD string SQLite will store.
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

// Per docs/RESTAU~1.MD: an item has *either* `price` *or* `variants`,
// never both, never neither. This is the validation the format doc
// flagged as step 2's job.
function validateItem(item, itemPath, errors) {
  if (!isNonEmptyString(item?.name)) {
    errors.push(`${itemPath}.name is required`);
  }
  if (item?.description !== undefined && typeof item.description !== "string") {
    errors.push(`${itemPath}.description must be a string`);
  }
  if (item?.photo !== undefined && typeof item.photo !== "string") {
    errors.push(`${itemPath}.photo must be a string`);
  }

  const hasPrice = item?.price !== undefined;
  const hasVariants = item?.variants !== undefined;

  if (hasPrice && hasVariants) {
    errors.push(`${itemPath} must not have both "price" and "variants"`);
  } else if (!hasPrice && !hasVariants) {
    errors.push(`${itemPath} must have one of "price" or "variants"`);
  } else if (hasPrice && !isPositiveNumber(item.price)) {
    errors.push(`${itemPath}.price must be a positive number`);
  } else if (hasVariants) {
    if (!Array.isArray(item.variants) || item.variants.length === 0) {
      errors.push(`${itemPath}.variants must be a non-empty array`);
    } else {
      item.variants.forEach((variant, vi) => {
        if (!isNonEmptyString(variant?.label)) {
          errors.push(`${itemPath}.variants[${vi}].label is required`);
        }
        if (!isPositiveNumber(variant?.price)) {
          errors.push(`${itemPath}.variants[${vi}].price must be a positive number`);
        }
      });
    }
  }
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

  if (!isNonEmptyString(data.name)) errors.push("name is required");
  if (!isNonEmptyString(data.phone)) errors.push("phone is required");
  if (!isNonEmptyString(data.address)) errors.push("address is required");
  if (!isNonEmptyString(data.hours)) errors.push("hours is required");
  if (!isNonEmptyString(data.storefrontPhoto)) errors.push("storefrontPhoto is required");
  if (data.website !== undefined && !isNonEmptyString(data.website)) {
    errors.push("website must be a non-empty string when present");
  }

  const lastVerified = normalizeDate(data.lastVerified);
  if (!lastVerified) {
    errors.push("lastVerified is required and must be a valid YYYY-MM-DD date");
  }

  if (!Array.isArray(data.menu)) {
    errors.push("menu is required and must be an array");
  } else {
    data.menu.forEach((category, ci) => {
      const categoryPath = `menu[${ci}]`;
      if (!isNonEmptyString(category?.category)) {
        errors.push(`${categoryPath}.category is required`);
      }
      if (!Array.isArray(category?.items)) {
        errors.push(`${categoryPath}.items must be an array`);
      } else {
        category.items.forEach((item, ii) => {
          validateItem(item, `${categoryPath}.items[${ii}]`, errors);
        });
      }
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
      name: data.name,
      phone: data.phone,
      address: data.address,
      website: data.website ?? null,
      hours: data.hours,
      lastVerified,
      storefrontPhoto: data.storefrontPhoto,
      sourceFile: filename,
      menu: data.menu,
    },
  };
}

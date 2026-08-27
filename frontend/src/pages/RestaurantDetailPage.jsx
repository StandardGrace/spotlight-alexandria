import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchRestaurant } from "../api/client.js";

function formatPrice(value) {
  return `$${value.toFixed(2)}`;
}

function pick(bilingual, lang) {
  return bilingual ? (lang === "fr" ? bilingual.fr : bilingual.en) : null;
}

// "Stale" means the info hasn't been reverified in 6+ months, per the
// content model in TECHNICAL_DESIGN.md. setMonth() correctly handles
// variable month lengths, so this doesn't need a fixed day count.
function isStale(lastVerified) {
  const verified = new Date(`${lastVerified}T00:00:00`);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  return verified < cutoff;
}

function formatVerifiedDate(lastVerified, lang) {
  const verified = new Date(`${lastVerified}T00:00:00`);
  const locale = lang === "fr" ? "fr-CA" : "en-CA";
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(verified);
}

// Multi-variant items (different sizes, etc.) get one inline control
// instead of a separate line per size - per TECHNICAL_DESIGN.md's
// presentation-layer notes. There's no ordering/cart system on the site,
// so this is purely to keep the menu compact, not to add to an order.
function VariantPicker({ variants, lang }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = variants[selectedIndex];

  return (
    <div className="variant-picker">
      <select
        value={selectedIndex}
        onChange={(e) => setSelectedIndex(Number(e.target.value))}
      >
        {variants.map((variant, i) => (
          <option key={i} value={i}>
            {pick(variant.label, lang)}
          </option>
        ))}
      </select>
      <span className="variant-price">{formatPrice(selected.price)}</span>
    </div>
  );
}

export default function RestaurantDetailPage() {
  const { id, lang } = useParams();
  const { t, i18n } = useTranslation();
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRestaurant(null);
    setError(null);
    fetchRestaurant(id)
      .then(setRestaurant)
      .catch((err) => setError(err.message));
  }, [id]);

  const backLink = (
    <Link to={`/${lang}/restaurants`} className="back-link">
      {t("restaurantDetail.backToList")}
    </Link>
  );

  if (error) {
    return (
      <div className="page">
        {backLink}
        <p className="error-text">{t("restaurantDetail.loadError")}</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="page">
        {backLink}
        <p className="loading-text">{t("restaurantDetail.loading")}</p>
      </div>
    );
  }

  const activeLang = i18n.language;
  const name = pick(restaurant.name, activeLang);
  const hours = pick(restaurant.hours, activeLang);
  const about = pick(restaurant.about, activeLang);

  return (
    <div className="page">
      {backLink}

      <div className="restaurant-header">
        {restaurant.storefrontPhoto ? (
          <img
            src={restaurant.storefrontPhoto}
            alt=""
            className="restaurant-header-photo"
          />
        ) : (
          // Same permanent (not temporary) missing-photo treatment as the
          // list page - storefrontPhoto is optional, not just "not yet
          // added."
          <div
            className="restaurant-header-photo restaurant-card-photo-placeholder"
            aria-hidden="true"
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="page-title">{name}</h1>
          <p className="restaurant-meta">
            <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>
            {" · "}
            {restaurant.address}
          </p>
          {restaurant.website && (
            <p className="restaurant-meta">
              <a href={restaurant.website} target="_blank" rel="noreferrer">
                {restaurant.website}
              </a>
            </p>
          )}
          <p className="restaurant-meta">{hours}</p>
          {about && <p className="restaurant-about">{about}</p>}
        </div>
      </div>

      {isStale(restaurant.lastVerified) && (
        <p className="staleness-notice">
          {t("restaurantDetail.staleNotice", {
            date: formatVerifiedDate(restaurant.lastVerified, activeLang),
          })}
        </p>
      )}

      {restaurant.menu.map((category, ci) => {
        const categoryName = pick(category.category, activeLang);
        const categoryNote = pick(category.note, activeLang);

        return (
          <details key={ci} className="menu-category">
            <summary className="menu-category-title">{categoryName}</summary>
            {categoryNote && (
              <p className="menu-category-note">{categoryNote}</p>
            )}
            <ul className="menu-item-list">
              {category.items.map((item, ii) => {
                const itemName = pick(item.name, activeLang);
                const itemDescription = pick(item.description, activeLang);

                return (
                  <li key={ii} className="menu-item">
                    {item.photo && (
                      <img
                        src={item.photo}
                        alt=""
                        className="menu-item-photo"
                      />
                    )}
                    <div className="menu-item-body">
                      <p className="menu-item-name">{itemName}</p>
                      {itemDescription && (
                        <p className="menu-item-description">
                          {itemDescription}
                        </p>
                      )}
                    </div>
                    {item.variants ? (
                      <VariantPicker variants={item.variants} lang={activeLang} />
                    ) : (
                      <span className="menu-item-price">
                        {formatPrice(item.price)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

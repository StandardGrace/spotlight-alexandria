import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { fetchRestaurants } from "../api/client.js";

export default function RestaurantsListPage() {
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const [restaurants, setRestaurants] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRestaurants()
      .then(setRestaurants)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{t("restaurants.pageTitle")}</h1>
          <p className="page-subtitle">{t("restaurants.pageSubtitle")}</p>
        </div>
      </div>

      {error && <p className="error-text">{t("restaurants.loadError")}</p>}

      {!error && !restaurants && (
        <p className="loading-text">{t("restaurants.loading")}</p>
      )}

      {restaurants && restaurants.length === 0 && (
        <p className="loading-text">{t("restaurants.empty")}</p>
      )}

      {restaurants && restaurants.length > 0 && (
        <div className="card-grid">
          {restaurants.map((restaurant) => {
            // API always resolves fr to en's value when no translation
            // exists yet (see parseRestaurant.js's resolveBilingual), so
            // this is safe even for restaurants with no French content.
            const name =
              i18n.language === "fr" ? restaurant.name.fr : restaurant.name.en;

            return (
              <Link
                key={restaurant.id}
                to={`/${lang}/restaurants/${restaurant.id}`}
                className="card restaurant-card"
              >
                {restaurant.storefrontPhoto ? (
                  <img
                    src={restaurant.storefrontPhoto}
                    alt=""
                    className="restaurant-card-photo"
                  />
                ) : (
                  // storefrontPhoto is optional - a restaurant can be live
                  // before anyone's visited to take one. This placeholder
                  // is the permanent fallback for that case, not a
                  // temporary "photo missing" state.
                  <div
                    className="restaurant-card-photo restaurant-card-photo-placeholder"
                    aria-hidden="true"
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="restaurant-card-name">{name}</p>
                <p className="restaurant-card-phone">{restaurant.phone}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
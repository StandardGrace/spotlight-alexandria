import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Catch-all for any path under /:lang that doesn't match a real route -
// closes the gap where an unmatched path used to render a blank content
// area (nav bar visible, nothing in the <Outlet/>) instead of a real
// "not found" state. A bad restaurant id still goes through
// RestaurantDetailPage's own error state, not this page - that's a data
// load failure on a route that *did* match, which is a different thing.
export default function NotFoundPage() {
  const { lang } = useParams();
  const { t } = useTranslation();

  return (
    <div className="page">
      <h1 className="page-title">{t("notFound.title")}</h1>
      <p className="page-subtitle">{t("notFound.message")}</p>
      <Link to={`/${lang}`} className="back-link">
        {t("notFound.backHome")}
      </Link>
    </div>
  );
}
import { Link, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { lang } = useParams();
  const location = useLocation();
  const { t } = useTranslation();

  // Preserve whatever page you're currently on - e.g. switching from
  // /en/restaurants/joes-pizza should land on /fr/restaurants/joes-pizza,
  // not bounce back to the home page. Only the leading /:lang segment
  // changes; everything after it carries over as-is.
  const restOfPath = location.pathname.replace(/^\/[^/]+/, "");
  const pathFor = (targetLang) => `/${targetLang}${restOfPath}`;

  return (
    <div className="language-switcher">
      <Link to={pathFor("en")} className={lang === "en" ? "active" : ""}>
        {t("language.en")}
      </Link>
      {" | "}
      <Link to={pathFor("fr")} className={lang === "fr" ? "active" : ""}>
        {t("language.fr")}
      </Link>
    </div>
  );
}

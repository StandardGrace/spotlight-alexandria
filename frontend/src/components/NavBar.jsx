import { NavLink, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher.jsx";

// The site's first nav bar - added now because the restaurants list page
// is the second real page, per the layout strategy in TECHNICAL_DESIGN.md
// ("navigation infrastructure is added only once it's needed"). Lives
// above every page via App.jsx's shared language layout, so it (and the
// language switcher it now owns) only has to be written once.
export default function NavBar() {
  const { lang } = useParams();
  const { t } = useTranslation();

  return (
    <nav className="nav-bar">
      <div className="nav-links">
        <NavLink to={`/${lang}`} end className={({ isActive }) => (isActive ? "active" : "")}>
          {t("nav.home")}
        </NavLink>
        <NavLink
          to={`/${lang}/restaurants`}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          {t("nav.restaurants")}
        </NavLink>
      </div>
      <LanguageSwitcher />
    </nav>
  );
}

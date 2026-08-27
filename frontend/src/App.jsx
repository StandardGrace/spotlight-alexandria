import { BrowserRouter, Routes, Route, Navigate, useParams, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import NavBar from "./components/NavBar.jsx";
import LocalConditionsPage from "./pages/LocalConditionsPage.jsx";
import RestaurantsListPage from "./pages/RestaurantsListPage.jsx";

const SUPPORTED_LANGUAGES = ["en", "fr"];

// Shared per-language layout: sets the active language and <html lang>,
// then renders the nav bar once with whichever page matched underneath it
// (via Outlet) - the nav bar no longer needs to be duplicated per page.
function LanguageLayout() {
  const { lang } = useParams();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      i18n.changeLanguage(lang);
      document.documentElement.lang = lang;
    }
  }, [lang, i18n]);

  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return <Navigate to="/en" replace />;
  }

  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/en" replace />} />
        <Route path="/:lang" element={<LanguageLayout />}>
          <Route index element={<LocalConditionsPage />} />
          <Route path="restaurants" element={<RestaurantsListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

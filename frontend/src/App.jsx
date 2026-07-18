import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import LocalConditionsPage from "./pages/LocalConditionsPage.jsx";

const SUPPORTED_LANGUAGES = ["en", "fr"];

function LanguageRoute() {
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

  return <LocalConditionsPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/en" replace />} />
        <Route path="/:lang" element={<LanguageRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

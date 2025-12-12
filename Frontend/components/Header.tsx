import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Globe, Sun, Moon } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { Language } from "../types";

const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: "/", label: t("nav.home") },
    { path: "/services", label: t("nav.services") },
    { path: "/apply", label: t("nav.apply") },
    { path: "/contact", label: t("nav.contact") },
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 shadow-md border-b dark:border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              PA
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-heading font-bold text-primary-900 dark:text-white leading-none">
                Pragalbh
              </span>
              <span className="text-xs text-primary-500 font-medium tracking-wider">
                Associates
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive(link.path)
                    ? "text-primary-600 dark:text-primary-400 font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Language Switcher & Mobile Menu Button */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-primary-600 transition-colors px-3 py-1.5 rounded-full border border-slate-200 hover:border-primary-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
              >
                <Globe size={16} />
                <span className="text-sm font-medium">{language}</span>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl py-2 border border-slate-100 dark:border-slate-700">
                  {["EN", "GU"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                        language === lang
                          ? "text-primary-600 dark:text-primary-400 font-bold"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {lang === "EN"
                        ? "English"
                        : "ગુજરાતી"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={toggleMenu}
              className="md:hidden p-2 rounded-md text-slate-700 dark:text-slate-200 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 absolute w-full shadow-lg z-50">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-3 rounded-md text-base font-medium ${
                  isActive(link.path)
                    ? "bg-primary-50 dark:bg-slate-800 text-primary-700 dark:text-primary-400"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary-600 relative"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/apply"
              onClick={() => setIsMenuOpen(false)}
              className="block w-full text-center mt-4 bg-primary-600 text-white px-4 py-3 rounded-lg font-medium shadow-md active:scale-95 transition-transform"
            >
              {t("nav.apply")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

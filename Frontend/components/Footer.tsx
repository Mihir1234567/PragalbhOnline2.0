import React from "react";
import { Link } from "react-router-dom";
import {
  Facebook,
  Twitter,
  Instagram,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

import logo from "../assets/logo.png";

const Footer: React.FC = () => {
  const { t } = useLanguage();
  const mapAddress =
    "OFFICE NO.6 OPP TALUKA SEVA SADAN JUNAGADH ROAD, JETPUR 360370";
  const mapQuery = encodeURIComponent(mapAddress);
  const mapsUrl = "https://maps.app.goo.gl/CMRK8Sp1CSJz9xFc9";

  return (
    <footer className="bg-primary-900 dark:bg-slate-950 text-white pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="Pragalbh Associates"
                className="h-10 w-auto bg-white rounded-md p-0.5"
              />
              <div className="flex flex-col">
                <span className="text-xl font-heading font-bold  leading-none">
                  Pragalbh
                </span>
                <span className="text-xs text-primary-500 font-medium tracking-wider">
                  Associates
                </span>
              </div>
            </div>
            <p className="text-primary-200 text-sm leading-relaxed">
              {t("footer.desc")}
            </p>
            <div className="flex space-x-4 pt-2">
              <a
                href="https://www.instagram.com/pragalbh_jetpur/"
                className="text-primary-300 hover:text-white transition-colors"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-heading font-semibold mb-6">
              {t("footer.quick_links")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/"
                  className="text-primary-200 hover:text-white transition-colors text-sm"
                >
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="text-primary-200 hover:text-white transition-colors text-sm"
                >
                  {t("nav.services")}
                </Link>
              </li>
              <li>
                <Link
                  to="/apply"
                  className="text-primary-200 hover:text-white transition-colors text-sm"
                >
                  {t("nav.apply")}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-primary-200 hover:text-white transition-colors text-sm"
                >
                  {t("nav.contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-heading font-semibold mb-6">
              {t("footer.contact_info")}
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-primary-200">
                <MapPin className="shrink-0 mt-0.5" size={18} />
                <span>
                  OFFICE NO.6 OPP TALUKA SEVA SADAN JUNAGADH ROAD, JETPUR 360370
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm text-primary-200">
                <Phone className="shrink-0" size={18} />
                <span>+91 98983 29056</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-primary-200">
                <Mail className="shrink-0" size={18} />
                <span>pragalbhxerox@gmail.com</span>
              </li>
            </ul>
          </div>

          {/* Map Snippet with live preview (responsive iframe) and fallback link */}
          <div className="rounded-lg overflow-hidden h-40 sm:h-48 bg-primary-800 border border-primary-700 block relative">
            <iframe
              title="Pragalbh office location"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            {/* Overlay anchor so clicking the preview opens the Maps app/link */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open location on Google Maps (opens in new tab)"
              className="absolute inset-0"
            />

            {/* Visible small label, non-interactive (overlay anchor covers clicks) */}
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
              View on Google Maps
            </div>
          </div>
        </div>

        <div className="border-t border-primary-800 mt-12 pt-8 text-center text-sm text-primary-400">
          <p>
            &copy; {new Date().getFullYear()} Pragalbh Services.{" "}
            {t("footer.rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

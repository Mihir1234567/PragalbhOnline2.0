import React, { useState } from "react";
import {
  ArrowRight,
  FileText,
  UserCheck,
  ShieldCheck,
  Award,
  MapPin,
  ShoppingBag,
  CreditCard,
  Briefcase,
  Utensils,
} from "lucide-react";
import { Service } from "../types";
import { useLanguage } from "../context/LanguageContext";

import ServiceApplicationModal from "./ServiceApplicationModal";

interface ServiceCardProps {
  service: Service;
}

const iconMap: { [key: string]: React.ElementType } = {
  FileText,
  UserCheck,
  ShieldCheck,
  Award,
  MapPin,
  ShoppingBag,
  CreditCard,
  Briefcase,
  Utensils,
};

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const { language, t } = useLanguage();
  const Icon = iconMap[service.iconName] || FileText;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApply = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
      <div className="w-12 h-12 bg-primary-50 dark:bg-slate-700 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 mb-6 group-hover:bg-primary-600 dark:group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300">
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white mb-2">
        {service.title?.[language] ||
          service.title?.["EN"] ||
          "Untitled Service"}
      </h3>
      <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed line-clamp-3">
        {service.description?.[language] ||
          service.description?.["EN"] ||
          "No description available."}
      </p>
      <button
        onClick={handleApply}
        className="w-full flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400 font-semibold text-sm py-2.5 rounded-lg border border-primary-100 dark:border-slate-600 hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-white hover:border-transparent transition-all"
      >
        <span>{t("nav.apply")}</span>
        <ArrowRight size={16} />
      </button>

      <ServiceApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        service={service}
      />
    </div>
  );
};

export default ServiceCard;

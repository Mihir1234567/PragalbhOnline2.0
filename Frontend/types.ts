import { ReactNode } from "react";

export type Language = "EN" | "GU";

export interface Service {
  id: string;
  iconName: string;
  title: {
    EN: string;
    GU: string;
  };
  description: {
    EN: string;
    GU: string;
  };
  category: "CERTIFICATE" | "ASSISTANCE" | "OTHER" | "ONLINE";
  documents?: {
    EN: string[];
    GU: string[];
  };
}

export interface Testimonial {
  id: number | string;
  name: string;
  role: string;
  content: {
    EN: string;
    GU: string;
  };
  rating: number;
}

export interface Translations {
  [key: string]: {
    EN: string;
    GU: string;
  };
}

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export interface Stat {
  id: number;
  value: string | number;
  suffix?: string;
  label: {
    EN: string;
    GU: string;
  };
  iconName: string;
}

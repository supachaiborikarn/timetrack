"use client";

import React, { createContext, useContext } from "react";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import thTranslations from "@/messages/th.json";
import enTranslations from "@/messages/en.json";
import myTranslations from "@/messages/my.json";

export type Language = "th" | "en" | "my";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

// Type for translation records
type TranslationRecord = Record<string, string>;

const translations: Record<Language, TranslationRecord> = {
    th: thTranslations,
    en: enTranslations,
    my: myTranslations,
};

const VALID_LANGUAGES = new Set<Language>(["th", "en", "my"]);

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useLocalStorageState<Language>(
        "language",
        "th",
        (rawValue) => {
            if (rawValue && VALID_LANGUAGES.has(rawValue as Language)) {
                return rawValue as Language;
            }

            return "th";
        },
        (value) => value,
    );

    const setLanguage = (lang: Language) => {
        if (VALID_LANGUAGES.has(lang)) {
            setLanguageState(lang);
        }
    };

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}

// Language names for display
export const languageNames: Record<Language, string> = {
    th: "ไทย",
    en: "EN",
    my: "မြန်မာ",
};

// Language flags (emoji)
export const languageFlags: Record<Language, string> = {
    th: "🇹🇭",
    en: "🇬🇧",
    my: "🇲🇲",
};

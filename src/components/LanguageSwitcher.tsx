"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, Language, languageNames, languageFlags } from "@/lib/language-context";

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    const languages: Language[] = ["th", "en", "my"];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white px-2"
                >
                    <span className="text-lg mr-1">{languageFlags[language]}</span>
                    <span className="text-xs">{languageNames[language]}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px]">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={language === lang ? "bg-accent" : ""}
                    >
                        <span className="text-lg mr-2">{languageFlags[lang]}</span>
                        <span>{languageNames[lang]}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

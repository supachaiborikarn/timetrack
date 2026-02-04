"use client";

import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    return (
        <Button variant="ghost" size="icon" disabled title="Language switcher disabled temporarily">
            <Globe className="w-4 h-4 opacity-50" />
        </Button>
    );
}

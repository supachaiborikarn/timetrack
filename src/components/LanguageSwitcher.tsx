"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation"; // Note: next-intl/navigation overrides might be better but standard works with redirect
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const handleSwitch = (newLocale: string) => {
        // Replace the locale in the pathname
        const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);

        // If path doesn't have locale (e.g. root), prepend it (though middleware handles this)
        if (!pathname.startsWith(`/${locale}`)) {
            // This handles cases where middleware rewrite happened but pathname from hook is cleaned?
            // Actually usePathname from next/navigation returns path without locale if configured... 
            // But let's assume standard behavior for now.
            router.push(`/${newLocale}${pathname}`);
        } else {
            router.push(newPath);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Globe className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSwitch("th")}>
                    🇹🇭 ไทย (Thai)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSwitch("en")}>
                    🇺🇸 English
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

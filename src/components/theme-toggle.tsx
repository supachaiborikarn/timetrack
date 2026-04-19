"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useHasMounted } from "@/hooks/use-has-mounted"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const mounted = useHasMounted()

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Sun className="h-5 w-5" />
            </Button>
        )
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground"
        >
            {theme === "dark" ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}

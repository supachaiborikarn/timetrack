"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useHasMounted } from "@/hooks/use-has-mounted";

interface ThemeToggleProps {
  /**
   * "icon" = just the icon button (for header use)
   * "pill" = a pill-shaped toggle with label
   */
  variant?: "icon" | "pill";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();
  if (!mounted) return null;

  const isDark = theme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (variant === "pill") {
    return (
      <button
        onClick={toggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/60 hover:bg-muted transition-colors font-bold text-sm ${className}`}
      >
        {isDark ? (
          <>
            <Sun className="w-4 h-4 text-yellow-400" />
            <span className="text-foreground">โหมดสว่าง</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="text-foreground">โหมดมืด</span>
          </>
        )}
      </button>
    );
  }

  // Default: icon button (transparent, for use on colored header)
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`p-2 rounded-full hover:bg-black/10 active:bg-black/20 transition-colors ${className}`}
    >
      {isDark ? (
        <Sun className="w-6 h-6 text-primary-foreground" />
      ) : (
        <Moon className="w-6 h-6 text-primary-foreground" />
      )}
    </button>
  );
}

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolvedTheme: "dark" as "dark" | "light",
  setTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "system",
    resolvedTheme: mocks.resolvedTheme,
    setTheme: mocks.setTheme,
  }),
}));

vi.mock("@/hooks/use-has-mounted", () => ({
  useHasMounted: () => true,
}));

import { ThemeToggle } from "@/components/layout/ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    mocks.resolvedTheme = "dark";
    mocks.setTheme.mockReset();
  });

  it("switches a system-resolved dark theme directly to light", () => {
    render(<ThemeToggle variant="pill" />);

    fireEvent.click(screen.getByRole("button", { name: /โหมดสว่าง/i }));

    expect(mocks.setTheme).toHaveBeenCalledWith("light");
  });

  it("switches a resolved light theme to dark", () => {
    mocks.resolvedTheme = "light";
    render(<ThemeToggle variant="pill" />);

    fireEvent.click(screen.getByRole("button", { name: /โหมดมืด/i }));

    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
  });
});

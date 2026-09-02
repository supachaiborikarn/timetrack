import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useLocalStorageState } from "./use-local-storage-state";

const STORAGE_KEY = "test-array-local-storage-state";

function ArrayStateHarness() {
    const [items, setItems] = useLocalStorageState<string[]>(
        STORAGE_KEY,
        [],
        (rawValue) => rawValue ? JSON.parse(rawValue) as string[] : [],
        (value) => JSON.stringify(value),
    );

    return (
        <div>
            <span data-testid="count">{items.length}</span>
            <button type="button" onClick={() => setItems(["one"])}>
                Set item
            </button>
        </div>
    );
}

describe("useLocalStorageState", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("keeps parsed object snapshots stable and updates after a local write", () => {
        render(<ArrayStateHarness />);

        expect(screen.getByTestId("count").textContent).toBe("0");

        fireEvent.click(screen.getByRole("button", { name: "Set item" }));

        expect(screen.getByTestId("count").textContent).toBe("1");
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('["one"]');
    });

    it("updates after a storage event changes the raw value", () => {
        render(<ArrayStateHarness />);

        act(() => {
            window.localStorage.setItem(STORAGE_KEY, '["one","two"]');
            window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
        });

        expect(screen.getByTestId("count").textContent).toBe("2");
    });
});

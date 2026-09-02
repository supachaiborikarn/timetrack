"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

const STORAGE_EVENT = "timetrack:local-storage-change";

type ParseValue<T> = (rawValue: string | null) => T;
type SerializeValue<T> = (value: T) => string;

interface StorageEventDetail {
    key: string;
}

interface SnapshotCache<T> {
    key: string;
    rawValue: string | null;
    value: T;
}

function isStorageEventForKey(event: Event, key: string) {
    if (event instanceof StorageEvent) {
        return event.key === null || event.key === key;
    }

    if (event instanceof CustomEvent) {
        return (event.detail as StorageEventDetail | undefined)?.key === key;
    }

    return true;
}

function emitStorageChange(key: string) {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new CustomEvent<StorageEventDetail>(STORAGE_EVENT, {
        detail: { key },
    }));
}

export function useLocalStorageState<T>(
    key: string,
    defaultValue: T,
    parseValue: ParseValue<T>,
    serializeValue: SerializeValue<T>,
) {
    const defaultValueRef = useRef(defaultValue);
    const snapshotCacheRef = useRef<SnapshotCache<T> | null>(null);

    const subscribe = useCallback((onStoreChange: () => void) => {
        if (typeof window === "undefined") {
            return () => {};
        }

        const handleChange = (event: Event) => {
            if (isStorageEventForKey(event, key)) {
                onStoreChange();
            }
        };

        window.addEventListener("storage", handleChange);
        window.addEventListener(STORAGE_EVENT, handleChange as EventListener);

        return () => {
            window.removeEventListener("storage", handleChange);
            window.removeEventListener(STORAGE_EVENT, handleChange as EventListener);
        };
    }, [key]);

    const getSnapshot = useCallback(() => {
        if (typeof window === "undefined") {
            return defaultValueRef.current;
        }

        const rawValue = window.localStorage.getItem(key);
        const cached = snapshotCacheRef.current;

        if (cached && cached.key === key && cached.rawValue === rawValue) {
            return cached.value;
        }

        const value = parseValue(rawValue);
        snapshotCacheRef.current = { key, rawValue, value };
        return value;
    }, [key, parseValue]);

    const getServerSnapshot = useCallback(() => defaultValueRef.current, []);
    const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const setValue = useCallback((nextValue: T) => {
        if (typeof window === "undefined") {
            return;
        }

        window.localStorage.setItem(key, serializeValue(nextValue));
        emitStorageChange(key);
    }, [key, serializeValue]);

    return [value, setValue] as const;
}

/**
 * Offline storage using IndexedDB for queuing actions when offline
 */

const DB_NAME = 'timetrack-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-actions';

interface PendingAction {
    id: string;
    type: 'check-in' | 'check-out' | 'break-start' | 'break-end';
    timestamp: Date;
    data: Record<string, unknown>;
    retries: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initOfflineStorage(): Promise<boolean> {
    return new Promise((resolve) => {
        if (!('indexedDB' in window)) {
            console.warn('IndexedDB not supported');
            resolve(false);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open IndexedDB');
            resolve(false);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB initialized');
            resolve(true);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

/**
 * Add a pending action to the queue
 */
export async function addPendingAction(action: Omit<PendingAction, 'id' | 'retries'>): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const id = `${action.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const pendingAction: PendingAction = {
            ...action,
            id,
            retries: 0,
        };

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(pendingAction);

        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(new Error('Failed to add pending action'));
    });
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<PendingAction[]> {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve([]);
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Failed to get pending actions'));
    });
}

/**
 * Remove a pending action by ID
 */
export async function removePendingAction(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve();
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to remove pending action'));
    });
}

/**
 * Sync pending actions when back online
 */
export async function syncPendingActions(): Promise<{ success: number; failed: number }> {
    const actions = await getPendingActions();
    let success = 0;
    let failed = 0;

    for (const action of actions) {
        try {
            const endpoint = getEndpointForAction(action.type);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...action.data,
                    offlineTimestamp: action.timestamp,
                }),
            });

            if (response.ok) {
                await removePendingAction(action.id);
                success++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error('Failed to sync action:', error);
            failed++;
        }
    }

    return { success, failed };
}

function getEndpointForAction(type: PendingAction['type']): string {
    switch (type) {
        case 'check-in':
            return '/api/attendance/check-in';
        case 'check-out':
            return '/api/attendance/check-out';
        case 'break-start':
            return '/api/attendance/break/start';
        case 'break-end':
            return '/api/attendance/break/end';
    }
}

/**
 * Check if currently online
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}

/**
 * Push notification helper functions
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) {
        return 'denied';
    }
    return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });
        console.log('Service Worker registered:', registration.scope);
        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
    registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
    if (!VAPID_PUBLIC_KEY) {
        console.warn('VAPID public key not configured');
        return null;
    }

    try {
        // Convert VAPID key to Uint8Array
        const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
            const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        };

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });

        // Send subscription to server
        await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription),
        });

        console.log('Push subscription created');
        return subscription;
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return null;
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(
    registration: ServiceWorkerRegistration
): Promise<boolean> {
    try {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();

            // Notify server
            await fetch('/api/notifications/subscribe', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
            });

            console.log('Push subscription removed');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to unsubscribe from push:', error);
        return false;
    }
}

/**
 * Initialize push notifications
 */
export async function initializePushNotifications(): Promise<boolean> {
    if (!isPushSupported()) {
        console.warn('Push notifications not supported');
        return false;
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) {
        return false;
    }

    const subscription = await subscribeToPush(registration);
    return !!subscription;
}

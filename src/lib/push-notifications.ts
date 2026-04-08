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
        // Register the service worker
        await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });
        
        // IMPORTANT: Wait for the service worker to be fully active/ready
        // Fixes error: "Subscribing for push requires an active service worker"
        const readyRegistration = await navigator.serviceWorker.ready;
        
        console.log('Service Worker is active and ready:', readyRegistration.scope);
        return readyRegistration;
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
        throw new Error('VAPID_PUBLIC_KEY is missing in env (NEXT_PUBLIC_VAPID_PUBLIC_KEY)');
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
        const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription),
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`Server API Failed (${response.status}): ${JSON.stringify(errData)}`);
        }

        console.log('Push subscription created');
        return subscription;
    } catch (error: any) {
        console.error('Failed to subscribe to push:', error);
        throw new Error(`Subscribe Failed: ${error.message}`);
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
export async function initializePushNotifications(): Promise<{success: boolean, error?: string}> {
    if (!isPushSupported()) {
        console.warn('Push notifications not supported');
        return { success: false, error: 'เบราว์เซอร์ไม่รองรับ Push Notifications' };
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return { success: false, error: 'กรุณาอนุญาตการแจ้งเตือนในตั้งค่าเบราว์เซอร์' };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
        return { success: false, error: 'ไม่สามารถลงทะเบียน Service Worker ได้' };
    }

    try {
        const subscription = await subscribeToPush(registration);
        if (!subscription) {
            return { success: false, error: 'ไม่สามารถสร้าง Subscription (1)' };
        }
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Unknown error' };
    }
}

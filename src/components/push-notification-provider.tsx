"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
    isPushSupported,
    getNotificationPermission,
    initializePushNotifications,
    registerServiceWorker
} from "@/lib/push-notifications";

export function PushNotificationProvider() {
    const { data: session } = useSession();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (!session?.user?.id) {
            setIsChecking(false);
            return;
        }

        // On first load with active session:
        // 1. Ensure service worker is running
        // 2. See if we should ask for permissions
        const init = async () => {
            try {
                if (!isPushSupported()) {
                    setIsChecking(false);
                    return;
                }

                const permission = getNotificationPermission();

                if (permission === 'default') {
                    // Ask user to enable notifications
                    toast("เปิดรับการแจ้งเตือน (Push Notifications)", {
                        description: "เพื่อให้คุณไม่พลาดทุกการแจ้งเตือนสำคัญ เช่น คนหน้าลานไม่พอ",
                        action: {
                            label: "เปิดใช้งาน",
                            onClick: async () => {
                                const success = await initializePushNotifications();
                                if (success) {
                                    toast.success("เปิดรับการแจ้งเตือนสำเร็จ");
                                } else {
                                    toast.error("ไม่สามารถเปิดการแจ้งเตือนได้");
                                }
                            },
                        },
                        duration: 10000,
                    });
                } else if (permission === 'granted') {
                    // Already granted, silently make sure service worker and subscription are active
                    // This handles cases where they allowed on this device but subscription record hasn't been created
                    await initializePushNotifications();
                }
            } catch (error) {
                console.error("Push init error:", error);
            } finally {
                setIsChecking(false);
            }
        };

        init();
    }, [session?.user?.id]);

    return null;
}

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
    isPushSupported,
    getNotificationPermission,
    initializePushNotifications,
} from "@/lib/push-notifications";

export function PushNotificationProvider() {
    const { data: session } = useSession();

    useEffect(() => {
        if (!session?.user?.id) {
            return;
        }

        // On first load with active session:
        // 1. Ensure service worker is running
        // 2. See if we should ask for permissions
        const init = async () => {
            try {
                if (!isPushSupported()) {
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
                                const result = await initializePushNotifications();
                                if (result.success) {
                                    toast.success("เปิดรับการแจ้งเตือนสำเร็จ");
                                } else {
                                    toast.error(`เกิดข้อผิดพลาด: ${result.error}`);
                                }
                            },
                        },
                        duration: 10000,
                    });
                } else if (permission === 'granted') {
                    // Already granted, silently make sure service worker and subscription are active
                    const result = await initializePushNotifications();
                    if (!result.success) {
                        toast.error(`ระบบการแจ้งเตือนมีปัญหา: ${result.error}`);
                    }
                }
            } catch (error) {
                console.error("Push init error:", error);
                const message = error instanceof Error ? error.message : "Unknown error";
                toast.error(`Push init error: ${message}`);
            }
        };

        init();
    }, [session?.user?.id]);

    return null;
}

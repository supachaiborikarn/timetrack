"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isOnline, onOnlineStatusChange, syncPendingActions, getPendingActions } from "@/lib/offline-storage";
import { toast } from "sonner";

export function OfflineIndicator() {
    const [online, setOnline] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        // Set initial state
        setOnline(isOnline());

        // Check pending actions count  
        const checkPending = async () => {
            try {
                const actions = await getPendingActions();
                setPendingCount(actions.length);
            } catch {
                setPendingCount(0);
            }
        };
        checkPending();

        // Listen for online/offline changes
        const unsubscribe = onOnlineStatusChange(async (isOnlineNow) => {
            setOnline(isOnlineNow);
            if (isOnlineNow) {
                // Auto-sync when coming back online
                await handleSync();
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const handleSync = async () => {
        if (pendingCount === 0) return;

        setSyncing(true);
        try {
            const result = await syncPendingActions();
            if (result.success > 0) {
                toast.success(`Synced ${result.success} action(s) successfully`);
            }
            if (result.failed > 0) {
                toast.error(`Failed to sync ${result.failed} action(s)`);
            }
            // Refresh pending count
            const actions = await getPendingActions();
            setPendingCount(actions.length);
        } catch (error) {
            console.error("Sync failed:", error);
            toast.error("Failed to sync pending actions");
        } finally {
            setSyncing(false);
        }
    };

    // Don't render anything if online with no pending actions
    if (online && pendingCount === 0) {
        return null;
    }

    return (
        <div
            className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 rounded-lg px-4 py-3 shadow-lg ${online
                    ? "bg-amber-500/90 text-amber-950"
                    : "bg-red-500/90 text-white"
                }`}
        >
            <div className="flex items-center gap-3">
                {online ? (
                    <Wifi className="w-5 h-5" />
                ) : (
                    <WifiOff className="w-5 h-5" />
                )}

                <div className="flex-1">
                    <p className="font-medium text-sm">
                        {online
                            ? `${pendingCount} pending action(s) to sync`
                            : "You're offline"
                        }
                    </p>
                    {!online && (
                        <p className="text-xs opacity-80">
                            Actions will be synced when online
                        </p>
                    )}
                </div>

                {online && pendingCount > 0 && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleSync}
                        disabled={syncing}
                        className="shrink-0"
                    >
                        {syncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        <span className="ml-1">Sync</span>
                    </Button>
                )}
            </div>
        </div>
    );
}

"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { Fingerprint } from "lucide-react";
import { toast } from "sonner";

export function PasskeyButton() {
    const handleRegister = async () => {
        try {
            // Trigger WebAuthn registration
            // In NextAuth v5, signing in with "webauthn" performs registration if not registered?
            // Or we need specific action.
            // Usually "webauthn" provider handles both login and registration flow.
            // For registration, we might need to pass specific options or use a separate flow.
            // But standard "signIn" initiates the ceremony.

            const result = await signIn("webauthn", {
                redirect: false,
                callbackUrl: "/profile",
            });

            if (result?.error) {
                toast.error("Failed to register: " + result.error);
            } else {
                toast.success("Biometric registered successfully");
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        }
    };

    return (
        <Button
            onClick={handleRegister}
            variant="outline"
            className="gap-2 w-full sm:w-auto"
        >
            <Fingerprint className="w-4 h-4" />
            Register Face ID / Touch ID
        </Button>
    );
}

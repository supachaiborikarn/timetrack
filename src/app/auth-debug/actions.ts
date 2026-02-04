'use server';

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function debugLogin(formData: FormData) {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const provider = formData.get("provider") as string; // "password" or "pin"

    console.log(`[DEBUG] Attempting login for: ${username} via ${provider}`);

    try {
        await signIn(provider, {
            [provider === 'password' ? 'email' : 'phone']: username, // Map username/phone dynamically based on provider logic
            [provider === 'password' ? 'password' : 'pin']: password,
            redirect: false,
        });
        return { success: true, message: "Login Successful!" };
    } catch (error) {
        console.error("[DEBUG] Login Error:", error);

        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { success: false, message: "Invalid credentials (AuthError: CredentialsSignin)" };
                default:
                    return { success: false, message: `AuthError: ${error.type}` };
            }
        }

        return { success: false, message: `Unknown Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}

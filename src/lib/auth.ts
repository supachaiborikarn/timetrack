import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { authConfig } from "./auth.config";

console.log("[DEBUG] Loading auth.ts");
console.log(`[DEBUG] AUTH_SECRET present: ${!!process.env.AUTH_SECRET}`);
if (process.env.AUTH_SECRET) {
    console.log(`[DEBUG] AUTH_SECRET length: ${process.env.AUTH_SECRET.length}`);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        CredentialsProvider({
            id: "pin",
            name: "PIN Login",
            credentials: {
                phone: { label: "Phone", type: "text" },
                pin: { label: "PIN", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.phone || !credentials?.pin) return null;

                const loginKey = credentials.phone as string;

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { phone: loginKey },
                            { username: loginKey },
                            { employeeId: loginKey },
                            { name: loginKey }
                        ],
                        isActive: true
                    },
                });

                if (!user) return null;

                const isValidPin = await bcrypt.compare(
                    credentials.pin as string,
                    user.pin
                );

                if (!isValidPin) return null;

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    stationId: user.stationId,
                    employeeId: user.employeeId,
                };
            },
        }),
        CredentialsProvider({
            id: "password",
            name: "Password Login",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log("[DEBUG] Authorize called (Password Provider)");
                try {
                    const loginKey = credentials?.email as string;
                    const password = credentials?.password as string;

                    console.log(`[DEBUG] Key: ${loginKey}, Pass Length: ${password?.length}`);

                    if (!loginKey || !password) {
                        console.log("[DEBUG] Missing credentials");
                        return null;
                    }

                    console.log("[DEBUG] Querying User...");
                    const user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { email: loginKey },
                                { username: loginKey },
                                { employeeId: loginKey },
                                { name: loginKey }
                            ],
                            isActive: true
                        },
                    });

                    console.log(`[DEBUG] Query Result: ${user ? 'Found User: ' + user.username : 'User Not Found'}`);

                    if (!user || !user.password) {
                        console.log("[DEBUG] User invalid or no password");
                        return null;
                    }

                    console.log("[DEBUG] Comparing Password...");
                    const isValidPassword = await bcrypt.compare(
                        password,
                        user.password
                    );

                    console.log(`[DEBUG] Password Valid: ${isValidPassword}`);

                    if (!isValidPassword) {
                        console.log("[DEBUG] Password Mismatch");
                        return null;
                    }

                    console.log("[DEBUG] Login Successful, returning user");
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        stationId: user.stationId,
                        employeeId: user.employeeId,
                    };
                } catch (error: any) {
                    console.error("[DEBUG] CRITICAL ERROR IN AUTHORIZE:", error);
                    console.error("[DEBUG] Error Stack:", error.stack);
                    throw error;
                }
            },
        }),
    ],
});

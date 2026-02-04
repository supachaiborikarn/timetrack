import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import WebAuthn from "next-auth/providers/webauthn";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        WebAuthn({
            name: "Biometrics",
        }),
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
                            { name: loginKey },
                            { nickName: loginKey }
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
                // Allow login with email OR username OR employeeId
                const loginKey = credentials?.email as string;
                const password = credentials?.password as string;

                if (!loginKey || !password) return null;

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: loginKey },
                            { username: loginKey },
                            { employeeId: loginKey },
                            { name: loginKey },
                            { nickName: loginKey }
                        ],
                        isActive: true
                    },
                });

                if (!user || !user.password) return null;

                const isValidPassword = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!isValidPassword) return null;

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
    ],
});

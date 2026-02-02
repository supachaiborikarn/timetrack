import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name: string;
            email?: string | null;
            role: Role;
            stationId?: string | null;
            employeeId: string;
        };
    }

    interface User {
        id: string;
        name: string;
        email?: string | null;
        role: Role;
        stationId?: string | null;
        employeeId: string;
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id: string;
        role: Role;
        stationId?: string | null;
        employeeId: string;
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma) as never,
    session: { strategy: "jwt" },
    secret: process.env.AUTH_SECRET || "dev-secret-please-change-in-production",
    pages: {
        signIn: "/login",
    },
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

                const user = await prisma.user.findUnique({
                    where: { phone: credentials.phone as string, isActive: true },
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
                const loginKey = (credentials?.email || credentials?.username) as string;
                const password = credentials?.password as string;

                if (!loginKey || !password) return null;

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: loginKey },
                            { username: loginKey }, // Check username
                            { employeeId: loginKey }, // Check employeeId
                            // Fallback to name if unique enough (careful with duplicates)
                            { name: loginKey }
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
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.stationId = user.stationId;
                token.employeeId = user.employeeId;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as Role;
                session.user.stationId = token.stationId as string | null | undefined;
                session.user.employeeId = token.employeeId as string;
            }
            return session;
        },
    },
});

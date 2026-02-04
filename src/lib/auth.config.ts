import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Define simpler Types for Edge runtime
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

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    // Using JWT strategy for session
    session: { strategy: "jwt" },
    secret: process.env.AUTH_SECRET,
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
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLogin = nextUrl.pathname.startsWith('/login');

            // Allow access to login page
            if (isOnLogin) {
                return true; // Use middleware logic to redirect if already logged in if needed
            }

            // By default, let middleware handle specific route protection
            return true;
        },
    },
    providers: [], // Providers configured in auth.ts
} satisfies NextAuthConfig;

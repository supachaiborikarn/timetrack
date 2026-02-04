import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    // Using JWT strategy for session
    session: { strategy: "jwt" },
    secret: process.env.AUTH_SECRET,
    callbacks: {
        async jwt({ token, user }: { token: any, user: any }) {
            if (user) {
                // Use assertions to bypass strict typing for now
                token.id = user.id;
                token.role = user.role;
                token.stationId = user.stationId;
                token.employeeId = user.employeeId;
            }
            return token;
        },
        async session({ session, token }: { session: any, token: any }) {
            if (token && session.user) {
                // Use assertions to transfer data
                session.user.id = token.id as string;
                session.user.role = token.role;
                session.user.stationId = token.stationId;
                session.user.employeeId = token.employeeId;
            }
            return session;
        },
        authorized({ auth, request: { nextUrl } }: { auth: any, request: { nextUrl: any } }) {
            // const isLoggedIn = !!auth?.user;
            const isOnLogin = nextUrl.pathname.startsWith('/login');

            // Allow access to login page
            if (isOnLogin) {
                return true;
            }

            // By default, let middleware handle specific route protection
            return true;
        },
    },
    providers: [], // Providers configured in auth.ts
} satisfies NextAuthConfig;
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

import type { NextAuthConfig, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export const authConfig = {
    pages: {
        signIn: "/login",
        error: "/auth/error",
    },
    // Using JWT strategy for session
    session: { strategy: "jwt" },
    trustHost: true,
    callbacks: {
        async jwt({ token, user }: { token: JWT; user?: User }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.stationId = user.stationId;
                token.employeeId = user.employeeId;
                token.v = 3; // Bump version to force re-login again
            }

            // บังคับ re-login ถ้า token version ไม่ตรง (เช่น หลังแก้ role หรือบังคับ logout)
            if (token.v !== 3) {
                return {}; // ล้าง token ทิ้ง → redirect ไปหน้า login
            }

            return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            // เพิ่มการตรวจสอบว่า token มีข้อมูลครบถ้วนหรือไม่ (ป้องกันเคสที่โดนล้าง token)
            if (!token.id || !token.role || !token.employeeId) {
                return {
                    ...session,
                    user: undefined as unknown as Session["user"],
                };
            }

            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.stationId = token.stationId ?? null;
                session.user.employeeId = token.employeeId;
            }
            return session;
        },
        authorized({ auth, request: { nextUrl } }: { auth: Session | null; request: NextRequest }) {
            // ใช้ id เพื่อเป็นตัวยืนยันว่ามี session สมบูรณ์
            const isLoggedIn = !!auth?.user?.id;
            const isOnLogin = nextUrl.pathname.startsWith('/login');

            // Allow access to login page
            if (isOnLogin) {
                return true;
            }

            // Simple check: strict login for everything else
            return isLoggedIn;
        },
    },
    providers: [], // Providers configured in auth.ts
} satisfies NextAuthConfig;

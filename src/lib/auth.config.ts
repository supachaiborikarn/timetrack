import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
        error: "/auth/error",
    },
    // Using JWT strategy for session
    session: { strategy: "jwt" },
    trustHost: true,
    callbacks: {
        async jwt({ token, user }: { token: any, user: any }) {
            if (user) {
                // Use assertions to bypass strict typing for now
                token.id = user.id;
                token.role = user.role;
                token.stationId = user.stationId;
                token.employeeId = user.employeeId;
                token.v = 1; // Add simple version flag
            }

            // บังคับให้พนักงาน (รวมพนักงานบ่อ) ที่ยังไม่ได้ล็อกอินใหม่ตั้งแต่ที่เราอัปเดตระบบ ต้องล็อกอินใหม่
            if (token.role === 'EMPLOYEE' && token.v !== 1) {
                return {}; // ล้าง token ทิ้ง
            }

            return token;
        },
        async session({ session, token }: { session: any, token: any }) {
            // เพิ่มการตรวจสอบว่า token มีข้อมูลครบถ้วนหรือไม่ (ป้องกันเคสที่โดนล้าง token)
            if (!token.id) {
                session.user = null; // บังคับให้ session ไม่มีข้อมูล user
                return session;
            }

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
            // ใช้ id เพื่อเป็นตัวยืนยันว่ามี session สมบูรณ์
            const isLoggedIn = !!auth?.user?.id;
            const isOnLogin = nextUrl.pathname.startsWith('/login');

            // Allow access to login page
            if (isOnLogin) {
                return true;
            }

            // Allow debugging
            if (nextUrl.pathname.startsWith('/auth-debug')) return true;

            // Simple check: strict login for everything else
            return isLoggedIn;
        },
    },
    providers: [], // Providers configured in auth.ts
} satisfies NextAuthConfig;

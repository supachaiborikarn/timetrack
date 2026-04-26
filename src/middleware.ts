import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
    // Keep routing middleware off public/static routes to reduce Vercel compute usage.
    // Client pages and API routes still perform their own session checks.
    matcher: [
        "/admin/:path*",
        "/advances/:path*",
        "/announcements/:path*",
        "/availability/:path*",
        "/history/:path*",
        "/notifications/:path*",
        "/performance/:path*",
        "/profile/:path*",
        "/qr-scan/:path*",
        "/requests/:path*",
        "/schedule/:path*",
        "/shift-pool/:path*",
        "/wallet/:path*",
    ],
};

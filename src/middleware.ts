import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Initialize NextAuth with Edge-safe config
const { auth } = NextAuth(authConfig);

// Routes that require authentication
const protectedRoutes = ["/", "/schedule", "/history", "/leave", "/qr-scan", "/profile"];
const adminRoutes = ["/admin"];
const managerRoutes = ["/manager"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip auth check for public routes
    if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/icons") ||
        pathname === "/manifest.json" ||
        pathname === "/favicon.ico"
    ) {
        return NextResponse.next();
    }

    const session = await auth();

    // Redirect to login if not authenticated
    if (!session) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Check admin routes
    if (pathname.startsWith("/admin") && !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // Check manager routes
    if (pathname.startsWith("/manager") && !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

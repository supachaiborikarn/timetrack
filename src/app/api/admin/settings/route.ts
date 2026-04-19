import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTimeTrackSettings, saveTimeTrackSettings } from "@/lib/server/system-settings";

function ensureAdminRole(role?: string) {
    return role === "ADMIN";
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!ensureAdminRole(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const settings = await getTimeTrackSettings();
        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Failed to fetch admin settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!ensureAdminRole(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const settings = await saveTimeTrackSettings(body ?? {});
        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Failed to save admin settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

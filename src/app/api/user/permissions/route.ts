import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";
import { Role } from "@prisma/client";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const permissions = await getUserPermissions(session.user.role as Role);

        return NextResponse.json({ permissions });
    } catch (error) {
        console.error("Error fetching user permissions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

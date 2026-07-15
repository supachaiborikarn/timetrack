import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/logger";
import {
    getPayrollDocumentSettings,
    savePayrollDocumentSettings,
} from "@/lib/server/payroll-document-settings";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ settings: await getPayrollDocumentSettings() });
    } catch (error) {
        console.error("Failed to load payroll document settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const settings = await savePayrollDocumentSettings(body ?? {});
        await logActivity(session.user.id, "UPDATE", "PayrollDocumentSettings", {
            displayName: settings.displayName,
            legalName: settings.legalName,
            taxId: settings.taxId,
            branch: settings.branch,
            logoConfigured: Boolean(settings.logoDataUrl),
            authorizedSigner: settings.authorizedSigner,
        });
        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Failed to save payroll document settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

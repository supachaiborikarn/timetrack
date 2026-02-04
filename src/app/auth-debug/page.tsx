import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function AuthDebugPage() {
    const session = await auth();
    const headerList = headers();

    // masked env vars
    const hasAuthSecret = !!process.env.AUTH_SECRET;
    const hasDbUrl = !!process.env.DATABASE_URL;
    const dbUrlStart = process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + "..." : "MISSING";
    const nextAuthUrl = process.env.NEXTAUTH_URL || "NOT SET";

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-xl mb-4 font-bold">Auth Debugger</h1>

            <div className="space-y-4">
                <section className="border p-4 rounded">
                    <h2 className="font-bold mb-2">Session</h2>
                    <pre className="bg-slate-900 text-slate-100 p-2 rounded">
                        {JSON.stringify(session, null, 2)}
                    </pre>
                </section>

                <section className="border p-4 rounded">
                    <h2 className="font-bold mb-2">Environment</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>AUTH_SECRET Present: {hasAuthSecret ? "✅ YES" : "❌ NO"}</li>
                        <li>DATABASE_URL Present: {hasDbUrl ? "✅ YES" : "❌ NO"}</li>
                        <li>DATABASE_URL Start: {dbUrlStart}</li>
                        <li>NEXTAUTH_URL: {nextAuthUrl}</li>
                    </ul>
                </section>

                <section className="border p-4 rounded">
                    <h2 className="font-bold mb-2">Headers</h2>
                    <pre className="bg-slate-900 text-slate-100 p-2 rounded overflow-auto max-h-40">
                        Top level host: {headerList.get('host')}
                    </pre>
                </section>
            </div>
        </div>
    );
}

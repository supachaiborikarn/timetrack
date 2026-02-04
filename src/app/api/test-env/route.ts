import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const secret = process.env.AUTH_SECRET;
    const dbUrl = process.env.DATABASE_URL;

    return NextResponse.json({
        AUTH_SECRET_EXISTS: !!secret,
        AUTH_SECRET_LENGTH: secret ? secret.length : 0,
        AUTH_SECRET_START: secret ? secret.substring(0, 3) + "***" : "NULL",
        DATABASE_URL_EXISTS: !!dbUrl,
        DATABASE_URL_START: dbUrl ? dbUrl.substring(0, 10) + "***" : "NULL",
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
    });
}

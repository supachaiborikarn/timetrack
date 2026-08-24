import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { FeedbackForm } from "./feedback-form";
import { isCustomerFeedbackPublicEnabled } from "@/lib/customer-feedback/feature-flags";

/**
 * หน้า shell ของแบบประเมินเสียงลูกค้า — เป็น Server Component ที่ส่งเฉพาะ
 * ค่าคงที่ให้ Client Component แล้ว resolve เป้าหมายผ่าน POST เท่านั้น
 * ยังไม่เผยเป้าหมายใด ๆ จนกว่าจะ resolve สำเร็จ
 */

export const metadata: Metadata = {
    title: "ประเมินการบริการ",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
};

// อ่าน feature flag ทุก request เพื่อไม่ให้ผลตอน build ถูกเก็บเป็น 404 ถาวร
export const dynamic = "force-dynamic";

// หน้า public ต้องยอมให้ผู้ใช้ขยายหน้าจอได้ (override ค่า root ที่ปิด zoom)
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
};

export default function CustomerFeedbackPage() {
    if (!isCustomerFeedbackPublicEnabled()) notFound();

    return (
        <main className="min-h-screen bg-white text-neutral-900">
            <FeedbackForm />
        </main>
    );
}

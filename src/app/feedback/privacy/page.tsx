import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "ประกาศความเป็นส่วนตัว — เสียงลูกค้า",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
};

export default function FeedbackPrivacyPage() {
    return (
        <main className="min-h-screen bg-white text-neutral-900">
            <div className="mx-auto w-full max-w-md px-4 py-8">
                <h1 className="mb-4 text-2xl font-bold">ประกาศความเป็นส่วนตัว</h1>
                <div className="space-y-4 text-sm leading-relaxed text-neutral-700">
                    <p>
                        แบบประเมินนี้เก็บความคิดเห็นของลูกค้าเพื่อปรับปรุงการให้บริการ ไม่ต้องสร้างบัญชี
                        และไม่ต้องระบุชื่อ คำถามปกติไม่เก็บเพศ อายุ เชื้อชาติ หรือเลขทะเบียนใด ๆ
                    </p>
                    <p>
                        พนักงานที่ปรากฏบนป้าย QR จะแสดงด้วย<strong>ชื่อเล่น</strong>และตำแหน่งงานเท่านั้น
                        ไม่มีการเปิดเผยชื่อจริง นามสกุล หรือรหัสพนักงานต่อลูกค้า
                    </p>
                    <p>
                        ข้อมูลติดต่อกลับ (เบอร์โทรศัพท์หรืออีเมล) เป็นทางเลือก ใช้เพื่อติดต่อกลับเท่านั้น
                        จะถูกเข้ารหัสแยกจากคำตอบทั่วไป และถูกลบเมื่อพ้นระยะเวลาที่กำหนด
                    </p>
                    <p>
                        เราไม่ใช้ความคิดเห็นหนึ่งรายการลงโทษ ตัดโบนัส หรือปรับเงินเดือนอัตโนมัติ
                        ผลประเมินจะถูกใช้เป็นข้อมูลประกอบเมื่อมีจำนวนคำตอบเพียงพอและผ่านการกลั่นกรองแล้ว
                    </p>
                    <p>
                        ที่อยู่ IP ถูกแปลงเป็นรหัสที่ไม่ระบุตัวตน (hash) เพื่อป้องกันการส่งซ้ำ
                        และไม่เก็บ IP ดิบไว้ในระบบ
                    </p>
                    <p className="text-neutral-500">
                        หากมีข้อสงสัยเกี่ยวกับการประมวลผลข้อมูล หรือต้องการใช้สิทธิ์ตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล
                        กรุณาติดต่อผู้รับผิดชอบข้อมูลส่วนบุคคลของบริษัทที่{" "}
                        <a href="tel:055773003" className="font-semibold text-neutral-700 underline underline-offset-2">
                            055-773003
                        </a>{" "}
                        (สำนักงานสถานีบริการ)
                    </p>
                </div>
                <Link
                    href="/f"
                    className="mt-8 inline-flex min-h-[44px] items-center rounded-xl bg-yellow-400 px-6 py-3 font-bold text-neutral-900"
                >
                    กลับไปทำแบบประเมิน
                </Link>
            </div>
        </main>
    );
}

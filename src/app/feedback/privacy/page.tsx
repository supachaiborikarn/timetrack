import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { PRIVACY_NOTICE_VERSION } from "@/lib/customer-feedback/questions";

export const metadata: Metadata = {
    title: "ประกาศความเป็นส่วนตัว / Privacy Notice — เสียงลูกค้า",
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
            <div className="mx-auto w-full max-w-2xl px-4 py-8">
                <section lang="th" aria-labelledby="privacy-th">
                    <h1 id="privacy-th" className="mb-4 text-2xl font-bold">ประกาศความเป็นส่วนตัว</h1>
                    <div className="space-y-4 text-sm leading-relaxed text-neutral-700">
                        <p>
                            บริษัทผู้ให้บริการที่ระบุบนป้ายหรือเอกสาร ณ จุดบริการเป็นผู้ควบคุมข้อมูลสำหรับแบบประเมินนี้
                            ระบบใช้ข้อมูลเพื่อปรับปรุงบริการ ตรวจสอบเหตุที่แจ้ง ติดต่อกลับเมื่อคุณร้องขอ และป้องกันการส่งซ้ำ
                        </p>
                        <p>
                            ข้อมูลที่เก็บได้แก่คำตอบ ข้อความ สถานีหรือพนักงานที่ประเมิน เวลาโดยประมาณ และรหัสทางเทคนิคที่แปลงจากเครือข่ายหรืออุปกรณ์
                            ระบบไม่เก็บ IP ดิบ และคุณไม่ต้องระบุชื่อ
                        </p>
                        <p>
                            เบอร์โทรศัพท์ อีเมล และชื่อสำหรับติดต่อกลับเป็นข้อมูลทางเลือก ระบบเข้ารหัสและแยกข้อมูลนี้จากรายการคำตอบทั่วไป
                            เจ้าหน้าที่ที่มีสิทธิ์เท่านั้นจึงเปิดดูได้ และทุกครั้งที่เปิดดูจะมีประวัติการเข้าถึง
                        </p>
                        <p>
                            พนักงานบนป้าย QR แสดงชื่อเล่นและตำแหน่งงานตามข้อมูลสาธารณะที่พนักงานรับทราบแล้ว
                            ลูกค้าไม่เห็นชื่อจริง นามสกุล หรือรหัสพนักงานจากแบบประเมินนี้
                        </p>
                        <p>
                            รหัสทางเทคนิคของ Visit ลบภายใน 90 วันหลังสรุปข้อมูล ข้อมูลติดต่อจะลบภายใน 30 วันหลังปิดเคสและไม่เกิน 120 วัน
                            ข้อความดิบลบเมื่อครบ 12 เดือนหากไม่มีเคสเปิด คำตอบรายรายการลบเมื่อครบ 24 เดือน
                            หากมีเคสหรือรอบประเมินที่ยังไม่ปิด ระบบจะเก็บจนปิดเคสครบ 12 เดือนหรือจนสร้างผลสรุปรอบประเมินแล้ว
                        </p>
                        <p>
                            บริษัทใช้คะแนนเมื่อมีจำนวนคำตอบเพียงพอและผ่านการกลั่นกรอง ความคิดเห็นหนึ่งรายการจะไม่ตัดโบนัส ลงโทษ หรือปรับเงินเดือนโดยอัตโนมัติ
                        </p>
                        <p>
                            คุณขอเข้าถึง แก้ไข ลบ จำกัดการใช้ หรือสอบถามเรื่องข้อมูลส่วนบุคคลได้ที่ผู้รับผิดชอบข้อมูลส่วนบุคคลของบริษัท โทร{" "}
                            <a
                                href="tel:055773003"
                                className="-mx-1 inline-flex min-h-[44px] items-center px-1 align-middle font-semibold text-neutral-800 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                            >
                                055-773003
                            </a>{" "}
                            โดยแจ้งเลขอ้างอิงจากหน้าสำเร็จเมื่อมี
                        </p>
                    </div>
                </section>

                <hr className="my-8 border-neutral-200" />

                <section lang="en" aria-labelledby="privacy-en">
                    <h2 id="privacy-en" className="mb-4 text-2xl font-bold">Privacy Notice</h2>
                    <div className="space-y-4 text-sm leading-relaxed text-neutral-700">
                        <p>
                            The service company identified on the sign or service document is the data controller for this survey.
                            The information is used to improve service, investigate reported incidents, contact you when requested, and prevent duplicate submissions.
                        </p>
                        <p>
                            We may collect your answers, comments, the station or employee reviewed, an approximate time, and technical identifiers derived from network or device information.
                            Raw IP addresses are not stored, and you do not need to provide your name.
                        </p>
                        <p>
                            A phone number, email address, and contact name are optional. Contact details are encrypted, stored separately from ordinary responses,
                            and available only to authorized staff with an access record.
                        </p>
                        <p>
                            Employee QR signs show an acknowledged public nickname and position. This survey does not show customers the employee&apos;s full legal name or employee number.
                        </p>
                        <p>
                            Technical visit identifiers are deleted within 90 days after aggregation. Contact details are deleted within 30 days after a case closes and no later than 120 days.
                            Raw comments are removed after 12 months when no case remains open. Individual responses are removed after 24 months.
                            If a case or review period remains open, the response is retained until 12 months after case closure or until the review snapshot has been created.
                        </p>
                        <p>
                            Scores are used only after a sufficient number of reviewed responses is available. A single response does not automatically change pay, bonuses, or disciplinary outcomes.
                        </p>
                        <p>
                            To request access, correction, deletion, restriction, or more information, contact the company&apos;s privacy contact at{" "}
                            <a
                                href="tel:055773003"
                                className="-mx-1 inline-flex min-h-[44px] items-center px-1 align-middle font-semibold text-neutral-800 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                            >
                                055-773003
                            </a>{" "}
                            and provide the reference code shown after submission when available.
                        </p>
                    </div>
                </section>

                <p className="mt-8 text-xs text-neutral-500">Notice version: {PRIVACY_NOTICE_VERSION}</p>

                <Link
                    href="/f"
                    className="mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-yellow-400 px-6 py-3 font-bold text-neutral-900"
                >
                    กลับไปทำแบบประเมิน / Back to survey
                </Link>
            </div>
        </main>
    );
}

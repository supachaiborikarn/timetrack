import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FeedbackForm, stableRequestKey } from "./feedback-form";

const stationResolveResult = {
    visitToken: "signed-visit-token",
    surveyVersion: "station-v1",
    targetType: "STATION",
    target: { label: "สถานีทดสอบ", position: null },
    station: { id: "station-1", name: "สถานีทดสอบ", emergencyPhone: "055000000" },
    stationNeedsSelection: false,
    reasonOptionOrder: ["station_cleanliness", "other", "unspecified"],
    maxReasons: 3,
    commentMaxLength: 300,
    serviceAreaKey: null,
    formExpiresAt: "2099-01-01T00:00:00.000Z",
    isTest: false,
};

const employeeV2ResolveResult = {
    ...stationResolveResult,
    surveyVersion: "employee-v2",
    targetType: "EMPLOYEE",
    target: { label: "พนักงาน ก", position: "พนักงานเติมน้ำมัน" },
    reasonOptionOrder: ["employee_courtesy", "other", "unspecified"],
};

const employeeV3ResolveResult = {
    ...employeeV2ResolveResult,
    surveyVersion: "employee-v3",
};

async function reachStationReasons() {
    fireEvent.change(screen.getByLabelText("กรอกรหัส 8 ตัวใต้ QR"), { target: { value: "ABCDEFGH" } });
    fireEvent.click(screen.getByRole("button", { name: "เริ่มประเมิน" }));
    await screen.findByRole("heading", { name: "วันนี้คุณใช้บริการที่สถานีนี้ใช่ไหม" });
    fireEvent.click(screen.getByRole("radio", { name: "ใช่" }));
    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
    await screen.findByRole("heading", { name: "วันนี้คุณใช้บริการส่วนใด" });
    fireEvent.click(screen.getByRole("checkbox", { name: "อื่น ๆ" }));
    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
    await screen.findByRole("heading", { name: "โดยรวม คุณพอใจกับการใช้บริการที่สถานีนี้วันนี้เพียงใด" });
    fireEvent.click(screen.getByRole("radio", { name: "4. พอใจ" }));
    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
    await screen.findByRole("heading", { name: "เรื่องใดทำให้คุณพอใจ" });
}

async function reachEmployeeRating() {
    fireEvent.change(screen.getByLabelText("กรอกรหัส 8 ตัวใต้ QR"), { target: { value: "ABCDEFGH" } });
    fireEvent.click(screen.getByRole("button", { name: "เริ่มประเมิน" }));
    await screen.findByRole("heading", { name: "วันนี้ พนักงาน ก เป็นผู้ให้บริการคุณใช่ไหม" });
    fireEvent.click(screen.getByRole("radio", { name: "ใช่" }));
    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
    await screen.findByRole("heading", { name: "โดยรวม คุณพอใจกับการให้บริการครั้งนี้เพียงใด" });
}

function answerBehavior(question: RegExp, answer: "ใช่" | "ไม่ใช่" | "ไม่แน่ใจ") {
    fireEvent.click(within(screen.getByRole("group", { name: question })).getByRole("radio", { name: answer }));
}

describe("FeedbackForm station choices", () => {
    beforeEach(() => {
        sessionStorage.clear();
        history.replaceState(null, "", "/f");
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                const url = String(input);
                if (url.endsWith("/api/public/customer-feedback/resolve")) {
                    return new Response(JSON.stringify(stationResolveResult), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({}), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            })
        );
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("clears the singleton service-area choice when another option is selected", async () => {
        render(<FeedbackForm />);

        fireEvent.change(screen.getByLabelText("กรอกรหัส 8 ตัวใต้ QR"), { target: { value: "ABCDEFGH" } });
        fireEvent.click(screen.getByRole("button", { name: "เริ่มประเมิน" }));

        await screen.findByRole("heading", { name: "วันนี้คุณใช้บริการที่สถานีนี้ใช่ไหม" });
        fireEvent.click(screen.getByRole("radio", { name: "ใช่" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

        await screen.findByRole("heading", { name: "วันนี้คุณใช้บริการส่วนใด" });
        const unsure = screen.getByRole("checkbox", { name: "ไม่แน่ใจ" });
        fireEvent.click(unsure);
        fireEvent.click(screen.getByRole("checkbox", { name: "อื่น ๆ" }));

        await waitFor(() => expect((unsure as HTMLInputElement).checked).toBe(false));
    });

    it("reuses the resolve idempotency key when the same manual code is retried", async () => {
        const keys: string[] = [];
        let attempt = 0;
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                const url = String(input);
                if (url.endsWith("/api/public/customer-feedback/resolve")) {
                    keys.push(new Headers(init?.headers).get("Resolve-Idempotency-Key") ?? "");
                    attempt += 1;
                    if (attempt === 1) throw new Error("network lost");
                    return new Response(JSON.stringify(stationResolveResult), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({}), { status: 200 });
            })
        );

        render(<FeedbackForm />);
        fireEvent.change(screen.getByLabelText("กรอกรหัส 8 ตัวใต้ QR"), { target: { value: "ABCDEFGH" } });
        fireEvent.click(screen.getByRole("button", { name: "เริ่มประเมิน" }));
        await screen.findByRole("alert");
        fireEvent.click(screen.getByRole("button", { name: "เริ่มประเมิน" }));

        await screen.findByRole("heading", { name: "วันนี้คุณใช้บริการที่สถานีนี้ใช่ไหม" });
        expect(keys).toHaveLength(2);
        expect(keys[0]).toBe(keys[1]);
    });

    it("keeps a QR fragment token in memory so a network failure can be retried", async () => {
        history.replaceState(null, "", "/f#t=qr-token-value");
        const bodies: string[] = [];
        const keys: string[] = [];
        let attempt = 0;
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                if (String(input).endsWith("/api/public/customer-feedback/resolve")) {
                    bodies.push(String(init?.body));
                    keys.push(new Headers(init?.headers).get("Resolve-Idempotency-Key") ?? "");
                    attempt += 1;
                    if (attempt === 1) throw new Error("network lost");
                    return new Response(JSON.stringify(stationResolveResult), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({}), { status: 200 });
            })
        );

        render(<FeedbackForm />);
        await screen.findByRole("alert");
        expect(window.location.hash).toBe("");
        fireEvent.click(screen.getByRole("button", { name: "ลองส่งอีกครั้ง" }));

        await screen.findByRole("heading", { name: "วันนี้คุณใช้บริการที่สถานีนี้ใช่ไหม" });
        expect(bodies).toEqual([
            JSON.stringify({ token: "qr-token-value" }),
            JSON.stringify({ token: "qr-token-value" }),
        ]);
        expect(keys[0]).toBe(keys[1]);
    });

    it("asks for incident station and time and keeps incident details separate from the survey draft", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                const url = String(input);
                if (url.endsWith("/api/public/customer-feedback/resolve")) {
                    return new Response(JSON.stringify(stationResolveResult), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                if (url.endsWith("/api/public/customer-feedback/incidents/start")) {
                    return new Response(JSON.stringify({ visitToken: "incident-token" }), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
            })
        );

        render(<FeedbackForm />);
        await reachStationReasons();
        fireEvent.click(screen.getByRole("button", { name: "เพิ่มรายละเอียด" }));
        fireEvent.change(screen.getByLabelText("ถ้าสถานีปรับหรือเพิ่มได้ 1 อย่าง คุณอยากให้ทำอะไร"), {
            target: { value: "ข้อความของแบบประเมินปกติ" },
        });
        fireEvent.click(screen.getByRole("button", { name: "แจ้งเหตุเร่งด่วนหรือพฤติกรรมไม่เหมาะสม" }));
        fireEvent.click(screen.getByRole("button", { name: "แจ้งเหตุต่อ" }));

        await screen.findByRole("heading", { name: "เรื่องนี้เกี่ยวกับอะไร" });
        fireEvent.click(screen.getByRole("radio", { name: "ความปลอดภัยหรืออุบัติเหตุ" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
        fireEvent.click(await screen.findByRole("radio", { name: "ไม่มี" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

        await screen.findByRole("heading", { name: "เหตุเกิดที่ไหนและเมื่อไร" });
        expect((screen.getByLabelText("เวลาที่เกิดเหตุ") as HTMLInputElement).value).not.toBe("");
        expect(screen.getAllByText("สถานีทดสอบ").length).toBeGreaterThan(0);
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

        const incidentComment = await screen.findByLabelText("เกิดอะไรขึ้น");
        expect((incidentComment as HTMLTextAreaElement).value).toBe("");
    });

    it("starts a report from the thank-you screen as a child of the submitted survey", async () => {
        const incidentStartAuthorizations: string[] = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                const url = String(input);
                if (url.endsWith("/api/public/customer-feedback/resolve")) {
                    return new Response(JSON.stringify(stationResolveResult), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                if (url.endsWith("/api/public/customer-feedback/submissions")) {
                    return new Response(JSON.stringify({ refCode: "STD-1" }), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                if (url.endsWith("/api/public/customer-feedback/incidents/start")) {
                    incidentStartAuthorizations.push(new Headers(init?.headers).get("Authorization") ?? "");
                    return new Response(JSON.stringify({ visitToken: "incident-token" }), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
            })
        );

        render(<FeedbackForm />);
        await reachStationReasons();
        fireEvent.click(screen.getByRole("button", { name: "ส่งความคิดเห็น" }));

        await screen.findByRole("heading", { name: "รับความคิดเห็นเกี่ยวกับสถานีแล้ว ขอบคุณที่ช่วยให้เราปรับบริการ" });
        expect(sessionStorage.getItem("cf_visit_token")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "แจ้งเหตุเร่งด่วนหรือพฤติกรรมไม่เหมาะสม" }));
        fireEvent.click(screen.getByRole("button", { name: "แจ้งเหตุต่อ" }));

        await screen.findByRole("heading", { name: "เรื่องนี้เกี่ยวกับอะไร" });
        expect(incidentStartAuthorizations[0]).toBe("Bearer signed-visit-token");
    });

    it("clears the standard visit token after the customer rejects the target", async () => {
        render(<FeedbackForm />);
        fireEvent.change(screen.getByLabelText("กรอกรหัส 8 ตัวใต้ QR"), { target: { value: "ABCDEFGH" } });
        fireEvent.click(screen.getByRole("button", { name: "เริ่มประเมิน" }));

        await screen.findByRole("heading", { name: "วันนี้คุณใช้บริการที่สถานีนี้ใช่ไหม" });
        expect(sessionStorage.getItem("cf_visit_token")).toBe("signed-visit-token");
        fireEvent.click(screen.getByRole("radio", { name: "ไม่ใช่" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

        await screen.findByRole("heading", { name: "ขอบคุณ" });
        expect(sessionStorage.getItem("cf_visit_token")).toBeNull();
    });

    it("restores only a safe survey draft after reload", async () => {
        sessionStorage.setItem("cf_feedback_draft_v1", JSON.stringify({
            version: 1,
            language: "th",
            screen: "rating",
            result: stationResolveResult,
            selectedStation: null,
            confirmation: "YES",
            serviceAreas: ["restroom"],
            rating: 3,
            reasonKeys: [],
        }));

        render(<FeedbackForm />);

        await screen.findByRole("heading", { name: "โดยรวม คุณพอใจกับการใช้บริการที่สถานีนี้วันนี้เพียงใด" });
        expect(sessionStorage.getItem("cf_visit_token")).toBe("signed-visit-token");
        expect((screen.getByRole("radio", { name: "3. ปานกลาง" }) as HTMLInputElement).checked).toBe(true);
    });

    it("requires all seven employee-v2 behaviors, keeps back navigation, and submits the exact answers", async () => {
        const submittedBodies: Array<Record<string, unknown>> = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                const url = String(input);
                if (url.endsWith("/api/public/customer-feedback/resolve")) {
                    return new Response(JSON.stringify(employeeV2ResolveResult), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                if (url.endsWith("/api/public/customer-feedback/submissions")) {
                    submittedBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
                    return new Response(JSON.stringify({ refCode: "EMP-2" }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({}), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            })
        );

        render(<FeedbackForm />);
        await reachEmployeeRating();
        fireEvent.click(screen.getByRole("radio", { name: "4. พอใจ" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

        await screen.findByRole("heading", { name: "พนักงานทำสิ่งต่อไปนี้หรือไม่" });
        expect(screen.getAllByRole("group")).toHaveLength(7);
        expect(screen.getAllByRole("radio")).toHaveLength(21);

        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
        expect((await screen.findByRole("alert")).textContent).toContain("กรุณาตอบคำถามนี้ก่อนดำเนินการต่อ");
        expect(screen.getByRole("heading", { name: "พนักงานทำสิ่งต่อไปนี้หรือไม่" })).toBeTruthy();

        answerBehavior(/แต่งกายสะอาดและเรียบร้อย/, "ใช่");
        answerBehavior(/โบกรถและแนะนำจุดจอด/, "ไม่ใช่");
        answerBehavior(/กล่าวทักทาย/, "ไม่แน่ใจ");
        answerBehavior(/ทวนรายการ/, "ใช่");
        answerBehavior(/เสนอผลิตภัณฑ์หรือบริการพิเศษ/, "ไม่ใช่");
        answerBehavior(/กล่าวขอบคุณ/, "ใช่");
        answerBehavior(/วางป้ายบริการหน้ารถ/, "ไม่แน่ใจ");

        await waitFor(() => {
            const draft = JSON.parse(sessionStorage.getItem("cf_feedback_draft_v1") ?? "{}") as Record<string, unknown>;
            expect(draft.behaviorAnswers).toEqual({
                appearance_neat: "YES",
                vehicle_guidance: "NO",
                greeted_customer: "UNSURE",
                order_repeated: "YES",
                special_service_offered: "NO",
                thanked_customer: "YES",
                front_sign_placed: "UNSURE",
            });
        });

        fireEvent.click(screen.getByRole("button", { name: "กลับ" }));
        await screen.findByRole("heading", { name: "โดยรวม คุณพอใจกับการให้บริการครั้งนี้เพียงใด" });
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
        await screen.findByRole("heading", { name: "พนักงานทำสิ่งต่อไปนี้หรือไม่" });
        expect((within(screen.getByRole("group", { name: /แต่งกายสะอาดและเรียบร้อย/ })).getByRole("radio", { name: "ใช่" }) as HTMLInputElement).checked).toBe(true);

        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
        await screen.findByRole("heading", { name: "เรื่องใดทำให้คุณพอใจ" });
        fireEvent.click(screen.getByRole("button", { name: "กลับ" }));
        await screen.findByRole("heading", { name: "พนักงานทำสิ่งต่อไปนี้หรือไม่" });
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
        fireEvent.click(await screen.findByRole("button", { name: "ส่งความคิดเห็น" }));

        await screen.findByRole("heading", { name: "รับความคิดเห็นแล้ว ขอบคุณที่ช่วยให้เราปรับบริการ" });
        expect(submittedBodies).toHaveLength(1);
        expect(submittedBodies[0].behaviorAnswers).toEqual({
            appearance_neat: "YES",
            vehicle_guidance: "NO",
            greeted_customer: "UNSURE",
            order_repeated: "YES",
            special_service_offered: "NO",
            thanked_customer: "YES",
            front_sign_placed: "UNSURE",
        });
    });

    it("shows all nine employee-v3 weighted questions and submits every answer", async () => {
        const submittedBodies: Array<Record<string, unknown>> = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                const url = String(input);
                if (url.endsWith("/api/public/customer-feedback/resolve")) {
                    return new Response(JSON.stringify(employeeV3ResolveResult), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                if (url.endsWith("/api/public/customer-feedback/submissions")) {
                    submittedBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
                    return new Response(JSON.stringify({ refCode: "EMP-3" }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({}), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            })
        );

        render(<FeedbackForm />);
        await reachEmployeeRating();
        fireEvent.click(screen.getByRole("radio", { name: "5. พอใจมาก" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

        await screen.findByRole("heading", { name: "พนักงานทำสิ่งต่อไปนี้หรือไม่" });
        const groups = screen.getAllByRole("group");
        expect(groups).toHaveLength(9);
        expect(screen.getByRole("group", { name: /15 คะแนน/ })).toBeTruthy();
        expect(screen.getAllByText(/คะแนน$/).length).toBeGreaterThanOrEqual(9);
        for (const group of groups) {
            fireEvent.click(within(group).getByRole("radio", { name: "ใช่" }));
        }

        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
        await screen.findByRole("heading", { name: "เรื่องใดทำให้คุณพอใจ" });
        fireEvent.click(screen.getByRole("button", { name: "ส่งความคิดเห็น" }));

        await screen.findByRole("heading", { name: "รับความคิดเห็นแล้ว ขอบคุณที่ช่วยให้เราปรับบริการ" });
        expect(submittedBodies).toHaveLength(1);
        const answers = submittedBodies[0].behaviorAnswers as Record<string, string>;
        expect(Object.keys(answers)).toHaveLength(9);
        expect(Object.values(answers)).toEqual(Array(9).fill("YES"));
    });

    it("restores safe employee-v2 behavior answers and translates the screen to English", async () => {
        sessionStorage.setItem("cf_feedback_draft_v1", JSON.stringify({
            version: 1,
            language: "th",
            screen: "service-behaviors",
            result: employeeV2ResolveResult,
            selectedStation: null,
            confirmation: "YES",
            serviceAreas: [],
            rating: 5,
            behaviorAnswers: { appearance_neat: "YES" },
            reasonKeys: [],
        }));

        render(<FeedbackForm />);

        await screen.findByRole("heading", { name: "พนักงานทำสิ่งต่อไปนี้หรือไม่" });
        expect(screen.getByText("ตอบแล้ว 1/7 ข้อ")).toBeTruthy();
        expect((within(screen.getByRole("group", { name: /แต่งกายสะอาดและเรียบร้อย/ })).getByRole("radio", { name: "ใช่" }) as HTMLInputElement).checked).toBe(true);

        fireEvent.click(screen.getByRole("button", { name: "Change language" }));
        await screen.findByRole("heading", { name: "Did the employee do the following?" });
        expect(screen.getByRole("group", { name: /clean and neatly dressed/ })).toBeTruthy();
        expect(within(screen.getByRole("group", { name: /guided your vehicle/ })).getByRole("radio", { name: "Not sure" })).toBeTruthy();
    });

    it("keeps employee-v1 on the original rating-to-reasons flow", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                if (String(input).endsWith("/api/public/customer-feedback/resolve")) {
                    return new Response(JSON.stringify({ ...employeeV2ResolveResult, surveyVersion: "employee-v1" }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({}), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            })
        );

        render(<FeedbackForm />);
        await reachEmployeeRating();
        fireEvent.click(screen.getByRole("radio", { name: "4. พอใจ" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

        await screen.findByRole("heading", { name: "เรื่องใดทำให้คุณพอใจ" });
        expect(screen.queryByRole("heading", { name: "พนักงานทำสิ่งต่อไปนี้หรือไม่" })).toBeNull();
    });

    it("never writes comments or contact details into the safe draft", async () => {
        render(<FeedbackForm />);
        await reachStationReasons();
        fireEvent.click(screen.getByRole("button", { name: "เพิ่มรายละเอียด" }));
        fireEvent.change(screen.getByLabelText("ถ้าสถานีปรับหรือเพิ่มได้ 1 อย่าง คุณอยากให้ทำอะไร"), {
            target: { value: "private-comment-value" },
        });
        fireEvent.click(screen.getByRole("checkbox", { name: "ขอให้ติดต่อกลับ" }));
        fireEvent.change(screen.getByPlaceholderText("08x-xxx-xxxx"), {
            target: { value: "0899999999" },
        });

        await waitFor(() => expect(sessionStorage.getItem("cf_feedback_draft_v1")).not.toBeNull());
        const rawDraft = sessionStorage.getItem("cf_feedback_draft_v1") ?? "";
        expect(rawDraft).not.toContain("private-comment-value");
        expect(rawDraft).not.toContain("0899999999");
        expect(Object.keys(JSON.parse(rawDraft))).not.toEqual(expect.arrayContaining(["comment", "contact", "contactValue"]));
    });

    it("clears an old draft and token before resolving a new QR fragment", async () => {
        sessionStorage.setItem("cf_visit_token", "old-visit-token");
        sessionStorage.setItem("cf_feedback_draft_v1", "old-draft");
        history.replaceState(null, "", "/f#t=new-qr-token");
        const storageSeenByResolve: Array<[string | null, string | null]> = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                if (String(input).endsWith("/api/public/customer-feedback/resolve")) {
                    storageSeenByResolve.push([
                        sessionStorage.getItem("cf_visit_token"),
                        sessionStorage.getItem("cf_feedback_draft_v1"),
                    ]);
                    return new Response(JSON.stringify(stationResolveResult), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
            })
        );

        render(<FeedbackForm />);

        await screen.findByRole("heading", { name: "วันนี้คุณใช้บริการที่สถานีนี้ใช่ไหม" });
        expect(storageSeenByResolve).toEqual([[null, null]]);
        expect(window.location.hash).toBe("");
    });

    it("shows test mode and hides all real-case promises", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                const url = String(input);
                if (url.endsWith("/api/public/customer-feedback/resolve")) {
                    return new Response(JSON.stringify({ ...stationResolveResult, isTest: true }), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                if (url.endsWith("/api/public/customer-feedback/submissions")) {
                    return new Response(JSON.stringify({ refCode: "TEST-1", severity: "HIGH" }), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
            })
        );

        render(<FeedbackForm />);
        fireEvent.change(screen.getByLabelText("กรอกรหัส 8 ตัวใต้ QR"), { target: { value: "ABCDEFGH" } });
        fireEvent.click(screen.getByRole("button", { name: "เริ่มประเมิน" }));
        await screen.findByRole("heading", { name: "วันนี้คุณใช้บริการที่สถานีนี้ใช่ไหม" });
        fireEvent.click(screen.getByRole("radio", { name: "ใช่" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
        await screen.findByRole("heading", { name: "วันนี้คุณใช้บริการส่วนใด" });
        fireEvent.click(screen.getByRole("checkbox", { name: "อื่น ๆ" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
        await screen.findByRole("heading", { name: "โดยรวม คุณพอใจกับการใช้บริการที่สถานีนี้วันนี้เพียงใด" });
        fireEvent.click(screen.getByRole("radio", { name: "1. ไม่พอใจมาก" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
        await screen.findByRole("heading", { name: "เรื่องใดควรปรับก่อน" });
        expect(screen.getByText("โหมดทดสอบ — คำตอบนี้ไม่ใช้คำนวณคะแนนและไม่สร้างเคสจริง")).toBeTruthy();
        expect(screen.queryByText("คำตอบนี้จะสร้างเรื่องให้ทีมตรวจสอบ")).toBeNull();
        fireEvent.click(screen.getByRole("checkbox", { name: "ความสะอาด" }));
        fireEvent.click(screen.getByRole("button", { name: "ส่งความคิดเห็น" }));

        await screen.findByRole("heading", { name: "รับความคิดเห็นเกี่ยวกับสถานีแล้ว ขอบคุณที่ช่วยให้เราปรับบริการ" });
        expect(screen.queryByText("ทีมงานจะรับทราบตามระยะเวลาที่กำหนด")).toBeNull();
    });

    it("debounces station search and displays a 429 message", async () => {
        const employeeResolveResult = {
            ...stationResolveResult,
            surveyVersion: "employee-v1" as const,
            targetType: "EMPLOYEE" as const,
            target: { label: "พนักงาน ก", position: "พนักงานบริการ" },
            station: null,
            stationNeedsSelection: true,
            reasonOptionOrder: ["employee_courtesy"],
        };
        let stationSearchCount = 0;
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                const url = String(input);
                if (url.endsWith("/api/public/customer-feedback/resolve")) {
                    return new Response(JSON.stringify(employeeResolveResult), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                if (url.includes("/api/public/customer-feedback/stations?")) {
                    stationSearchCount += 1;
                    return new Response(JSON.stringify({ code: "SEARCH_RATE_LIMITED", error: "ค้นหาบ่อยเกินไป" }), {
                        status: 429,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
            })
        );

        render(<FeedbackForm />);
        fireEvent.change(screen.getByLabelText("กรอกรหัส 8 ตัวใต้ QR"), { target: { value: "ABCDEFGH" } });
        fireEvent.click(screen.getByRole("button", { name: "เริ่มประเมิน" }));
        await screen.findByRole("heading", { name: "วันนี้ พนักงาน ก เป็นผู้ให้บริการคุณใช่ไหม" });
        fireEvent.click(screen.getByRole("radio", { name: "ใช่" }));
        fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
        await screen.findByRole("heading", { name: "เลือกสถานีที่ใช้บริการ" });

        const searchInput = screen.getByLabelText("พิมพ์ชื่อสถานีอย่างน้อย 2 ตัวอักษร");
        fireEvent.change(searchInput, { target: { value: "สถ" } });
        fireEvent.change(searchInput, { target: { value: "สถาน" } });
        fireEvent.change(searchInput, { target: { value: "สถานี" } });

        await screen.findByText("ค้นหาบ่อยเกินไป", {}, { timeout: 1500 });
        expect(stationSearchCount).toBe(1);
    });
});

describe("stableRequestKey", () => {
    it("keeps a key for an unchanged payload and creates a new key after the payload changes", () => {
        const create = vi.fn()
            .mockReturnValueOnce("key-1")
            .mockReturnValueOnce("key-2");

        const first = stableRequestKey(null, '{"rating":1}', create);
        const retry = stableRequestKey(first, '{"rating":1}', create);
        const changed = stableRequestKey(retry, '{"rating":2}', create);

        expect(retry.key).toBe("key-1");
        expect(changed.key).toBe("key-2");
        expect(create).toHaveBeenCalledTimes(2);
    });
});

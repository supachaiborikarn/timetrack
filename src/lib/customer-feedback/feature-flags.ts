/**
 * Feature flags ของระบบเสียงลูกค้า — fail closed
 *
 * CUSTOMER_FEEDBACK_ENABLED  คุมหน้า admin, dashboard และ API ภายใน
 * CUSTOMER_FEEDBACK_PUBLIC_ENABLED คุมหน้า /f และ public API
 */

function enabled(flag: string): boolean {
    return process.env[flag] === "true";
}

export function isCustomerFeedbackEnabled(): boolean {
    return enabled("CUSTOMER_FEEDBACK_ENABLED");
}

export function isCustomerFeedbackPublicEnabled(): boolean {
    return enabled("CUSTOMER_FEEDBACK_PUBLIC_ENABLED");
}

/**
 * ตรวจว่า secret ที่ public API ต้องใช้ครบถ้วน — fail closed
 * production ห้ามมีค่า fallback
 */
export function assertPublicSecrets(): void {
    const missing: string[] = [];
    if (!process.env.AUTH_SECRET) missing.push("AUTH_SECRET");
    if (!process.env.CUSTOMER_FEEDBACK_MANUAL_CODE_HMAC_KEY) missing.push("CUSTOMER_FEEDBACK_MANUAL_CODE_HMAC_KEY");
    if (!process.env.CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY) missing.push("CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY");
    if (!process.env.FIELD_ENCRYPTION_KEY) missing.push("FIELD_ENCRYPTION_KEY");
    if (!process.env.APP_BASE_URL) missing.push("APP_BASE_URL");
    if (missing.length > 0) {
        throw new Error(`Customer feedback secrets missing: ${missing.join(", ")}`);
    }
}

/** Thai national ID: 13 digits, last digit is a mod-11 checksum of the first 12. */
export function isValidThaiCitizenId(rawValue: string): boolean {
    const digits = rawValue.replace(/\D/g, "");
    if (digits.length !== 13) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += Number(digits[i]) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === Number(digits[12]);
}

export function formatThaiCitizenId(rawValue: string): string {
    const digits = rawValue.replace(/\D/g, "").slice(0, 13);
    const parts = [digits.slice(0, 1), digits.slice(1, 5), digits.slice(5, 10), digits.slice(10, 12), digits.slice(12, 13)];
    return parts.filter(Boolean).join("-");
}

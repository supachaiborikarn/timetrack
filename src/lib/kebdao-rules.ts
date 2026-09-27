export function parseKebdaoCode(value: unknown): string {
    if (typeof value !== "string" || !/^\d{1,32}$/.test(value.trim())) throw new Error("กรอกรหัสเป็นตัวเลขตามบัตร ไม่เกิน 32 หลัก");
    return value.trim();
}
export function kebdaoBranchAllowed(role: string, viewerStation: string | null, stationId: string): boolean {
    return role === "ADMIN" || role === "HR" || Boolean(viewerStation && viewerStation === stationId);
}
export function kebdaoReviewAllowed(actor: { id: string; role: string; stationId: string | null }, row: { userId: string; stationId: string; status: string }): boolean {
    return row.status === "PENDING" && actor.id !== row.userId && kebdaoBranchAllowed(actor.role, actor.stationId, row.stationId);
}

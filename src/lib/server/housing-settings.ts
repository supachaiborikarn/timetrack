import { prisma } from "@/lib/prisma";
import { DEFAULT_HOUSING_ALLOWANCE, HOUSING_ALLOWANCE_SETTING_KEY } from "@/lib/housing";

/** Company-wide monthly housing allowance, in baht. Falls back to 0 when unset —
 *  paying nothing by default is the safe direction for a value nobody has entered. */
export async function getHousingAllowanceDefault(): Promise<number> {
    const record = await prisma.systemConfig.findUnique({ where: { key: HOUSING_ALLOWANCE_SETTING_KEY } });
    if (!record) return DEFAULT_HOUSING_ALLOWANCE;

    const value = Number(record.value);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_HOUSING_ALLOWANCE;
}

export async function setHousingAllowanceDefault(amount: number): Promise<void> {
    const value = String(Math.max(0, Math.round(amount * 100) / 100));
    await prisma.systemConfig.upsert({
        where: { key: HOUSING_ALLOWANCE_SETTING_KEY },
        update: { value },
        create: { key: HOUSING_ALLOWANCE_SETTING_KEY, value },
    });
}

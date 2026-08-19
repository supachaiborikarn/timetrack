/**
 * One-off backfill for employees hired before the StoredAsset table existed.
 *
 * The old hire route wrote the applicant's raw Cloudinary public_id into
 * `User.photoUrl` (e.g. "hr/applications/orphan/clx…"). The UI renders photoUrl
 * straight into <AvatarImage src>, so the browser requested it as a relative path
 * and every one of those avatars silently fell back to initials.
 *
 * This copies each such photo into the employee's own StoredAsset row and points
 * photoUrl at /api/employees/<id>/photo instead. Safe to re-run: employees that
 * already have an EMPLOYEE_PHOTO asset are skipped.
 *
 * Run with: npx tsx prisma/backfill-employee-photos.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { getStorage } from "../src/lib/storage";
import { createAsset } from "../src/lib/assets";
import { employeePhotoUrl } from "../src/lib/asset-kinds";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

/** A photoUrl the browser can actually load: absolute, or one of our own routes. */
function isServableUrl(photoUrl: string): boolean {
    return photoUrl.startsWith("http://") || photoUrl.startsWith("https://") || photoUrl.startsWith("/");
}

async function main() {
    const users = await prisma.user.findMany({
        where: { photoUrl: { not: null } },
        select: { id: true, name: true, employeeId: true, photoUrl: true },
    });

    const broken = users.filter((u) => u.photoUrl && !isServableUrl(u.photoUrl));
    console.log(`พบพนักงาน ${users.length} คนที่มี photoUrl, ในจำนวนนี้ ${broken.length} คนเป็น Cloudinary key ที่แสดงผลไม่ได้\n`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of broken) {
        const existing = await prisma.storedAsset.count({ where: { ownerUserId: user.id, kind: "EMPLOYEE_PHOTO" } });
        if (existing > 0) {
            console.log(`⏭️  ${user.employeeId} ${user.name} — มีรูปในระบบใหม่แล้ว`);
            skipped++;
            continue;
        }

        const source = await prisma.jobApplicationFile.findFirst({
            where: { storageKey: user.photoUrl, kind: "PROFILE_PHOTO" },
        });
        if (!source) {
            console.log(`⚠️  ${user.employeeId} ${user.name} — หาไฟล์ต้นทางไม่เจอ (${user.photoUrl})`);
            failed++;
            continue;
        }

        if (dryRun) {
            console.log(`🔍 ${user.employeeId} ${user.name} — จะคัดลอกรูปจาก ${source.storageKey}`);
            migrated++;
            continue;
        }

        try {
            const body = await getStorage().get({
                driver: source.storageDriver === "db" ? "db" : "cloudinary",
                key: source.storageKey ?? source.id,
                resourceType: "image",
                mimeType: source.mimeType,
                size: source.sizeBytes,
            });

            await createAsset({
                kind: "EMPLOYEE_PHOTO",
                body,
                mimeType: source.mimeType,
                checksum: source.checksum ?? createHash("sha256").update(body).digest("hex"),
                width: source.width,
                height: source.height,
                note: "backfill จากใบสมัครงาน",
                ownerUserId: user.id,
                uploadedById: user.id,
            });

            await prisma.user.update({ where: { id: user.id }, data: { photoUrl: employeePhotoUrl(user.id) } });
            console.log(`✅ ${user.employeeId} ${user.name}`);
            migrated++;
        } catch (error) {
            console.error(`❌ ${user.employeeId} ${user.name} —`, error);
            failed++;
        }
    }

    console.log(`\n${dryRun ? "[dry run] " : ""}ย้ายแล้ว ${migrated} · ข้าม ${skipped} · ล้มเหลว ${failed}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

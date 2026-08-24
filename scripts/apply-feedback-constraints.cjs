#!/usr/bin/env node
/**
 * ลง CHECK constraint + partial unique index ของระบบเสียงลูกค้า
 *
 * `prisma db push` สร้างของพวกนี้ให้ไม่ได้ (Prisma ยังไม่รองรับ) จึงต้องรันแยก
 * สคริปต์นี้รันทีละคำสั่ง ข้ามอันที่มีอยู่แล้ว จึงรันซ้ำได้
 *
 * ที่มา: migration หลักและ migration ปิดการแข่งขันของ idempotency
 */
require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const MARKER = "-- Customer feedback: check constraints";
const MIGRATIONS = [
    {
        name: "base constraints",
        file: path.join(__dirname, "../prisma/migrations/20260823000000_add_customer_feedback/migration.sql"),
        marker: MARKER,
        transaction: false,
    },
    {
        name: "idempotency constraints",
        file: path.join(__dirname, "../prisma/migrations/20260824000000_harden_customer_feedback_idempotency/migration.sql"),
        marker: null,
        transaction: true,
    },
];

function statementsFromSql(sql, marker) {
    const idx = marker ? sql.indexOf(marker) : 0;
    if (idx === -1) throw new Error(`ไม่พบ marker "${marker}" ในไฟล์ migration`);
    return sql
        .slice(idx)
        .split(/;\s*$/m)
        .map((s) =>
            s
                .split("\n")
                .filter((line) => !line.trim().startsWith("--"))
                .join("\n")
                .trim()
        )
        .filter((s) => s.length > 0);
}

function label(stmt) {
    const m =
        stmt.match(/ADD CONSTRAINT "([^"]+)"/) ??
        stmt.match(/CREATE (?:UNIQUE )?INDEX(?: IF NOT EXISTS)? "([^"]+)"/);
    return m ? m[1] : stmt.slice(0, 60).replace(/\s+/g, " ");
}

(async () => {
    const groups = MIGRATIONS.map((migration) => ({
        ...migration,
        statements: statementsFromSql(fs.readFileSync(migration.file, "utf8"), migration.marker),
    }));

    if (process.argv.includes("--dry-run")) {
        for (const group of groups) {
            console.log(`${group.name}: ${group.statements.length} คำสั่ง`);
            for (const stmt of group.statements) console.log(`  - ${label(stmt)}`);
        }
        return;
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    let applied = 0;
    let skipped = 0;
    let failed = 0;
    let total = 0;

    for (const group of groups) {
        total += group.statements.length;
        if (group.transaction) {
            try {
                await client.query("BEGIN");
                // กัน Visit ใหม่แทรกระหว่างล้าง nonce ซ้ำกับสร้าง unique index
                await client.query('LOCK TABLE "CustomerFeedbackVisit" IN SHARE ROW EXCLUSIVE MODE');
                for (const stmt of group.statements) await client.query(stmt);
                await client.query("COMMIT");
                applied += group.statements.length;
                console.log(`  ✅ ลงแล้ว   ${group.name} (${group.statements.length} คำสั่ง)`);
            } catch (e) {
                await client.query("ROLLBACK").catch(() => undefined);
                console.log(`  ❌ ไม่สำเร็จ ${group.name}`);
                console.log(`     ${e.code ?? ""} ${e.message}`);
                failed++;
            }
            continue;
        }

        for (const stmt of group.statements) {
            const name = label(stmt);
            try {
                await client.query(stmt);
                console.log(`  ✅ ลงแล้ว   ${name}`);
                applied++;
            } catch (e) {
                // 42P07 = relation exists, 42710 = duplicate object
                if (e.code === "42P07" || e.code === "42710") {
                    console.log(`  ⏭️  มีอยู่แล้ว ${name}`);
                    skipped++;
                } else {
                    console.log(`  ❌ ไม่สำเร็จ ${name}`);
                    console.log(`     ${e.code ?? ""} ${e.message}`);
                    failed++;
                }
            }
        }
    }

    console.log(`\nรวม ${total} คำสั่ง — ลงใหม่ ${applied} · มีอยู่แล้ว ${skipped} · ไม่สำเร็จ ${failed}`);
    await client.end();
    process.exit(failed > 0 ? 1 : 0);
})();

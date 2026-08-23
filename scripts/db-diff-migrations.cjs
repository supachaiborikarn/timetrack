#!/usr/bin/env node
/**
 * เทียบ prisma/migrations ทั้งโฟลเดอร์กับ schema.prisma ปัจจุบัน
 *
 * แบบนี้ Prisma "บังคับ" ให้มี shadow database เพราะมันต้อง replay migration ทีละไฟล์
 * สคริปต์นี้จึงบังคับใช้ SHADOW_DATABASE_URL และ ตรวจซ้ำ ว่าไม่ใช่ host เดียวกับ DATABASE_URL
 *
 * ⚠ schema ของ shadow branch จะถูก DROP ทิ้งทุกครั้งที่รัน — ตั้งใจให้เป็นแบบนั้น
 *   branch "shadow" เป็น schema-only ไม่มีข้อมูลจริงอยู่ในนั้น
 *
 * ถ้าแค่อยากได้ SQL ของสิ่งที่เพิ่งแก้ ใช้ `npm run db:diff` แทน — ไม่ต่อฐานข้อมูลเลย
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const fs = require('fs');

const shadow = process.env.SHADOW_DATABASE_URL;
const prod = process.env.DATABASE_URL;
const outFile = 'prisma/migrations-preview.sql';

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/-pooler\./, '.');
  } catch {
    return null;
  }
};

if (!shadow) {
  console.error('ไม่มี SHADOW_DATABASE_URL ใน .env');
  console.error('ใส่ connection string ของ Neon branch "shadow" ก่อน หรือใช้ `npm run db:diff` แทน');
  process.exit(1);
}

if (hostOf(shadow) === hostOf(prod)) {
  console.error('\n\x1b[41m\x1b[97m  หยุด: SHADOW_DATABASE_URL ชี้ไป host เดียวกับ DATABASE_URL  \x1b[0m\n');
  console.error('  Prisma จะ DROP schema ของฐานข้อมูลนั้นทิ้ง = ข้อมูล production หายทั้งหมด');
  console.error('  นี่คือสิ่งที่เกิดขึ้นเมื่อ 23 ส.ค. 2026 — ดู docs/incident-2026-08-23-production-wipe.md\n');
  process.exit(1);
}

console.log(`\x1b[33m→ shadow database: ${hostOf(shadow)} (schema ของมันจะถูกล้างทิ้ง)\x1b[0m\n`);

const run = spawnSync(
  'npx',
  [
    'prisma', 'migrate', 'diff',
    '--from-migrations', './prisma/migrations',
    '--to-schema-datamodel', './prisma/schema.prisma',
    '--shadow-database-url', shadow,
    '--script',
  ],
  { encoding: 'utf8' },
);

if (run.status !== 0) {
  console.error(run.stderr || 'prisma migrate diff ล้มเหลว');
  process.exit(run.status ?? 1);
}

fs.writeFileSync(outFile, run.stdout.trim() + '\n');
console.log(`เขียนผลลง ${outFile} แล้ว`);

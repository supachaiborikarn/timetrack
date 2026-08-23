#!/usr/bin/env node
/**
 * สร้าง SQL ของสิ่งที่เปลี่ยนใน schema.prisma โดย "ไม่ต่อฐานข้อมูลเลย"
 *
 * เทียบ schema.prisma ของ git commit ที่ระบุ (ค่าเริ่มต้น HEAD) กับไฟล์ปัจจุบัน
 * ใช้ --from-schema-datamodel / --to-schema-datamodel ซึ่งอ่านแค่ไฟล์ ไม่ต้องมี shadow database
 *
 *   npm run db:diff              # เทียบกับ HEAD
 *   npm run db:diff -- <commit>  # เทียบกับ commit อื่น
 *
 * ต่างจาก `--from-migrations` ที่ Prisma บังคับให้มี shadow database แล้วจะ DROP schema
 * ของฐานข้อมูลนั้นทิ้ง — ดู docs/incident-2026-08-23-production-wipe.md
 */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ref = process.argv[2] || 'HEAD';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'db-diff-'));
const oldSchema = path.join(tmp, 'old.prisma');
const outFile = 'prisma/migrations-preview.sql';

try {
  fs.writeFileSync(oldSchema, execFileSync('git', ['show', `${ref}:prisma/schema.prisma`]));
} catch {
  console.error(`อ่าน prisma/schema.prisma ที่ ${ref} ไม่ได้ — commit นี้มีจริงไหม?`);
  process.exit(1);
}

const run = spawnSync(
  'npx',
  [
    'prisma', 'migrate', 'diff',
    '--from-schema-datamodel', oldSchema,
    '--to-schema-datamodel', 'prisma/schema.prisma',
    '--script',
  ],
  { encoding: 'utf8' },
);

fs.rmSync(tmp, { recursive: true, force: true });

if (run.status !== 0) {
  console.error(run.stderr || 'prisma migrate diff ล้มเหลว');
  process.exit(run.status ?? 1);
}

const sql = run.stdout.trim();
const empty = /^--\s*This is an empty migration\.?$/im.test(sql) || sql === '';

fs.writeFileSync(outFile, sql + '\n');

console.log(`เทียบ ${ref}:prisma/schema.prisma → prisma/schema.prisma (ไม่ได้ต่อฐานข้อมูล)`);
console.log(empty ? 'ไม่มีอะไรเปลี่ยน' : `เขียนผลลง ${outFile} แล้ว`);

if (!empty) {
  const destructive = sql.match(/^\s*(DROP|ALTER TABLE .* DROP)\b.*$/gim);
  if (destructive) {
    console.log(`\n\x1b[33m⚠ SQL นี้มีคำสั่งที่ลบของ ${destructive.length} บรรทัด — อ่านให้ครบก่อนเอาไปใช้:\x1b[0m`);
    destructive.slice(0, 10).forEach((l) => console.log('   ' + l.trim()));
    if (destructive.length > 10) console.log(`   ... อีก ${destructive.length - 10} บรรทัด`);
  }
}

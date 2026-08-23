#!/usr/bin/env node
/**
 * ตัวกันคำสั่ง prisma ที่ทำข้อมูล production หาย
 *
 * ใช้แทน `npx prisma ...` — ถ้าคำสั่งเข้าข่ายอันตรายจะหยุดทันทีก่อนต่อฐานข้อมูล
 * ที่มา: 23 ส.ค. 2026 มี agent รัน `migrate diff --shadow-database-url <prod>`
 * แล้ว Prisma drop schema ของ production ทิ้งทั้งหมด
 * ดู docs/incident-2026-08-23-production-wipe.md
 */
require('dotenv').config();
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
// ปิดรหัสผ่านก่อนพิมพ์ออกจอเสมอ — คำสั่งเหล่านี้มักมี connection string เต็ม ๆ อยู่ด้วย
const mask = (s) => s.replace(/(postgres(?:ql)?:\/\/[^:@\s]+:)[^@\s]+@/g, '$1***@');
const argv = args.join(' ');
const safeArgv = mask(argv);

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/-pooler\./, '.');
  } catch {
    return null;
  }
};

const die = (why, how) => {
  console.error('\n\x1b[41m\x1b[97m  หยุด: คำสั่งนี้ทำข้อมูล production หายได้  \x1b[0m\n');
  console.error(`  คำสั่ง : npx prisma ${safeArgv}`);
  console.error(`  เหตุผล : ${why}\n`);
  console.error(`  ทำแทน  : ${how}\n`);
  console.error('  ถ้ายืนยันว่าตั้งใจจริง ให้รันเองพร้อม I_KNOW_THIS_HITS_PRODUCTION=1\n');
  process.exit(1);
};

if (process.env.I_KNOW_THIS_HITS_PRODUCTION !== '1') {
  const prodHost = hostOf(process.env.DATABASE_URL || '');

  // 1. คำสั่งตระกูล migrate ที่ reset ฐานข้อมูลได้
  const banned = ['migrate dev', 'migrate reset', 'migrate deploy'];
  for (const cmd of banned) {
    if (argv.startsWith(cmd)) {
      die(
        `\`prisma ${cmd}\` จะ reset ฐานข้อมูล เพราะ production ไม่มี _prisma_migrations ` +
          'Prisma จะเห็นว่า drift ทั้งหมด',
        'ใช้ `npm run db:push` ถ้าจะเปลี่ยน schema หรือ `npm run db:diff` ถ้าอยากได้ไฟล์ SQL',
      );
    }
  }

  // 2. flag ที่ยอมให้ลบข้อมูล
  if (/--force-reset/.test(argv)) {
    die('`--force-reset` สั่ง drop ทุกตารางในฐานข้อมูลก่อน push', 'ตัด flag นี้ออก');
  }
  if (/--accept-data-loss/.test(argv)) {
    die(
      '`--accept-data-loss` ยอมให้ Prisma ลบคอลัมน์/ตารางที่ไม่ตรง schema ได้เงียบ ๆ',
      'ตัด flag นี้ออก แล้วดูว่า push บ่นเรื่องอะไร ค่อยแก้ทีละจุด',
    );
  }

  // 3. shadow database ที่ชี้มาที่ฐานข้อมูลจริง — สาเหตุของเหตุการณ์ 23 ส.ค.
  const shadowFlag = argv.match(/--shadow-database-url[= ]+"?([^\s"]+)"?/);
  const shadowUrl = shadowFlag ? shadowFlag[1] : null;
  if (shadowUrl) {
    const resolved = shadowUrl.startsWith('$') || shadowUrl.startsWith('%')
      ? process.env[shadowUrl.replace(/^[$%]|%$/g, '')] || ''
      : shadowUrl;
    if (prodHost && hostOf(resolved) === prodHost) {
      die(
        'shadow database ชี้มาที่ host เดียวกับ DATABASE_URL — Prisma จะ DROP schema ของมันทิ้งก่อนเสมอ ' +
          'นี่คือคำสั่งที่ทำข้อมูลหายเมื่อ 23 ส.ค. 2026',
        'ใช้ `npm run db:diff` (ไม่ต้องมี shadow database) หรือชี้ไปที่ SHADOW_DATABASE_URL',
      );
    }
    if (!resolved) {
      die('`--shadow-database-url` ว่างเปล่า เสี่ยงไป fallback เป็น DATABASE_URL', 'ใช้ `npm run db:diff` แทน');
    }
  }
}

// ผ่านด่านแล้ว — บอกให้เห็นชัด ๆ ว่ากำลังจะโดน host ไหน
const target = hostOf(process.env.DATABASE_URL || '');
console.log(`\x1b[33m→ prisma ${safeArgv}\x1b[0m`);
console.log(`\x1b[33m→ DATABASE_URL ชี้ไปที่: ${target} (production)\x1b[0m\n`);

const run = spawnSync('npx', ['prisma', ...args], { stdio: 'inherit' });
process.exit(run.status ?? 1);

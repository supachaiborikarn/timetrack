import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Map station names from CSV to DB station names
const stationMapping: Record<string, string> = {
    'ศุภชัยบริการ': 'ศุภชัยบริการ',
    'พงษ์อนันต์': 'พงษ์อนันต์ปิโตรเลียม',
    'วัชรเกียรติ': 'วัชรเกียรติออยล์'
};

// Map position (ตำแหน่ง) to department
const positionToDeptCode: Record<string, string> = {
    'พนักงานเติมน้ำมัน': 'FUEL',
    'พนักงานเติมแก๊ส': 'GAS',
    'เสมียนน้ำมัน': 'CLERK',
    'เสมียนแก๊ส': 'CLERK',
    'ร้านกาแฟ': 'CAFE',
    'แม่บ้าน': 'MAID',
    'บ่อ': 'OIL_PIT',
    'ล้างรถ': 'CAR_WASH',
    'ยาม': 'MISC',
    'ทั่วไป': 'MISC',
    'พนักงานบัญชี': 'CLERK'
};

// Get role based on position
function getRole(position: string): string {
    if (position.includes('เสมียน')) return 'CASHIER';
    return 'EMPLOYEE';
}

// Generate a unique employee ID
function generateEmployeeId(): string {
    const chars = 'ABCDEF0123456789';
    let id = 'EMP';
    for (let i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Clean phone number
function cleanPhone(phone: string | null): string | null {
    if (!phone || phone === 'nan' || phone === '-') return null;
    return phone.replace(/-/g, '').trim();
}

// Parse CSV decimal to number
function parseNumber(val: string): number | null {
    if (!val || val === 'nan' || val.trim() === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

async function main() {
    try {
        console.log("=== STAFF IMPORT SCRIPT ===\n");

        // Read CSV
        const csvPath = path.join(process.cwd(), 'cleaned_staff.csv');
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);

        // Skip header
        const dataLines = lines.slice(1);
        console.log(`Found ${dataLines.length} staff records in CSV\n`);

        // Fetch existing data
        const stations = await prisma.station.findMany();
        const departments = await prisma.department.findMany();
        const existingUsers = await prisma.user.findMany();

        console.log(`Existing users in DB: ${existingUsers.length}`);

        // Create station lookup
        const stationLookup: Record<string, string> = {};
        for (const s of stations) {
            stationLookup[s.name] = s.id;
        }

        // Create department lookup (by station + code)
        const deptLookup: Record<string, string> = {};
        for (const d of departments) {
            const key = `${d.stationId || 'global'}_${d.code}`;
            deptLookup[key] = d.id;
            // Also add a global lookup fallback
            if (!deptLookup[`global_${d.code}`]) {
                deptLookup[`global_${d.code}`] = d.id;
            }
        }

        // Create name lookup for existing users (to avoid duplicates)
        const existingNames = new Set(existingUsers.map(u => u.name.toLowerCase()));

        // Track duplicates
        const nameCount: Record<string, number> = {};

        // Default password hash
        const defaultPassword = await bcrypt.hash('1234', 10);

        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const line of dataLines) {
            try {
                const parts = line.split(',');
                if (parts.length < 5) continue;

                const [
                    stationCsv,
                    nickname,
                    fullName,
                    phone,
                    position,
                    dailyRate,
                    monthlyRate,
                    specialPay,
                    workHours,
                    bankAccount,
                    housing,
                    socialSecurityStation
                ] = parts;

                // Skip if no valid name
                if (!nickname || nickname === 'nan' || !fullName || fullName === 'nan') {
                    console.log(`SKIP: Empty name - ${line.substring(0, 50)}...`);
                    skipped++;
                    continue;
                }

                // Map station
                const stationName = stationMapping[stationCsv.trim()];
                if (!stationName) {
                    console.log(`SKIP: Unknown station "${stationCsv}"`);
                    skipped++;
                    continue;
                }

                const stationId = stationLookup[stationName];
                if (!stationId) {
                    console.log(`SKIP: Station not found in DB: ${stationName}`);
                    skipped++;
                    continue;
                }

                // Handle duplicate names by appending station prefix for 2nd occurrence
                const baseName = nickname.trim();
                nameCount[baseName] = (nameCount[baseName] || 0) + 1;

                let displayName = baseName;
                if (nameCount[baseName] > 1) {
                    // Have a duplicate, add suffix
                    displayName = `${baseName} (${stationCsv.trim().substring(0, 3)}${nameCount[baseName]})`;
                    console.log(`INFO: Duplicate name "${baseName}" -> "${displayName}"`);
                }

                // Check if already exists
                if (existingNames.has(displayName.toLowerCase())) {
                    console.log(`SKIP: User already exists: ${displayName}`);
                    skipped++;
                    continue;
                }

                // Map position to department
                const deptCode = positionToDeptCode[position.trim()] || 'MISC';
                const deptKey = `${stationId}_${deptCode}`;
                let departmentId = deptLookup[deptKey] || deptLookup[`global_${deptCode}`];

                if (!departmentId) {
                    // Fallback to first MISC or first dept
                    departmentId = deptLookup[`global_MISC`] || departments[0]?.id;
                }

                // Calculate hourly rate
                const daily = parseNumber(dailyRate);
                const monthly = parseNumber(monthlyRate);
                const hours = parseNumber(workHours) || 12;

                let hourlyRate = 0;
                if (daily) {
                    hourlyRate = daily / hours;
                } else if (monthly) {
                    hourlyRate = monthly / 26 / hours; // Approximate
                }

                // Create user
                const userData: Record<string, unknown> = {
                    name: displayName,
                    employeeId: generateEmployeeId(),
                    password: defaultPassword,
                    pin: '1234',
                    role: getRole(position.trim()),
                    stationId: stationId,
                    departmentId: departmentId,
                    hourlyRate: hourlyRate,
                    isActive: true
                };

                const cleanedPhone = cleanPhone(phone);
                if (cleanedPhone) {
                    userData.phone = cleanedPhone;
                } else {
                    // Generate unique placeholder phone based on name
                    const nameHash = displayName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                    const uniqueNum = String(nameHash % 10000000).padStart(7, '0');
                    userData.phone = `000${uniqueNum}`;
                }

                const newUser = await prisma.user.create({
                    data: userData as any
                });

                console.log(`CREATED: ${displayName} @ ${stationCsv} as ${position} (Rate: ${hourlyRate.toFixed(2)}/hr)`);
                existingNames.add(displayName.toLowerCase());
                created++;

            } catch (err) {
                console.error(`ERROR processing line:`, err);
                errors++;
            }
        }

        console.log(`\n=== SUMMARY ===`);
        console.log(`Created: ${created}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Errors: ${errors}`);

    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

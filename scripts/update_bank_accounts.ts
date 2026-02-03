import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Map station names from CSV to DB station names
const stationMapping: Record<string, string> = {
    'ศุภชัยบริการ': 'ศุภชัยบริการ',
    'พงษ์อนันต์': 'พงษ์อนันต์ปิโตรเลียม',
    'วัชรเกียรติ': 'วัชรเกียรติออยล์'
};

function cleanAccountNumber(val: string | null): string | null {
    if (!val || val === 'nan' || val.trim() === '') return null;
    // Remove decimal point from CSV number like "7852186878.0"
    return val.replace('.0', '').trim();
}

async function main() {
    try {
        console.log("=== BANK ACCOUNT UPDATE SCRIPT ===\n");

        // Read CSV
        const csvPath = path.join(process.cwd(), 'cleaned_staff.csv');
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);

        // Skip header
        const dataLines = lines.slice(1);
        console.log(`Found ${dataLines.length} records in CSV\n`);

        // Fetch existing users
        const users = await prisma.user.findMany();

        // Create name lookup
        const userByName: Record<string, typeof users[0]> = {};
        for (const u of users) {
            userByName[u.name.toLowerCase()] = u;
            // Also add without suffix for duplicates like "บี (วัช2)"
            const baseName = u.name.split(' (')[0].toLowerCase();
            if (!userByName[baseName]) {
                userByName[baseName] = u;
            }
        }

        let updated = 0;
        let skipped = 0;
        let noAccount = 0;

        for (const line of dataLines) {
            try {
                const parts = line.split(',');
                if (parts.length < 11) continue;

                const nickname = parts[1]?.trim();
                const bankAccountRaw = parts[9]; // เลขที่บัญชี

                if (!nickname || nickname === 'nan') continue;

                const accountNumber = cleanAccountNumber(bankAccountRaw);

                if (!accountNumber) {
                    noAccount++;
                    continue;
                }

                // Find user by nickname
                const user = userByName[nickname.toLowerCase()];
                if (!user) {
                    console.log(`SKIP: User not found: ${nickname}`);
                    skipped++;
                    continue;
                }

                // Determine bank name based on account prefix
                let bankName = 'TTB'; // Default as user said 785218... is TTB
                if (accountNumber.startsWith('785218') || accountNumber.startsWith('785219')) {
                    bankName = 'TTB';
                }

                // Update user
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        bankAccountNumber: accountNumber,
                        bankName: bankName
                    }
                });

                console.log(`UPDATED: ${user.name} -> ${bankName} ${accountNumber}`);
                updated++;

            } catch (err) {
                console.error(`ERROR:`, err);
            }
        }

        console.log(`\n=== SUMMARY ===`);
        console.log(`Updated: ${updated}`);
        console.log(`Skipped (user not found): ${skipped}`);
        console.log(`No account in CSV: ${noAccount}`);

    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

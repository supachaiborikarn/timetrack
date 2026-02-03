import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Map station names from CSV social security column to DB-friendly names
const socialSecurityStationMapping: Record<string, string> = {
    'วัชรเกียรติ': 'วัชรเกียรติออยล์',
    'ศุภชัยบริการ': 'ศุภชัยบริการ',
    'พงษ์อนันต์': 'พงษ์อนันต์ปิโตรเลียม'
};

function cleanPhone(phone: string | null): string | null {
    if (!phone || phone === 'nan' || phone === '-' || phone.trim() === '') return null;
    // Remove dashes for cleaner storage
    return phone.replace(/-/g, '').trim();
}

function cleanSocialSecurity(val: string | null): string | null {
    if (!val || val === 'nan' || val.trim() === '') return null;
    const mapped = socialSecurityStationMapping[val.trim()];
    return mapped || val.trim();
}

async function main() {
    try {
        console.log("=== PHONE & SOCIAL SECURITY UPDATE SCRIPT ===\n");

        // Read CSV
        const csvPath = path.join(process.cwd(), 'cleaned_staff.csv');
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);

        // Skip header
        const dataLines = lines.slice(1);
        console.log(`Found ${dataLines.length} records in CSV\n`);

        // Fetch existing users
        const users = await prisma.user.findMany();

        // Create name lookup - handle duplicates by matching with multiple keys
        const userByName: Record<string, typeof users[0]> = {};
        for (const u of users) {
            const lowerName = u.name.toLowerCase();
            userByName[lowerName] = u;
            // Also add base name without suffix for duplicates like "บี (วัช2)"
            const baseName = u.name.split(' (')[0].toLowerCase();
            if (!userByName[baseName]) {
                userByName[baseName] = u;
            }
        }

        let phoneUpdated = 0;
        let ssUpdated = 0;
        let skipped = 0;

        // Track which names we've already processed (for duplicates)
        const processedNames: Record<string, number> = {};

        for (const line of dataLines) {
            try {
                const parts = line.split(',');
                if (parts.length < 12) continue;

                const nickname = parts[1]?.trim();
                const phoneRaw = parts[3]; // เบอร์โทร
                const socialSecurityRaw = parts[11]; // ประกันสังคม

                if (!nickname || nickname === 'nan') continue;

                // Track duplicates
                processedNames[nickname] = (processedNames[nickname] || 0) + 1;

                // Build the lookup key
                let lookupKey = nickname.toLowerCase();
                if (processedNames[nickname] > 1) {
                    // This is a duplicate, try looking up with suffix
                    const possibleKeys = Object.keys(userByName).filter(k =>
                        k.startsWith(nickname.toLowerCase()) && k.includes('(')
                    );
                    if (possibleKeys.length > 0) {
                        lookupKey = possibleKeys[processedNames[nickname] - 2] || lookupKey;
                    }
                }

                // Find user by nickname
                const user = userByName[lookupKey];
                if (!user) {
                    console.log(`SKIP: User not found: ${nickname} (lookup: ${lookupKey})`);
                    skipped++;
                    continue;
                }

                const phone = cleanPhone(phoneRaw);
                const socialSecurity = cleanSocialSecurity(socialSecurityRaw);

                const updateData: Record<string, string> = {};

                if (phone && user.phone !== phone) {
                    updateData.phone = phone;
                }

                if (socialSecurity) {
                    updateData.socialSecurityStation = socialSecurity;
                }

                if (Object.keys(updateData).length > 0) {
                    try {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: updateData
                        });

                        if (updateData.phone) {
                            console.log(`PHONE: ${user.name} -> ${phone}`);
                            phoneUpdated++;
                        }
                        if (updateData.socialSecurityStation) {
                            console.log(`SS: ${user.name} -> ${socialSecurity}`);
                            ssUpdated++;
                        }
                    } catch (err: any) {
                        if (err.code === 'P2002') {
                            console.log(`SKIP: Phone already exists: ${phone} for ${user.name}`);
                        } else {
                            throw err;
                        }
                    }
                }

            } catch (err) {
                console.error(`ERROR:`, err);
            }
        }

        console.log(`\n=== SUMMARY ===`);
        console.log(`Phone updated: ${phoneUpdated}`);
        console.log(`Social Security updated: ${ssUpdated}`);
        console.log(`Skipped: ${skipped}`);

    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Updating Staff Data from CSV ===\n');

    // Read CSV
    const csvPath = path.join(process.cwd(), 'cleaned_staff.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);

    // Parse header
    const header = lines[0].split(',');
    console.log('CSV Columns:', header);

    // Get all existing users with their stations
    const users = await prisma.user.findMany({
        include: { station: true }
    });
    console.log(`\nFound ${users.length} users in database\n`);

    // Create lookup map by name (using the 'name' field which contains the nickname)
    const userByName: Record<string, typeof users[0]> = {};
    for (const user of users) {
        // Store by lowercase name for matching
        const baseName = user.name.toLowerCase().split(' ')[0]; // Get first word (nickname)
        userByName[baseName] = user;

        // Also store users with station suffix like "บี (วัช2)"
        if (user.name.includes('(')) {
            userByName[user.name.toLowerCase()] = user;
        }
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    // Process each row
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 12) continue;

        const [
            stationName,
            nickname,
            realName,
            phone,
            position,
            dailyRate,
            monthlySalary,
            specialPay,
            workHours,
            bankAccount,
            houseCost,
            socialSecurity
        ] = parts.map(p => p.trim());

        // Skip if no nickname
        if (!nickname) continue;

        // Find user - try multiple matching strategies
        let user = userByName[nickname.toLowerCase()];

        // If not found, try with station suffix (for duplicates like "บี")
        if (!user) {
            // Map station name to code
            const stationCode = stationName === 'วัชรเกียรติ' ? 'วัช' :
                stationName === 'พงษ์อนันต์' ? 'พงษ์' : 'ศุภ';
            const nameWithStation = `${nickname.toLowerCase()} (${stationCode}`;

            for (const key of Object.keys(userByName)) {
                if (key.startsWith(nameWithStation)) {
                    user = userByName[key];
                    break;
                }
            }
        }

        if (!user) {
            console.log(`NOT FOUND: ${nickname} (${stationName})`);
            notFoundCount++;
            continue;
        }

        // Prepare update data
        const updateData: Record<string, string | null> = {};

        // Update nickname and realName
        updateData.nickname = nickname;
        if (realName && realName !== 'nan') {
            updateData.realName = realName;
        }

        // Update social security station
        if (socialSecurity && socialSecurity !== 'nan') {
            updateData.socialSecurityStation = socialSecurity;
        }

        // Update bank account
        if (bankAccount && bankAccount !== 'nan' && bankAccount !== '') {
            // Clean the account number (remove .0 suffix from Excel)
            let accountNum = bankAccount.replace('.0', '').trim();
            updateData.bankAccountNumber = accountNum;
            updateData.bankName = 'TTB';
        }

        // Update in database
        await prisma.user.update({
            where: { id: user.id },
            data: updateData
        });

        console.log(`UPDATED: ${user.name} -> nickname: ${nickname}, realName: ${realName || '-'}, ss: ${socialSecurity || '-'}, bank: ${bankAccount || '-'}`);
        updatedCount++;
    }

    console.log('\n=== Summary ===');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Not Found: ${notFoundCount}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

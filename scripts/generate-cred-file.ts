
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
            name: true,
            employeeId: true,
            username: true,
            phone: true,
            role: true,
            email: true,
        },
        orderBy: {
            employeeId: 'asc',
        },
    });

    let content = '# Employee Login Credentials\n\n';
    content += '**Default PIN for all employees: 123456**\n\n';
    content += '| Name | Role | Employee ID | Phone | Username | Email |\n';
    content += '| :--- | :--- | :--- | :--- | :--- | :--- |\n';

    users.forEach((u: any) => {
        content += `| ${u.name} | ${u.role} | ${u.employeeId} | ${u.phone || '-'} | ${u.username || '-'} | ${u.email || '-'} |\n`;
    });

    const filePath = '/Users/benzsuphaudphanich/.gemini/antigravity/brain/ec874e86-8a5a-413e-979d-dfe210c7ed09/employee_credentials.md';
    fs.writeFileSync(filePath, content);
    console.log(`File generated at: ${filePath}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

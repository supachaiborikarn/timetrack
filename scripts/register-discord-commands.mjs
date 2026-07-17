import "dotenv/config";

const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!applicationId || !botToken) {
    console.error("กรุณาตั้ง DISCORD_APPLICATION_ID และ DISCORD_BOT_TOKEN ก่อนลงทะเบียนคำสั่ง");
    process.exit(1);
}

const optionalFilters = [
    {
        type: 3,
        name: "station",
        description: "รหัสสาขา เช่น WKO",
        required: false,
    },
    {
        type: 3,
        name: "date",
        description: "วันที่รูปแบบ YYYY-MM-DD โดยค่าเริ่มต้นคือวันนี้",
        required: false,
    },
];

const commands = [
    {
        type: 1,
        name: "attendance",
        description: "ตรวจและส่งรายงานการมาทำงาน",
        contexts: [0],
        integration_types: [0],
        options: [
            {
                type: 1,
                name: "summary",
                description: "ดูจำนวนคนมา คนลา และคนขาด",
                options: optionalFilters,
            },
            {
                type: 1,
                name: "send",
                description: "ส่งรายงานเข้า Discord ที่ตั้งไว้",
                options: optionalFilters,
            },
        ],
    },
];

const scopePath = guildId
    ? `/applications/${applicationId}/guilds/${guildId}/commands`
    : `/applications/${applicationId}/commands`;
const response = await fetch(`https://discord.com/api/v10${scopePath}`, {
    method: "PUT",
    headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
});

if (!response.ok) {
    console.error(`ลงทะเบียนคำสั่งไม่สำเร็จ ${response.status}: ${(await response.text()).slice(0, 500)}`);
    process.exit(1);
}

const registered = await response.json();
console.log(`ลงทะเบียนคำสั่งสำเร็จ ${registered.length} คำสั่ง${guildId ? ` ในเซิร์ฟเวอร์ ${guildId}` : " แบบใช้งานทั่วโลก"}`);

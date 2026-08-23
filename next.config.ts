/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                // หน้า public ของเสียงลูกค้า (§14.1): ห้าม cache และห้ามส่ง referrer
                // เป็น HTTP header จริง ไม่ใช่แค่ meta tag
                source: "/f",
                headers: [
                    { key: "Cache-Control", value: "no-store, max-age=0" },
                    { key: "Referrer-Policy", value: "no-referrer" },
                ],
            },
            {
                source: "/feedback/privacy",
                headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
            },
        ];
    },
};

export default nextConfig;

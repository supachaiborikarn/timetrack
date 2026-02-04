const baseUrl = "https://timetrack-inb7dahgi-benzs-projects-2423502c.vercel.app";

async function testLogin() {
    console.log(`Testing login against ${baseUrl}...`);

    try {
        // Try password login
        const res = await fetch(`${baseUrl}/api/auth/callback/password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                email: "benz",
                password: "123456",
                redirect: "false",
                csrfToken: "", // Might need to fetch CSRF first
                json: "true"
            })
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text.substring(0, 500)}...`);

    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

testLogin();

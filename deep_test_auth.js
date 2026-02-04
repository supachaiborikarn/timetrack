const BASE_URL = "https://timetrack-lake.vercel.app";

async function deepTestAuth() {
    console.log("🔍 Deep Testing Auth Configuration...\n");

    // 1. Check Session Endpoint (should be 200 null)
    try {
        const sessionRes = await fetch(`${BASE_URL}/api/auth/session`);
        console.log(`SESSION Endpoint: ${sessionRes.status} ${sessionRes.statusText}`);
        console.log(`Response: ${await sessionRes.text()}`);
    } catch (e) { console.log("Session Check Failed", e.message); }

    // 2. Check Providers Endpoint (Verifies if auth.ts loaded correctly)
    try {
        const providersRes = await fetch(`${BASE_URL}/api/auth/providers`);
        console.log(`\nPROVIDERS Endpoint: ${providersRes.status} ${providersRes.statusText}`);
        const text = await providersRes.text();
        console.log(`Response: ${text.substring(0, 500)}`);
    } catch (e) { console.log("Providers Check Failed", e.message); }

    // 3. Check CSRF
    let csrfToken = "";
    let cookies = "";
    try {
        const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
        console.log(`\nCSRF Endpoint: ${csrfRes.status}`);
        const json = await csrfRes.json();
        csrfToken = json.csrfToken;
        cookies = csrfRes.headers.get('set-cookie');
        console.log(`Token: ${csrfToken ? '✅ YES' : '❌ NO'}`);
    } catch (e) { console.log("CSRF Check Failed", e.message); }

    // 4. Test Signin (Password)
    if (csrfToken) {
        console.log("\n4. Attempting Signin (benz)...");
        const params = new URLSearchParams();
        params.append('csrfToken', csrfToken);
        params.append('email', 'benz');
        params.append('password', '123456');
        params.append('json', 'true');

        try {
            const loginRes = await fetch(`${BASE_URL}/api/auth/callback/password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies
                },
                body: params.toString(),
                redirect: 'manual'
            });
            console.log(`Signin Status: ${loginRes.status}`);
            console.log(`Location: ${loginRes.headers.get('location')}`);
        } catch (e) { console.log("Signin Failed", e.message); }
    }
}

deepTestAuth();

const BASE_URL = "https://timetrack-lake.vercel.app";

async function testProdLogin() {
    console.log("🔍 Testing Production Login API...\n");

    try {
        // Step 1: Get CSRF Token
        console.log("1. Fetching CSRF token...");
        const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
        const csrfData = await csrfRes.json();
        console.log(`   CSRF Token: ${csrfData.csrfToken ? '✅ Got token' : '❌ No token'}`);

        if (!csrfData.csrfToken) {
            console.log("   Cannot proceed without CSRF token");
            return;
        }

        // Step 2: Try password login
        console.log("\n2. Attempting login with benz/123456...");

        const params = new URLSearchParams();
        params.append('csrfToken', csrfData.csrfToken);
        params.append('email', 'benz');
        params.append('password', '123456');
        params.append('json', 'true');

        const loginRes = await fetch(`${BASE_URL}/api/auth/callback/password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': csrfRes.headers.get('set-cookie') || ''
            },
            body: params.toString(),
            redirect: 'manual'
        });

        console.log(`   Status: ${loginRes.status}`);
        console.log(`   Status Text: ${loginRes.statusText}`);

        // Check headers
        const location = loginRes.headers.get('location');
        const setCookie = loginRes.headers.get('set-cookie');

        console.log(`   Location header: ${location || 'none'}`);
        console.log(`   Set-Cookie: ${setCookie ? '✅ Has cookies' : '❌ No cookies'}`);

        if (loginRes.status === 200 || (location && !location.includes('error'))) {
            console.log("\n✅ LOGIN APPEARS SUCCESSFUL!");
        } else {
            console.log("\n❌ LOGIN FAILED");
            const body = await loginRes.text();
            console.log(`   Response: ${body.substring(0, 500)}`);
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

testProdLogin();

const BASE_URL = "https://timetrack-lake.vercel.app";

async function testSignin() {
    console.log("🔍 Testing Direct Signin Endpoint...\n");

    try {
        // Try signin endpoint directly
        const res = await fetch(`${BASE_URL}/api/auth/signin/password`, {
            method: 'GET'
        });

        console.log(`Signin page status: ${res.status}`);

        // Try a simple API call to see if the app works
        console.log("\n--- Testing App API ---");

        const sessionRes = await fetch(`${BASE_URL}/api/auth/session`);
        console.log(`Session endpoint: ${sessionRes.status}`);
        const sessionData = await sessionRes.text();
        console.log(`Session data: ${sessionData.substring(0, 200)}`);

        // Try to access a protected API to see the error
        console.log("\n--- Testing Protected Endpoint ---");
        const protectedRes = await fetch(`${BASE_URL}/api/profile`);
        console.log(`Profile API: ${protectedRes.status}`);

    } catch (e) {
        console.error("Error:", e.message);
    }
}

testSignin();

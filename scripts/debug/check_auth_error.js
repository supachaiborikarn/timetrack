const BASE_URL = "https://timetrack-lake.vercel.app";

async function fetchAuthError() {
    console.log("🔍 Checking Auth Error Page...\n");

    try {
        // Direct fetch of error page
        const res = await fetch(`${BASE_URL}/api/auth/error?error=Configuration`);
        console.log(`Status: ${res.status}`);

        const html = await res.text();

        // Look for error details
        if (html.includes('Configuration')) {
            console.log("Found Configuration error page");
        }

        // Try to find any error details in the HTML
        const errorMatch = html.match(/<p[^>]*>(.*?error.*?)<\/p>/gi);
        if (errorMatch) {
            console.log("Error messages found:");
            errorMatch.forEach(m => console.log(`  ${m}`));
        }

        // Check providers endpoint
        console.log("\n--- Checking Providers ---");
        const providersRes = await fetch(`${BASE_URL}/api/auth/providers`);
        const providers = await providersRes.json();
        console.log("Providers:", JSON.stringify(providers, null, 2));

    } catch (e) {
        console.error("Error:", e.message);
    }
}

fetchAuthError();

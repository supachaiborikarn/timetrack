/**
 * Generate VAPID keys for Web Push notifications
 * 
 * Run: node scripts/generate-vapid.js
 * 
 * Then add the output to your .env file:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
 *   VAPID_PRIVATE_KEY=<private key>
 */

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=== VAPID Keys Generated ===\n');
console.log('Add these to your .env file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`\nPublic key (for client-side):\n${vapidKeys.publicKey}`);
console.log(`\nPrivate key (server-side only):\n${vapidKeys.privateKey}`);
console.log('\n============================\n');

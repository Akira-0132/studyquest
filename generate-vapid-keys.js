// VAPID鍵生成スクリプト
const webpush = require('web-push');

console.log('Generating VAPID keys...');
const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n🔑 Your VAPID keys:');
console.log('\nPublic Key (NEXT_PUBLIC_VAPID_PUBLIC_KEY):');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key (VAPID_PRIVATE_KEY):');
console.log(vapidKeys.privateKey);

console.log('\n📋 Add these to your .env.local file:');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);

console.log('\n🚀 And to your Vercel environment variables.');
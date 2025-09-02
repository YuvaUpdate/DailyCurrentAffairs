// Simple FCM test sender (legacy HTTP v1 endpoint)
// Usage (PowerShell):
// $env:FCM_SERVER_KEY="AAAA..."; node tools/send_fcm_test.js <DEVICE_TOKEN>
// Or pass server key as first arg and token as second arg: node tools/send_fcm_test.js <SERVER_KEY> <DEVICE_TOKEN>
// This script sends both `notification` and `data` fields so OS displays notification when app is killed

const https = require('https');

function sendMessage(serverKey, targetToken) {
  const body = JSON.stringify({
    to: targetToken,
    priority: 'high',
    notification: {
      title: 'Test: New Article',
      body: 'This is a test notification sent from tools/send_fcm_test.js',
      sound: 'default'
    },
    data: {
      article: JSON.stringify({
        id: 'test-123',
        headline: 'Test Article',
        summary: 'This is a background-delivery test',
        timestamp: new Date().toISOString()
      })
    }
  });

  const options = {
    hostname: 'fcm.googleapis.com',
    port: 443,
    path: '/fcm/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Authorization': `key=${serverKey}`
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('FCM response status:', res.statusCode);
      console.log('FCM response body:', data);
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e);
  });

  req.write(body);
  req.end();
}

(async function main() {
  try {
    const args = process.argv.slice(2);
    let serverKey = process.env.FCM_SERVER_KEY;
    let token = args[0];
    if (args.length >= 2) {
      serverKey = args[0];
      token = args[1];
    }
    if (!serverKey || !token) {
      console.error('Usage: set FCM_SERVER_KEY env var and pass device token as arg, or pass both as args');
      console.error('Example (PowerShell): $env:FCM_SERVER_KEY="AAAA..."; node tools/send_fcm_test.js <DEVICE_TOKEN>');
      process.exit(1);
    }
    sendMessage(serverKey, token);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

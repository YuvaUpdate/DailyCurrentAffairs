/**
 * Usage:
 *  - Install: npm install firebase-admin
 *  - Export service account JSON path: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccountKey.json"
 *  - Run (PowerShell): node .\scripts\set-admin-claim.js --email admin@yuvaupdate.com --admin true
 *
 * This script sets the custom claim `admin: true` for the user identified by email or uid.
 */
const admin = require('firebase-admin');
const argv = require('yargs').argv;

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file with admin privileges');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  const email = argv.email;
  const uid = argv.uid;
  const password = argv.password;
  const makeAdmin = argv.admin === 'true' || argv.admin === true || argv.admin === undefined;

  if (!email && !uid) {
    console.error('Provide --email or --uid');
    process.exit(1);
  }

  try {
    let userRecord;
    try {
      if (email) {
        userRecord = await admin.auth().getUserByEmail(email);
      } else {
        userRecord = await admin.auth().getUser(uid);
      }
    } catch (getErr) {
      // If user not found by email and password provided, create the user
      if (email && getErr.code && (getErr.code === 'auth/user-not-found' || getErr.code === 'auth/user-not-found' || getErr.code === 'USER_NOT_FOUND')) {
        if (!password) {
          console.error('User not found. Provide --password to create the user.');
          process.exit(1);
        }
        console.log('User not found. Creating user with provided password...');
        userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: 'Admin User',
          emailVerified: true
        });
        console.log('✅ Created user:', userRecord.uid);
      } else {
        throw getErr;
      }
    }

    const claims = { admin: !!makeAdmin };
    await admin.auth().setCustomUserClaims(userRecord.uid, claims);
    console.log(`✅ Set custom claims for ${userRecord.uid}:`, claims);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to set custom claim:', err);
    process.exit(2);
  }
}

main();

import "dotenv/config";

import admin from "firebase-admin";

import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = process.env.ADMIN_UID;

if (!uid) {
  console.error("Missing ADMIN_UID env variable");
  process.exit(1);
}

await admin.auth().setCustomUserClaims(uid, {
  admin: true,
});

console.log(`Admin set for UID: ${uid}`);
process.exit();
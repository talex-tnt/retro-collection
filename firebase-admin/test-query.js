const admin = require('firebase-admin');
const fs = require('fs');
if (!fs.existsSync('./serviceAccountKey.json')) {
  console.error('no key');
  process.exit(1);
}
const key = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();
(async () => {
  const q = db.collection('collections').where('userId', '==', 'dummy').orderBy('createdAt', 'desc');
  console.log('query built');
  try {
    const s = await q.limit(1).get();
    console.log('snapshot size', s.size);
  } catch (e) {
    console.error('ERROR');
    console.error(e.toString());
    console.error(e.stack);
    process.exit(1);
  }
})();

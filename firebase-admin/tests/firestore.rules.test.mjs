import 'dotenv/config';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import admin from 'firebase-admin';
import { deleteApp, initializeApp as initializeClientApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  terminate,
  serverTimestamp,
} from 'firebase/firestore';

const RULES_TARGET = process.env.RULES_TARGET ?? 'emulator';
const ENV = process.env.ENV ?? 'dev';
const TEST_ENV = 'test';
const TEST_DATA_TEST_PATH = `${TEST_ENV}/data/rulesSmoke/adminOnlyWrite`;
const TEST_CONFIG_PATH = `${TEST_ENV}/config/public/runtime`;
const TEST_COLLECTION_ID = 'test-collection-1';
const TEST_USER_ID = 'rules-regular-user';
const TEST_COLLECTION_PATH = `${TEST_ENV}/data/collections/${TEST_COLLECTION_ID}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const FIREBASE_WEB_CONFIGS = {
  dev: {
    apiKey: 'AIzaSyB4YnIk0kbBTKDiHOgXpVOaYIxLdchItzQ',
    authDomain: 'retro-collections-dev.firebaseapp.com',
    projectId: 'retro-collections-dev',
    storageBucket: 'retro-collections-dev.firebasestorage.app',
    messagingSenderId: '473822754233',
    appId: '1:473822754233:web:0de2e6930818d3a2ea7268',
  },
  prod: {
    apiKey: 'AIzaSyCD8zIM4SOBkLIzzLpZuagq688BwXfohDg',
    authDomain: 'retro-collections-prod.firebaseapp.com',
    projectId: 'retro-collections-prod',
    storageBucket: 'retro-collections-prod.firebasestorage.app',
    messagingSenderId: '509856353620',
    appId: '1:509856353620:web:6bac6b42759eb94a4e0cc1',
  },
};

const SERVICE_ACCOUNT_FILES = {
  dev: 'retro-collections-dev.json',
  prod: 'retro-collections-prod.json',
};

const firebaseConfig = FIREBASE_WEB_CONFIGS[ENV];

if (!firebaseConfig) {
  throw new Error(`Unsupported ENV value: ${ENV}`);
}

let adminApp;

const getAdminApp = () => {
  if (adminApp) {
    return adminApp;
  }

  const serviceAccountFile = SERVICE_ACCOUNT_FILES[ENV];
  const serviceAccountPath = path.join(ROOT_DIR, serviceAccountFile);

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Missing service account file for ENV=${ENV}: ${serviceAccountPath}`
    );
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf8')
  );

  adminApp = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    },
    `rules-test-admin-${ENV}`
  );

  return adminApp;
};

const getAdminDb = () => admin.firestore(getAdminApp());
const getAdminAuth = () => admin.auth(getAdminApp());

const buildClientContext = async ({ uid, claims = {} }) => {
  const appName = `rules-client-${RULES_TARGET}-${uid}-${Date.now()}-${Math.random()}`;
  const app = initializeClientApp(firebaseConfig, appName);
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (RULES_TARGET === 'emulator') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  const customToken = await getAdminAuth().createCustomToken(uid, claims);
  await signInWithCustomToken(auth, customToken);

  return {
    db,
    cleanup: async () => {
      await signOut(auth).catch(() => undefined);
      await terminate(db).catch(() => undefined);
      await deleteApp(app).catch(() => undefined);
    },
  };
};

const cleanupTestDocs = async () => {
  if (RULES_TARGET === 'emulator') {
    const response = await fetch(
      `http://127.0.0.1:8080/emulator/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error(`Failed to clear Firestore emulator: ${response.status}`);
    }

    return;
  }

  await getAdminDb().doc(TEST_DATA_TEST_PATH).delete().catch(() => undefined);
  await getAdminDb().doc(TEST_CONFIG_PATH).delete().catch(() => undefined);
  await getAdminDb().doc(TEST_COLLECTION_PATH).delete().catch(() => undefined);
};

const expectPermissionDenied = async (promise) => {
  await assert.rejects(promise, (error) => {
    const message = String(error?.message ?? '');
    const code = String(error?.code ?? '');

    return (
      code.includes('permission-denied') ||
      message.includes('Missing or insufficient permissions') ||
      message.includes('permission-denied') ||
      message.includes('PERMISSION_DENIED')
    );
  });
};

test.beforeEach(async () => {
  await cleanupTestDocs();

  // Initialize config with dataFolder value AFTER cleanup
  const adminDb = getAdminDb();
  await adminDb.doc(TEST_CONFIG_PATH).set(
    { dataFolder: 'collections' },
    { merge: true }
  );
});

test.after(async () => {
  await cleanupTestDocs();
  if (adminApp) {
    await adminApp.delete();
  }
});

test(`admin can write into ${TEST_DATA_TEST_PATH} on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(context.db, TEST_DATA_TEST_PATH), {
        createdBy: 'rules-admin-user',
        target: RULES_TARGET,
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`non-admin cannot write into ${TEST_DATA_TEST_PATH} on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: 'rules-regular-user',
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, TEST_DATA_TEST_PATH), {
        createdBy: 'rules-regular-user',
        target: RULES_TARGET,
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`admin can write into ${TEST_CONFIG_PATH} on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(context.db, TEST_CONFIG_PATH), {
        dataFolder: 'data',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`non-admin cannot write into ${TEST_CONFIG_PATH} on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: 'rules-regular-user',
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, TEST_CONFIG_PATH), {
        dataFolder: 'data',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`user can write to matched dataFolder on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Should succeed because dataFolder is 'collections'
    await assert.doesNotReject(
      setDoc(doc(context.db, TEST_COLLECTION_PATH), {
        testData: 'value',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`user cannot write to non-matched dataFolder on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Should fail because dataFolder is 'collections', not 'items'
    await expectPermissionDenied(
      setDoc(doc(context.db, `${TEST_ENV}/data/items/test-item-1`), {
        testData: 'value',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`authenticated user can read data on ${RULES_TARGET}`, async () => {
  // Admin creates test data
  await getAdminDb().doc(TEST_COLLECTION_PATH).set({ testData: 'value' });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const snap = await getDoc(doc(context.db, TEST_COLLECTION_PATH));
    assert.ok(snap.exists(), 'Should be readable by authenticated user');
  } finally {
    await context.cleanup();
  }
});
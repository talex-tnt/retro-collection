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
  collection,
  deleteDoc,
  documentId,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  getFirestore,
  orderBy,
  query,
  setDoc,
  terminate,
  serverTimestamp,
  where,
} from 'firebase/firestore';

const RULES_TARGET = process.env.RULES_TARGET ?? 'emulator';
const ENV = process.env.ENV ?? 'dev';
const TEST_ROOT = 'test';
const TEST_DATA_FOLDER = 'default';
const TEST_ALT_DATA_FOLDER_1 = 'default1';
const TEST_ALT_DATA_FOLDER_2 = 'default2';

const TEST_DATA_TEST_PATH = `${TEST_ROOT}/testData/rulesSmoke/adminOnlyWrite/doc/smokeDoc`;
const TEST_CONFIG_PATH = `${TEST_ROOT}/config/public/runtime`;
const TEST_COLLECTION_ID = 'test-collection-1';
const TEST_USER_ID = 'rules-regular-user';

const joinPath = (...segments) => segments.filter(Boolean).join('/');

const getPublicResourcePath = (folder, resourceType) =>
  joinPath(TEST_ROOT, 'data', folder, 'public', resourceType);
const getPublicResourceDocPath = (folder, resourceType, docId) =>
  joinPath(getPublicResourcePath(folder, resourceType), docId);
const getPrivateResourcePath = (folder, resourceType) =>
  joinPath(TEST_ROOT, 'data', folder, 'private', resourceType);
const getPrivateResourceDocPath = (folder, resourceType, docId) =>
  joinPath(getPrivateResourcePath(folder, resourceType), docId);
const getAuthorizedUsersPath = (folder) =>
  getPrivateResourcePath(folder, 'authorized-users');

const TEST_COLLECTION_PATH = getPublicResourceDocPath(TEST_DATA_FOLDER, 'collections', TEST_COLLECTION_ID);
const TEST_ALT_COLLECTION_PATH_1 = getPublicResourceDocPath(TEST_ALT_DATA_FOLDER_1, 'collections', 'test-collection-default1');
const TEST_ALT_COLLECTION_PATH_2 = getPublicResourceDocPath(TEST_ALT_DATA_FOLDER_2, 'collections', 'test-collection-default2');
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

const buildUnauthenticatedClientContext = async () => {
  const appName = `rules-client-${RULES_TARGET}-unauth-${Date.now()}-${Math.random()}`;
  const app = initializeClientApp(firebaseConfig, appName);
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (RULES_TARGET === 'emulator') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

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

  // Live Firebase cleanup - try to delete but don't fail if paths don't exist
  try {
    await getAdminDb().doc(TEST_DATA_TEST_PATH).delete();
  } catch (e) {
    // Path might not exist or might have different structure
  }
  try {
    await getAdminDb().doc(TEST_CONFIG_PATH).delete();
  } catch (e) {
    // Path might not exist
  }
  try {
    await getAdminDb().doc(TEST_COLLECTION_PATH).delete();
  } catch (e) {
    // Path structure might be different
  }
  try {
    await getAdminDb().doc(TEST_ALT_COLLECTION_PATH_1).delete();
  } catch (e) {
    // Fallback
  }
  try {
    await getAdminDb().doc(TEST_ALT_COLLECTION_PATH_2).delete();
  } catch (e) {
    // Fallback
  }
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

const expectFailedPrecondition = async (promise) => {
  await assert.rejects(promise, (error) => {
    const message = String(error?.message ?? '');
    const code = String(error?.code ?? '');

    return (
      code.includes('failed-precondition') ||
      message.includes('failed-precondition') ||
      message.includes('The query requires an index')
    );
  });
};

test.beforeEach(async () => {
  await cleanupTestDocs();

  // Initialize config with dataFolder value AFTER cleanup
  const adminDb = getAdminDb();
  await adminDb.doc(TEST_CONFIG_PATH).set(
    { dataFolder: TEST_DATA_FOLDER },
    { merge: true }
  );
});

test.after(async () => {
  await cleanupTestDocs();
  if (adminApp) {
    await adminApp.delete();
  }
});

test(`user cannot read data from a folder that does not match public config on ${RULES_TARGET}`, async () => {
  await getAdminDb().collection(getPublicResourcePath(TEST_ALT_DATA_FOLDER_1, 'collections')).doc('test-collection-default1').set({ userId: 'wrong-folder', visibility: { public: true }, createdAt: admin.firestore.Timestamp.now() });
  await getAdminDb().collection(getPublicResourcePath(TEST_ALT_DATA_FOLDER_2, 'collections')).doc('test-collection-default2').set({ userId: 'matched-folder', visibility: { public: true }, createdAt: admin.firestore.Timestamp.now() });
  await getAdminDb().doc(TEST_CONFIG_PATH).set(
    { dataFolder: TEST_ALT_DATA_FOLDER_2 },
    { merge: true }
  );

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const configSnap = await getDocFromServer(doc(context.db, TEST_CONFIG_PATH));
    assert.ok(configSnap.exists(), 'Public runtime config should be readable');
    assert.equal(configSnap.data()?.dataFolder, TEST_ALT_DATA_FOLDER_2);

    await expectPermissionDenied(
      getDocFromServer(doc(context.db, TEST_ALT_COLLECTION_PATH_1))
    );

    const matchedSnap = await getDocFromServer(
      doc(context.db, getPublicResourceDocPath(TEST_ALT_DATA_FOLDER_2, 'collections', 'test-collection-default2'))
    );
    assert.ok(matchedSnap.exists(), 'Configured folder data should stay readable');
  } finally {
    await context.cleanup();
  }
});
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
    // Should fail because dataFolder is 'default', not 'items'
    await expectPermissionDenied(
      setDoc(doc(context.db, joinPath(TEST_ROOT, 'data', 'items', 'public', 'items', 'test-item-1')), {
        testData: 'value',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`user cannot write to unknown resourceType on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Folder matches config (default), but resourceType is not allowed
    await expectPermissionDenied(
      setDoc(
        doc(
          context.db,
          joinPath(TEST_ROOT, 'data', TEST_DATA_FOLDER, 'public', 'unknown-type', 'doc-1')
        ),
        {
          testData: 'value',
        }
      )
    );
  } finally {
    await context.cleanup();
  }
});

test(`authorized-users is admin-only read/write on ${RULES_TARGET}`, async () => {
  const ownEmail = 'self@example.com';
  const otherEmail = 'other@example.com';
  const ownDocPath = joinPath(getAuthorizedUsersPath(TEST_DATA_FOLDER), ownEmail);
  const otherDocPath = joinPath(getAuthorizedUsersPath(TEST_DATA_FOLDER), otherEmail);

  // Seed both docs
  await getAdminDb().doc(ownDocPath).set({ allowed: true });
  await getAdminDb().doc(otherDocPath).set({ allowed: true });

  // Unauthenticated cannot read
  const unauth = await buildUnauthenticatedClientContext();
  try {
    await expectPermissionDenied(getDocFromServer(doc(unauth.db, ownDocPath)));
  } finally {
    await unauth.cleanup();
  }

  // Non-admin can only read their own doc (by token email), cannot read others, cannot write
  const nonAdmin = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false, authEmail: ownEmail },
  });

  try {
    const ownSnap = await getDocFromServer(doc(nonAdmin.db, ownDocPath));
    assert.ok(ownSnap.exists(), 'Non-admin should be able to read own authorized-users doc');

    await expectPermissionDenied(getDocFromServer(doc(nonAdmin.db, otherDocPath)));

    await expectPermissionDenied(setDoc(doc(nonAdmin.db, ownDocPath), { allowed: true }));
  } finally {
    await nonAdmin.cleanup();
  }

  // Admin can write then read
  const adminUser = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    await assert.doesNotReject(setDoc(doc(adminUser.db, ownDocPath), { allowed: true }));
    const snap = await getDocFromServer(doc(adminUser.db, ownDocPath));
    assert.ok(snap.exists(), 'Admin should be able to read authorized-users doc');
    assert.equal(snap.data()?.allowed, true);
  } finally {
    await adminUser.cleanup();
  }
});

test(`authorized-users: legacy root collection query is denied (repro getAuthorizedUsers error) on ${RULES_TARGET}`, async () => {
  const adminUser = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    // This matches the current web implementation which queries a top-level
    // collection named "authorized-users".
    await expectPermissionDenied(
      getDocs(collection(adminUser.db, 'authorized-users'))
    );
  } finally {
    await adminUser.cleanup();
  }
});

test(`authorized-users: admin can list from canonical docs-root path on ${RULES_TARGET}`, async () => {
  const authorizedUsersCollectionPath = getAuthorizedUsersPath(TEST_DATA_FOLDER);

  const seededEmail = `seeded-${Date.now()}@example.com`;
  await getAdminDb().doc(joinPath(authorizedUsersCollectionPath, seededEmail)).set({
    allowed: true,
    seededAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const adminUser = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    const snap = await getDocs(collection(adminUser.db, authorizedUsersCollectionPath));
    assert.ok(snap.size >= 1, 'Admin should be able to list authorized-users');
    assert.ok(
      snap.docs.some((d) => d.id === seededEmail),
      'Seeded authorized user should be present'
    );
  } finally {
    await adminUser.cleanup();
  }
});

test(`users public: owner can create/get/update own doc with name and visibility only on ${RULES_TARGET}`, async () => {
  const userDocPath = getPublicResourceDocPath(TEST_DATA_FOLDER, 'users', TEST_USER_ID);

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(owner.db, userDocPath), {
        name: 'Me',
        visibility: { public: false },
      })
    );

    const snap = await getDocFromServer(doc(owner.db, userDocPath));
    assert.ok(snap.exists(), 'Owner should be able to get their user doc');
    assert.equal(snap.data()?.name, 'Me');
    assert.equal(snap.data()?.visibility?.public, false);

    await assert.doesNotReject(
      setDoc(
        doc(owner.db, userDocPath),
        { name: 'Me2', visibility: { public: true } },
        { merge: true }
      )
    );

    await expectPermissionDenied(
      setDoc(
        doc(owner.db, userDocPath),
        { email: 'me@example.com' },
        { merge: true }
      )
    );

    await expectPermissionDenied(
      setDoc(
        doc(owner.db, userDocPath),
        { lastLogin: serverTimestamp() },
        { merge: true }
      )
    );
  } finally {
    await owner.cleanup();
  }
});

test(`users public: non-owner cannot create or update someone else's doc on ${RULES_TARGET}`, async () => {
  const otherUserId = 'someone-else';
  const otherUserDocPath = getPublicResourceDocPath(TEST_DATA_FOLDER, 'users', otherUserId);

  // Seed other user's doc via admin
  await getAdminDb().doc(otherUserDocPath).set({
    name: 'Other',
    visibility: { public: false },
  });

  const nonOwner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(getDocFromServer(doc(nonOwner.db, otherUserDocPath)));
    await expectPermissionDenied(setDoc(doc(nonOwner.db, otherUserDocPath), { name: 'Hax' }));
    await expectPermissionDenied(
      setDoc(doc(nonOwner.db, otherUserDocPath), { name: 'Hax2' }, { merge: true })
    );
  } finally {
    await nonOwner.cleanup();
  }
});

test(`users public: owner cannot access user doc in non-configured folder on ${RULES_TARGET}`, async () => {
  const wrongFolderUserDocPath = getPublicResourceDocPath(TEST_ALT_DATA_FOLDER_1, 'users', TEST_USER_ID);

  // Seed via admin in the wrong folder
  await getAdminDb().doc(wrongFolderUserDocPath).set({
    name: 'WrongFolder',
    visibility: { public: false },
  });

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // config dataFolder remains 'default', so this should be denied
    await expectPermissionDenied(getDocFromServer(doc(owner.db, wrongFolderUserDocPath)));
    await expectPermissionDenied(
      setDoc(doc(owner.db, wrongFolderUserDocPath), { name: 'Nope' }, { merge: true })
    );
  } finally {
    await owner.cleanup();
  }
});

test(`users public: delete is admin-only on ${RULES_TARGET}`, async () => {
  const usersCollectionPath = getPublicResourcePath(TEST_DATA_FOLDER, 'users');
  const userDocPath = joinPath(usersCollectionPath, TEST_USER_ID);
  await getAdminDb().doc(userDocPath).set({
    name: 'Seed',
    visibility: { public: false },
  });

  const nonAdmin = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(deleteDoc(doc(nonAdmin.db, userDocPath)));
  } finally {
    await nonAdmin.cleanup();
  }

  const adminUser = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    await assert.doesNotReject(deleteDoc(doc(adminUser.db, userDocPath)));
  } finally {
    await adminUser.cleanup();
  }
});

test(`users public: anyone can get a public user, but not a private one on ${RULES_TARGET}`, async () => {
  const usersCollectionPath = getPublicResourcePath(TEST_DATA_FOLDER, 'users');

  const publicUserId = `public-user-${Date.now()}`;
  const privateUserId = `private-user-${Date.now()}`;
  const publicUserDocPath = joinPath(usersCollectionPath, publicUserId);
  const privateUserDocPath = joinPath(usersCollectionPath, privateUserId);

  await getAdminDb().doc(publicUserDocPath).set({
    name: 'Public User',
    visibility: { public: true },
  });
  await getAdminDb().doc(privateUserDocPath).set({
    name: 'Private User',
    visibility: { public: false },
  });

  const unauth = await buildUnauthenticatedClientContext();
  try {
    const publicSnap = await getDocFromServer(doc(unauth.db, publicUserDocPath));
    assert.ok(publicSnap.exists(), 'Unauth should be able to read public user');

    await expectPermissionDenied(getDocFromServer(doc(unauth.db, privateUserDocPath)));
  } finally {
    await unauth.cleanup();
  }

  const nonOwner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const publicSnap = await getDocFromServer(doc(nonOwner.db, publicUserDocPath));
    assert.ok(publicSnap.exists(), 'Non-owner should be able to read public user');

    await expectPermissionDenied(getDocFromServer(doc(nonOwner.db, privateUserDocPath)));
  } finally {
    await nonOwner.cleanup();
  }
});

test(`users public: only owner can update own visibility on ${RULES_TARGET}`, async () => {
  const usersCollectionPath = getPublicResourcePath(TEST_DATA_FOLDER, 'users');

  const ownerId = `owner-${Date.now()}`;
  const otherId = `other-${Date.now()}`;
  const ownerDocPath = joinPath(usersCollectionPath, ownerId);
  const otherDocPath = joinPath(usersCollectionPath, otherId);

  // Seed both docs
  await getAdminDb().doc(ownerDocPath).set({
    name: 'Owner',
    visibility: { public: false },
  });
  await getAdminDb().doc(otherDocPath).set({
    name: 'Other',
    visibility: { public: false },
  });

  // Owner can update their own visibility
  const owner = await buildClientContext({
    uid: ownerId,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(
        doc(owner.db, ownerDocPath),
        { visibility: { public: true } },
        { merge: true }
      )
    );

    const snap = await getDocFromServer(doc(owner.db, ownerDocPath));
    assert.equal(
      snap.data()?.visibility?.public,
      true,
      'Owner visibility should be updated to public'
    );
  } finally {
    await owner.cleanup();
  }

  // Another user cannot update someone else's visibility
  const nonOwner = await buildClientContext({
    uid: otherId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(
        doc(nonOwner.db, ownerDocPath),
        { visibility: { public: false } },
        { merge: true }
      )
    );
  } finally {
    await nonOwner.cleanup();
  }
});

test(`users visibility: can list public users only with explicit filter on ${RULES_TARGET}`, async () => {
  const usersCollectionPath = getPublicResourcePath(TEST_DATA_FOLDER, 'users');

  const publicUserId = `public-user-${Date.now()}`;
  const privateUserId = `private-user-${Date.now()}`;
  await getAdminDb().doc(joinPath(usersCollectionPath, publicUserId)).set({
    name: 'Public User',
    visibility: { public: true },
  });
  await getAdminDb().doc(joinPath(usersCollectionPath, privateUserId)).set({
    name: 'Private User',
    visibility: { public: false },
  });

  const unauth = await buildUnauthenticatedClientContext();
  try {
    // Without explicit filter, list is denied
    await expectPermissionDenied(getDocs(query(collection(unauth.db, usersCollectionPath))));

    const snap = await getDocs(
      query(
        collection(unauth.db, usersCollectionPath),
        where('visibility.public', '==', true)
      )
    );

    assert.ok(snap.size >= 1, 'Should return at least the public user');
    assert.ok(
      snap.docs.some((d) => d.id === publicUserId),
      'Public user should be present in results'
    );
    assert.ok(
      !snap.docs.some((d) => d.id === privateUserId),
      'Private user should not be present in results'
    );
  } finally {
    await unauth.cleanup();
  }
});

test(`users private: owner can create/get/update own doc with email and lastLogin only on ${RULES_TARGET}`, async () => {
  const userDocPath = getPrivateResourceDocPath(TEST_DATA_FOLDER, 'users', TEST_USER_ID);

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(owner.db, userDocPath), {
        email: 'me@example.com',
        lastLogin: serverTimestamp(),
      })
    );

    const snap = await getDocFromServer(doc(owner.db, userDocPath));
    assert.ok(snap.exists(), 'Owner should be able to get their private user doc');
    assert.equal(snap.data()?.email, 'me@example.com');

    await assert.doesNotReject(
      setDoc(doc(owner.db, userDocPath), { email: 'me2@example.com' }, { merge: true })
    );

    await expectPermissionDenied(
      setDoc(doc(owner.db, userDocPath), { name: 'Nope' }, { merge: true })
    );

    await expectPermissionDenied(
      setDoc(
        doc(owner.db, userDocPath),
        { visibility: { public: true } },
        { merge: true }
      )
    );
  } finally {
    await owner.cleanup();
  }
});

test(`users private: non-owner cannot read or write someone else's doc on ${RULES_TARGET}`, async () => {
  const otherUserId = 'private-someone-else';
  const otherUserDocPath = getPrivateResourceDocPath(TEST_DATA_FOLDER, 'users', otherUserId);

  await getAdminDb().doc(otherUserDocPath).set({
    email: 'other@example.com',
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  });

  const nonOwner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(getDocFromServer(doc(nonOwner.db, otherUserDocPath)));
    await expectPermissionDenied(
      setDoc(doc(nonOwner.db, otherUserDocPath), { email: 'hax@example.com' }, { merge: true })
    );
    await expectPermissionDenied(
      setDoc(doc(nonOwner.db, otherUserDocPath), { lastLogin: serverTimestamp() }, { merge: true })
    );
  } finally {
    await nonOwner.cleanup();
  }
});

test(`authenticated user can read data on ${RULES_TARGET}`, async () => {
  // Admin creates test data
  await getAdminDb().collection(getPublicResourcePath(TEST_DATA_FOLDER, 'collections')).doc(TEST_COLLECTION_ID).set({ testData: 'value' });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const snap = await getDocFromServer(doc(context.db, TEST_COLLECTION_PATH));
    assert.ok(snap.exists(), 'Should be readable by authenticated user');
  } finally {
    await context.cleanup();
  }
});

test(`user can read config public and then read matched dataFolder data on ${RULES_TARGET}`, async () => {
  await getAdminDb().collection(getPublicResourcePath(TEST_DATA_FOLDER, 'collections')).doc(TEST_COLLECTION_ID).set({ testData: 'value' });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const configSnap = await getDocFromServer(doc(context.db, TEST_CONFIG_PATH));
    assert.ok(configSnap.exists(), 'Public runtime config should be readable');

    const dataFolder = configSnap.data()?.dataFolder;
    assert.equal(dataFolder, TEST_DATA_FOLDER);

    const matchedPath = getPublicResourceDocPath(dataFolder, 'collections', TEST_COLLECTION_ID);
    const dataSnap = await getDocFromServer(doc(context.db, matchedPath));
    assert.ok(dataSnap.exists(), 'Matched dataFolder data should be readable');
    assert.equal(dataSnap.data()?.testData, 'value');
  } finally {
    await context.cleanup();
  }
});

test(`user cannot read data from a folder that does not match public config on ${RULES_TARGET}`, async () => {
  await getAdminDb().collection(getPublicResourcePath(TEST_ALT_DATA_FOLDER_1, 'collections')).doc('test-collection-default1').set({ testData: 'wrong-folder' });
  await getAdminDb().collection(getPublicResourcePath(TEST_ALT_DATA_FOLDER_2, 'collections')).doc('test-collection-default2').set({ testData: 'matched-folder' });
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

test(`collections array is queryable (allowed folder): insert 1 item then query it`, async () => {
  const collectionsArrayPath = getPublicResourcePath(TEST_DATA_FOLDER, 'collections');
  const testDocId = `test-collection-${Date.now()}`;

  // Insert exactly one document for this test run
  const adminDb = getAdminDb();
  await adminDb.collection(collectionsArrayPath).doc(testDocId).set({
    name: 'test-collection',
  });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const q = query(
      collection(context.db, collectionsArrayPath),
      where(documentId(), '==', testDocId)
    );
    const snapshot = await getDocs(q);

    assert.equal(snapshot.size, 1, 'Query should return exactly 1 document');
    assert.equal(snapshot.docs[0].id, testDocId);
    assert.equal(snapshot.docs[0].data().name, 'test-collection');
  } finally {
    await adminDb.collection(collectionsArrayPath).doc(testDocId).delete();
    await context.cleanup();
  }
});

test(`items query reproduces the frontend getItems shape on ${RULES_TARGET}`, async () => {
  const itemsPath = getPublicResourcePath(TEST_DATA_FOLDER, 'items');
  const testCollectionId = `test-items-collection-${Date.now()}`;
  const firstDocId = `item-a-${Date.now()}`;
  const secondDocId = `item-b-${Date.now()}`;
  const adminDb = getAdminDb();

  await adminDb.collection(itemsPath).doc(firstDocId).set({
    name: 'First item',
    userId: TEST_USER_ID,
    collectionId: testCollectionId,
    createdAt: admin.firestore.Timestamp.fromMillis(1_700_000_000_000),
  });
  await adminDb.collection(itemsPath).doc(secondDocId).set({
    name: 'Second item',
    userId: TEST_USER_ID,
    collectionId: testCollectionId,
    createdAt: admin.firestore.Timestamp.fromMillis(1_700_000_001_000),
  });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const q = query(
      collection(context.db, itemsPath),
      where('collectionId', '==', testCollectionId),
      orderBy('createdAt', 'desc'),
      orderBy('__name__', 'asc')
    );

    if (RULES_TARGET === 'live') {
      await expectFailedPrecondition(getDocs(q));
      return;
    }

    const snapshot = await getDocs(q);
    assert.equal(snapshot.size, 2, 'Emulator should allow the getItems query shape');
  } finally {
    await adminDb.collection(itemsPath).doc(firstDocId).delete().catch(() => undefined);
    await adminDb.collection(itemsPath).doc(secondDocId).delete().catch(() => undefined);
    await context.cleanup();
  }
});

test(`collections array is not queryable (wrong folder): query should be denied`, async () => {
  const wrongCollectionsArrayPath = getPublicResourcePath(TEST_ALT_DATA_FOLDER_1, 'collections');
  const testDocId = `test-collection-${Date.now()}`;

  // Create a doc in the wrong folder; config still points at TEST_DATA_FOLDER ('default')
  const adminDb = getAdminDb();
  await adminDb.collection(wrongCollectionsArrayPath).doc(testDocId).set({
    name: 'test-collection',
  });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const q = query(
      collection(context.db, wrongCollectionsArrayPath),
      where(documentId(), '==', testDocId)
    );
    await expectPermissionDenied(getDocs(q));
  } finally {
    await adminDb.collection(wrongCollectionsArrayPath).doc(testDocId).delete();
    await context.cleanup();
  }
});

test(`users public: owner can set and update nickname field on ${RULES_TARGET}`, async () => {
  const userDocPath = getPublicResourceDocPath(TEST_DATA_FOLDER, 'users', TEST_USER_ID);

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Create user with nickname
    await assert.doesNotReject(
      setDoc(doc(owner.db, userDocPath), {
        name: 'Me',
        nickname: 'alice_cool',
        visibility: { public: false },
      })
    );

    const snap1 = await getDocFromServer(doc(owner.db, userDocPath));
    assert.equal(snap1.data()?.nickname, 'alice_cool', 'Owner should be able to set nickname');

    // Update nickname
    await assert.doesNotReject(
      setDoc(
        doc(owner.db, userDocPath),
        { nickname: 'alice_awesome' },
        { merge: true }
      )
    );

    const snap2 = await getDocFromServer(doc(owner.db, userDocPath));
    assert.equal(snap2.data()?.nickname, 'alice_awesome', 'Owner should be able to update nickname');

    // Remove nickname
    await assert.doesNotReject(
      setDoc(
        doc(owner.db, userDocPath),
        { nickname: null },
        { merge: true }
      )
    );

    const snap3 = await getDocFromServer(doc(owner.db, userDocPath));
    assert.equal(snap3.data()?.nickname, null, 'Owner should be able to remove nickname');
  } finally {
    await owner.cleanup();
  }
});

test(`users public: owner cannot set empty nickname on ${RULES_TARGET}`, async () => {
  const userDocPath = getPublicResourceDocPath(TEST_DATA_FOLDER, 'users', TEST_USER_ID);

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Seed valid user first
    await setDoc(doc(owner.db, userDocPath), {
      name: 'Me',
      nickname: 'alice_cool',
      visibility: { public: false },
    });

    // Try to set empty nickname
    await expectPermissionDenied(
      setDoc(
        doc(owner.db, userDocPath),
        { nickname: '' },
        { merge: true }
      )
    );
  } finally {
    await owner.cleanup();
  }
});

test(`users public: non-owner cannot set or modify someone else's nickname on ${RULES_TARGET}`, async () => {
  const otherUserId = 'someone-else-nickname';
  const otherUserDocPath = getPublicResourceDocPath(TEST_DATA_FOLDER, 'users', otherUserId);

  // Seed other user's doc via admin
  await getAdminDb().doc(otherUserDocPath).set({
    name: 'Other',
    nickname: 'other_cool',
    visibility: { public: false },
  });

  const nonOwner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(
        doc(nonOwner.db, otherUserDocPath),
        { nickname: 'hax_nickname' },
        { merge: true }
      )
    );
  } finally {
    await nonOwner.cleanup();
  }
});

test(`nicknameIndex: authenticated user can read any nickname entry on ${RULES_TARGET}`, async () => {
  const nicknameIndexPath = getPublicResourcePath(TEST_DATA_FOLDER, 'nicknameIndex');
  const nicknamePath = joinPath(nicknameIndexPath, 'alice_cool');

  // Seed via admin
  await getAdminDb().doc(nicknamePath).set({ userId: 'user-alice' });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const snap = await getDocFromServer(doc(context.db, nicknamePath));
    assert.ok(snap.exists(), 'Authenticated user should be able to read nickname entry');
    assert.equal(snap.data()?.userId, 'user-alice');
  } finally {
    await context.cleanup();
  }
});

test(`nicknameIndex: owner can create nickname entry only if it contains their own userId on ${RULES_TARGET}`, async () => {
  const nicknameIndexPath = getPublicResourcePath(TEST_DATA_FOLDER, 'nicknameIndex');
  const ownNicknamePath = joinPath(nicknameIndexPath, 'alice_cool');
  const otherNicknamePath = joinPath(nicknameIndexPath, 'bob_cool');

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Create own nickname entry
    await assert.doesNotReject(
      setDoc(doc(owner.db, ownNicknamePath), { userId: TEST_USER_ID })
    );

    // Try to create someone else's nickname entry
    await expectPermissionDenied(
      setDoc(doc(owner.db, otherNicknamePath), { userId: 'someone-else' })
    );

    // Try to create nickname with wrong userId
    await expectPermissionDenied(
      setDoc(doc(owner.db, ownNicknamePath), { userId: 'wrong-user-id' })
    );
  } finally {
    await owner.cleanup();
  }
});

test(`nicknameIndex: owner can only delete nickname entry if they own it on ${RULES_TARGET}`, async () => {
  const nicknameIndexPath = getPublicResourcePath(TEST_DATA_FOLDER, 'nicknameIndex');
  const ownNicknamePath = joinPath(nicknameIndexPath, 'alice_cool');
  const otherNicknamePath = joinPath(nicknameIndexPath, 'bob_cool');

  // Seed entries via admin
  await getAdminDb().doc(ownNicknamePath).set({ userId: TEST_USER_ID });
  await getAdminDb().doc(otherNicknamePath).set({ userId: 'someone-else' });

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Delete own nickname entry
    await assert.doesNotReject(deleteDoc(doc(owner.db, ownNicknamePath)));

    // Try to delete someone else's nickname entry
    await expectPermissionDenied(deleteDoc(doc(owner.db, otherNicknamePath)));
  } finally {
    await owner.cleanup();
  }
});

test(`nicknameIndex: non-owner cannot read or modify nicknameIndex from non-configured folder on ${RULES_TARGET}`, async () => {
  const nicknameIndexPath = getPublicResourcePath(TEST_ALT_DATA_FOLDER_1, 'nicknameIndex');
  const nicknamePath = joinPath(nicknameIndexPath, 'alice_cool');

  // Seed via admin in the non-configured folder
  await getAdminDb().doc(nicknamePath).set({ userId: TEST_USER_ID });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // config dataFolder remains 'default', so this should be denied
    await expectPermissionDenied(getDocFromServer(doc(context.db, nicknamePath)));
    await expectPermissionDenied(
      setDoc(doc(context.db, nicknamePath), { userId: TEST_USER_ID }, { merge: true })
    );
  } finally {
    await context.cleanup();
  }
});

test(`users public: owner cannot set visibility to public without nickname on ${RULES_TARGET}`, async () => {
  const userDocPath = getPublicResourceDocPath(TEST_DATA_FOLDER, 'users', TEST_USER_ID);

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Try to create user with public visibility but no nickname
    await expectPermissionDenied(
      setDoc(doc(owner.db, userDocPath), {
        name: 'Me',
        visibility: { public: true },
      })
    );

    // Seed user with private visibility and no nickname
    await setDoc(doc(owner.db, userDocPath), {
      name: 'Me',
      visibility: { public: false },
    });

    // Try to set visibility to public without adding nickname
    await expectPermissionDenied(
      setDoc(
        doc(owner.db, userDocPath),
        { visibility: { public: true } },
        { merge: true }
      )
    );

    // But can set public if we add a nickname
    await assert.doesNotReject(
      setDoc(
        doc(owner.db, userDocPath),
        { visibility: { public: true }, nickname: 'alice_cool' },
        { merge: true }
      )
    );

    const snap = await getDocFromServer(doc(owner.db, userDocPath));
    assert.equal(snap.data()?.visibility?.public, true, 'Should be able to set public with nickname');
    assert.equal(snap.data()?.nickname, 'alice_cool', 'Nickname should be set');
  } finally {
    await owner.cleanup();
  }
});

test(`users public: owner can set visibility to private without nickname on ${RULES_TARGET}`, async () => {
  const userDocPath = getPublicResourceDocPath(TEST_DATA_FOLDER, 'users', TEST_USER_ID);

  // Seed user with public visibility and nickname via admin
  await getAdminDb().doc(userDocPath).set({
    name: 'Public User',
    visibility: { public: true },
    nickname: 'alice_cool',
  });

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Owner can set visibility to private (nickname not required for private)
    await assert.doesNotReject(
      setDoc(
        doc(owner.db, userDocPath),
        { visibility: { public: false } },
        { merge: true }
      )
    );

    const snap = await getDocFromServer(doc(owner.db, userDocPath));
    assert.equal(snap.data()?.visibility?.public, false, 'Should be able to set private');
    assert.equal(snap.data()?.nickname, 'alice_cool', 'Nickname should remain');
  } finally {
    await owner.cleanup();
  }
});

test(`nicknameIndex: admin can create/read/update/delete any nickname entry on ${RULES_TARGET}`, async () => {
  const nicknameIndexPath = getPublicResourcePath(TEST_DATA_FOLDER, 'nicknameIndex');
  const nicknamePath = joinPath(nicknameIndexPath, 'admin_nickname');

  const admin = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    // Admin can create
    await assert.doesNotReject(
      setDoc(doc(admin.db, nicknamePath), { userId: 'any-user' })
    );

    // Admin can read
    const snap = await getDocFromServer(doc(admin.db, nicknamePath));
    assert.ok(snap.exists(), 'Admin should be able to read nickname entry');

    // Admin can update
    await assert.doesNotReject(
      setDoc(doc(admin.db, nicknamePath), { userId: 'other-user' }, { merge: true })
    );

    // Admin can delete
    await assert.doesNotReject(deleteDoc(doc(admin.db, nicknamePath)));
  } finally {
    await admin.cleanup();
  }
});
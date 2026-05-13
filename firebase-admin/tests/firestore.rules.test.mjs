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
const TEST_ENV = 'test';
const TEST_DATA_FOLDER = 'default';
const TEST_ALT_DATA_FOLDER_1 = 'default1';
const TEST_ALT_DATA_FOLDER_2 = 'default2';
const ROOT_COLLECTION = 'docs';

const TEST_DATA_TEST_PATH = `${ROOT_COLLECTION}/${TEST_ENV}/testData/rulesSmoke/adminOnlyWrite/doc`;
const TEST_CONFIG_PATH = `${ROOT_COLLECTION}/${TEST_ENV}/config/runtime`;
const TEST_COLLECTION_ID = 'test-collection-1';
const TEST_USER_ID = 'rules-regular-user';

const joinPath = (...segments) => segments.filter(Boolean).join('/');

const getCollectionsArrayPath = (folder) =>
  joinPath(ROOT_COLLECTION, TEST_ENV, 'data', folder, 'collections');
const getCollectionsDocPath = (folder, docId) =>
  joinPath(getCollectionsArrayPath(folder), docId);

const TEST_COLLECTION_PATH = getCollectionsDocPath(TEST_DATA_FOLDER, TEST_COLLECTION_ID);
const TEST_ALT_COLLECTION_PATH_1 = getCollectionsDocPath(TEST_ALT_DATA_FOLDER_1, 'test-collection-default1');
const TEST_ALT_COLLECTION_PATH_2 = getCollectionsDocPath(TEST_ALT_DATA_FOLDER_2, 'test-collection-default2');
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
      setDoc(doc(context.db, joinPath(ROOT_COLLECTION, TEST_ENV, 'data', 'items', 'items', 'test-item-1')), {
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
          joinPath(ROOT_COLLECTION, TEST_ENV, 'data', TEST_DATA_FOLDER, 'unknown-type', 'doc-1')
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
  const ownDocPath = joinPath(
    ROOT_COLLECTION,
    TEST_ENV,
    'data',
    TEST_DATA_FOLDER,
    'authorized-users',
    ownEmail
  );
  const otherDocPath = joinPath(
    ROOT_COLLECTION,
    TEST_ENV,
    'data',
    TEST_DATA_FOLDER,
    'authorized-users',
    otherEmail
  );

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
  const authorizedUsersCollectionPath = joinPath(
    ROOT_COLLECTION,
    TEST_ENV,
    'data',
    TEST_DATA_FOLDER,
    'authorized-users'
  );

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

test(`users: owner can create/get/update own doc on ${RULES_TARGET}`, async () => {
  const userDocPath = joinPath(
    ROOT_COLLECTION,
    TEST_ENV,
    'data',
    TEST_DATA_FOLDER,
    'users',
    TEST_USER_ID
  );

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(setDoc(doc(owner.db, userDocPath), { displayName: 'Me' }));

    const snap = await getDocFromServer(doc(owner.db, userDocPath));
    assert.ok(snap.exists(), 'Owner should be able to get their user doc');

    await assert.doesNotReject(setDoc(doc(owner.db, userDocPath), { displayName: 'Me2' }, { merge: true }));
  } finally {
    await owner.cleanup();
  }
});

test(`users: non-owner cannot get/create/update someone else's doc on ${RULES_TARGET}`, async () => {
  const otherUserId = 'someone-else';
  const otherUserDocPath = joinPath(
    ROOT_COLLECTION,
    TEST_ENV,
    'data',
    TEST_DATA_FOLDER,
    'users',
    otherUserId
  );

  // Seed other user's doc via admin
  await getAdminDb().doc(otherUserDocPath).set({ displayName: 'Other' });

  const nonOwner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(getDocFromServer(doc(nonOwner.db, otherUserDocPath)));
    await expectPermissionDenied(setDoc(doc(nonOwner.db, otherUserDocPath), { displayName: 'Hax' }));
    await expectPermissionDenied(setDoc(doc(nonOwner.db, otherUserDocPath), { displayName: 'Hax2' }, { merge: true }));
  } finally {
    await nonOwner.cleanup();
  }
});

test(`users: owner cannot access user doc in non-configured folder on ${RULES_TARGET}`, async () => {
  const wrongFolderUserDocPath = joinPath(
    ROOT_COLLECTION,
    TEST_ENV,
    'data',
    TEST_ALT_DATA_FOLDER_1,
    'users',
    TEST_USER_ID
  );

  // Seed via admin in the wrong folder
  await getAdminDb().doc(wrongFolderUserDocPath).set({ displayName: 'WrongFolder' });

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // config dataFolder remains 'default', so this should be denied
    await expectPermissionDenied(getDocFromServer(doc(owner.db, wrongFolderUserDocPath)));
    await expectPermissionDenied(setDoc(doc(owner.db, wrongFolderUserDocPath), { displayName: 'Nope' }, { merge: true }));
  } finally {
    await owner.cleanup();
  }
});

test(`users: delete is admin-only on ${RULES_TARGET}`, async () => {
  const usersCollectionPath = joinPath(
    ROOT_COLLECTION,
    TEST_ENV,
    'data',
    TEST_DATA_FOLDER,
    'users'
  );
  const userDocPath = joinPath(usersCollectionPath, TEST_USER_ID);
  await getAdminDb().doc(userDocPath).set({ displayName: 'Seed' });

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

test(`users visibility: anyone can get a public user, but not a private one on ${RULES_TARGET}`, async () => {
  const usersCollectionPath = joinPath(
    ROOT_COLLECTION,
    TEST_ENV,
    'data',
    TEST_DATA_FOLDER,
    'users'
  );

  const publicUserId = `public-user-${Date.now()}`;
  const privateUserId = `private-user-${Date.now()}`;
  const publicUserDocPath = joinPath(usersCollectionPath, publicUserId);
  const privateUserDocPath = joinPath(usersCollectionPath, privateUserId);

  await getAdminDb().doc(publicUserDocPath).set({
    displayName: 'Public User',
    visibility: { public: true },
  });
  await getAdminDb().doc(privateUserDocPath).set({
    displayName: 'Private User',
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

test(`users visibility: only owner can update own visibility on ${RULES_TARGET}`, async () => {
  const usersCollectionPath = joinPath(
    ROOT_COLLECTION,
    TEST_ENV,
    'data',
    TEST_DATA_FOLDER,
    'users'
  );

  const ownerId = `owner-${Date.now()}`;
  const otherId = `other-${Date.now()}`;
  const ownerDocPath = joinPath(usersCollectionPath, ownerId);
  const otherDocPath = joinPath(usersCollectionPath, otherId);

  // Seed both docs
  await getAdminDb().doc(ownerDocPath).set({
    displayName: 'Owner',
    visibility: { public: false },
  });
  await getAdminDb().doc(otherDocPath).set({
    displayName: 'Other',
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
  const usersCollectionPath = joinPath(
    ROOT_COLLECTION,
    TEST_ENV,
    'data',
    TEST_DATA_FOLDER,
    'users'
  );

  const publicUserId = `public-user-${Date.now()}`;
  const privateUserId = `private-user-${Date.now()}`;
  await getAdminDb().doc(joinPath(usersCollectionPath, publicUserId)).set({
    displayName: 'Public User',
    visibility: { public: true },
  });
  await getAdminDb().doc(joinPath(usersCollectionPath, privateUserId)).set({
    displayName: 'Private User',
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

test(`authenticated user can read data on ${RULES_TARGET}`, async () => {
  // Admin creates test data
  await getAdminDb().collection(getCollectionsArrayPath(TEST_DATA_FOLDER)).doc(TEST_COLLECTION_ID).set({ testData: 'value' });

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
  await getAdminDb().collection(getCollectionsArrayPath(TEST_DATA_FOLDER)).doc(TEST_COLLECTION_ID).set({ testData: 'value' });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const configSnap = await getDocFromServer(doc(context.db, TEST_CONFIG_PATH));
    assert.ok(configSnap.exists(), 'Public runtime config should be readable');

    const dataFolder = configSnap.data()?.dataFolder;
    assert.equal(dataFolder, TEST_DATA_FOLDER);

    const matchedPath = getCollectionsDocPath(dataFolder, TEST_COLLECTION_ID);
    const dataSnap = await getDocFromServer(doc(context.db, matchedPath));
    assert.ok(dataSnap.exists(), 'Matched dataFolder data should be readable');
    assert.equal(dataSnap.data()?.testData, 'value');
  } finally {
    await context.cleanup();
  }
});

test(`user cannot read data from a folder that does not match public config on ${RULES_TARGET}`, async () => {
  await getAdminDb().collection(getCollectionsArrayPath(TEST_ALT_DATA_FOLDER_1)).doc('test-collection-default1').set({ testData: 'wrong-folder' });
  await getAdminDb().collection(getCollectionsArrayPath(TEST_ALT_DATA_FOLDER_2)).doc('test-collection-default2').set({ testData: 'matched-folder' });
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
      doc(context.db, getCollectionsDocPath(TEST_ALT_DATA_FOLDER_2, 'test-collection-default2'))
    );
    assert.ok(matchedSnap.exists(), 'Configured folder data should stay readable');
  } finally {
    await context.cleanup();
  }
});

test(`collections array is queryable (allowed folder): insert 1 item then query it`, async () => {
  const collectionsArrayPath = getCollectionsArrayPath(TEST_DATA_FOLDER);
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

test(`collections array is not queryable (wrong folder): query should be denied`, async () => {
  const wrongCollectionsArrayPath = getCollectionsArrayPath(TEST_ALT_DATA_FOLDER_1);
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
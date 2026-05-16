/**
 * INFRASTRUCTURE & CROSS-CUTTING RULES TEST SUITE
 *
 * Test Checklist:
 * ADMIN & CONFIG PATHS
 * [x] 1.1 Admin can write to test/testData/rulesSmoke (admin-only)
 * [x] 1.2 Non-admin cannot write to test data path
 * [x] 1.3 Admin can write to test/config/public/runtime
 * [x] 1.4 Non-admin cannot write to test config path
 *
 * DATAFOLDER VALIDATION
 * [x] 2.1 User can write to matched dataFolder
 * [x] 2.2 User cannot write to non-matched dataFolder
 * [x] 2.3 User cannot write to unknown resourceType
 *
 * DATA READING (Cross-cutting)
 * [x] 3.1 Authenticated user can read data
 * [x] 3.2 User can read config public and then read matched dataFolder data
 * [x] 3.3 User cannot read data from folder that does not match public config
 *
 * NOTE: Authorized-users and Users collection tests have been moved to their
 * dedicated test files (firestore.rules.authorized-users.test.mjs and
 * firestore.rules.users.test.mjs). Collections-specific tests are in
 * firestore.rules.collections.test.mjs.
 */

import 'dotenv/config';

import test from 'node:test';
import assert from 'node:assert/strict';

import admin from 'firebase-admin';

import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import {
  RULES_TARGET,
  TEST_ROOT,
  TEST_DATA_FOLDER,
  TEST_CONFIG_PATH,
  createAdminApp,
  getAdminDb as sharedGetAdminDb,
  buildClientContext as sharedBuildClientContext,
  buildUnauthenticatedClientContext,
  cleanupTestDocs as sharedCleanupTestDocs,
  expectPermissionDenied,
  acquireSuiteLock,
  joinPath,
  getPublicResourcePath,
  getPublicResourceDocPath,
} from './test-utils.mjs';

const TEST_ALT_DATA_FOLDER_1 = 'default1';
const TEST_ALT_DATA_FOLDER_2 = 'default2';

const TEST_DATA_TEST_PATH = `${TEST_ROOT}/testData/rulesSmoke/adminOnlyWrite/doc/smokeDoc`;
const TEST_COLLECTION_ID = 'test-collection-1';
const TEST_USER_ID = 'rules-regular-user';

const TEST_COLLECTION_PATH = getPublicResourceDocPath(
  TEST_DATA_FOLDER,
  'collections',
  TEST_COLLECTION_ID
);
const TEST_ALT_COLLECTION_PATH_1 = getPublicResourceDocPath(
  TEST_ALT_DATA_FOLDER_1,
  'collections',
  'test-collection-default1'
);
const TEST_ALT_COLLECTION_PATH_2 = getPublicResourceDocPath(
  TEST_ALT_DATA_FOLDER_2,
  'collections',
  'test-collection-default2'
);

// Cleanup paths for infrastructure tests only (removed authorized-users and users paths)
const miscCleanupDocPaths = [
  TEST_DATA_TEST_PATH,
  TEST_COLLECTION_PATH,
  TEST_ALT_COLLECTION_PATH_1,
  TEST_ALT_COLLECTION_PATH_2,
];

const adminApp = createAdminApp('misc');
const getAdminDb = () => sharedGetAdminDb(adminApp);
const buildClientContext = (options) =>
  sharedBuildClientContext(adminApp, options);
const cleanupTestDocs = (extraDocPaths = []) =>
  sharedCleanupTestDocs(adminApp, extraDocPaths);
const releaseSuiteLock = await acquireSuiteLock();

test.beforeEach(async () => {
  await cleanupTestDocs(miscCleanupDocPaths);

  // Initialize config with dataFolder value AFTER cleanup
  const adminDb = getAdminDb();
  await adminDb
    .doc(TEST_CONFIG_PATH)
    .set({ dataFolder: TEST_DATA_FOLDER }, { merge: true });
});

test.after(async () => {
  await cleanupTestDocs(miscCleanupDocPaths);
  if (adminApp) {
    await adminApp.delete();
  }
  releaseSuiteLock();
});

test(`[1.1 Admin & Config] admin can write into ${TEST_DATA_TEST_PATH} on ${RULES_TARGET}`, async () => {
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
test(`[1.2 Admin & Config] non-admin cannot write into ${TEST_DATA_TEST_PATH} on ${RULES_TARGET}`, async () => {
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

test(`[1.3 Admin & Config] admin can write into ${TEST_CONFIG_PATH} on ${RULES_TARGET}`, async () => {
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

test(`[1.4 Admin & Config] non-admin cannot write into ${TEST_CONFIG_PATH} on ${RULES_TARGET}`, async () => {
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

test(`[2.1 DataFolder Validation] user can write to matched dataFolder on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Should succeed because dataFolder is 'default'
    await assert.doesNotReject(
      setDoc(doc(context.db, TEST_COLLECTION_PATH), {
        userId: TEST_USER_ID,
        name: 'Test Collection',
        visibility: { public: true },
        createdAt: serverTimestamp(),
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.2 DataFolder Validation] user cannot write to non-matched dataFolder on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Should fail because dataFolder is 'default', not 'items'
    await expectPermissionDenied(
      setDoc(
        doc(
          context.db,
          joinPath(
            TEST_ROOT,
            'data',
            'items',
            'public',
            'collections',
            'test-item-1'
          )
        ),
        {
          userId: TEST_USER_ID,
          visibility: { public: true },
          createdAt: serverTimestamp(),
        }
      )
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.3 DataFolder Validation] user cannot write to unknown resourceType on ${RULES_TARGET}`, async () => {
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
          joinPath(
            TEST_ROOT,
            'data',
            TEST_DATA_FOLDER,
            'public',
            'unknown-type',
            'doc-1'
          )
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

test(`[3.1 Data Reading] authenticated user can read data on ${RULES_TARGET}`, async () => {
  // Admin creates test data
  await getAdminDb()
    .collection(getPublicResourcePath(TEST_DATA_FOLDER, 'collections'))
    .doc(TEST_COLLECTION_ID)
    .set({
      userId: TEST_USER_ID,
      visibility: { public: true },
      createdAt: admin.firestore.Timestamp.now(),
    });

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

test(`[3.2 Data Reading] user can read config public and then read matched dataFolder data on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .collection(getPublicResourcePath(TEST_DATA_FOLDER, 'collections'))
    .doc(TEST_COLLECTION_ID)
    .set({
      userId: TEST_USER_ID,
      visibility: { public: true },
      createdAt: admin.firestore.Timestamp.now(),
    });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const configSnap = await getDocFromServer(
      doc(context.db, TEST_CONFIG_PATH)
    );
    assert.ok(configSnap.exists(), 'Public runtime config should be readable');

    const dataFolder = configSnap.data()?.dataFolder;
    assert.equal(dataFolder, TEST_DATA_FOLDER);

    const matchedPath = getPublicResourceDocPath(
      dataFolder,
      'collections',
      TEST_COLLECTION_ID
    );
    const dataSnap = await getDocFromServer(doc(context.db, matchedPath));
    assert.ok(dataSnap.exists(), 'Matched dataFolder data should be readable');
    assert.equal(dataSnap.data()?.userId, TEST_USER_ID);
  } finally {
    await context.cleanup();
  }
});

test(`[3.3 Data Reading] user cannot read data from folder that does not match public config on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .collection(getPublicResourcePath(TEST_ALT_DATA_FOLDER_1, 'collections'))
    .doc('test-collection-default1')
    .set({
      userId: 'wrong-folder',
      visibility: { public: true },
      createdAt: admin.firestore.Timestamp.now(),
    });
  await getAdminDb()
    .collection(getPublicResourcePath(TEST_ALT_DATA_FOLDER_2, 'collections'))
    .doc('test-collection-default2')
    .set({
      userId: 'matched-folder',
      visibility: { public: true },
      createdAt: admin.firestore.Timestamp.now(),
    });

  await getAdminDb()
    .doc(TEST_CONFIG_PATH)
    .set({ dataFolder: TEST_ALT_DATA_FOLDER_2 }, { merge: true });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const configSnap = await getDocFromServer(
      doc(context.db, TEST_CONFIG_PATH)
    );
    assert.ok(configSnap.exists(), 'Public runtime config should be readable');
    assert.equal(configSnap.data()?.dataFolder, TEST_ALT_DATA_FOLDER_2);

    await expectPermissionDenied(
      getDocFromServer(doc(context.db, TEST_ALT_COLLECTION_PATH_1))
    );

    const matchedSnap = await getDocFromServer(
      doc(
        context.db,
        getPublicResourceDocPath(
          TEST_ALT_DATA_FOLDER_2,
          'collections',
          'test-collection-default2'
        )
      )
    );
    assert.ok(
      matchedSnap.exists(),
      'Configured folder data should stay readable'
    );
  } finally {
    await context.cleanup();
  }
});

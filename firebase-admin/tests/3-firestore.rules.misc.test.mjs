/**
 * SUITE 3: INFRASTRUCTURE & CROSS-CUTTING RULES
 *
 * Test Checklist:
 * [x] 3.1.1 - admin can write to test/testData/rulesSmoke
 * [x] 3.1.2 - non-admin cannot write to test data path
 * [x] 3.1.3 - admin can write to test/config/public/runtime
 * [x] 3.1.4 - non-admin cannot write to test config path
 * [x] 3.1.5 - USERS (non-testers) cannot access /test folder
 * [x] 3.1.6 - TESTERS cannot access /main folder
 * [x] 3.1.7 - unauthenticated cannot access /main or /test
 * [x] 3.1.8 - admin with tester claim can access both /main and /test
 * [x] 3.1.9 - admin without tester claim can access both /main and /test
 * [x] 3.2.1 - user can write to matched dataFolder
 * [x] 3.2.2 - user cannot write to non-matched dataFolder
 * [x] 3.2.3 - user cannot write to unknown resourceType
 * [x] 3.3.1 - authenticated user can read data
 * [x] 3.3.2 - user can read config public and then read matched dataFolder data
 * [x] 3.3.3 - user cannot read data from folder that does not match public config
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

const MAIN_CONFIG_PATH = 'main/config/public/runtime';
const MAIN_COLLECTION_PATH = joinPath(
  'main',
  'data',
  TEST_DATA_FOLDER,
  'public',
  'collections',
  'main-test-collection-1'
);

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
  MAIN_COLLECTION_PATH,
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
  await adminDb
    .doc(MAIN_CONFIG_PATH)
    .set({ dataFolder: TEST_DATA_FOLDER }, { merge: true });
});

test.after(async () => {
  await cleanupTestDocs(miscCleanupDocPaths);
  if (adminApp) {
    await adminApp.delete();
  }
  releaseSuiteLock();
});

test(`[3.1.1] admin can write into ${TEST_DATA_TEST_PATH} on ${RULES_TARGET}`, async () => {
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
test(`[3.1.2] non-admin cannot write into ${TEST_DATA_TEST_PATH} on ${RULES_TARGET}`, async () => {
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

test(`[3.1.3] admin can write into ${TEST_CONFIG_PATH} on ${RULES_TARGET}`, async () => {
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

test(`[3.1.4] non-admin cannot write into ${TEST_CONFIG_PATH} on ${RULES_TARGET}`, async () => {
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

test(`[3.1.5] USERS (non-testers) cannot read/write to /test folder on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .doc(TEST_COLLECTION_PATH)
    .set({
      userId: TEST_USER_ID,
      visibility: { public: true },
      createdAt: admin.firestore.Timestamp.now(),
    });

  const context = await buildClientContext({
    uid: 'rules-user-no-tester',
    claims: { admin: false, tester: false },
  });

  try {
    await expectPermissionDenied(
      getDocFromServer(doc(context.db, TEST_CONFIG_PATH))
    );

    await expectPermissionDenied(
      getDocFromServer(doc(context.db, TEST_COLLECTION_PATH))
    );

    await expectPermissionDenied(
      setDoc(doc(context.db, TEST_DATA_TEST_PATH), {
        createdBy: 'rules-user-no-tester',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[3.1.6] TESTERS cannot read/write to /main folder on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .doc(MAIN_COLLECTION_PATH)
    .set({
      userId: TEST_USER_ID,
      visibility: { public: true },
      createdAt: admin.firestore.Timestamp.now(),
    });

  const context = await buildClientContext({
    uid: 'rules-tester-user',
    claims: { admin: false, tester: true },
  });

  try {
    await expectPermissionDenied(
      getDocFromServer(doc(context.db, MAIN_CONFIG_PATH))
    );

    await expectPermissionDenied(
      getDocFromServer(doc(context.db, MAIN_COLLECTION_PATH))
    );

    await expectPermissionDenied(
      setDoc(doc(context.db, MAIN_CONFIG_PATH), {
        dataFolder: 'test',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[3.1.7] unauthenticated cannot read/write to /main or /test on ${RULES_TARGET}`, async () => {
  const context = await buildUnauthenticatedClientContext(adminApp);

  try {
    // Try to write to /main
    await expectPermissionDenied(
      setDoc(doc(context.db, MAIN_CONFIG_PATH), {
        dataFolder: 'test',
      })
    );

    // Try to write to /test
    await expectPermissionDenied(
      setDoc(doc(context.db, TEST_DATA_TEST_PATH), {
        createdBy: 'unauthenticated',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[3.1.8] admin with tester claim can read/write to both /main and /test on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: 'rules-admin-tester',
    claims: { admin: true, tester: true },
  });

  try {
    // Should succeed for /main
    await assert.doesNotReject(
      setDoc(doc(context.db, MAIN_CONFIG_PATH), {
        dataFolder: 'tested-by-admin-tester',
      })
    );

    // Should succeed for /test
    await assert.doesNotReject(
      setDoc(doc(context.db, TEST_DATA_TEST_PATH), {
        createdBy: 'rules-admin-tester',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[3.1.9] admin without tester claim can read/write to both /main and /test on ${RULES_TARGET}`, async () => {
  const context = await buildClientContext({
    uid: 'rules-admin-no-tester',
    claims: { admin: true, tester: false },
  });

  try {
    // Should succeed for /main
    await assert.doesNotReject(
      setDoc(doc(context.db, MAIN_CONFIG_PATH), {
        dataFolder: 'tested-by-admin-no-tester',
      })
    );

    // Should succeed for /test
    await assert.doesNotReject(
      setDoc(doc(context.db, TEST_DATA_TEST_PATH), {
        createdBy: 'rules-admin-no-tester',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[3.2.1] user can write to matched dataFolder on ${RULES_TARGET}`, async () => {
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

test(`[3.2.2] user cannot write to non-matched dataFolder on ${RULES_TARGET}`, async () => {
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

test(`[3.2.3] user cannot write to unknown resourceType on ${RULES_TARGET}`, async () => {
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

test(`[3.3.1] authenticated user can read data on ${RULES_TARGET}`, async () => {
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

test(`[3.3.2] user can read config public and then read matched dataFolder data on ${RULES_TARGET}`, async () => {
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

test(`[3.3.3] user cannot read data from folder that does not match public config on ${RULES_TARGET}`, async () => {
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

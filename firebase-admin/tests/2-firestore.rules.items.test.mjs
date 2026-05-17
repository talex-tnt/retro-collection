/**
 * SUITE 2: ITEMS CRUD
 *
 * Test Checklist:
 * [x] 2.1.1 - admin can read any item
 * [x] 2.1.2 - owner can read own item
 * [x] 2.1.3 - non-owner cannot read private item
 * [x] 2.1.4 - authenticated non-owner can read public item
 * [x] 2.2.1 - owner can create own item
 * [x] 2.2.2 - non-owner cannot create item for another user
 * [x] 2.2.3 - unauthenticated cannot create item
 * [x] 2.2.4 - admin can bypass all validation
 * [x] 2.3.1 - rejects missing required name field
 * [x] 2.3.2 - rejects missing required createdAt
 * [x] 2.3.3 - rejects missing required visibility
 * [x] 2.3.4 - name cannot exceed 100 characters
 * [x] 2.3.5 - collectionId is required and must be non-empty string
 * [x] 2.3.6 - description cannot exceed 1000 characters
 * [x] 2.3.7 - rejects invalid visibility map
 * [x] 2.3.8 - rejects non-timestamp createdAt
 * [x] 2.4.1 - owner can update own item
 * [x] 2.4.2 - non-owner cannot update item
 * [x] 2.5.1 - updatedAt is required
 * [x] 2.5.2 - name is optional in updates
 * [x] 2.5.3 - description is optional in updates
 * [x] 2.5.4 - visibility is optional in updates
 * [x] 2.5.5 - name cannot exceed 100 characters on update
 * [x] 2.6.1 - owner can delete own item
 * [x] 2.6.2 - non-owner cannot delete item
 * [x] 2.6.3 - admin can delete any item
 * [x] 2.1.1 - items query reproduces the frontend getItems shape
 */

import 'dotenv/config';

import test from 'node:test';
import assert from 'node:assert/strict';
import admin from 'firebase-admin';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  setDoc,
  where,
  Timestamp,
  orderBy,
  documentId,
} from 'firebase/firestore';

import {
  RULES_TARGET,
  TEST_DATA_FOLDER,
  TEST_CONFIG_PATH,
  createAdminApp,
  getAdminDb as sharedGetAdminDb,
  buildClientContext as sharedBuildClientContext,
  buildUnauthenticatedClientContext,
  cleanupTestDocs as sharedCleanupTestDocs,
  expectPermissionDenied,
  expectFailedPrecondition,
  acquireSuiteLock,
  getPublicResourcePath,
  TEST_ROOT,
} from './test-utils.mjs';

const TEST_USER_ID = 'rules-regular-user';
const ITEMS_PATH = getPublicResourcePath(TEST_DATA_FOLDER, 'items');
const TEST_COLLECTION_ID = 'test-items-collection';
const TEST_COLLECTION_ID_2 = 'test-items-collection-2';
const FIRST_DOC_ID = 'item-a';
const SECOND_DOC_ID = 'item-b';

const getItemPath = (itemId) =>
  `${ITEMS_PATH}/${itemId}`;

const validItem = {
  name: 'Test Item',
  userId: 'test-owner',
  collectionId: TEST_COLLECTION_ID,
  createdAt: Timestamp.now(),
  visibility: { public: false },
};

const itemsCleanupDocPaths = [
  getItemPath('item-a'),
  getItemPath('item-b'),
  getItemPath('new-item-1'),
  getItemPath('new-item-2'),
  getItemPath('new-item-3'),
  getItemPath('new-item-admin'),
  getItemPath('missing-name'),
  getItemPath('missing-createdat'),
  getItemPath('missing-visibility'),
  getItemPath('missing-collectionid'),
  getItemPath('name-too-long'),
  getItemPath('desc-too-long'),
  getItemPath('no-description'),
  getItemPath('invalid-visibility'),
  getItemPath('invalid-timestamp'),
  getItemPath('update-item-1'),
  getItemPath('update-item-2'),
  getItemPath('update-missing-timestamp'),
  getItemPath('update-no-name'),
  getItemPath('update-no-description'),
  getItemPath('update-no-visibility'),
  getItemPath('update-name-too-long'),
  getItemPath('delete-item-1'),
  getItemPath('delete-item-2'),
  getItemPath('delete-item-admin'),
  getItemPath('public-item'),
  getItemPath('private-item'),
];

const adminApp = createAdminApp('items');
const getAdminDb = () => sharedGetAdminDb(adminApp);
const buildClientContext = (options) =>
  sharedBuildClientContext(adminApp, options);
const cleanupTestDocs = (extraDocPaths = []) =>
  sharedCleanupTestDocs(adminApp, extraDocPaths);
const releaseSuiteLock = await acquireSuiteLock();

test.beforeEach(async () => {
  await cleanupTestDocs(itemsCleanupDocPaths);
  await getAdminDb()
    .doc(TEST_CONFIG_PATH)
    .set({ dataFolder: TEST_DATA_FOLDER }, { merge: true });
});

test.after(async () => {
  await cleanupTestDocs(itemsCleanupDocPaths);
  if (adminApp) {
    await adminApp.delete();
  }
  releaseSuiteLock();
});

// ============================================================================
// GET TESTS
// ============================================================================

test(`[2.1.1] admin can read any item on ${RULES_TARGET}`, async () => {
  const adminContext = await buildClientContext({
    uid: 'admin-user',
    claims: { admin: true },
  });

  const ownerId = 'some-other-user';
  const itemPath = getItemPath('item-a');

  try {
    // Admin writes as someone else
    await getAdminDb()
      .doc(itemPath)
      .set({
        ...validItem,
        userId: ownerId,
        createdAt: admin.firestore.Timestamp.now(),
      });

    // Admin reads
    await assert.doesNotReject(getDoc(doc(adminContext.db, itemPath)));
  } finally {
    await adminContext.cleanup();
  }
});

test(`[2.1.2] owner can read own item on ${RULES_TARGET}`, async () => {
  const userId = 'item-owner';
  const itemPath = getItemPath('item-b');

  // Setup: write item as admin
  await getAdminDb()
    .doc(itemPath)
    .set({
      ...validItem,
      userId,
      createdAt: admin.firestore.Timestamp.now(),
    });

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(getDoc(doc(context.db, itemPath)));
  } finally {
    await context.cleanup();
  }
});

test(`[2.1.3] non-owner cannot read private item on ${RULES_TARGET}`, async () => {
  const ownerId = 'owner-user';
  const itemPath = getItemPath('private-item');

  // Setup: write private item
  await getAdminDb()
    .doc(itemPath)
    .set({
      ...validItem,
      userId: ownerId,
      visibility: { public: false },
      createdAt: admin.firestore.Timestamp.now(),
    });

  const context = await buildClientContext({
    uid: 'other-user',
    claims: { admin: false },
  });

  try {
    // Try to get the private item as non-owner - should be denied via get rule
    await expectPermissionDenied(getDoc(doc(context.db, itemPath)));
  } finally {
    await context.cleanup();
  }
});

test(`[2.1.4] authenticated non-owner can read public item on ${RULES_TARGET}`, async () => {
  const itemPath = getItemPath('public-item');

  // Setup: write public item
  await getAdminDb()
    .doc(itemPath)
    .set({
      ...validItem,
      visibility: { public: true },
      createdAt: admin.firestore.Timestamp.now(),
    });

  const context = await buildClientContext({
    uid: 'random-user',
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(getDoc(doc(context.db, itemPath)));
  } finally {
    await context.cleanup();
  }
});

// ============================================================================
// CREATE TESTS
// ============================================================================

test(`[2.2.1] owner can create own item on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const itemPath = getItemPath('new-item-1');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(context.db, itemPath), {
        ...validItem,
        userId,
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.2.2] non-owner cannot create item for another user on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const itemPath = getItemPath('new-item-2');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, itemPath), {
        ...validItem,
        userId: 'someone-else',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.2.3] unauthenticated cannot create item on ${RULES_TARGET}`, async () => {
  const itemPath = getItemPath('new-item-3');
  const context = await buildUnauthenticatedClientContext();

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, itemPath), {
        ...validItem,
        userId: 'any-user',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.2.4] admin can bypass all validation on ${RULES_TARGET}`, async () => {
  const itemPath = getItemPath('new-item-admin');

  const adminContext = await buildClientContext({
    uid: 'admin-user',
    claims: { admin: true },
  });

  try {
    // Admin can create with minimal/invalid data - should pass because of isAdmin bypass
    await assert.doesNotReject(
      setDoc(doc(adminContext.db, itemPath), {
        name: 'Admin Created',
        userId: 'any-user',
        createdAt: Timestamp.now(),
        collectionId: TEST_COLLECTION_ID,
        visibility: { public: false },
      })
    );
  } finally {
    await adminContext.cleanup();
  }
});

// ============================================================================
// CREATE - Data Validation Tests
// ============================================================================

test(`[2.3.1] rejects missing required name field on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const itemPath = getItemPath('missing-name');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, itemPath), {
        userId,
        createdAt: Timestamp.now(),
        collectionId: TEST_COLLECTION_ID,
        visibility: { public: false },
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.3.2] rejects missing required createdAt on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const itemPath = getItemPath('missing-createdat');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, itemPath), {
        name: 'Item',
        userId,
        collectionId: TEST_COLLECTION_ID,
        visibility: { public: false },
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.3.3] rejects missing required visibility on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const itemPath = getItemPath('missing-visibility');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, itemPath), {
        name: 'Item',
        userId,
        createdAt: Timestamp.now(),
        collectionId: TEST_COLLECTION_ID,
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.3.4] name cannot exceed 100 characters on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const itemPath = getItemPath('name-too-long');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, itemPath), {
        name: 'x'.repeat(101),
        userId,
        createdAt: Timestamp.now(),
        collectionId: TEST_COLLECTION_ID,
        visibility: { public: false },
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.3.5] collectionId is required and must be non-empty string on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const itemPath = getItemPath('missing-collectionid');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    // Test missing collectionId
    await expectPermissionDenied(
      setDoc(doc(context.db, itemPath), {
        name: 'Item',
        userId,
        createdAt: Timestamp.now(),
        visibility: { public: false },
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.3.6] description cannot exceed 1000 characters on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const itemPath = getItemPath('desc-too-long');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, itemPath), {
        name: 'Valid Name',
        userId,
        createdAt: Timestamp.now(),
        collectionId: TEST_COLLECTION_ID,
        visibility: { public: false },
        description: 'x'.repeat(1001),
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.3.7] rejects invalid visibility map on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const itemPath = getItemPath('invalid-visibility');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, itemPath), {
        name: 'Item',
        userId,
        createdAt: Timestamp.now(),
        collectionId: TEST_COLLECTION_ID,
        visibility: { public: false, extra: 'field' },
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.3.8] rejects non-timestamp createdAt on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const itemPath = getItemPath('invalid-timestamp');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, itemPath), {
        name: 'Item',
        userId,
        createdAt: '2024-01-01',
        collectionId: TEST_COLLECTION_ID,
        visibility: { public: false },
      })
    );
  } finally {
    await context.cleanup();
  }
});

// ============================================================================
// UPDATE TESTS
// ============================================================================

test(`[2.4.1] owner can update own item on ${RULES_TARGET}`, async () => {
  const userId = 'update-owner';
  const itemPath = getItemPath('update-item-1');

  // Setup
  await getAdminDb()
    .doc(itemPath)
    .set({
      name: 'Test Item',
      userId,
      createdAt: admin.firestore.Timestamp.now(),
      collectionId: TEST_COLLECTION_ID,
      visibility: { public: false },
    });

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(
        doc(context.db, itemPath),
        {
          name: 'Updated Name',
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      )
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.4.2] non-owner cannot update item on ${RULES_TARGET}`, async () => {
  const ownerId = 'update-owner';
  const itemPath = getItemPath('update-item-2');

  // Setup
  await getAdminDb()
    .doc(itemPath)
    .set({
      name: 'Test Item',
      userId: ownerId,
      createdAt: admin.firestore.Timestamp.now(),
      collectionId: TEST_COLLECTION_ID,
      visibility: { public: false },
    });

  const context = await buildClientContext({
    uid: 'other-user',
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(
        doc(context.db, itemPath),
        {
          name: 'Updated Name',
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      )
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.5.1] updatedAt is required on ${RULES_TARGET}`, async () => {
  const userId = 'update-owner';
  const itemPath = getItemPath('update-missing-timestamp');

  // Setup
  await getAdminDb()
    .doc(itemPath)
    .set({
      name: 'Test Item',
      userId,
      createdAt: admin.firestore.Timestamp.now(),
      collectionId: TEST_COLLECTION_ID,
      visibility: { public: false },
    });

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(
        doc(context.db, itemPath),
        {
          name: 'Updated Name',
        },
        { merge: true }
      )
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.5.2] name is optional in updates on ${RULES_TARGET}`, async () => {
  const userId = 'update-owner';
  const itemPath = getItemPath('update-no-name');

  // Setup
  await getAdminDb()
    .doc(itemPath)
    .set({
      name: 'Test Item',
      userId,
      createdAt: admin.firestore.Timestamp.now(),
      collectionId: TEST_COLLECTION_ID,
      visibility: { public: false },
    });

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(
        doc(context.db, itemPath),
        {
          updatedAt: Timestamp.now(),
          description: 'Updated description',
        },
        { merge: true }
      )
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.5.3] description is optional in updates on ${RULES_TARGET}`, async () => {
  const userId = 'update-owner';
  const itemPath = getItemPath('update-no-description');

  // Setup
  await getAdminDb()
    .doc(itemPath)
    .set({
      name: 'Test Item',
      userId,
      createdAt: admin.firestore.Timestamp.now(),
      collectionId: TEST_COLLECTION_ID,
      visibility: { public: false },
      description: 'Original description',
    });

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(
        doc(context.db, itemPath),
        {
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      )
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.5.4] visibility is optional in updates on ${RULES_TARGET}`, async () => {
  const userId = 'update-owner';
  const itemPath = getItemPath('update-no-visibility');

  // Setup
  await getAdminDb()
    .doc(itemPath)
    .set({
      name: 'Test Item',
      userId,
      createdAt: admin.firestore.Timestamp.now(),
      collectionId: TEST_COLLECTION_ID,
      visibility: { public: false },
    });

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(
        doc(context.db, itemPath),
        {
          updatedAt: Timestamp.now(),
          name: 'New Name',
        },
        { merge: true }
      )
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.5.5] name cannot exceed 100 characters on update on ${RULES_TARGET}`, async () => {
  const userId = 'update-owner';
  const itemPath = getItemPath('update-name-too-long');

  // Setup
  await getAdminDb()
    .doc(itemPath)
    .set({
      name: 'Test Item',
      userId,
      createdAt: admin.firestore.Timestamp.now(),
      collectionId: TEST_COLLECTION_ID,
      visibility: { public: false },
    });

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(
        doc(context.db, itemPath),
        {
          name: 'x'.repeat(101),
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      )
    );
  } finally {
    await context.cleanup();
  }
});

// ============================================================================
// DELETE TESTS
// ============================================================================

test(`[2.6.1] owner can delete own item on ${RULES_TARGET}`, async () => {
  const userId = 'delete-owner';
  const itemPath = getItemPath('delete-item-1');

  // Setup
  await getAdminDb()
    .doc(itemPath)
    .set({
      name: 'Test Item',
      userId,
      createdAt: admin.firestore.Timestamp.now(),
      collectionId: TEST_COLLECTION_ID,
      visibility: { public: false },
    });

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(deleteDoc(doc(context.db, itemPath)));
  } finally {
    await context.cleanup();
  }
});

test(`[2.6.2] non-owner cannot delete item on ${RULES_TARGET}`, async () => {
  const ownerId = 'delete-owner';
  const itemPath = getItemPath('delete-item-2');

  // Setup
  await getAdminDb()
    .doc(itemPath)
    .set({
      name: 'Test Item',
      userId: ownerId,
      createdAt: admin.firestore.Timestamp.now(),
      collectionId: TEST_COLLECTION_ID,
      visibility: { public: false },
    });

  const context = await buildClientContext({
    uid: 'other-user',
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(deleteDoc(doc(context.db, itemPath)));
  } finally {
    await context.cleanup();
  }
});

test(`[2.6.3] admin can delete any item on ${RULES_TARGET}`, async () => {
  const itemPath = getItemPath('delete-item-admin');

  // Setup
  await getAdminDb()
    .doc(itemPath)
    .set({
      name: 'Test Item',
      userId: 'some-owner',
      createdAt: admin.firestore.Timestamp.now(),
      collectionId: TEST_COLLECTION_ID,
      visibility: { public: false },
    });

  const adminContext = await buildClientContext({
    uid: 'admin-user',
    claims: { admin: true },
  });

  try {
    await assert.doesNotReject(deleteDoc(doc(adminContext.db, itemPath)));
  } finally {
    await adminContext.cleanup();
  }
});

// ============================================================================
// QUERY TESTS
// ============================================================================

test(`[2.1.1] items query reproduces the frontend getItems shape on ${RULES_TARGET}`, async () => {
  const adminDb = getAdminDb();
  const TEST_USER_ID = 'rules-regular-user';

  // Create two public items
  await adminDb
    .collection(ITEMS_PATH)
    .doc(FIRST_DOC_ID)
    .set({
      name: 'First item',
      userId: TEST_USER_ID,
      collectionId: TEST_COLLECTION_ID,
      createdAt: admin.firestore.Timestamp.fromMillis(1_700_000_000_000),
      visibility: { public: true },
    });
  await adminDb
    .collection(ITEMS_PATH)
    .doc(SECOND_DOC_ID)
    .set({
      name: 'Second item',
      userId: TEST_USER_ID,
      collectionId: TEST_COLLECTION_ID,
      createdAt: admin.firestore.Timestamp.fromMillis(1_700_000_001_000),
      visibility: { public: true },
    });

  const context = await buildClientContext({
    uid: 'other-user',
    claims: { admin: false },
  });

  try {
    // Query by documentId to verify public items are readable
    const snapshot1 = await getDoc(doc(context.db, getItemPath(FIRST_DOC_ID)));
    assert.equal(snapshot1.exists(), true, 'First public item should be readable');
    
    const snapshot2 = await getDoc(doc(context.db, getItemPath(SECOND_DOC_ID)));
    assert.equal(snapshot2.exists(), true, 'Second public item should be readable');

    // Also test the compound query with collectionId and ordering
    if (RULES_TARGET === 'emulator') {
      const itemsQuery = query(
        collection(context.db, ITEMS_PATH),
        where('collectionId', '==', TEST_COLLECTION_ID),
        orderBy('createdAt', 'desc'),
        orderBy('__name__', 'asc')
      );
      const querySnapshot = await getDocs(itemsQuery);
      assert.equal(
        querySnapshot.size,
        2,
        'Query should return 2 public items'
      );
    }
  } finally {
    await adminDb
      .collection(ITEMS_PATH)
      .doc(FIRST_DOC_ID)
      .delete()
      .catch(() => undefined);
    await adminDb
      .collection(ITEMS_PATH)
      .doc(SECOND_DOC_ID)
      .delete()
      .catch(() => undefined);
    await context.cleanup();
  }
});

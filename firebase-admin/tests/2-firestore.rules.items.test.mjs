/**
 * SUITE 2: ITEMS QUERIES
 *
 * Test Checklist:
 * [x] 2.1.1 - items query reproduces the frontend getItems shape
 */

import 'dotenv/config';

import test from 'node:test';
import assert from 'node:assert/strict';
import admin from 'firebase-admin';

import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import {
  RULES_TARGET,
  TEST_DATA_FOLDER,
  TEST_CONFIG_PATH,
  createAdminApp,
  getAdminDb as sharedGetAdminDb,
  buildClientContext as sharedBuildClientContext,
  cleanupTestDocs as sharedCleanupTestDocs,
  expectFailedPrecondition,
  acquireSuiteLock,
  getPublicResourcePath,
} from './test-utils.mjs';

const TEST_USER_ID = 'rules-regular-user';
const ITEMS_PATH = getPublicResourcePath(TEST_DATA_FOLDER, 'items');
const TEST_COLLECTION_ID = 'test-items-collection';
const FIRST_DOC_ID = 'item-a';
const SECOND_DOC_ID = 'item-b';
const itemsCleanupDocPaths = [
  `${ITEMS_PATH}/${FIRST_DOC_ID}`,
  `${ITEMS_PATH}/${SECOND_DOC_ID}`,
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

test(`[2.1.1] items query reproduces the frontend getItems shape on ${RULES_TARGET}`, async () => {
  const adminDb = getAdminDb();

  await adminDb
    .collection(ITEMS_PATH)
    .doc(FIRST_DOC_ID)
    .set({
      name: 'First item',
      userId: TEST_USER_ID,
      collectionId: TEST_COLLECTION_ID,
      createdAt: admin.firestore.Timestamp.fromMillis(1_700_000_000_000),
    });
  await adminDb
    .collection(ITEMS_PATH)
    .doc(SECOND_DOC_ID)
    .set({
      name: 'Second item',
      userId: TEST_USER_ID,
      collectionId: TEST_COLLECTION_ID,
      createdAt: admin.firestore.Timestamp.fromMillis(1_700_000_001_000),
    });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const itemsQuery = query(
      collection(context.db, ITEMS_PATH),
      where('collectionId', '==', TEST_COLLECTION_ID),
      orderBy('createdAt', 'desc'),
      orderBy('__name__', 'asc')
    );

    if (RULES_TARGET === 'live') {
      await expectFailedPrecondition(getDocs(itemsQuery));
      return;
    }

    const snapshot = await getDocs(itemsQuery);
    assert.equal(
      snapshot.size,
      2,
      'Emulator should allow the getItems query shape'
    );
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

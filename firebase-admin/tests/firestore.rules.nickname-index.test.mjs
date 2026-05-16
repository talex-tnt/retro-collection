import 'dotenv/config';

import test from 'node:test';
import assert from 'node:assert/strict';

import { deleteDoc, doc, getDocFromServer, setDoc } from 'firebase/firestore';

import {
  RULES_TARGET,
  TEST_DATA_FOLDER,
  TEST_CONFIG_PATH,
  createAdminApp,
  getAdminDb as sharedGetAdminDb,
  buildClientContext as sharedBuildClientContext,
  cleanupTestDocs as sharedCleanupTestDocs,
  expectPermissionDenied,
  acquireSuiteLock,
  joinPath,
  getPublicResourcePath,
} from './test-utils.mjs';

const TEST_ALT_DATA_FOLDER_1 = 'default1';
const TEST_USER_ID = 'rules-regular-user';
const NICKNAME_INDEX_PATH = getPublicResourcePath(
  TEST_DATA_FOLDER,
  'nicknameIndex'
);
const ALT_NICKNAME_INDEX_PATH = getPublicResourcePath(
  TEST_ALT_DATA_FOLDER_1,
  'nicknameIndex'
);
const OWN_NICKNAME_PATH = joinPath(NICKNAME_INDEX_PATH, 'alice_cool');
const OTHER_NICKNAME_PATH = joinPath(NICKNAME_INDEX_PATH, 'bob_cool');
const ADMIN_NICKNAME_PATH = joinPath(NICKNAME_INDEX_PATH, 'admin_nickname');
const ALT_NICKNAME_PATH = joinPath(ALT_NICKNAME_INDEX_PATH, 'alice_cool');

const nicknameCleanupDocPaths = [
  OWN_NICKNAME_PATH,
  OTHER_NICKNAME_PATH,
  ADMIN_NICKNAME_PATH,
  ALT_NICKNAME_PATH,
];

const adminApp = createAdminApp('nickname-index');
const getAdminDb = () => sharedGetAdminDb(adminApp);
const buildClientContext = (options) =>
  sharedBuildClientContext(adminApp, options);
const cleanupTestDocs = (extraDocPaths = []) =>
  sharedCleanupTestDocs(adminApp, extraDocPaths);
const releaseSuiteLock = await acquireSuiteLock();

test.beforeEach(async () => {
  await cleanupTestDocs(nicknameCleanupDocPaths);
  await getAdminDb()
    .doc(TEST_CONFIG_PATH)
    .set({ dataFolder: TEST_DATA_FOLDER }, { merge: true });
});

test.after(async () => {
  await cleanupTestDocs(nicknameCleanupDocPaths);
  if (adminApp) {
    await adminApp.delete();
  }
  releaseSuiteLock();
});

test(`nicknameIndex: authenticated user can read any nickname entry on ${RULES_TARGET}`, async () => {
  await getAdminDb().doc(OWN_NICKNAME_PATH).set({ userId: 'user-alice' });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const snap = await getDocFromServer(doc(context.db, OWN_NICKNAME_PATH));
    assert.ok(
      snap.exists(),
      'Authenticated user should be able to read nickname entry'
    );
    assert.equal(snap.data()?.userId, 'user-alice');
  } finally {
    await context.cleanup();
  }
});

test(`nicknameIndex: owner can create nickname entry only if it contains their own userId on ${RULES_TARGET}`, async () => {
  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(owner.db, OWN_NICKNAME_PATH), { userId: TEST_USER_ID })
    );

    await expectPermissionDenied(
      setDoc(doc(owner.db, OTHER_NICKNAME_PATH), { userId: 'someone-else' })
    );

    await expectPermissionDenied(
      setDoc(doc(owner.db, OWN_NICKNAME_PATH), { userId: 'wrong-user-id' })
    );
  } finally {
    await owner.cleanup();
  }
});

test(`nicknameIndex: owner can only delete nickname entry if they own it on ${RULES_TARGET}`, async () => {
  await getAdminDb().doc(OWN_NICKNAME_PATH).set({ userId: TEST_USER_ID });
  await getAdminDb().doc(OTHER_NICKNAME_PATH).set({ userId: 'someone-else' });

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(deleteDoc(doc(owner.db, OWN_NICKNAME_PATH)));
    await expectPermissionDenied(deleteDoc(doc(owner.db, OTHER_NICKNAME_PATH)));
  } finally {
    await owner.cleanup();
  }
});

test(`nicknameIndex: non-owner cannot read or modify nicknameIndex from non-configured folder on ${RULES_TARGET}`, async () => {
  await getAdminDb().doc(ALT_NICKNAME_PATH).set({ userId: TEST_USER_ID });

  const context = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      getDocFromServer(doc(context.db, ALT_NICKNAME_PATH))
    );
    await expectPermissionDenied(
      setDoc(
        doc(context.db, ALT_NICKNAME_PATH),
        { userId: TEST_USER_ID },
        { merge: true }
      )
    );
  } finally {
    await context.cleanup();
  }
});

test(`nicknameIndex: admin can create/read/update/delete any nickname entry on ${RULES_TARGET}`, async () => {
  const adminUser = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(adminUser.db, ADMIN_NICKNAME_PATH), { userId: 'any-user' })
    );

    const snap = await getDocFromServer(doc(adminUser.db, ADMIN_NICKNAME_PATH));
    assert.ok(snap.exists(), 'Admin should be able to read nickname entry');

    await assert.doesNotReject(
      setDoc(
        doc(adminUser.db, ADMIN_NICKNAME_PATH),
        { userId: 'other-user' },
        { merge: true }
      )
    );

    await assert.doesNotReject(
      deleteDoc(doc(adminUser.db, ADMIN_NICKNAME_PATH))
    );
  } finally {
    await adminUser.cleanup();
  }
});

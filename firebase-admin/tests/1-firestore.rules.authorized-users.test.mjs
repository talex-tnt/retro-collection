/**
 * SUITE 1: AUTHORIZED-USERS ACCESS CONTROL
 *
 * Test Checklist:
 * [x] 1.1.1 - admin-only read/write
 * [x] 1.1.2 - legacy root collection query is denied
 * [x] 1.1.3 - admin can list from canonical docs-root path
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
  setDoc,
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
  acquireSuiteLock,
  joinPath,
  getAuthorizedUsersPath,
} from './test-utils.mjs';

const OWN_EMAIL = 'self@example.com';
const OTHER_EMAIL = 'other@example.com';
const AUTHORIZED_USERS_COLLECTION_PATH =
  getAuthorizedUsersPath(TEST_DATA_FOLDER);
const OWN_DOC_PATH = joinPath(AUTHORIZED_USERS_COLLECTION_PATH, OWN_EMAIL);
const OTHER_DOC_PATH = joinPath(AUTHORIZED_USERS_COLLECTION_PATH, OTHER_EMAIL);
const authorizedUsersCleanupDocPaths = [OWN_DOC_PATH, OTHER_DOC_PATH];

const adminApp = createAdminApp('authorized-users');
const getAdminDb = () => sharedGetAdminDb(adminApp);
const buildClientContext = (options) =>
  sharedBuildClientContext(adminApp, options);
const cleanupTestDocs = (extraDocPaths = []) =>
  sharedCleanupTestDocs(adminApp, extraDocPaths);
const releaseSuiteLock = await acquireSuiteLock();

test.beforeEach(async () => {
  await cleanupTestDocs(authorizedUsersCleanupDocPaths);
  await getAdminDb()
    .doc(TEST_CONFIG_PATH)
    .set({ dataFolder: TEST_DATA_FOLDER }, { merge: true });
});

test.after(async () => {
  await cleanupTestDocs(authorizedUsersCleanupDocPaths);
  if (adminApp) {
    await adminApp.delete();
  }
  releaseSuiteLock();
});

test(`[1.1.1] authorized-users is admin-only read/write on ${RULES_TARGET}`, async () => {
  await getAdminDb().doc(OWN_DOC_PATH).set({ allowed: true });
  await getAdminDb().doc(OTHER_DOC_PATH).set({ allowed: true });

  const unauth = await buildUnauthenticatedClientContext();
  try {
    await expectPermissionDenied(
      getDocFromServer(doc(unauth.db, OWN_DOC_PATH))
    );
  } finally {
    await unauth.cleanup();
  }

  const nonAdmin = await buildClientContext({
    uid: 'rules-regular-user',
    claims: { admin: false, authEmail: OWN_EMAIL },
  });

  try {
    const ownSnap = await getDocFromServer(doc(nonAdmin.db, OWN_DOC_PATH));
    assert.ok(
      ownSnap.exists(),
      'Non-admin should be able to read own authorized-users doc'
    );

    await expectPermissionDenied(
      getDocFromServer(doc(nonAdmin.db, OTHER_DOC_PATH))
    );

    await expectPermissionDenied(
      setDoc(doc(nonAdmin.db, OWN_DOC_PATH), { allowed: true })
    );
  } finally {
    await nonAdmin.cleanup();
  }

  const adminUser = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(adminUser.db, OWN_DOC_PATH), { allowed: true })
    );

    const snap = await getDocFromServer(doc(adminUser.db, OWN_DOC_PATH));
    assert.ok(
      snap.exists(),
      'Admin should be able to read authorized-users doc'
    );
    assert.equal(snap.data()?.allowed, true);
  } finally {
    await adminUser.cleanup();
  }
});

test(`[1.1.2] authorized-users: legacy root collection query is denied (repro getAuthorizedUsers error) on ${RULES_TARGET}`, async () => {
  const adminUser = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    await expectPermissionDenied(
      getDocs(collection(adminUser.db, 'authorized-users'))
    );
  } finally {
    await adminUser.cleanup();
  }
});

test(`[1.1.3] authorized-users: admin can list from canonical docs-root path on ${RULES_TARGET}`, async () => {
  const seededEmail = `seeded-${Date.now()}@example.com`;
  const seededDocPath = joinPath(AUTHORIZED_USERS_COLLECTION_PATH, seededEmail);

  await getAdminDb().doc(seededDocPath).set({
    allowed: true,
    seededAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const adminUser = await buildClientContext({
    uid: 'rules-admin-user',
    claims: { admin: true },
  });

  try {
    const snap = await getDocs(
      collection(adminUser.db, AUTHORIZED_USERS_COLLECTION_PATH)
    );
    assert.ok(snap.size >= 1, 'Admin should be able to list authorized-users');
    assert.ok(
      snap.docs.some((docSnap) => docSnap.id === seededEmail),
      'Seeded authorized user should be present'
    );
  } finally {
    await adminUser.cleanup();
  }
});

test(`[1.1.4] non-admin user with matching email or authEmail claim can read their own authorized-users doc in main env and correct folder`, async () => {
  const email = 'test@gmail.com';
  const anotherEmail = 'test2@gmail.com';
  const docPath = joinPath(getAuthorizedUsersPath(TEST_DATA_FOLDER), email);
  const anotherEmailDocPath = joinPath(
    getAuthorizedUsersPath(TEST_DATA_FOLDER),
    anotherEmail
  );
  await getAdminDb().doc(docPath).set({ allowed: true });
  await getAdminDb().doc(anotherEmailDocPath).set({ allowed: true });

  let passed = false;
  // Try with 'email' claim
  const nonAdminEmail = await buildClientContext({
    uid: 'rules-nonadmin-user-email',
    claims: { admin: false, email },
  });
  try {
    const snap = await getDocFromServer(doc(nonAdminEmail.db, docPath));
    if (snap.exists()) {
      assert.equal(snap.data()?.allowed, true);
      passed = true;
    }
  } catch (e) {
    // ignore
  } finally {
    await nonAdminEmail.cleanup();
  }

  // Try with 'authEmail' claim
  const nonAdminAuthEmail = await buildClientContext({
    uid: 'rules-nonadmin-user-authEmail',
    claims: { admin: false, authEmail: email },
  });
  try {
    const snap = await getDocFromServer(doc(nonAdminAuthEmail.db, docPath));
    if (snap.exists()) {
      assert.equal(snap.data()?.allowed, true);
      passed = true;
    }
  } catch (e) {
    // ignore
  } finally {
    await nonAdminAuthEmail.cleanup();
  }
  assert.ok(
    passed,
    'Non-admin should be able to read their own authorized-users doc if email or authEmail matches'
  );

  const forbiddenContext = await buildClientContext({
    uid: 'rules-nonadmin-user-email',
    claims: { admin: false, email },
  });
  try {
    await expectPermissionDenied(
      getDocFromServer(doc(forbiddenContext.db, anotherEmailDocPath))
    );
  } finally {
    await forbiddenContext.cleanup();
  }
});

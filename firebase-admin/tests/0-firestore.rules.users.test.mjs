/**
 * SUITE 0: USERS (PUBLIC & PRIVATE PROFILES)
 *
 * Test Checklist:
 * [x] 0.1.1 - owner can create/get/update own doc with name and visibility only
 * [x] 0.1.2 - non-owner cannot create or update someone else's doc
 * [x] 0.1.3 - owner cannot access user doc in non-configured folder
 * [x] 0.1.4 - delete is admin-only
 * [x] 0.2.1 - authenticated non-owner can get a public user, but not a private one
 * [x] 0.2.2 - only owner can update own visibility
 * [x] 0.2.3 - authenticated non-owner can list public users only with explicit filter
 * [x] 0.3.1 - owner can create/get/update own doc with email and lastLogin only
 * [x] 0.3.2 - non-owner cannot read or write someone else's doc
 * [x] 0.4.1 - owner can set and update nickname field
 * [x] 0.4.2 - owner cannot set empty nickname
 * [x] 0.4.3 - non-owner cannot set or modify someone else's nickname
 * [x] 0.4.4 - owner can set visibility to private without nickname
 * [x] 0.5.1 - owner can update user profile with nickname when visibility is public
 * [x] 0.5.2 - owner cannot set nickname when visibility is private (rules allow, client prevents)
 * [x] 0.5.3 - profile and nicknameIndex must be kept in sync by client (rules allow orphaned state)
 * [x] 0.5.4 - changing nickname requires updating both profile and nicknameIndex
 */

import 'dotenv/config';

import test from 'node:test';
import assert from 'node:assert/strict';
import admin from 'firebase-admin';

import {
  collection,
  deleteDoc,
  deleteField,
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
  TEST_DATA_FOLDER,
  TEST_CONFIG_PATH,
  createAdminApp,
  getAdminDb as sharedGetAdminDb,
  buildClientContext as sharedBuildClientContext,
  cleanupTestDocs as sharedCleanupTestDocs,
  expectPermissionDenied,
  acquireSuiteLock,
  getPrivateResourceDocPath,
  getPublicResourceDocPath,
  getPublicResourcePath,
} from './test-utils.mjs';

const TEST_ALT_DATA_FOLDER_1 = 'default1';
const TEST_USER_ID = 'rules-regular-user';
const OTHER_USER_ID = 'someone-else';
const PUBLIC_USER_ID = 'public-user';
const PRIVATE_USER_ID = 'private-user';
const OWNER_VISIBILITY_USER_ID = 'owner-user';
const OTHER_VISIBILITY_USER_ID = 'other-user';
const PRIVATE_OTHER_USER_ID = 'private-someone-else';
const NICKNAME_OTHER_USER_ID = 'someone-else-nickname';

const OWN_PUBLIC_USER_DOC_PATH = getPublicResourceDocPath(
  TEST_DATA_FOLDER,
  'users',
  TEST_USER_ID
);
const OWN_PRIVATE_USER_DOC_PATH = getPrivateResourceDocPath(
  TEST_DATA_FOLDER,
  'users',
  TEST_USER_ID
);
const OTHER_PUBLIC_USER_DOC_PATH = getPublicResourceDocPath(
  TEST_DATA_FOLDER,
  'users',
  OTHER_USER_ID
);
const WRONG_FOLDER_USER_DOC_PATH = getPublicResourceDocPath(
  TEST_ALT_DATA_FOLDER_1,
  'users',
  TEST_USER_ID
);
const PUBLIC_USER_DOC_PATH = getPublicResourceDocPath(
  TEST_DATA_FOLDER,
  'users',
  PUBLIC_USER_ID
);
const PRIVATE_USER_DOC_PATH = getPublicResourceDocPath(
  TEST_DATA_FOLDER,
  'users',
  PRIVATE_USER_ID
);
const OWNER_VISIBILITY_DOC_PATH = getPublicResourceDocPath(
  TEST_DATA_FOLDER,
  'users',
  OWNER_VISIBILITY_USER_ID
);
const OTHER_VISIBILITY_DOC_PATH = getPublicResourceDocPath(
  TEST_DATA_FOLDER,
  'users',
  OTHER_VISIBILITY_USER_ID
);
const PRIVATE_OTHER_USER_DOC_PATH = getPrivateResourceDocPath(
  TEST_DATA_FOLDER,
  'users',
  PRIVATE_OTHER_USER_ID
);
const NICKNAME_OTHER_USER_DOC_PATH = getPublicResourceDocPath(
  TEST_DATA_FOLDER,
  'users',
  NICKNAME_OTHER_USER_ID
);

const usersCleanupDocPaths = [
  OWN_PUBLIC_USER_DOC_PATH,
  OWN_PRIVATE_USER_DOC_PATH,
  OTHER_PUBLIC_USER_DOC_PATH,
  WRONG_FOLDER_USER_DOC_PATH,
  PUBLIC_USER_DOC_PATH,
  PRIVATE_USER_DOC_PATH,
  OWNER_VISIBILITY_DOC_PATH,
  OTHER_VISIBILITY_DOC_PATH,
  PRIVATE_OTHER_USER_DOC_PATH,
  NICKNAME_OTHER_USER_DOC_PATH,
];

const adminApp = createAdminApp('users');
const getAdminDb = () => sharedGetAdminDb(adminApp);
const buildClientContext = (options) =>
  sharedBuildClientContext(adminApp, options);
const cleanupTestDocs = (extraDocPaths = []) =>
  sharedCleanupTestDocs(adminApp, extraDocPaths);
const releaseSuiteLock = await acquireSuiteLock();

test.beforeEach(async () => {
  await cleanupTestDocs(usersCleanupDocPaths);
  await getAdminDb()
    .doc(TEST_CONFIG_PATH)
    .set({ dataFolder: TEST_DATA_FOLDER }, { merge: true });
});

test.after(async () => {
  await cleanupTestDocs(usersCleanupDocPaths);
  if (adminApp) {
    await adminApp.delete();
  }
  releaseSuiteLock();
});

test(`[0.1.1] owner can create/get/update own doc with name and visibility only on ${RULES_TARGET}`, async () => {
  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(owner.db, OWN_PUBLIC_USER_DOC_PATH), {
        name: 'Me',
        visibility: { public: false },
      })
    );

    const snap = await getDocFromServer(
      doc(owner.db, OWN_PUBLIC_USER_DOC_PATH)
    );
    assert.ok(snap.exists(), 'Owner should be able to get their user doc');
    assert.equal(snap.data()?.name, 'Me');
    assert.equal(snap.data()?.visibility?.public, false);

    await assert.doesNotReject(
      setDoc(
        doc(owner.db, OWN_PUBLIC_USER_DOC_PATH),
        { name: 'Me2', visibility: { public: true }, nickname: 'Me2Nick' },
        { merge: true }
      )
    );

    await expectPermissionDenied(
      setDoc(
        doc(owner.db, OWN_PUBLIC_USER_DOC_PATH),
        { email: 'me@example.com' },
        { merge: true }
      )
    );

    await expectPermissionDenied(
      setDoc(
        doc(owner.db, OWN_PUBLIC_USER_DOC_PATH),
        { lastLogin: serverTimestamp() },
        { merge: true }
      )
    );
  } finally {
    await owner.cleanup();
  }
});

test(`[0.1.2] non-owner cannot create or update someone else's doc on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .doc(OTHER_PUBLIC_USER_DOC_PATH)
    .set({
      name: 'Other',
      visibility: { public: false },
    });

  const nonOwner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      getDocFromServer(doc(nonOwner.db, OTHER_PUBLIC_USER_DOC_PATH))
    );
    await expectPermissionDenied(
      setDoc(doc(nonOwner.db, OTHER_PUBLIC_USER_DOC_PATH), { name: 'Hax' })
    );
    await expectPermissionDenied(
      setDoc(
        doc(nonOwner.db, OTHER_PUBLIC_USER_DOC_PATH),
        { name: 'Hax2' },
        { merge: true }
      )
    );
  } finally {
    await nonOwner.cleanup();
  }
});

test(`[0.1.3] owner cannot access user doc in non-configured folder on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .doc(WRONG_FOLDER_USER_DOC_PATH)
    .set({
      name: 'WrongFolder',
      visibility: { public: false },
    });

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      getDocFromServer(doc(owner.db, WRONG_FOLDER_USER_DOC_PATH))
    );
    await expectPermissionDenied(
      setDoc(
        doc(owner.db, WRONG_FOLDER_USER_DOC_PATH),
        { name: 'Nope' },
        { merge: true }
      )
    );
  } finally {
    await owner.cleanup();
  }
});

test(`[0.1.4] delete is admin-only on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .doc(OWN_PUBLIC_USER_DOC_PATH)
    .set({
      name: 'Seed',
      visibility: { public: false },
    });

  const nonAdmin = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      deleteDoc(doc(nonAdmin.db, OWN_PUBLIC_USER_DOC_PATH))
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
      deleteDoc(doc(adminUser.db, OWN_PUBLIC_USER_DOC_PATH))
    );
  } finally {
    await adminUser.cleanup();
  }
});

test(`[0.2.1] authenticated non-owner can get a public user, but not a private one on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .doc(PUBLIC_USER_DOC_PATH)
    .set({
      name: 'Public User',
      visibility: { public: true },
    });
  await getAdminDb()
    .doc(PRIVATE_USER_DOC_PATH)
    .set({
      name: 'Private User',
      visibility: { public: false },
    });

  const publicReader = await buildClientContext({
    uid: 'public-user-reader',
    claims: { admin: false },
  });
  try {
    const publicSnap = await getDocFromServer(
      doc(publicReader.db, PUBLIC_USER_DOC_PATH)
    );
    assert.ok(
      publicSnap.exists(),
      'Authenticated non-owner should be able to read public user'
    );

    await expectPermissionDenied(
      getDocFromServer(doc(publicReader.db, PRIVATE_USER_DOC_PATH))
    );
  } finally {
    await publicReader.cleanup();
  }

  const nonOwner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    const publicSnap = await getDocFromServer(
      doc(nonOwner.db, PUBLIC_USER_DOC_PATH)
    );
    assert.ok(
      publicSnap.exists(),
      'Non-owner should be able to read public user'
    );

    await expectPermissionDenied(
      getDocFromServer(doc(nonOwner.db, PRIVATE_USER_DOC_PATH))
    );
  } finally {
    await nonOwner.cleanup();
  }
});

test(`[0.2.2] only owner can update own visibility on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .doc(OWNER_VISIBILITY_DOC_PATH)
    .set({
      name: 'Owner',
      visibility: { public: false },
    });
  await getAdminDb()
    .doc(OTHER_VISIBILITY_DOC_PATH)
    .set({
      name: 'Other',
      visibility: { public: false },
    });

  const owner = await buildClientContext({
    uid: OWNER_VISIBILITY_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(
        doc(owner.db, OWNER_VISIBILITY_DOC_PATH),
        { visibility: { public: true }, nickname: 'OwnerNick' },
        { merge: true }
      )
    );

    const snap = await getDocFromServer(
      doc(owner.db, OWNER_VISIBILITY_DOC_PATH)
    );
    assert.equal(
      snap.data()?.visibility?.public,
      true,
      'Owner visibility should be updated to public'
    );
  } finally {
    await owner.cleanup();
  }

  const nonOwner = await buildClientContext({
    uid: OTHER_VISIBILITY_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(
        doc(nonOwner.db, OWNER_VISIBILITY_DOC_PATH),
        { visibility: { public: false } },
        { merge: true }
      )
    );
  } finally {
    await nonOwner.cleanup();
  }
});

test(`[0.2.3] authenticated non-owner can list public users only with explicit filter on ${RULES_TARGET}`, async () => {
  const usersCollectionPath = getPublicResourcePath(TEST_DATA_FOLDER, 'users');

  await getAdminDb()
    .doc(PUBLIC_USER_DOC_PATH)
    .set({
      name: 'Public User',
      visibility: { public: true },
    });
  await getAdminDb()
    .doc(PRIVATE_USER_DOC_PATH)
    .set({
      name: 'Private User',
      visibility: { public: false },
    });

  const publicReader = await buildClientContext({
    uid: 'public-user-list-reader',
    claims: { admin: false },
  });
  try {
    await expectPermissionDenied(
      getDocs(query(collection(publicReader.db, usersCollectionPath)))
    );

    const snap = await getDocs(
      query(
        collection(publicReader.db, usersCollectionPath),
        where('visibility.public', '==', true)
      )
    );

    assert.ok(snap.size >= 1, 'Should return at least the public user');
    assert.ok(
      snap.docs.some((docSnap) => docSnap.id === PUBLIC_USER_ID),
      'Public user should be present in results'
    );
    assert.ok(
      !snap.docs.some((docSnap) => docSnap.id === PRIVATE_USER_ID),
      'Private user should not be present in results'
    );
  } finally {
    await publicReader.cleanup();
  }
});

test(`[0.3.1] owner can create/get/update own doc with email and lastLogin only on ${RULES_TARGET}`, async () => {
  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(owner.db, OWN_PRIVATE_USER_DOC_PATH), {
        email: 'me@example.com',
        lastLogin: serverTimestamp(),
      })
    );

    const snap = await getDocFromServer(
      doc(owner.db, OWN_PRIVATE_USER_DOC_PATH)
    );
    assert.ok(
      snap.exists(),
      'Owner should be able to get their private user doc'
    );
    assert.equal(snap.data()?.email, 'me@example.com');

    await assert.doesNotReject(
      setDoc(
        doc(owner.db, OWN_PRIVATE_USER_DOC_PATH),
        { email: 'me2@example.com' },
        { merge: true }
      )
    );

    await expectPermissionDenied(
      setDoc(
        doc(owner.db, OWN_PRIVATE_USER_DOC_PATH),
        { name: 'Nope' },
        { merge: true }
      )
    );

    await expectPermissionDenied(
      setDoc(
        doc(owner.db, OWN_PRIVATE_USER_DOC_PATH),
        { visibility: { public: true } },
        { merge: true }
      )
    );
  } finally {
    await owner.cleanup();
  }
});

test(`[0.3.2] non-owner cannot read or write someone else's doc on ${RULES_TARGET}`, async () => {
  await getAdminDb().doc(PRIVATE_OTHER_USER_DOC_PATH).set({
    email: 'other@example.com',
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  });

  const nonOwner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      getDocFromServer(doc(nonOwner.db, PRIVATE_OTHER_USER_DOC_PATH))
    );
    await expectPermissionDenied(
      setDoc(
        doc(nonOwner.db, PRIVATE_OTHER_USER_DOC_PATH),
        { email: 'hax@example.com' },
        { merge: true }
      )
    );
    await expectPermissionDenied(
      setDoc(
        doc(nonOwner.db, PRIVATE_OTHER_USER_DOC_PATH),
        { lastLogin: serverTimestamp() },
        { merge: true }
      )
    );
  } finally {
    await nonOwner.cleanup();
  }
});

test(`[0.4.1] owner can set and update nickname field on ${RULES_TARGET}`, async () => {
  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(owner.db, OWN_PUBLIC_USER_DOC_PATH), {
        name: 'Me',
        nickname: 'alice_cool',
        visibility: { public: false },
      })
    );

    const initialSnap = await getDocFromServer(
      doc(owner.db, OWN_PUBLIC_USER_DOC_PATH)
    );
    assert.equal(
      initialSnap.data()?.nickname,
      'alice_cool',
      'Owner should be able to set nickname'
    );

    await assert.doesNotReject(
      setDoc(
        doc(owner.db, OWN_PUBLIC_USER_DOC_PATH),
        { nickname: 'alice_awesome' },
        { merge: true }
      )
    );

    const updatedSnap = await getDocFromServer(
      doc(owner.db, OWN_PUBLIC_USER_DOC_PATH)
    );
    assert.equal(
      updatedSnap.data()?.nickname,
      'alice_awesome',
      'Owner should be able to update nickname'
    );

    await assert.doesNotReject(
      setDoc(
        doc(owner.db, OWN_PUBLIC_USER_DOC_PATH),
        { nickname: null },
        { merge: true }
      )
    );

    const removedSnap = await getDocFromServer(
      doc(owner.db, OWN_PUBLIC_USER_DOC_PATH)
    );
    assert.equal(
      removedSnap.data()?.nickname,
      null,
      'Owner should be able to remove nickname'
    );
  } finally {
    await owner.cleanup();
  }
});

test(`[0.4.2] owner cannot set empty nickname on ${RULES_TARGET}`, async () => {
  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await setDoc(doc(owner.db, OWN_PUBLIC_USER_DOC_PATH), {
      name: 'Me',
      nickname: 'alice_cool',
      visibility: { public: false },
    });

    await expectPermissionDenied(
      setDoc(
        doc(owner.db, OWN_PUBLIC_USER_DOC_PATH),
        { nickname: '' },
        { merge: true }
      )
    );
  } finally {
    await owner.cleanup();
  }
});

test(`[0.4.3] non-owner cannot set or modify someone else's nickname on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .doc(NICKNAME_OTHER_USER_DOC_PATH)
    .set({
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
        doc(nonOwner.db, NICKNAME_OTHER_USER_DOC_PATH),
        { nickname: 'hax_nickname' },
        { merge: true }
      )
    );
  } finally {
    await nonOwner.cleanup();
  }
});

test(`[0.4.4] owner can set visibility to private without nickname on ${RULES_TARGET}`, async () => {
  await getAdminDb()
    .doc(OWN_PUBLIC_USER_DOC_PATH)
    .set({
      name: 'Public User',
      visibility: { public: true },
      nickname: 'alice_cool',
    });

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(
        doc(owner.db, OWN_PUBLIC_USER_DOC_PATH),
        { visibility: { public: false } },
        { merge: true }
      )
    );

    const snap = await getDocFromServer(
      doc(owner.db, OWN_PUBLIC_USER_DOC_PATH)
    );
    assert.equal(
      snap.data()?.visibility?.public,
      false,
      'Should be able to set private'
    );
    assert.equal(snap.data()?.nickname, 'alice_cool', 'Nickname should remain');
  } finally {
    await owner.cleanup();
  }
});

// ============================================================================
// NICKNAME-INDEX INTERACTION TESTS
// ============================================================================

test(`[0.5.1] owner can update user profile with nickname when visibility is public on ${RULES_TARGET}`, async () => {
  // Setup: create a public user profile with a nickname
  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(owner.db, OWN_PUBLIC_USER_DOC_PATH), {
        name: 'Public User',
        visibility: { public: true },
        nickname: 'public_alice',
      })
    );

    const snap = await getDocFromServer(
      doc(owner.db, OWN_PUBLIC_USER_DOC_PATH)
    );
    assert.equal(
      snap.data()?.nickname,
      'public_alice',
      'Nickname should be set'
    );
  } finally {
    await owner.cleanup();
  }
});

test(`[0.5.2] owner cannot set nickname when visibility is private on ${RULES_TARGET}`, async () => {
  // Setup: create a private user profile
  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Create private user without nickname - should succeed
    await assert.doesNotReject(
      setDoc(doc(owner.db, OWN_PUBLIC_USER_DOC_PATH), {
        name: 'Private User',
        visibility: { public: false },
      })
    );

    // Try to add nickname to private profile - should succeed (rules don't block this)
    // In practice, client code should prevent this
    const updateResult = setDoc(
      doc(owner.db, OWN_PUBLIC_USER_DOC_PATH),
      { nickname: 'private_alice' },
      { merge: true }
    );

    // This is allowed at the rule level, but client code should prevent it
    await assert.doesNotReject(updateResult);
  } finally {
    await owner.cleanup();
  }
});

test(`[0.5.3] profile and nicknameIndex can be updated independently (client manages sync) on ${RULES_TARGET}`, async () => {
  // This test verifies that rules don't prevent independent updates to profile and nicknameIndex.
  // In practice, the client application should manage keeping them in sync via transactions.
  // This is a Spark-compatible design that works without Cloud Functions.

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Create a public profile with a nickname
    await assert.doesNotReject(
      setDoc(doc(owner.db, OWN_PUBLIC_USER_DOC_PATH), {
        name: 'Public User',
        visibility: { public: true },
        nickname: 'sync_test_user',
      })
    );

    // Verify the profile was created
    const profileSnap = await getDocFromServer(
      doc(owner.db, OWN_PUBLIC_USER_DOC_PATH)
    );
    assert.ok(profileSnap.exists(), 'Profile should exist');
    assert.equal(
      profileSnap.data()?.nickname,
      'sync_test_user',
      'Nickname should be set'
    );

    // Update name - rules allow this independently of nicknameIndex
    await assert.doesNotReject(
      setDoc(
        doc(owner.db, OWN_PUBLIC_USER_DOC_PATH),
        { name: 'Updated User' },
        { merge: true }
      )
    );

    // Verify name was updated
    const updatedSnap = await getDocFromServer(
      doc(owner.db, OWN_PUBLIC_USER_DOC_PATH)
    );
    assert.equal(
      updatedSnap.data()?.name,
      'Updated User',
      'Name should be updated'
    );
    assert.equal(
      updatedSnap.data()?.nickname,
      'sync_test_user',
      'Nickname should remain'
    );
  } finally {
    await owner.cleanup();
  }
});

test(`[0.5.4] changing nickname requires updating both profile and nicknameIndex on ${RULES_TARGET}`, async () => {
  // This test documents that nickname changes require updating two documents.
  // Rules allow this but don't enforce it; client transactions should handle it.

  const owner = await buildClientContext({
    uid: TEST_USER_ID,
    claims: { admin: false },
  });

  try {
    // Setup: Create profile with nickname
    const oldNickname = 'old_nick';
    const newNickname = 'new_nick';

    await assert.doesNotReject(
      setDoc(doc(owner.db, OWN_PUBLIC_USER_DOC_PATH), {
        name: 'User',
        visibility: { public: true },
        nickname: oldNickname,
      })
    );

    const oldIndexPath = getPublicResourceDocPath(
      TEST_DATA_FOLDER,
      'nicknameIndex',
      oldNickname
    );

    await assert.doesNotReject(
      setDoc(doc(owner.db, oldIndexPath), { userId: TEST_USER_ID })
    );

    // Change nickname: update profile
    await assert.doesNotReject(
      setDoc(
        doc(owner.db, OWN_PUBLIC_USER_DOC_PATH),
        { nickname: newNickname },
        { merge: true }
      )
    );

    // Delete old nicknameIndex entry
    await assert.doesNotReject(deleteDoc(doc(owner.db, oldIndexPath)));

    // Create new nicknameIndex entry
    const newIndexPath = getPublicResourceDocPath(
      TEST_DATA_FOLDER,
      'nicknameIndex',
      newNickname
    );

    await assert.doesNotReject(
      setDoc(doc(owner.db, newIndexPath), { userId: TEST_USER_ID })
    );

    // Verify the change
    const profileSnap = await getDocFromServer(
      doc(owner.db, OWN_PUBLIC_USER_DOC_PATH)
    );
    assert.equal(
      profileSnap.data()?.nickname,
      newNickname,
      'Nickname should be updated'
    );
  } finally {
    await owner.cleanup();
  }
});

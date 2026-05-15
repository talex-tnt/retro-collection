import 'dotenv/config';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import admin from 'firebase-admin';
/**
 * COLLECTIONS CRUD TEST SUITE
 * 
 * Test Checklist:
 * 
 * GET TESTS
 * [x] 1.1 Admin can read any collection
 * [x] 1.2 Owner can read own collection
 * [x] 1.3 Non-owner cannot read private collection
 * [x] 1.4 Anyone can read public collection
 * 
 * CREATE - Access Control
 * [x] 2.1 Owner can create own collection
 * [x] 2.2 Non-owner cannot create collection for another user
 * [x] 2.3 Unauthenticated cannot create collection
 * [x] 2.4 Admin can bypass all validation
 * 
 * CREATE - Data Validation
 * [] 3.1 Rejects missing required name
 * [] 3.2 Rejects missing required createdAt
 * [ ] 3.3 Rejects missing required userId (NOT IN CURRENT FILE - ADD THIS)
 * [] 3.4 Rejects missing required visibility
 * [] 3.5 Rejects name exceeding 100 characters
 * [] 3.6 Rejects description exceeding 500 characters
 * [] 3.7 Accepts valid optional description
 * [] 3.8 Rejects invalid visibility map
 * [] 3.9 Rejects non-timestamp createdAt
 * 
 * UPDATE - Access Control
 * [] 4.1 Owner can update own collection
 * [] 4.2 Non-owner cannot update collection
 * 
 * UPDATE - Data Validation
 * [] 5.1 Rejects missing required updatedAt
 * [] 5.2 Accepts optional name field
 * [] 5.3 Accepts optional description field
 * [] 5.4 Accepts optional visibility field
 * [] 5.5 Rejects name exceeding 100 characters on update
 * [ ] 5.6 Rejects description exceeding 500 characters on update (NOT IN CURRENT FILE - ADD THIS)
 * 
 * DELETE
 * [] 6.1 Owner can delete own collection
 * [] 6.2 Non-owner cannot delete collection
 * [] 6.3 Admin can delete any collection
 */

// AI task: implement the above test cases in the file, following the patterns established in the existing tests. 
// Make sure to cover both access control and data validation scenarios for collection documents.
// Add one test at a time, and ensure that the test setup and assertions are correctly implemented according to the Firestore rules being tested. 
// Aske me before implementing the next test case, to confirm that the previous one is correctly implemented and to get approval before proceeding.

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
  documentId,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  setDoc,
  terminate,
  serverTimestamp,
  where,
  Timestamp,
} from 'firebase/firestore';

const RULES_TARGET = process.env.RULES_TARGET ?? 'emulator';
const ENV = process.env.ENV ?? 'dev';
const TEST_ROOT = 'test';
const TEST_DATA_FOLDER = 'default';
const TEST_CONFIG_PATH = `${TEST_ROOT}/config/public/runtime`;

const FIREBASE_WEB_CONFIGS = {
  dev: {
    apiKey: 'AIzaSyB4YnIk0kbBTKDiHOgXpVOaYIxLdchItzQ',
    authDomain: 'retro-collections-dev.firebaseapp.com',
    projectId: 'retro-collections-dev',
    storageBucket: 'retro-collections-dev.firebasestorage.app',
    messagingSenderId: '473822754233',
    appId: '1:473822754233:web:0de2e6930818d3a2ea7268',
  },
};

const SERVICE_ACCOUNT_FILES = {
  dev: 'retro-collections-dev.json',
};

const firebaseConfig = FIREBASE_WEB_CONFIGS[ENV];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

let adminApp;

const getAdminApp = () => {
  if (adminApp) return adminApp;

  const serviceAccountFile = SERVICE_ACCOUNT_FILES[ENV];
  const serviceAccountPath = path.join(ROOT_DIR, serviceAccountFile);

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Missing service account file: ${serviceAccountPath}`);
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf8')
  );

  adminApp = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    },
    `rules-test-collections-admin-${ENV}`
  );

  return adminApp;
};

const getAdminDb = () => admin.firestore(getAdminApp());
const getAdminAuth = () => admin.auth(getAdminApp());

const buildClientContext = async ({ uid, claims = {} }) => {
  const appName = `rules-client-collections-${uid}-${Date.now()}-${Math.random()}`;
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
  const appName = `rules-client-collections-unauth-${Date.now()}-${Math.random()}`;
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
      throw new Error(`Failed to clear emulator: ${response.status}`);
    }
    return;
  }

  try {
    await getAdminDb().doc(TEST_CONFIG_PATH).delete();
  } catch (e) {
    // Ignore
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

const getCollectionPath = (collectionId) =>
  `${TEST_ROOT}/data/${TEST_DATA_FOLDER}/public/collections/${collectionId}`;

const getPublicResourcePath = (folder, resourceType) =>
  `${TEST_ROOT}/data/${folder}/public/${resourceType}`;

const validCollection = {
  name: 'Test Collection',
  userId: 'test-owner',
  createdAt: Timestamp.now(),
  description: 'A test collection',
  visibility: { public: false },
};

test.beforeEach(async () => {
  await cleanupTestDocs();
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

// ============================================================================
// GET TESTS
// ============================================================================

test(`[1.1 GET] admin can read any collection on ${RULES_TARGET}`, async () => {
  const adminContext = await buildClientContext({
    uid: 'admin-user',
    claims: { admin: true },
  });

  const ownerId = 'some-other-user';
  const collectionPath = getCollectionPath('collection-1');

  try {
    // Admin writes as someone else
    await getAdminDb().doc(collectionPath).set({
      ...validCollection,
      userId: ownerId,
      createdAt: admin.firestore.Timestamp.now(),
    });

    // Admin reads
    await assert.doesNotReject(
      getDoc(doc(adminContext.db, collectionPath))
    );
  } finally {
    await adminContext.cleanup();
  }
});

test(`[1.2 GET] owner can read own collection on ${RULES_TARGET}`, async () => {
  const userId = 'collection-owner';
  const collectionPath = getCollectionPath('collection-2');

  // Setup: write collection as admin
  await getAdminDb().doc(collectionPath).set({
    ...validCollection,
    userId,
    createdAt: admin.firestore.Timestamp.now(),
  });

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(getDoc(doc(context.db, collectionPath)));
  } finally {
    await context.cleanup();
  }
});

test(`[1.3 GET] non-owner cannot read private collection on ${RULES_TARGET}`, async () => {
  const ownerId = 'owner-user';
  const collectionPath = getCollectionPath('collection-3');

  // Setup: write private collection
  await getAdminDb().doc(collectionPath).set({
    ...validCollection,
    userId: ownerId,
    visibility: { public: false },
    createdAt: admin.firestore.Timestamp.now(),
  });

  const context = await buildClientContext({
    uid: 'other-user',
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      getDocs(
        query(
          collection(context.db, getPublicResourcePath(TEST_DATA_FOLDER, 'collections')),
          where(documentId(), '==', 'collection-3')
        )
      )
    );
  } finally {
    await context.cleanup();
  }
});

test(`[1.4 GET] anyone can read public collection on ${RULES_TARGET}`, async () => {
  const collectionPath = getCollectionPath('collection-4');

  // Setup: write public collection
  await getAdminDb().doc(collectionPath).set({
    ...validCollection,
    visibility: { public: true },
    createdAt: admin.firestore.Timestamp.now(),
  });

  const context = await buildClientContext({
    uid: 'random-user',
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(getDoc(doc(context.db, collectionPath)));
  } finally {
    await context.cleanup();
  }
});

// // ============================================================================
// // CREATE TESTS
// // ============================================================================

test(`[2.1 CREATE] owner can create own collection on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const collectionPath = getCollectionPath('new-collection-1');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await assert.doesNotReject(
      setDoc(doc(context.db, collectionPath), {
        ...validCollection,
        userId,
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.2 CREATE] non-owner cannot create collection for another user on ${RULES_TARGET}`, async () => {
  const userId = 'creator-user';
  const collectionPath = getCollectionPath('new-collection-2');

  const context = await buildClientContext({
    uid: userId,
    claims: { admin: false },
  });

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, collectionPath), {
        ...validCollection,
        userId: 'someone-else',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.3 CREATE] unauthenticated cannot create collection on ${RULES_TARGET}`, async () => {
  const collectionPath = getCollectionPath('new-collection-3');
  const context = await buildUnauthenticatedClientContext();

  try {
    await expectPermissionDenied(
      setDoc(doc(context.db, collectionPath), {
        ...validCollection,
        userId: 'any-user',
      })
    );
  } finally {
    await context.cleanup();
  }
});

test(`[2.4 CREATE] admin can bypass all validation on ${RULES_TARGET}`, async () => {
  const collectionPath = getCollectionPath('new-collection-admin');

  const adminContext = await buildClientContext({
    uid: 'admin-user',
    claims: { admin: true },
  });

  try {
    // Admin can create with minimal/invalid data - should pass because of isAdmin bypass
    await assert.doesNotReject(
      setDoc(doc(adminContext.db, collectionPath), {
        name: 'Admin Created',
        userId: 'any-user',
        createdAt: Timestamp.now(),
        visibility: { public: false },
      })
    );
  } finally {
    await adminContext.cleanup();
  }
});

// // CREATE - Data Validation Tests

// test(`[3.1 CREATE] rejects missing required name field on ${RULES_TARGET}`, async () => {
//   const userId = 'creator-user';
//   const collectionPath = getCollectionPath('missing-name');

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       setDoc(doc(context.db, collectionPath), {
//         userId,
//         createdAt: Timestamp.now(),
//         visibility: { public: false },
//       })
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[3.2 CREATE] rejects missing required createdAt on ${RULES_TARGET}`, async () => {
//   const userId = 'creator-user';
//   const collectionPath = getCollectionPath('missing-createdat');

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       setDoc(doc(context.db, collectionPath), {
//         name: 'Collection',
//         userId,
//         visibility: { public: false },
//       })
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[3.4 CREATE] rejects missing required visibility on ${RULES_TARGET}`, async () => {
//   const userId = 'creator-user';
//   const collectionPath = getCollectionPath('missing-visibility');

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       setDoc(doc(context.db, collectionPath), {
//         name: 'Collection',
//         userId,
//         createdAt: Timestamp.now(),
//       })
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[3.5 CREATE] name cannot exceed 100 characters on ${RULES_TARGET}`, async () => {
//   const userId = 'creator-user';
//   const collectionPath = getCollectionPath('name-too-long');

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       setDoc(doc(context.db, collectionPath), {
//         name: 'x'.repeat(101),
//         userId,
//         createdAt: Timestamp.now(),
//         visibility: { public: false },
//       })
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[3.6 CREATE] description cannot exceed 500 characters on ${RULES_TARGET}`, async () => {
//   const userId = 'creator-user';
//   const collectionPath = getCollectionPath('desc-too-long');

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       setDoc(doc(context.db, collectionPath), {
//         name: 'Valid Name',
//         userId,
//         createdAt: Timestamp.now(),
//         visibility: { public: false },
//         description: 'x'.repeat(501),
//       })
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[3.7 CREATE] description is optional on ${RULES_TARGET}`, async () => {
//   const userId = 'creator-user';
//   const collectionPath = getCollectionPath('no-description');

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await assert.doesNotReject(
//       setDoc(doc(context.db, collectionPath), {
//         name: 'Collection',
//         userId,
//         createdAt: Timestamp.now(),
//         visibility: { public: false },
//       })
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[3.8 CREATE] rejects invalid visibility map on ${RULES_TARGET}`, async () => {
//   const userId = 'creator-user';
//   const collectionPath = getCollectionPath('invalid-visibility');

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       setDoc(doc(context.db, collectionPath), {
//         name: 'Collection',
//         userId,
//         createdAt: Timestamp.now(),
//         visibility: { public: false, extra: 'field' },
//       })
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[3.9 CREATE] rejects non-timestamp createdAt on ${RULES_TARGET}`, async () => {
//   const userId = 'creator-user';
//   const collectionPath = getCollectionPath('invalid-timestamp');

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       setDoc(doc(context.db, collectionPath), {
//         name: 'Collection',
//         userId,
//         createdAt: '2024-01-01',
//         visibility: { public: false },
//       })
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// // ============================================================================
// // UPDATE TESTS
// // ============================================================================

// test(`[4.1 UPDATE] owner can update own collection on ${RULES_TARGET}`, async () => {
//   const userId = 'update-owner';
//   const collectionPath = getCollectionPath('update-collection-1');

//   // Setup
//   await setDoc(doc(getAdminDb(), collectionPath), {
//     ...validCollection,
//     userId,
//   });

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await assert.doesNotReject(
//       setDoc(
//         doc(context.db, collectionPath),
//         {
//           name: 'Updated Name',
//           updatedAt: Timestamp.now(),
//         },
//         { merge: true }
//       )
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[4.2 UPDATE] non-owner cannot update collection on ${RULES_TARGET}`, async () => {
//   const ownerId = 'update-owner';
//   const collectionPath = getCollectionPath('update-collection-2');

//   // Setup
//   await setDoc(doc(getAdminDb(), collectionPath), {
//     ...validCollection,
//     userId: ownerId,
//   });

//   const context = await buildClientContext({
//     uid: 'other-user',
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       setDoc(
//         doc(context.db, collectionPath),
//         {
//           name: 'Updated Name',
//           updatedAt: Timestamp.now(),
//         },
//         { merge: true }
//       )
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[5.1 UPDATE] updatedAt is required on ${RULES_TARGET}`, async () => {
//   const userId = 'update-owner';
//   const collectionPath = getCollectionPath('update-missing-timestamp');

//   // Setup
//   await setDoc(doc(getAdminDb(), collectionPath), {
//     ...validCollection,
//     userId,
//   });

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       setDoc(
//         doc(context.db, collectionPath),
//         {
//           name: 'Updated Name',
//         },
//         { merge: true }
//       )
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[5.2 UPDATE] name is optional in updates on ${RULES_TARGET}`, async () => {
//   const userId = 'update-owner';
//   const collectionPath = getCollectionPath('update-no-name');

//   // Setup
//   await setDoc(doc(getAdminDb(), collectionPath), {
//     ...validCollection,
//     userId,
//   });

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await assert.doesNotReject(
//       setDoc(
//         doc(context.db, collectionPath),
//         {
//           updatedAt: Timestamp.now(),
//           description: 'Updated description',
//         },
//         { merge: true }
//       )
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[5.3 UPDATE] description is optional in updates on ${RULES_TARGET}`, async () => {
//   const userId = 'update-owner';
//   const collectionPath = getCollectionPath('update-no-description');

//   // Setup
//   await setDoc(doc(getAdminDb(), collectionPath), {
//     ...validCollection,
//     userId,
//   });

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await assert.doesNotReject(
//       setDoc(
//         doc(context.db, collectionPath),
//         {
//           updatedAt: Timestamp.now(),
//         },
//         { merge: true }
//       )
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[5.4 UPDATE] visibility is optional in updates on ${RULES_TARGET}`, async () => {
//   const userId = 'update-owner';
//   const collectionPath = getCollectionPath('update-no-visibility');

//   // Setup
//   await setDoc(doc(getAdminDb(), collectionPath), {
//     ...validCollection,
//     userId,
//   });

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await assert.doesNotReject(
//       setDoc(
//         doc(context.db, collectionPath),
//         {
//           updatedAt: Timestamp.now(),
//           name: 'New Name',
//         },
//         { merge: true }
//       )
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[5.5 UPDATE] name cannot exceed 100 characters on ${RULES_TARGET}`, async () => {
//   const userId = 'update-owner';
//   const collectionPath = getCollectionPath('update-name-too-long');

//   // Setup
//   await setDoc(doc(getAdminDb(), collectionPath), {
//     ...validCollection,
//     userId,
//   });

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       setDoc(
//         doc(context.db, collectionPath),
//         {
//           name: 'x'.repeat(101),
//           updatedAt: Timestamp.now(),
//         },
//         { merge: true }
//       )
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// // ============================================================================
// // DELETE TESTS
// // ============================================================================

// test(`[6.1 DELETE] owner can delete own collection on ${RULES_TARGET}`, async () => {
//   const userId = 'delete-owner';
//   const collectionPath = getCollectionPath('delete-collection-1');

//   // Setup
//   await setDoc(doc(getAdminDb(), collectionPath), {
//     ...validCollection,
//     userId,
//   });

//   const context = await buildClientContext({
//     uid: userId,
//     claims: { admin: false },
//   });

//   try {
//     await assert.doesNotReject(
//       doc(context.db, collectionPath).delete()
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[6.2 DELETE] non-owner cannot delete collection on ${RULES_TARGET}`, async () => {
//   const ownerId = 'delete-owner';
//   const collectionPath = getCollectionPath('delete-collection-2');

//   // Setup
//   await setDoc(doc(getAdminDb(), collectionPath), {
//     ...validCollection,
//     userId: ownerId,
//   });

//   const context = await buildClientContext({
//     uid: 'other-user',
//     claims: { admin: false },
//   });

//   try {
//     await expectPermissionDenied(
//       doc(context.db, collectionPath).delete()
//     );
//   } finally {
//     await context.cleanup();
//   }
// });

// test(`[6.3 DELETE] admin can delete any collection on ${RULES_TARGET}`, async () => {
//   const collectionPath = getCollectionPath('delete-collection-admin');

//   // Setup
//   await setDoc(doc(getAdminDb(), collectionPath), {
//     ...validCollection,
//     userId: 'some-owner',
//   });

//   const adminContext = await buildClientContext({
//     uid: 'admin-user',
//     claims: { admin: true },
//   });

//   try {
//     await assert.doesNotReject(
//       doc(adminContext.db, collectionPath).delete()
//     );
//   } finally {
//     await adminContext.cleanup();
//   }
// });

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import type { FirestoreBuilder } from '../../types/firestoreBuilder';
import { createFirestoreApiError } from '../../errorLogger';
import { db } from '../../../../lib/firebase';
import { resolveDataCollectionPath } from '../../runtimeConfig';

const visibility = 'private' as const;

export interface PrivateUserRecord {
  id: string;
  email?: string;
  lastLogin?: string;
}

interface FirestorePrivateUserDoc {
  email?: string;
  lastLogin?: Timestamp;
}

const mapPrivateUserDoc = (
  snapshot: QueryDocumentSnapshot<DocumentData>
): PrivateUserRecord => {
  const data = snapshot.data() as FirestorePrivateUserDoc;

  return {
    id: snapshot.id,
    email: data.email,
    lastLogin: data.lastLogin?.toDate?.()?.toISOString(),
  };
};

const getUsersEndpoints = (builder: FirestoreBuilder) => ({
  getPrivateUsers: builder.query<PrivateUserRecord[], void>({
    async queryFn() {
      const path = await resolveDataCollectionPath({
        visibility,
        resourceType: 'users',
      });
      const context = {
        apiEndpoint: 'getPrivateUsers',
        operation: 'QUERY' as const,
        firebaseFunc: 'getDocs',
        path,
      };

      try {
        const snapshot = await getDocs(collection(db, path));

        return {
          data: snapshot.docs.map(mapPrivateUserDoc),
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    providesTags: [{ type: 'PrivateUsers' as const, id: 'LIST' }],
  }),

  getPrivateUserById: builder.query<PrivateUserRecord | null, string>({
    async queryFn(userId) {
      const path = await resolveDataCollectionPath({
        visibility,
        resourceType: 'users',
      });
      const context = {
        apiEndpoint: 'getPrivateUserById',
        operation: 'GET' as const,
        firebaseFunc: 'getDoc',
        path,
        segmentPaths: [userId],
      };
      try {
        const snap = await getDoc(doc(db, path, ...context.segmentPaths));

        if (!snap.exists()) return { data: null };

        const data = snap.data() as FirestorePrivateUserDoc;

        return {
          data: {
            id: snap.id,
            email: data.email,
            lastLogin: data.lastLogin?.toDate?.()?.toISOString(),
          },
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    providesTags: (_result, _error, userId) => [
      { type: 'PrivateUsers' as const, id: userId },
    ],
  }),

  createOrUpdatePrivateUser: builder.mutation<
    void,
    {
      id: string;
      email: string;
      lastLogin: string;
    }
  >({
    async queryFn({ id, email }) {
      const path = await resolveDataCollectionPath({
        visibility,
        resourceType: 'users',
      });
      const requestPayload = {
        email,
        lastLogin: serverTimestamp(),
      };
      const context = {
        apiEndpoint: 'createOrUpdatePrivateUser',
        operation: 'CREATE' as const,
        firebaseFunc: 'setDoc',
        path,
        segmentPaths: [id],
        requestPayload,
      };

      try {
        await setDoc(doc(db, path, id), requestPayload, { merge: true });

        return {
          data: undefined,
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    invalidatesTags: (_result, _error, { id }) => [
      { type: 'PrivateUsers' as const, id },
      { type: 'PrivateUsers' as const, id: 'LIST' },
    ],
  }),
});

export default getUsersEndpoints;

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  updateDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';

import type { FirestoreBuilder } from '../../types/firestoreBuilder';
import { createFirestoreApiError } from '../../errorLogger';
import { db } from '../../../../lib/firebase';
import { resolveDataCollectionPath } from '../../runtimeConfig';

const visibility = 'public' as const;

export interface UserRecord {
  id: string;
  name?: string;
  nickname?: string;
  visibility?: {
    public: boolean;
  };
}

interface FirestoreUserDoc {
  name?: string;
  nickname?: string;
  visibility?: {
    public: boolean;
  };
}

const mapUserDoc = (
  snapshot: QueryDocumentSnapshot<DocumentData>
): UserRecord => {
  const data = snapshot.data() as FirestoreUserDoc;

  return {
    id: snapshot.id,
    name: data.name,
    nickname: data.nickname,
    visibility: data.visibility,
  };
};

const getUsersEndpoints = (builder: FirestoreBuilder) => ({
  getUsers: builder.query<UserRecord[], void>({
    async queryFn() {
      const path = await resolveDataCollectionPath({
        visibility,
        resourceType: 'users',
      });
      const context = {
        apiEndpoint: 'getUsers',
        operation: 'QUERY' as const,
        firebaseFunc: 'getDocs',
        path,
      };
      try {
        const snapshot = await getDocs(collection(db, path));

        return {
          data: snapshot.docs.map(mapUserDoc),
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    providesTags: [{ type: 'PublicUsers' as const, id: 'LIST' }],
  }),

  getPublicUsers: builder.query<UserRecord[], void>({
    async queryFn() {
      const path = await resolveDataCollectionPath({
        visibility,
        resourceType: 'users',
      });
      const q = query(
        collection(db, path),
        where('visibility.public', '==', true)
      );
      const context = {
        apiEndpoint: 'getPublicUsers',
        operation: 'QUERY' as const,
        firebaseFunc: 'getDocs',
        path,
        requestPayload: q,
      };
      try {
        const snapshot = await getDocs(q);

        return {
          data: snapshot.docs.map(mapUserDoc),
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    providesTags: [{ type: 'PublicUsers' as const, id: 'PUBLIC_LIST' }],
  }),

  getUserById: builder.query<UserRecord | null, string>({
    async queryFn(userId) {
      const path = await resolveDataCollectionPath({
        visibility,
        resourceType: 'users',
      });
      const context = {
        apiEndpoint: 'getUserById',
        operation: 'GET' as const,
        firebaseFunc: 'getDoc',
        path,
        segmentPaths: [userId],
      };
      try {
        const snap = await getDoc(doc(db, path, ...context.segmentPaths));

        if (!snap.exists()) return { data: null };

        const data = snap.data() as FirestoreUserDoc;

        return {
          data: {
            id: snap.id,
            name: data.name,
            nickname: data.nickname,
            visibility: data.visibility,
          },
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    providesTags: (_result, _error, userId) => [
      { type: 'PublicUsers' as const, id: userId },
    ],
  }),

  createOrUpdateUser: builder.mutation<
    void,
    {
      id: string;
      name?: string;
      nickname?: string;
      visibility?: {
        public: boolean;
      };
    }
  >({
    async queryFn({ id, ...data }) {
      const path = await resolveDataCollectionPath({
        visibility,
        resourceType: 'users',
      });
      const requestPayload = data;
      const context = {
        apiEndpoint: 'createOrUpdateUser',
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
      {
        type: 'PublicUsers' as const,
        id,
      },

      {
        type: 'PublicUsers' as const,
        id: 'LIST',
      },

      {
        type: 'PublicUsers' as const,
        id: 'PUBLIC_LIST',
      },
    ],
  }),

  updateUser: builder.mutation<
    void,
    {
      id: string;
      updates: Partial<UserRecord>;
    }
  >({
    async queryFn({ id, updates }) {
      const path = await resolveDataCollectionPath({
        visibility,
        resourceType: 'users',
      });
      const requestPayload = updates;
      const context = {
        apiEndpoint: 'updateUser',
        operation: 'UPDATE' as const,
        firebaseFunc: 'updateDoc',
        path,
        segmentPaths: [id],
        requestPayload,
      };
      try {
        await updateDoc(doc(db, path, id), requestPayload);

        return {
          data: undefined,
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    invalidatesTags: (_result, _error, { id }) => [
      {
        type: 'PublicUsers' as const,
        id,
      },

      {
        type: 'PublicUsers' as const,
        id: 'LIST',
      },

      {
        type: 'PublicUsers' as const,
        id: 'PUBLIC_LIST',
      },
    ],
  }),

  setUserVisibility: builder.mutation<
    void,
    { userId: string; public: boolean }
  >({
    async queryFn({ userId, public: isPublic }) {
      const path = await resolveDataCollectionPath({
        visibility,
        resourceType: 'users',
      });
      const requestPayload = {
        visibility: { public: isPublic },
      };
      const context = {
        apiEndpoint: 'setUserVisibility',
        operation: 'UPDATE' as const,
        firebaseFunc: 'setDoc',
        path,
        segmentPaths: [userId],
        requestPayload,
      };

      try {
        await setDoc(doc(db, path, userId), requestPayload, { merge: true });
        return { data: undefined };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    invalidatesTags: (_result, _error, { userId }) => [
      { type: 'PublicUsers' as const, id: userId },
      { type: 'PublicUsers' as const, id: 'LIST' },
      { type: 'PublicUsers' as const, id: 'PUBLIC_LIST' },
    ],
  }),
});

export default getUsersEndpoints;

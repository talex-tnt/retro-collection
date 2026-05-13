import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import type { FirestoreBuilder } from '../types/firestoreBuilder';
import { createFirestoreApiError } from '../errorLogger';
import { db } from '../../../lib/firebase';
import { resolveDataCollectionPath } from '../runtimeConfig';

export interface Collection {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  visibility?: {
    public: boolean;
  };
}

type CollectionInput = Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>;

type CollectionUpdate = Partial<Omit<Collection, 'id' | 'createdAt'>>;

interface FirestoreCollectionDoc {
  name: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  description?: string;
  visibility?: {
    public: boolean;
  };
}

const mapCollectionDoc = (
  snapshot: QueryDocumentSnapshot<DocumentData>
): Collection => {
  const data = snapshot.data() as FirestoreCollectionDoc;

  return {
    id: snapshot.id,

    name: data.name,
    userId: data.userId,
    description: data.description,
    visibility: data.visibility,

    createdAt: data.createdAt?.toDate?.()?.toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
  };
};

const getCollectionsEndpoints = (builder: FirestoreBuilder) => ({
  getCollections: builder.query<Collection[], string>({
    async queryFn(userId) {
      const path = await resolveDataCollectionPath('collections');
      const q = query(
        collection(db, path),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        orderBy('__name__', 'asc')
      );
      const context = {
        apiEndpoint: 'getCollections',
        operation: 'QUERY' as const,
        firebaseFunc: 'getDocs',
        path,
        requestPayload: q,
      };
      try {
        const snapshot = await getDocs(q);

        return {
          data: snapshot.docs.map(mapCollectionDoc),
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    providesTags: (result) =>
      result
        ? [
            ...result.map(({ id }) => ({
              type: 'Collections' as const,
              id,
            })),
            { type: 'Collections' as const, id: 'LIST' },
          ]
        : [{ type: 'Collections' as const, id: 'LIST' }],
  }),

  getPublicCollectionsByUserId: builder.query<Collection[], string>({
    async queryFn(userId) {
      const path = await resolveDataCollectionPath('collections');
      const q = query(
        collection(db, path),
        where('userId', '==', userId),
        where('visibility.public', '==', true),
        orderBy('createdAt', 'desc'),
        orderBy('__name__', 'asc')
      );
      const context = {
        apiEndpoint: 'getPublicCollectionsByUserId',
        operation: 'QUERY' as const,
        firebaseFunc: 'getDocs',
        path,
        requestPayload: q,
      };
      try {
        const snapshot = await getDocs(q);

        return {
          data: snapshot.docs.map(mapCollectionDoc),
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    providesTags: (_result, _error, userId) => [
      { type: 'Collections' as const, id: `${userId}_PUBLIC_LIST` },
    ],
  }),

  createCollection: builder.mutation<Collection, CollectionInput>({
    async queryFn(collectionData) {
      const path = await resolveDataCollectionPath('collections');
      const requestPayload = {
        ...collectionData,
        visibility: collectionData.visibility ?? { public: false },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const context = {
        apiEndpoint: 'createCollection',
        operation: 'CREATE' as const,
        firebaseFunc: 'addDoc',
        path,
        requestPayload,
      };
      try {
        const docRef = await addDoc(collection(db, path), requestPayload);

        return {
          data: {
            id: docRef.id,
            ...collectionData,
            visibility: collectionData.visibility ?? { public: false },
            createdAt: '',
            updatedAt: '',
          },
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    invalidatesTags: [{ type: 'Collections' as const, id: 'LIST' }],
  }),

  updateCollection: builder.mutation<
    void,
    { id: string; updates: CollectionUpdate }
  >({
    async queryFn({ id, updates }) {
      const path = await resolveDataCollectionPath('collections');
      const requestPayload = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      const context = {
        apiEndpoint: 'updateCollection',
        operation: 'UPDATE' as const,
        firebaseFunc: 'updateDoc',
        path,
        segmentPaths: [id],
        requestPayload,
      };
      try {
        await updateDoc(doc(db, path, id), requestPayload);

        return { data: undefined };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    invalidatesTags: (_r, _e, { id }) => [
      { type: 'Collections' as const, id },
      { type: 'Collections' as const, id: 'LIST' },
    ],
  }),

  deleteCollection: builder.mutation<void, string>({
    async queryFn(id) {
      const path = await resolveDataCollectionPath('collections');
      const context = {
        apiEndpoint: 'deleteCollection',
        operation: 'DELETE' as const,
        firebaseFunc: 'deleteDoc',
        path,
        segmentPaths: [id],
      };
      try {
        await deleteDoc(doc(db, path, ...context.segmentPaths));

        return { data: undefined };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    invalidatesTags: (_r, _e, id) => [
      { type: 'Collections' as const, id },
      { type: 'Collections' as const, id: 'LIST' },
    ],
  }),
});

export default getCollectionsEndpoints;

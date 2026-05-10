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

import type { BaseQueryFn, EndpointBuilder } from '@reduxjs/toolkit/query';

import { db } from '../../../lib/firebase';

export interface Collection {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
}

type CollectionInput = Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>;

type CollectionUpdate = Partial<Omit<Collection, 'id' | 'createdAt'>>;

interface FirestoreCollectionDoc {
  name: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  description?: string;
}

type FirestoreBuilder = EndpointBuilder<
  BaseQueryFn,
  'Collections' | 'Items',
  'firestoreApi'
>;

const mapCollectionDoc = (
  snapshot: QueryDocumentSnapshot<DocumentData>
): Collection => {
  const data = snapshot.data() as FirestoreCollectionDoc;

  return {
    id: snapshot.id,

    name: data.name,
    userId: data.userId,
    description: data.description,

    createdAt: data.createdAt?.toDate?.()?.toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
  };
};

const getCollectionsEndpoints = (builder: FirestoreBuilder) => ({
  getCollections: builder.query<Collection[], string>({
    async queryFn(userId) {
      try {
        const q = query(
          collection(db, 'collections'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          orderBy('__name__', 'asc')
        );

        const snapshot = await getDocs(q);

        return {
          data: snapshot.docs.map(mapCollectionDoc),
        };
      } catch (error) {
        return { error };
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

  createCollection: builder.mutation<Collection, CollectionInput>({
    async queryFn(collectionData) {
      try {
        const docRef = await addDoc(collection(db, 'collections'), {
          ...collectionData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return {
          data: {
            id: docRef.id,
            ...collectionData,
            createdAt: '',
            updatedAt: '',
          },
        };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: [{ type: 'Collections' as const, id: 'LIST' }],
  }),

  updateCollection: builder.mutation<
    void,
    { id: string; updates: CollectionUpdate }
  >({
    async queryFn({ id, updates }) {
      try {
        await updateDoc(doc(db, 'collections', id), {
          ...updates,
          updatedAt: serverTimestamp(),
        });

        return { data: undefined };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: (_r, _e, { id }) => [
      { type: 'Collections' as const, id },
      { type: 'Collections' as const, id: 'LIST' },
    ],
  }),

  deleteCollection: builder.mutation<void, string>({
    async queryFn(id) {
      try {
        await deleteDoc(doc(db, 'collections', id));

        return { data: undefined };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: (_r, _e, id) => [
      { type: 'Collections' as const, id },
      { type: 'Collections' as const, id: 'LIST' },
    ],
  }),
});

export default getCollectionsEndpoints;

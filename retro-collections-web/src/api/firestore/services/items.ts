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

export interface Item {
  id: string;
  name: string;
  userId: string;
  collectionId: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;

  visibility?: {
    public: boolean;
  };
}

type ItemInput = Omit<Item, 'id' | 'createdAt' | 'updatedAt'>;

type ItemUpdate = Partial<Omit<Item, 'id' | 'createdAt'>>;

interface FirestoreItemDoc {
  name: string;
  userId: string;
  collectionId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  description?: string;

  visibility?: {
    public: boolean;
  };
}

type FirestoreBuilder = EndpointBuilder<
  BaseQueryFn,
  'Collections' | 'Items',
  'firestoreApi'
>;

const mapItemDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): Item => {
  const data = snapshot.data() as FirestoreItemDoc;

  return {
    id: snapshot.id,

    name: data.name,
    userId: data.userId,
    collectionId: data.collectionId,
    description: data.description,
    visibility: data.visibility,

    createdAt: data.createdAt?.toDate?.()?.toISOString(),

    updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
  };
};

const getItemsEndpoints = (builder: FirestoreBuilder) => ({
  getItems: builder.query<Item[], string>({
    async queryFn(collectionId) {
      try {
        const q = query(
          collection(db, 'items'),
          where('collectionId', '==', collectionId),
          orderBy('createdAt', 'desc'),
          orderBy('__name__', 'asc')
        );

        const snapshot = await getDocs(q);

        return {
          data: snapshot.docs.map(mapItemDoc),
        };
      } catch (error) {
        return { error };
      }
    },

    providesTags: (result) =>
      result
        ? [
            ...result.map(({ id }) => ({
              type: 'Items' as const,
              id,
            })),
            { type: 'Items' as const, id: 'LIST' },
          ]
        : [{ type: 'Items' as const, id: 'LIST' }],
  }),

  getAllItems: builder.query<Item[], void>({
    async queryFn() {
      try {
        const q = query(
          collection(db, 'items'),
          orderBy('createdAt', 'desc'),
          orderBy('__name__', 'asc')
        );

        const snapshot = await getDocs(q);

        return {
          data: snapshot.docs.map(mapItemDoc),
        };
      } catch (error) {
        return { error };
      }
    },

    providesTags: [{ type: 'Items' as const, id: 'LIST' }],
  }),

  getUserItems: builder.query<Item[], string>({
    async queryFn(userId) {
      try {
        const q = query(
          collection(db, 'items'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          orderBy('__name__', 'asc')
        );

        const snapshot = await getDocs(q);

        return {
          data: snapshot.docs.map(mapItemDoc),
        };
      } catch (error) {
        return { error };
      }
    },

    providesTags: (result) =>
      result
        ? [
            ...result.map(({ id }) => ({
              type: 'Items' as const,
              id,
            })),
            { type: 'Items' as const, id: 'LIST' },
          ]
        : [{ type: 'Items' as const, id: 'LIST' }],
  }),

  createItem: builder.mutation<Item, ItemInput>({
    async queryFn(itemData) {
      try {
        const docRef = await addDoc(collection(db, 'items'), {
          ...itemData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return {
          data: {
            id: docRef.id,
            ...itemData,
            createdAt: '',
            updatedAt: '',
          },
        };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: [{ type: 'Items' as const, id: 'LIST' }],
  }),

  updateItem: builder.mutation<void, { id: string; updates: ItemUpdate }>({
    async queryFn({ id, updates }) {
      try {
        await updateDoc(doc(db, 'items', id), {
          ...updates,
          updatedAt: serverTimestamp(),
        });

        return { data: undefined };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: (_r, _e, { id }) => [
      { type: 'Items' as const, id },
      { type: 'Items' as const, id: 'LIST' },
    ],
  }),

  deleteItem: builder.mutation<void, string>({
    async queryFn(id) {
      try {
        await deleteDoc(doc(db, 'items', id));

        return { data: undefined };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: (_r, _e, id) => [
      { type: 'Items' as const, id },
      { type: 'Items' as const, id: 'LIST' },
    ],
  }),
});

export default getItemsEndpoints;

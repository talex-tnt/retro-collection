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
  getCountFromServer,
} from 'firebase/firestore';
import type { FirestoreBuilder } from '../types/firestoreBuilder';

import { db } from '../../../lib/firebase';

export interface Item {
  id: string;
  name: string;
  userId: string;
  collectionId?: string;
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

const sortItemsNewestFirst = (left: Item, right: Item) => {
  const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
  const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return left.id.localeCompare(right.id);
};

const getItemsEndpoints = (builder: FirestoreBuilder) => ({
  getItems: builder.query<Item[], { collectionId: string; userId: string }>({
    async queryFn({ collectionId /*, userId*/ }) {
      try {
        const q = query(
          collection(db, 'items'),
          where('collectionId', '==', collectionId),
          // where('userId', '==', userId),
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

    providesTags: (result, _error, request) =>
      result
        ? [
            ...result.map(({ id }) => ({
              type: 'Items' as const,
              id,
            })),
            { type: 'Items' as const, id: `${request.collectionId}_LIST` },
          ]
        : [{ type: 'Items' as const, id: `${request.collectionId}_LIST` }],
  }),
  getItemsCount: builder.query<
    number,
    { collectionId: string; userId?: string }
  >({
    async queryFn({ collectionId, userId }) {
      try {
        const constraints = [where('collectionId', '==', collectionId)];

        if (userId) {
          constraints.push(where('userId', '==', userId));
        }

        const q = query(collection(db, 'items'), ...constraints);

        const snapshot = await getCountFromServer(q);

        return {
          data: snapshot.data().count,
        };
      } catch (error) {
        return { error };
      }
    },
    providesTags: (_result, _error, request) => [
      { type: 'Items' as const, id: `${request.collectionId}_LIST` },
    ],
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
        const q = query(collection(db, 'items'), where('userId', '==', userId));

        const snapshot = await getDocs(q);

        return {
          data: snapshot.docs.map(mapItemDoc).sort(sortItemsNewestFirst),
        };
      } catch (error) {
        return { error };
      }
    },

    providesTags: (result, _error, userId) =>
      result
        ? [
            ...result.map(({ id }) => ({
              type: 'Items' as const,
              id,
            })),
            { type: 'Items' as const, id: `${userId}_LIST` },
          ]
        : [{ type: 'Items' as const, id: `${userId}_LIST` }],
  }),
  getUserItemsCount: builder.query<number, string>({
    async queryFn(userId) {
      try {
        const q = query(collection(db, 'items'), where('userId', '==', userId));

        const snapshot = await getCountFromServer(q);

        return {
          data: snapshot.data().count,
        };
      } catch (error) {
        return { error };
      }
    },
    providesTags: (result, _error, userId) =>
      result ? [{ type: 'Items' as const, id: `${userId}_LIST` }] : [],
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

    invalidatesTags: (_r, _e, { collectionId, userId }) => [
      { type: 'Items' as const, id: `${collectionId}_LIST` },
      { type: 'Items' as const, id: `${userId}_LIST` },
    ],
  }),

  updateItem: builder.mutation<
    void,
    {
      id: string;
      userId: string;
      updates: ItemUpdate;
      previousCollectionId?: string;
    }
  >({
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

    invalidatesTags: (
      _r,
      _e,
      { id, userId, previousCollectionId, updates }
    ) => {
      const tags = [
        { type: 'Items' as const, id },
        { type: 'Items' as const, id: `${userId}_LIST` },
      ];

      if (previousCollectionId) {
        tags.push({
          type: 'Items' as const,
          id: `${previousCollectionId}_LIST`,
        });
      }

      if (updates.collectionId) {
        tags.push({
          type: 'Items' as const,
          id: `${updates.collectionId}_LIST`,
        });
      }

      return tags;
    },
  }),

  deleteItem: builder.mutation<
    void,
    { id: string; collectionId: string; userId: string }
  >({
    async queryFn({ id }) {
      try {
        await deleteDoc(doc(db, 'items', id));

        return { data: undefined };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: (_r, _e, { id, collectionId, userId }) => [
      { type: 'Items' as const, id },
      { type: 'Items' as const, id: `${collectionId}_LIST` },
      { type: 'Items' as const, id: `${userId}_LIST` },
    ],
  }),
});

export default getItemsEndpoints;

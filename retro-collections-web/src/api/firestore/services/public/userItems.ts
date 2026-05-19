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
import type { FirestoreBuilder } from '../../types/firestoreBuilder';
import { createFirestoreApiError } from '../../errorLogger';
import { db } from '../../../../lib/firebase';
import { getUserCollectionPath } from '../../runtimeConfig';

const visibility = 'public' as const;

export interface Item {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  visibility?: {
    public: boolean;
  };
  tags?: string[];
}

type ItemInput = Omit<Item, 'id' | 'createdAt' | 'updatedAt'>;
type ItemUpdate = Partial<Omit<Item, 'id' | 'createdAt'>>;

interface FirestoreItemDoc {
  name: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  description?: string;
  visibility?: {
    public: boolean;
  };
  tags?: string[];
}

const mapItemDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): Item => {
  const data = snapshot.data() as FirestoreItemDoc;

  return {
    id: snapshot.id,
    name: data.name,
    userId: data.userId,
    // collectionId removed
    description: data.description,
    visibility: data.visibility,
    tags: data.tags || [],
    createdAt: data.createdAt?.toDate?.()?.toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
  };
};

const getPublicUserItemsEndpoints = (builder: FirestoreBuilder) => ({
  getPublicUserItems: builder.query<Item[], { userId: string }>({
    async queryFn({ userId }) {
      const path = await getUserCollectionPath({
        visibility,
        resourceType: 'items',
        userId,
      });
      const q = query(
        collection(db, path),
        orderBy('createdAt', 'desc'),
        orderBy('__name__', 'asc')
      );
      const context = {
        apiEndpoint: 'getPublicUserItems',
        operation: 'QUERY' as const,
        firebaseFunc: 'getDocs',
        path,
        requestPayload: q,
      };
      try {
        const snapshot = await getDocs(q);
        return {
          data: snapshot.docs.map(mapItemDoc),
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },
    providesTags: (result, _error, request) =>
      result
        ? [
            ...result.map(({ id }) => ({
              type: 'PublicUserItems' as const,
              id,
            })),
            {
              type: 'PublicUserItems' as const,
              id: `${request.userId}_LIST`,
            },
          ]
        : [
            {
              type: 'PublicUserItems' as const,
              id: `${request.userId}_LIST`,
            },
          ],
  }),

  getPublicUserItemsCount: builder.query<number, string>({
    async queryFn(userId) {
      const path = await getUserCollectionPath({
        visibility,
        resourceType: 'items',
        userId,
      });
      const q = query(collection(db, path), where('userId', '==', userId));
      const context = {
        apiEndpoint: 'getPublicUserItemsCount',
        operation: 'QUERY' as const,
        firebaseFunc: 'getCountFromServer',
        path,
        requestPayload: q,
      };
      try {
        const snapshot = await getCountFromServer(q);

        return {
          data: snapshot.data().count,
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },
    providesTags: (result, _error, userId) =>
      result
        ? [{ type: 'PublicUserItems' as const, id: `${userId}_LIST` }]
        : [],
  }),

  createPublicUserItem: builder.mutation<Item, ItemInput>({
    async queryFn(itemData) {
      const path = await getUserCollectionPath({
        visibility,
        resourceType: 'items',
        userId: itemData.userId,
      });
      const requestPayload = {
        ...itemData,
        tags: itemData.tags || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const context = {
        apiEndpoint: 'createPublicUserItem',
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
            ...itemData,
            createdAt: '',
            updatedAt: '',
          },
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },
    invalidatesTags: (_r, _e, { userId }) => [
      { type: 'PublicUserItems' as const, id: `${userId}_LIST` },
    ],
  }),

  updatePublicUserItem: builder.mutation<
    void,
    {
      id: string;
      userId: string;
      updates: ItemUpdate;
    }
  >({
    async queryFn({ id, userId, updates }) {
      const path = await getUserCollectionPath({
        visibility,
        resourceType: 'items',
        userId,
      });
      const requestPayload = {
        ...updates,
        tags: updates.tags || [],
        updatedAt: serverTimestamp(),
      };
      const context = {
        apiEndpoint: 'updatePublicUserItem',
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
    invalidatesTags: (_r, _e, { id, userId }) => [
      { type: 'PublicUserItems' as const, id },
      { type: 'PublicUserItems' as const, id: `${userId}_LIST` },
    ],
  }),

  deletePublicUserItem: builder.mutation<void, { id: string; userId: string }>({
    async queryFn({ id, userId }) {
      const path = await getUserCollectionPath({
        visibility,
        resourceType: 'items',
        userId,
      });
      const context = {
        apiEndpoint: 'deletePublicUserItem',
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
    invalidatesTags: (_r, _e, { id, userId }) => [
      { type: 'PublicUserItems' as const, id },
      { type: 'PublicUserItems' as const, id: `${userId}_LIST` },
    ],
  }),
});

export default getPublicUserItemsEndpoints;

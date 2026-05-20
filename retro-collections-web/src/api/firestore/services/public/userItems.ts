import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
  type QueryConstraint,
  getCountFromServer,
  startAfter as fsStartAfter,
  limit as fsLimit,
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

interface PaginationCursor {
  createdAt: string;
  id: string;
}

const mapItemDoc = (snapshot: QueryDocumentSnapshot<DocumentData>): Item => {
  const data = snapshot.data() as FirestoreItemDoc;

  return {
    id: snapshot.id,
    name: data.name,
    userId: data.userId,
    description: data.description,
    visibility: data.visibility,
    tags: data.tags || [],
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? '',
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.(),
  };
};

const getPublicUserItemsEndpoints = (builder: FirestoreBuilder) => ({
  /**
   * Cursor-based paginated query for user items.
   */
  getPublicUserItems: builder.query<
    {
      items: Item[];
      pageInfo: {
        endCursor: PaginationCursor | null;
        hasNextPage: boolean;
      };
    },
    {
      userId: string;
      tags?: string[];
      name?: string;
      isPublic?: boolean;
      limit?: number;
      startAfter?: PaginationCursor | null;
    }
  >({
    async queryFn({ userId, tags, name, isPublic, limit = 25, startAfter }) {
      const path = await getUserCollectionPath({
        visibility,
        resourceType: 'items',
        userId,
      });

      const baseConstraints: QueryConstraint[] = [];

      if (tags && tags.length > 0) {
        baseConstraints.push(where('tags', 'array-contains-any', tags));
      }

      if (isPublic === true || isPublic === false) {
        baseConstraints.push(where('visibility.public', '==', isPublic));
      }

      baseConstraints.push(orderBy('createdAt', 'desc'));

      baseConstraints.push(orderBy('__name__', 'asc'));

      if (startAfter) {
        baseConstraints.push(
          fsStartAfter(
            Timestamp.fromDate(new Date(startAfter.createdAt)),
            startAfter.id
          )
        );
      }

      const pagedQuery = query(
        collection(db, path),
        ...baseConstraints,
        fsLimit(limit + 1)
      );

      const context = {
        apiEndpoint: 'getPublicUserItems',
        operation: 'QUERY' as const,
        firebaseFunc: 'getDocs',
        path,
        requestPayload: {
          userId,
          tags,
          name,
          isPublic,
          limit,
          startAfter,
        },
      };

      try {
        const snapshot = await getDocs(pagedQuery);

        const rawItems = snapshot.docs.map(mapItemDoc);

        const hasNextPage = rawItems.length > limit;

        const pagedItems = hasNextPage ? rawItems.slice(0, limit) : rawItems;

        let filteredItems = pagedItems;

        /**
         * Client-side name filtering.
         * Firestore does not support
         * case-insensitive substring search.
         */
        if (name?.trim()) {
          const nameLower = name.trim().toLowerCase();

          filteredItems = pagedItems.filter((item) =>
            item.name?.toLowerCase().includes(nameLower)
          );
        }

        const lastItem = pagedItems[pagedItems.length - 1];

        return {
          data: {
            items: filteredItems,
            pageInfo: {
              endCursor: lastItem
                ? {
                    createdAt: lastItem.createdAt,
                    id: lastItem.id,
                  }
                : null,
              hasNextPage,
            },
          },
        };
      } catch (error) {
        return {
          error: createFirestoreApiError(context, error),
        };
      }
    },

    providesTags: (result, _error, request) =>
      result && result.items
        ? [
            ...result.items.map(({ id }) => ({
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

      const q = query(collection(db, path));

      const context = {
        apiEndpoint: 'getPublicUserItemsCount',
        operation: 'QUERY' as const,
        firebaseFunc: 'getCountFromServer',
        path,
        requestPayload: { userId },
      };

      try {
        const snapshot = await getCountFromServer(q);

        return {
          data: snapshot.data().count,
        };
      } catch (error) {
        return {
          error: createFirestoreApiError(context, error),
        };
      }
    },

    providesTags: (result, _error, userId) =>
      result
        ? [
            {
              type: 'PublicUserItems' as const,
              id: `${userId}_LIST`,
            },
          ]
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        return {
          error: createFirestoreApiError(context, error),
        };
      }
    },

    invalidatesTags: (_r, _e, { userId }) => [
      {
        type: 'PublicUserItems' as const,
        id: `${userId}_LIST`,
      },
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
        updatedAt: serverTimestamp(),
      };

      const context = {
        apiEndpoint: 'updatePublicUserItem',
        operation: 'UPDATE' as const,
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
        return {
          error: createFirestoreApiError(context, error),
        };
      }
    },

    invalidatesTags: (_r, _e, { id, userId }) => [
      {
        type: 'PublicUserItems' as const,
        id,
      },
      {
        type: 'PublicUserItems' as const,
        id: `${userId}_LIST`,
      },
    ],
  }),

  deletePublicUserItem: builder.mutation<
    void,
    {
      id: string;
      userId: string;
    }
  >({
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

        return {
          data: undefined,
        };
      } catch (error) {
        return {
          error: createFirestoreApiError(context, error),
        };
      }
    },

    invalidatesTags: (_r, _e, { id, userId }) => [
      {
        type: 'PublicUserItems' as const,
        id,
      },
      {
        type: 'PublicUserItems' as const,
        id: `${userId}_LIST`,
      },
    ],
  }),
});

export default getPublicUserItemsEndpoints;

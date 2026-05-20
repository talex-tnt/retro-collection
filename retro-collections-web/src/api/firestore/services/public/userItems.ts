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
  nameLowercase: string;
  nameTokens: string[];
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
  id: string;
  createdAt?: string;
  nameLowercase?: string;
}

const tokenizeName = (name: string): string[] => {
  return Array.from(
    new Set(name.trim().toLowerCase().split(/\s+/).filter(Boolean))
  );
};

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
      // name?: string;
      startWithNameFilter?: string;
      nameContainsTokens?: string;
      isPublic?: boolean;
      limit?: number;
      startAfter?: PaginationCursor | null;
    }
  >({
    async queryFn({
      userId,
      tags,
      // name,
      startWithNameFilter,
      nameContainsTokens,
      isPublic,
      limit,
      startAfter,
    }) {
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

      const startWithFilter = startWithNameFilter?.trim().toLowerCase();

      /**
       * Search
       */
      if (nameContainsTokens && nameContainsTokens.length > 0) {
        const searchTokens = tokenizeName(nameContainsTokens);

        /**
         * Firestore token pre-filter
         *
         * Firestore only supports ONE array-contains.
         */
        if (searchTokens.length > 0) {
          baseConstraints.push(
            where('nameTokens', 'array-contains', searchTokens[0])
          );
        }

        /**
         * Prefix search on lowercase name
         */
        baseConstraints.push(where('nameLowercase', '>=', startWithFilter));

        baseConstraints.push(
          where('nameLowercase', '<=', `${startWithFilter}\uf8ff`)
        );

        baseConstraints.push(orderBy('nameLowercase'));
      } else {
        baseConstraints.push(orderBy('createdAt', 'desc'));
      }

      baseConstraints.push(orderBy('__name__', 'asc'));

      /**
       * Cursor pagination
       */
      if (startAfter) {
        if (startWithFilter) {
          baseConstraints.push(
            fsStartAfter(startAfter.nameLowercase, startAfter.id)
          );
        } else {
          baseConstraints.push(
            fsStartAfter(
              Timestamp.fromDate(new Date(startAfter.createdAt!)),
              startAfter.id
            )
          );
        }
      }

      const pagedQuery = Number.isInteger(limit)
        ? query(
            collection(db, path),
            ...baseConstraints,
            fsLimit((limit ?? 0) + 1)
          )
        : query(collection(db, path), ...baseConstraints);

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

        let rawItems = snapshot.docs.map(mapItemDoc);

        /**
         * Client-side refinement for multi-token contains
         */
        if (startWithFilter) {
          const searchTokens = tokenizeName(startWithFilter);

          rawItems = rawItems.filter((item) => {
            const itemTokens = tokenizeName(item.name);

            return searchTokens.every((token) => itemTokens.includes(token));
          });
        }

        const hasNextPage = rawItems.length > (limit ?? rawItems.length);

        const pagedItems = hasNextPage
          ? rawItems.slice(0, limit ?? rawItems.length)
          : rawItems;

        const lastItem = pagedItems[pagedItems.length - 1];

        return {
          data: {
            items: pagedItems,
            pageInfo: {
              endCursor: lastItem
                ? startWithFilter
                  ? {
                      id: lastItem.id,
                      nameLowercase: lastItem.name.toLowerCase(),
                    }
                  : {
                      id: lastItem.id,
                      createdAt: lastItem.createdAt,
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

      const normalizedName = itemData.name.trim().toLowerCase();

      const requestPayload = {
        ...itemData,
        nameLowercase: normalizedName,
        nameTokens: tokenizeName(itemData.name),
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

        ...(updates.name
          ? {
              nameLowercase: updates.name.trim().toLowerCase(),

              nameTokens: tokenizeName(updates.name),
            }
          : {}),

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
        await setDoc(doc(db, path, id), requestPayload, {
          merge: true,
        });

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

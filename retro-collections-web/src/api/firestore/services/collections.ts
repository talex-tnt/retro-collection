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
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore'

import type {
  BaseQueryFn,
  EndpointBuilder,
} from '@reduxjs/toolkit/query'

import { db } from '../../../lib/firebase'

export interface Collection {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt?: string
  description?: string
}

type CollectionInput = Omit<
  Collection,
  'id' | 'createdAt' | 'updatedAt'
>

type CollectionUpdate = Partial<
  Omit<Collection, 'id' | 'createdAt'>
>

interface FirestoreCollectionDoc {
  name: string
  userId: string
  createdAt: Timestamp
  updatedAt?: Timestamp
  description?: string
}

type FirestoreBuilder = EndpointBuilder<
  BaseQueryFn,
  'Collections' | 'Items',
  'firestoreApi'
>

const serializeFirestoreData = (
  data: FirestoreCollectionDoc
): Omit<Collection, 'id'> => ({
  ...data,

  createdAt: data.createdAt
    .toDate()
    .toISOString(),

  updatedAt: data.updatedAt
    ?.toDate()
    .toISOString(),
})

const mapCollectionDoc = (
  snapshot: QueryDocumentSnapshot<DocumentData>
): Collection => {
  const data =
    snapshot.data() as FirestoreCollectionDoc

  return {
    id: snapshot.id,
    ...serializeFirestoreData(data),
  }
}

const getCollectionsEndpoints = (
  builder: FirestoreBuilder
) => ({
  getCollections: builder.query<
    Collection[],
    string
  >({
    async queryFn(userId: string) {
      try {
        const q = query(
          collection(db, 'collections'),

          where('userId', '==', userId),

          orderBy('createdAt', 'desc'),

          orderBy('__name__', 'asc')
        )

        const snapshot = await getDocs(q)

        return {
          data:
            snapshot.docs.map(mapCollectionDoc),
        }
      } catch (error) {
        return {
          error,
        }
      }
    },

    providesTags: (result) =>
      result
        ? [
            ...result.map(({ id }) => ({
              type: 'Collections' as const,
              id,
            })),

            {
              type: 'Collections' as const,
              id: 'LIST',
            },
          ]
        : [
            {
              type: 'Collections' as const,
              id: 'LIST',
            },
          ],
  }),

  createCollection: builder.mutation<
    Collection,
    CollectionInput
  >({
    async queryFn(
      collectionData: CollectionInput
    ) {
      try {
        const now = new Date()

        const docRef = await addDoc(
          collection(db, 'collections'),
          {
            ...collectionData,

            createdAt:
              Timestamp.fromDate(now),

            updatedAt:
              Timestamp.fromDate(now),
          }
        )

        return {
          data: {
            id: docRef.id,

            ...collectionData,

            createdAt: now.toISOString(),

            updatedAt: now.toISOString(),
          },
        }
      } catch (error) {
        return {
          error,
        }
      }
    },

    invalidatesTags: [
      {
        type: 'Collections' as const,
        id: 'LIST',
      },
    ],
  }),

  updateCollection: builder.mutation<
    void,
    {
      id: string
      updates: CollectionUpdate
    }
  >({
    async queryFn({ id, updates }) {
      try {
        await updateDoc(
          doc(db, 'collections', id),
          {
            ...updates,

            updatedAt: Timestamp.now(),
          }
        )

        return {
          data: undefined,
        }
      } catch (error) {
        return {
          error,
        }
      }
    },

    invalidatesTags: (
      _result,
      _error,
      { id }
    ) => [
      {
        type: 'Collections' as const,
        id,
      },

      {
        type: 'Collections' as const,
        id: 'LIST',
      },
    ],
  }),

  deleteCollection: builder.mutation<
    void,
    string
  >({
    async queryFn(id: string) {
      try {
        await deleteDoc(
          doc(db, 'collections', id)
        )

        return {
          data: undefined,
        }
      } catch (error) {
        return {
          error,
        }
      }
    },

    invalidatesTags: (
      _result,
      _error,
      id
    ) => [
      {
        type: 'Collections' as const,
        id,
      },

      {
        type: 'Collections' as const,
        id: 'LIST',
      },
    ],
  }),
})

export default getCollectionsEndpoints
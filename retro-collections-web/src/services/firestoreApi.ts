import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
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
  type DocumentData
} from 'firebase/firestore'
import { db } from '../lib/firebase'

// Helper function to convert Firestore data to serializable format
const serializeFirestoreData = (data: DocumentData): any => {
  const serialized = { ...data }
  Object.keys(serialized).forEach(key => {
    const value = serialized[key]
    if (value && typeof value === 'object' && 'toDate' in value) {
      // Convert Firestore Timestamp to ISO string
      serialized[key] = value.toDate().toISOString()
    }
  })
  return serialized
}

export interface Collection {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt?: string
  description?: string
}

export interface Item {
  id: string
  name: string
  userId: string
  collectionId: string
  createdAt: string
  updatedAt?: string
  description?: string
  visibility?: {
    public: boolean
  }
}

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Collections', 'Items'],
  endpoints: (builder) => ({
    // Collections
    getCollections: builder.query<Collection[], string>({
      async queryFn(userId) {
        try {
          const q = query(
            collection(db, 'collections'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            orderBy('__name__', 'asc')
          )
          const snapshot = await getDocs(q)
          const collections = snapshot.docs.map(doc => ({
            id: doc.id,
            ...serializeFirestoreData(doc.data())
          })) as Collection[]

          return { data: collections }
        } catch (error) {
          return { error: error as Error }
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Collections' as const, id })),
              { type: 'Collections', id: 'LIST' },
            ]
          : [{ type: 'Collections', id: 'LIST' }],
    }),

    createCollection: builder.mutation<Collection, Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>>({
      async queryFn(collectionData) {
        try {
          const docRef = await addDoc(collection(db, 'collections'), {
            ...collectionData,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          return {
            data: {
              id: docRef.id,
              ...collectionData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          }
        } catch (error) {
          return { error: error as Error }
        }
      },
      invalidatesTags: [{ type: 'Collections', id: 'LIST' }],
    }),

    updateCollection: builder.mutation<Collection, { id: string; updates: Partial<Omit<Collection, 'id' | 'createdAt'>> }>({
      async queryFn({ id, updates }) {
        try {
          await updateDoc(doc(db, 'collections', id), {
            ...updates,
            updatedAt: new Date(),
          })

          return { data: { id, ...updates } as Collection }
        } catch (error) {
          return { error: error as Error }
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Collections', id },
        { type: 'Collections', id: 'LIST' },
      ],
    }),

    deleteCollection: builder.mutation<void, string>({
      async queryFn(id) {
        try {
          await deleteDoc(doc(db, 'collections', id))
          return { data: undefined }
        } catch (error) {
          return { error: error as Error }
        }
      },
      invalidatesTags: (_result, _error, id) => [
        { type: 'Collections', id },
        { type: 'Collections', id: 'LIST' },
      ],
    }),

    // Items
    getItems: builder.query<Item[], string>({
      async queryFn(collectionId) {
        try {
          const q = query(
            collection(db, 'items'),
            where('collectionId', '==', collectionId),
            orderBy('createdAt', 'desc'),
            orderBy('__name__', 'asc')
          )
          const snapshot = await getDocs(q)
          const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...serializeFirestoreData(doc.data())
          })) as Item[]

          return { data: items }
        } catch (error) {
          return { error: error as Error }
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Items' as const, id })),
              { type: 'Items', id: 'LIST' },
            ]
          : [{ type: 'Items', id: 'LIST' }],
    }),

    getAllItems: builder.query<Item[], void>({
      async queryFn() {
        try {
          const q = query(
            collection(db, 'items'),
            orderBy('createdAt', 'desc'),
            orderBy('__name__', 'asc')
          )
          const snapshot = await getDocs(q)
          const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...serializeFirestoreData(doc.data())
          })) as Item[]

          return { data: items }
        } catch (error) {
          return { error: error as Error }
        }
      },
      providesTags: [{ type: 'Items', id: 'LIST' }],
    }),

    getUserItems: builder.query<Item[], string>({
      async queryFn(userId) {
        try {
          const q = query(
            collection(db, 'items'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            orderBy('__name__', 'asc')
          )
          const snapshot = await getDocs(q)
          const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...serializeFirestoreData(doc.data())
          })) as Item[]

          return { data: items }
        } catch (error) {
          return { error: error as Error }
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Items' as const, id })),
              { type: 'Items', id: 'LIST' },
          ]
        : [{ type: 'Items', id: 'LIST' }],
    }),

    createItem: builder.mutation<Item, Omit<Item, 'id' | 'createdAt' | 'updatedAt'>>({
      async queryFn(itemData) {
        try {
          const docRef = await addDoc(collection(db, 'items'), {
            ...itemData,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          return {
            data: {
              id: docRef.id,
              ...itemData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          }
        } catch (error) {
          return { error: error as Error }
        }
      },
      invalidatesTags: [{ type: 'Items', id: 'LIST' }],
    }),

    updateItem: builder.mutation<Item, { id: string; updates: Partial<Omit<Item, 'id' | 'createdAt'>> }>({
      async queryFn({ id, updates }) {
        try {
          await updateDoc(doc(db, 'items', id), {
            ...updates,
            updatedAt: new Date(),
          })

          return { data: { id, ...updates } as Item }
        } catch (error) {
          return { error: error as Error }
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Items', id },
        { type: 'Items', id: 'LIST' },
      ],
    }),

    deleteItem: builder.mutation<void, string>({
      async queryFn(id) {
        try {
          await deleteDoc(doc(db, 'items', id))
          return { data: undefined }
        } catch (error) {
          return { error: error as Error }
        }
      },
      invalidatesTags: (_result, _error, id) => [
        { type: 'Items', id },
        { type: 'Items', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,
  useGetItemsQuery,
  useGetAllItemsQuery,
  useGetUserItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
} = firestoreApi
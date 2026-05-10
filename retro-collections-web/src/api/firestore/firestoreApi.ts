import {
  createApi,
  fakeBaseQuery,
} from '@reduxjs/toolkit/query/react'

import getCollectionsEndpoints from './services/collections'
import getItemsEndpoints from './services/items'

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',

  baseQuery: fakeBaseQuery(),

  tagTypes: ['Collections', 'Items'],

  endpoints: (builder) => ({
    ...getCollectionsEndpoints(builder),
    ...getItemsEndpoints(builder),
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
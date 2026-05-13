import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FirestoreApiError } from './errorLogger';

import getCollectionsEndpoints from './services/collections';
import getItemsEndpoints from './services/items';
import getUsersEndpoints from './services/users';
import getAuthorizedUsersEndpoints from './services/authorized-users';

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',

  baseQuery: fakeBaseQuery<FirestoreApiError>(),

  tagTypes: ['Collections', 'Items', 'Users', 'AuthorizedUsers'],

  endpoints: (builder) => ({
    ...getCollectionsEndpoints(builder),
    ...getItemsEndpoints(builder),
    ...getUsersEndpoints(builder),
    ...getAuthorizedUsersEndpoints(builder),
  }),
});

export const {
  useGetCollectionsQuery,
  useGetPublicCollectionsByUserIdQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,

  useGetItemsQuery,
  useGetPublicItemsByCollectionIdQuery,
  useGetItemsCountQuery,
  useGetAllItemsQuery,
  useGetUserItemsQuery,
  useGetUserItemsCountQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,

  useGetUsersQuery,
  useGetUserByIdQuery,
  useLazyIsUserAuthorizedQuery,
  useCreateOrUpdateUserMutation,

  useIsUserAuthorizedQuery,
  useGetAuthorizedUsersQuery,
  useAddAuthorizedUserMutation,
  useRemoveAuthorizedUserMutation,
} = firestoreApi;

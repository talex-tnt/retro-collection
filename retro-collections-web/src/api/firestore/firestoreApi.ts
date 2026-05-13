import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FirestoreApiError } from './errorLogger';

import getRuntimeConfigEndpoints from './services/runtime-config';
import getCollectionsEndpoints from './services/collections';
import getItemsEndpoints from './services/items';
import getUsersEndpoints from './services/users';
import getAuthorizedUsersEndpoints from './services/authorized-users';

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',

  baseQuery: fakeBaseQuery<FirestoreApiError>(),

  tagTypes: ['Collections', 'Items', 'Users', 'AuthorizedUsers'],

  endpoints: (builder) => ({
    ...getRuntimeConfigEndpoints(builder),
    ...getCollectionsEndpoints(builder),
    ...getItemsEndpoints(builder),
    ...getUsersEndpoints(builder),
    ...getAuthorizedUsersEndpoints(builder),
  }),
});

export const {
  useGetRuntimeConfigQuery,

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
  useGetPublicUsersQuery,
  useGetUserByIdQuery,
  useLazyIsUserAuthorizedQuery,
  useCreateOrUpdateUserMutation,
  useSetUserVisibilityMutation,

  useIsUserAuthorizedQuery,
  useGetAuthorizedUsersQuery,
  useAddAuthorizedUserMutation,
  useRemoveAuthorizedUserMutation,
} = firestoreApi;

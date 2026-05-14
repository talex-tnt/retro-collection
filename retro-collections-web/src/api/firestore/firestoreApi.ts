import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FirestoreApiError } from './errorLogger';

import getRuntimeConfigEndpoints from './services/runtime-config';
import getCollectionsEndpoints from './services/public/collections';
import getItemsEndpoints from './services/public/items';
import getUsersEndpoints from './services/public/users';
import getAuthorizedUsersEndpoints from './services/private/authorized-users';

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',

  baseQuery: fakeBaseQuery<FirestoreApiError>(),

  tagTypes: [
    'PublicCollections',
    'PublicItems',
    'PublicUsers',
    'PrivateAuthorizedUsers',
  ],

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
  useGetPublicCollectionsQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,

  useGetItemsQuery,
  useGetPublicItemsQuery,
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

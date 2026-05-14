import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FirestoreApiError } from './errorLogger';

import getRuntimeConfigEndpoints from './services/runtime-config';
import getCollectionsEndpoints from './services/public/collections';
import getItemsEndpoints from './services/public/items';
import getUsersEndpoints from './services/public/users';
import getAuthorizedUsersEndpoints from './services/private/authorized-users';
import getPrivateUsersEndpoints from './services/private/users';

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',

  baseQuery: fakeBaseQuery<FirestoreApiError>(),

  tagTypes: [
    'PublicCollections',
    'PublicItems',
    'PublicUsers',
    'PrivateUsers',
    'PrivateAuthorizedUsers',
  ],

  endpoints: (builder) => ({
    ...getRuntimeConfigEndpoints(builder),
    ...getCollectionsEndpoints(builder),
    ...getItemsEndpoints(builder),
    ...getUsersEndpoints(builder),
    ...getPrivateUsersEndpoints(builder),
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
  useGetPrivateUsersQuery,
  useGetUserByIdQuery,
  useGetPrivateUserByIdQuery,
  useLazyIsUserAuthorizedQuery,
  useCreateOrUpdateUserMutation,
  useCreateOrUpdatePrivateUserMutation,
  useSetUserVisibilityMutation,

  useIsUserAuthorizedQuery,
  useGetAuthorizedUsersQuery,
  useAddAuthorizedUserMutation,
  useRemoveAuthorizedUserMutation,
} = firestoreApi;

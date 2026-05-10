import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import getCollectionsEndpoints from './services/collections';
import getItemsEndpoints from './services/items';
import getUsersEndpoints from './services/users';
import getAuthorizedUsersEndpoints from './services/authorized-users';

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',

  baseQuery: fakeBaseQuery(),

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
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,

  useGetItemsQuery,
  useGetAllItemsQuery,
  useGetUserItemsQuery,
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

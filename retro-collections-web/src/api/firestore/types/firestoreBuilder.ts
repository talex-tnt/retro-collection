import type { BaseQueryFn, EndpointBuilder } from '@reduxjs/toolkit/query';

export type FirestoreTagTypes =
  | 'Collections'
  | 'Items'
  | 'Users'
  | 'AuthorizedUsers';

export type FirestoreBuilder = EndpointBuilder<
  BaseQueryFn,
  FirestoreTagTypes,
  'firestoreApi'
>;

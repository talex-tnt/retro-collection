import type { BaseQueryFn, EndpointBuilder } from '@reduxjs/toolkit/query';
import type { FirestoreApiError } from '../errorLogger';

export type FirestoreTagTypes =
  | 'Collections'
  | 'Items'
  | 'Users'
  | 'AuthorizedUsers';

export type FirestoreBuilder = EndpointBuilder<
  BaseQueryFn<void, unknown, FirestoreApiError>,
  FirestoreTagTypes,
  'firestoreApi'
>;

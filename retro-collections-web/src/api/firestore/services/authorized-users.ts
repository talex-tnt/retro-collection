import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

import type { FirestoreBuilder } from '../types/firestoreBuilder';
import { createFirestoreApiError } from '../errorLogger';
import { db } from '../../../lib/firebase';

export interface AuthorizedUser {
  id: string;
}

/**
 * NOTE:
 * Document ID = email
 */

const getAuthorizedUsersEndpoints = (builder: FirestoreBuilder) => ({
  // -------------------------
  // CHECK AUTHORIZATION
  // -------------------------
  isUserAuthorized: builder.query<boolean, string>({
    async queryFn(email: string) {
      const context = {
        apiEndpoint: 'isUserAuthorized',
        operation: 'GET' as const,
        firebaseFunc: 'getDoc',
        path: 'authorized-users',
        segmentPaths: [email],
      };
      try {
        const snap = await getDoc(
          doc(db, context.path, ...context.segmentPaths)
        );

        return {
          data: snap.exists(),
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },
  }),

  // -------------------------
  // LIST USERS
  // -------------------------
  getAuthorizedUsers: builder.query<AuthorizedUser[], void>({
    async queryFn() {
      const context = {
        apiEndpoint: 'getAuthorizedUsers',
        operation: 'QUERY' as const,
        firebaseFunc: 'getDocs',
        path: 'authorized-users',
      };
      try {
        const snapshot = await getDocs(collection(db, context.path));

        return {
          data: snapshot.docs.map((d) => ({
            id: d.id,
          })),
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    providesTags: (result) =>
      result
        ? [
            ...result.map((u) => ({
              type: 'AuthorizedUsers' as const,
              id: u.id,
            })),
            { type: 'AuthorizedUsers' as const, id: 'LIST' },
          ]
        : [{ type: 'AuthorizedUsers' as const, id: 'LIST' }],
  }),

  // -------------------------
  // ADD USER
  // -------------------------
  addAuthorizedUser: builder.mutation<void, string>({
    async queryFn(email: string) {
      const context = {
        apiEndpoint: 'addAuthorizedUser',
        operation: 'CREATE' as const,
        firebaseFunc: 'setDoc',
        path: 'authorized-users',
        segmentPaths: [email],
        requestPayload: {
          addedAt: serverTimestamp(),
        },
      };
      try {
        await setDoc(
          doc(db, context.path, ...context.segmentPaths),
          context.requestPayload
        );

        return { data: undefined };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },
    invalidatesTags: [{ type: 'AuthorizedUsers' as const, id: 'LIST' }],
  }),

  // -------------------------
  // REMOVE USER
  // -------------------------
  removeAuthorizedUser: builder.mutation<void, string>({
    async queryFn(email: string) {
      const context = {
        apiEndpoint: 'removeAuthorizedUser',
        operation: 'DELETE' as const,
        firebaseFunc: 'deleteDoc',
        path: 'authorized-users',
        segmentPaths: [email],
      };
      try {
        await deleteDoc(doc(db, context.path, ...context.segmentPaths));

        return { data: undefined };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },

    invalidatesTags: [{ type: 'AuthorizedUsers' as const, id: 'LIST' }],
  }),
});

export default getAuthorizedUsersEndpoints;

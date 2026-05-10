import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

import type { FirestoreBuilder } from '../types/firestoreBuilder';
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
      try {
        const snap = await getDoc(doc(db, 'authorized-users', email));

        return {
          data: snap.exists(),
        };
      } catch (error) {
        return { error };
      }
    },
  }),

  // -------------------------
  // LIST USERS
  // -------------------------
  getAuthorizedUsers: builder.query<AuthorizedUser[], void>({
    async queryFn() {
      try {
        const snapshot = await getDocs(collection(db, 'authorized-users'));

        return {
          data: snapshot.docs.map((d) => ({
            id: d.id,
          })),
        };
      } catch (error) {
        return { error };
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
      try {
        await setDoc(doc(db, 'authorized-users', email), {
          addedAt: new Date(),
        });

        return { data: undefined };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: [{ type: 'AuthorizedUsers' as const, id: 'LIST' }],
  }),

  // -------------------------
  // REMOVE USER
  // -------------------------
  removeAuthorizedUser: builder.mutation<void, string>({
    async queryFn(email: string) {
      try {
        await deleteDoc(doc(db, 'authorized-users', email));

        return { data: undefined };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: [{ type: 'AuthorizedUsers' as const, id: 'LIST' }],
  }),
});

export default getAuthorizedUsersEndpoints;

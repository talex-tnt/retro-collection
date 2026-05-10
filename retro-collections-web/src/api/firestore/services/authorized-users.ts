import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import type { FirestoreBuilder } from '../types/firestoreBuilder';

import { db } from '../../../lib/firebase';

export interface AuthorizedUser {
  id: string;
}

const getAuthorizedUsersEndpoints = (builder: FirestoreBuilder) => ({
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

    providesTags: [{ type: 'AuthorizedUsers' as const, id: 'LIST' }],
  }),
});

export default getAuthorizedUsersEndpoints;

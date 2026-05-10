import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';

import type { FirestoreBuilder } from '../types/firestoreBuilder';
import { db } from '../../../lib/firebase';

export interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  lastLogin?: string;
}

interface FirestoreUserDoc {
  name?: string;
  email?: string;
  lastLogin?: Timestamp;
}

const mapUserDoc = (
  snapshot: QueryDocumentSnapshot<DocumentData>
): UserRecord => {
  const data = snapshot.data() as FirestoreUserDoc;

  return {
    id: snapshot.id,
    name: data.name,
    email: data.email,
    lastLogin: data.lastLogin?.toDate?.()?.toISOString(),
  };
};

const getUsersEndpoints = (builder: FirestoreBuilder) => ({
  getUsers: builder.query<UserRecord[], void>({
    async queryFn() {
      try {
        const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'));

        const snapshot = await getDocs(q);

        return {
          data: snapshot.docs.map(mapUserDoc),
        };
      } catch (error) {
        return { error };
      }
    },

    providesTags: [{ type: 'Users' as const, id: 'LIST' }],
  }),

  getUserById: builder.query<UserRecord | null, string>({
    async queryFn(userId) {
      try {
        const snap = await getDoc(doc(db, 'users', userId));

        if (!snap.exists()) return { data: null };

        const data = snap.data() as FirestoreUserDoc;

        return {
          data: {
            id: snap.id,
            name: data.name,
            email: data.email,
            lastLogin: data.lastLogin?.toDate?.()?.toISOString(),
          },
        };
      } catch (error) {
        return { error };
      }
    },
  }),
  createOrUpdateUser: builder.mutation<
    void,
    {
      id: string;
      name: string;
      email: string;
      lastLogin: string;
    }
  >({
    async queryFn({ id, ...data }) {
      try {
        await setDoc(
          doc(db, 'users', id),
          {
            ...data,
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );

        return {
          data: undefined,
        };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: (_result, _error, { id }) => [
      {
        type: 'Users' as const,
        id,
      },

      {
        type: 'Users' as const,
        id: 'LIST',
      },
    ],
  }),
  updateUser: builder.mutation<
    void,
    {
      id: string;
      updates: Partial<UserRecord>;
    }
  >({
    async queryFn({ id, updates }) {
      try {
        await updateDoc(doc(db, 'users', id), {
          ...updates,

          lastLogin: serverTimestamp(),
        });

        return {
          data: undefined,
        };
      } catch (error) {
        return { error };
      }
    },

    invalidatesTags: (_result, _error, { id }) => [
      {
        type: 'Users' as const,
        id,
      },

      {
        type: 'Users' as const,
        id: 'LIST',
      },
    ],
  }),
});

export default getUsersEndpoints;

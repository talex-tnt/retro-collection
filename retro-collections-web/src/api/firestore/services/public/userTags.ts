import {
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import type { FirestoreBuilder } from '../../types/firestoreBuilder';
import { db } from '../../../../lib/firebase';
import { getUserCollectionPath } from '../../runtimeConfig';
import { createFirestoreApiError } from '../../errorLogger';

export interface UserTag {
  id: string; // tag name
  userId: string;
}

const getPublicUserTagsEndpoints = (builder: FirestoreBuilder) => ({
  getPublicUserTags: builder.query<UserTag[], { userId: string }>({
    async queryFn({ userId }) {
      // Tags are stored as docs in a subcollection: /users/{userId}/tags/{tag}
      const path = await getUserCollectionPath({
        visibility: 'public',
        resourceType: 'tags',
        userId,
      });
      const q = query(collection(db, path), orderBy('__name__', 'asc'));
      const context = {
        apiEndpoint: 'getPublicUserTags',
        operation: 'QUERY' as const,
        firebaseFunc: 'getDocs',
        path,
        requestPayload: q,
      };
      try {
        const snapshot = await getDocs(q);
        return {
          data: snapshot.docs.map((doc) => ({
            id: doc.id,
            userId,
          })),
        };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },
    providesTags: (result, _error, request) =>
      result
        ? [
            ...result.map(({ id }) => ({
              type: 'PublicUserTags' as const,
              id,
            })),
            {
              type: 'PublicUserTags' as const,
              id: `${request.userId}_LIST`,
            },
          ]
        : [
            {
              type: 'PublicUserTags' as const,
              id: `${request.userId}_LIST`,
            },
          ],
  }),

  createPublicUserTag: builder.mutation<
    UserTag,
    { userId: string; tag: string }
  >({
    async queryFn({ userId, tag }) {
      const path = await getUserCollectionPath({
        visibility: 'public',
        resourceType: 'tags',
        userId,
      });
      const context = {
        apiEndpoint: 'createPublicUserTag',
        operation: 'CREATE' as const,
        firebaseFunc: 'setDoc',
        path,
        segmentPaths: [tag],
        requestPayload: { createdAt: serverTimestamp() },
      };
      try {
        // Use setDoc to create the tag doc with the tag name as the doc id

        await setDoc(doc(db, path, tag), context.requestPayload);
        return { data: { id: tag, userId } };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },
    invalidatesTags: (_r, _e, { userId }) => [
      { type: 'PublicUserTags' as const, id: `${userId}_LIST` },
    ],
  }),

  deletePublicUserTag: builder.mutation<void, { userId: string; tag: string }>({
    async queryFn({ userId, tag }) {
      const path = await getUserCollectionPath({
        visibility: 'public',
        resourceType: 'tags',
        userId,
      });
      const context = {
        apiEndpoint: 'deletePublicUserTag',
        operation: 'DELETE' as const,
        firebaseFunc: 'deleteDoc',
        path,
        segmentPaths: [tag],
      };
      try {
        await deleteDoc(doc(db, path, tag));
        return { data: undefined };
      } catch (error) {
        return { error: createFirestoreApiError(context, error) };
      }
    },
    invalidatesTags: (_r, _e, { userId, tag }) => [
      { type: 'PublicUserTags' as const, id: tag },
      { type: 'PublicUserTags' as const, id: `${userId}_LIST` },
    ],
  }),
});

export default getPublicUserTagsEndpoints;

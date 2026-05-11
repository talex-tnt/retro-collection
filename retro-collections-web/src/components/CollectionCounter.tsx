import { useGetItemsCountQuery } from '../api/firestore/firestoreApi';

function CollectionCounter({
  collectionId,
  userId,
}: {
  collectionId: string;
  userId: string;
}) {
  const { data: count } = useGetItemsCountQuery({
    collectionId,
    userId,
  });

  return <span>({count ?? 0})</span>;
}
export default CollectionCounter;

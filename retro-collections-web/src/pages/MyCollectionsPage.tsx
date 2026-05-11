import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import CollectionsPanel from '../components/CollectionsPanel';
import ItemsPanel from '../components/ItemsPanel';
import {
  useGetCollectionsQuery,
  useGetUserItemsQuery,
} from '../api/firestore/firestoreApi';

interface CollectionRecord {
  id: string;
  name: string;
  createdAt: string;
}

type SelectedCollection =
  | CollectionRecord
  | { id: 'orphaned'; name: 'Orphaned Items'; createdAt: '' };

function MyCollectionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedCollection, setSelectedCollection] =
    useState<SelectedCollection | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  const { data: collections = [] } = useGetCollectionsQuery(user?.uid || '', {
    skip: !user?.uid,
  });

  const { data: allUserItems = [] } = useGetUserItemsQuery(user?.uid || '', {
    skip: !user?.uid,
  });

  const collectionIds = useMemo(
    () => new Set(collections.map((c) => c.id)),
    [collections]
  );

  const orphanedItems = useMemo(
    () =>
      allUserItems.filter(
        (item) => item.collectionId && !collectionIds.has(item.collectionId)
      ),
    [allUserItems, collectionIds]
  );

  const resolvedSelectedCollection = useMemo(() => {
    if (!selectedCollection) {
      return null;
    }

    if (selectedCollection.id === 'orphaned') {
      return orphanedItems.length > 0 ? selectedCollection : null;
    }

    if (collectionIds.has(selectedCollection.id)) {
      return selectedCollection;
    }

    return orphanedItems.some(
      (item) => item.collectionId === selectedCollection.id
    )
      ? { id: 'orphaned', name: 'Orphaned Items', createdAt: '' }
      : null;
  }, [collectionIds, orphanedItems, selectedCollection]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  if (!user) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">My Collections</h2>
          <p>Please log in to manage your collections and items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      {/* LEFT - Collections Panel */}
      <CollectionsPanel
        user={user}
        selectedCollection={resolvedSelectedCollection}
        onSelectCollection={setSelectedCollection}
        collectionName={collectionName}
        onCollectionNameChange={setCollectionName}
        orphanedCount={orphanedItems.length}
      />

      {/* CENTER - Items Panel */}
      <ItemsPanel
        user={user}
        selectedCollection={resolvedSelectedCollection}
        itemName={itemName}
        onItemNameChange={setItemName}
        itemFilter={itemFilter}
        onItemFilterChange={setItemFilter}
        orphanedItems={orphanedItems}
      />
    </div>
  );
}

export default MyCollectionsPage;

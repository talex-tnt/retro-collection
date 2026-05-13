import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useNavigate, useParams } from 'react-router-dom';
import { auth } from '../lib/firebase';
import CollectionsPanel from '../components/CollectionsPanel';
import ItemsPanel from '../components/ItemsPanel';
import NewItem from '../components/NewItem';
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
  const navigate = useNavigate();
  const { collectionId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [selectedCollection, setSelectedCollection] =
    useState<SelectedCollection | null>(null);
  const [collectionName, setCollectionName] = useState('');
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
        (item) => !item.collectionId || !collectionIds.has(item.collectionId)
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

  const routeSelectedCollection = useMemo(() => {
    if (!collectionId) {
      return null;
    }

    if (collectionId === 'orphaned') {
      return orphanedItems.length > 0
        ? { id: 'orphaned', name: 'Orphaned Items', createdAt: '' }
        : null;
    }

    return (
      collections.find((collection) => collection.id === collectionId) ?? null
    );
  }, [collectionId, collections, orphanedItems.length]);

  useEffect(() => {
    setSelectedCollection(routeSelectedCollection);
  }, [routeSelectedCollection]);

  const handleSelectCollection = (collection: SelectedCollection) => {
    setSelectedCollection(collection);
    navigate(`/my-collections/${collection.id}`);
  };

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
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_1fr]">
      <div className="space-y-6">
        <NewItem
          userId={user.uid}
          collections={collections}
          selectedCollection={resolvedSelectedCollection}
        />

        <CollectionsPanel
          user={user}
          selectedCollection={resolvedSelectedCollection}
          onSelectCollection={handleSelectCollection}
          collectionName={collectionName}
          onCollectionNameChange={setCollectionName}
          orphanedCount={orphanedItems.length}
        />
      </div>

      <ItemsPanel
        user={user}
        selectedCollection={resolvedSelectedCollection}
        collections={collections}
        itemFilter={itemFilter}
        onItemFilterChange={setItemFilter}
        orphanedItems={orphanedItems}
      />
    </div>
  );
}

export default MyCollectionsPage;

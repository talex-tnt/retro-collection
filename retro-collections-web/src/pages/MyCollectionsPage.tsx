import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import CollectionsPanel from '../components/CollectionsPanel';
import ItemsPanel from '../components/ItemsPanel';

interface CollectionRecord {
  id: string;
  name: string;
  createdAt: string;
}

function MyCollectionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionRecord | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemFilter, setItemFilter] = useState('');

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
        selectedCollection={selectedCollection}
        onSelectCollection={setSelectedCollection}
        collectionName={collectionName}
        onCollectionNameChange={setCollectionName}
      />

      {/* CENTER - Items Panel */}
      <ItemsPanel
        user={user}
        selectedCollection={selectedCollection}
        itemName={itemName}
        onItemNameChange={setItemName}
        itemFilter={itemFilter}
        onItemFilterChange={setItemFilter}
      />
    </div>
  );
}

export default MyCollectionsPage;

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ItemsList from '../components/ItemsList';
import NewItem from '../components/NewItem';

function MyCollectionPage() {
  const [user, setUser] = useState<User | null>(null);
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
          <h2 className="card-title">My Items</h2>
          <p>Please log in to manage your items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-1">
      <div className="space-y-6">
        <ItemsList
          user={user}
          itemFilter={itemFilter}
          onItemFilterChange={setItemFilter}
        />
        <NewItem userId={user.uid} />
      </div>
    </div>
  );
}

export default MyCollectionPage;

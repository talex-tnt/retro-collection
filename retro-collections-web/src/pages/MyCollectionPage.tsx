import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';

import MySpareItems from './MySpareItems';
import WIPTab from './WIPTab';

function MyCollectionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'spare' | 'wip'>('spare');

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
    <div>
      <div className="tabs tabs-boxed mb-4">
        <button
          className={`tab${activeTab === 'spare' ? ' tab-active' : ''}`}
          onClick={() => setActiveTab('spare')}
        >
          Spare Collectibles
        </button>
        <button
          className={`tab${activeTab === 'wip' ? ' tab-active' : ''}`}
          onClick={() => setActiveTab('wip')}
        >
          Collections
        </button>
      </div>
      <div>
        {activeTab === 'spare' && <MySpareItems user={user} />}
        {activeTab === 'wip' && <WIPTab />}
      </div>
    </div>
  );
}

export default MyCollectionPage;

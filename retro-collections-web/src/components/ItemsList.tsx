import { useState } from 'react';
import { useGetPublicUserItemsQuery } from '../api/firestore/firestoreApi';

import ListItem from './ListItem';

interface ItemsListProps {
  user: { uid: string } | null;
  itemFilter: string;
  onItemFilterChange: (filter: string) => void;
  selectedTags: string[];
}

function ItemsList({ user, itemFilter, selectedTags }: ItemsListProps) {
  const [showTags, setShowTags] = useState(true);
  const {
    data: items = [],
    isLoading: loadingItems,
    error: itemsError,
  } = useGetPublicUserItemsQuery(
    {
      userId: user?.uid || '',
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    },
    { skip: !user?.uid }
  );

  // Filter items by name
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(itemFilter.toLowerCase())
  );

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-4">
        {/* Items Header */}
        <div className="flex items-center justify-between">
          <h2 className="card-title">My Collectibles</h2>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setShowTags((v) => !v)}
          >
            {showTags ? 'Hide Tags' : 'Show Tags'}
          </button>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {itemsError ? (
            <div className="alert alert-error">
              <span>
                Error loading collectibles:{' '}
                {(itemsError as Error).message || 'Unknown error'}
              </span>
            </div>
          ) : loadingItems ? (
            <div className="alert alert-info">Loading collectibles...</div>
          ) : filteredItems.length === 0 ? (
            <div className="alert alert-info">
              {itemFilter
                ? 'No collectibles match your filter.'
                : 'No collectibles yet.'}
            </div>
          ) : (
            filteredItems.map((item) => (
              <ListItem
                key={item.id}
                item={item}
                showTags={showTags}
                userId={user?.uid || ''}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ItemsList;

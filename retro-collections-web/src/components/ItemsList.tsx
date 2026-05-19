import {
  useGetPublicUserItemsQuery,
  useUpdatePublicUserItemMutation,
  useDeletePublicUserItemMutation,
} from '../api/firestore/firestoreApi';

import ItemActions from './ItemActions';

interface ItemsListProps {
  user: { uid: string } | null;
  itemFilter: string;
  onItemFilterChange: (filter: string) => void;
}

function ItemsList({ user, itemFilter, onItemFilterChange }: ItemsListProps) {
  const {
    data: items = [],
    isLoading: loadingItems,
    error: itemsError,
  } = useGetPublicUserItemsQuery(
    { userId: user?.uid || '' },
    { skip: !user?.uid }
  );

  const [updateItem] = useUpdatePublicUserItemMutation();
  const [deleteItem] = useDeletePublicUserItemMutation();

  const handleEditItem = async (itemId: string, newName: string) => {
    if (!user || !newName.trim()) return;

    try {
      await updateItem({
        id: itemId,
        userId: user.uid,
        updates: { name: newName.trim() },
      }).unwrap();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;
    try {
      await deleteItem({
        id: itemId,
        userId: user.uid,
      }).unwrap();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleToggleItemVisibility = async (
    itemId: string,
    currentVisibility: boolean
  ) => {
    if (!user) return;

    try {
      await updateItem({
        id: itemId,
        userId: user.uid,
        updates: { visibility: { public: !currentVisibility } },
      }).unwrap();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  // Filter items by name
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(itemFilter.toLowerCase())
  );

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-4">
        {/* Items Header */}
        <div>
          <h2 className="card-title">My Collectibles</h2>
        </div>

        {/* Filter Input */}
        <div>
          <input
            type="text"
            className="input input-bordered w-full"
            value={itemFilter}
            onChange={(e) => onItemFilterChange(e.target.value)}
            placeholder="Filter items by name..."
          />
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
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-base-300 bg-base-200 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{item.name}</p>
                  <ItemActions
                    itemId={item.id}
                    itemName={item.name}
                    isPublic={!!item.visibility?.public}
                    onEdit={handleEditItem}
                    onToggleVisibility={handleToggleItemVisibility}
                    onDelete={handleDeleteItem}
                  />
                </div>
                <div className="space-y-1">
                  {item.description && (
                    <p className="text-sm text-base-content/80 whitespace-pre-wrap">
                      {item.description}
                    </p>
                  )}
                  <p className="text-sm text-base-content/70">
                    {item.createdAt
                      ? `Added ${new Date(item.createdAt).toLocaleString()}`
                      : 'No timestamp'}
                  </p>
                  <p className="text-sm text-base-content/70">
                    Visibility: {item.visibility?.public ? 'Public' : 'Private'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ItemsList;

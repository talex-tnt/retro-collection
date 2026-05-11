import {
  useGetItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
} from '../api/firestore/firestoreApi';
import ItemActions from './ItemActions';

interface CollectionRecord {
  id: string;
  name: string;
  createdAt: string;
}

interface ItemsPanelProps {
  user: { uid: string } | null;
  selectedCollection: CollectionRecord | null;
  itemName: string;
  onItemNameChange: (name: string) => void;
  itemFilter: string;
  onItemFilterChange: (filter: string) => void;
}

function ItemsPanel({
  user,
  selectedCollection,
  itemName,
  onItemNameChange,
  itemFilter,
  onItemFilterChange,
}: ItemsPanelProps) {
  const {
    data: items = [],
    isLoading: loadingItems,
    error: itemsError,
  } = useGetItemsQuery(
    { collectionId: selectedCollection?.id || '', userId: user?.uid || '' },
    {
      skip: !selectedCollection?.id,
    }
  );

  const [createItem, { isLoading: isCreatingItem }] = useCreateItemMutation();
  const [updateItem] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCollection || !itemName.trim()) return;

    try {
      await createItem({
        name: itemName.trim(),
        userId: user.uid,
        collectionId: selectedCollection.id,
        visibility: { public: false },
      }).unwrap();
      onItemNameChange('');
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleEditItem = async (itemId: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      await updateItem({
        id: itemId,
        updates: { name: newName.trim() },
      }).unwrap();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedCollection) return;
    try {
      await deleteItem({
        id: itemId,
        collectionId: selectedCollection.id,
      }).unwrap();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleToggleItemVisibility = async (
    itemId: string,
    currentVisibility: boolean
  ) => {
    try {
      await updateItem({
        id: itemId,
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

  if (!selectedCollection) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="alert alert-info">
            <span>Select a collection from the left to view items</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-4">
        {/* Collection Header */}
        <div>
          <h2 className="card-title">{selectedCollection.name}</h2>
          <p className="text-sm text-base-content/70">
            Created{' '}
            {selectedCollection.createdAt
              ? new Date(selectedCollection.createdAt).toLocaleString()
              : 'unknown'}
          </p>
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

        {/* Create Item */}
        <form
          onSubmit={handleCreateItem}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            className="input input-bordered flex-1"
            value={itemName}
            onChange={(e) => onItemNameChange(e.target.value)}
            placeholder="New item name"
            disabled={isCreatingItem}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isCreatingItem || !itemName.trim()}
          >
            {isCreatingItem ? 'Adding...' : 'Add Item'}
          </button>
        </form>

        {/* Items List */}
        <div className="space-y-3">
          {itemsError ? (
            <div className="alert alert-error">
              <span>
                Error loading items:{' '}
                {(itemsError as Error).message || 'Unknown error'}
              </span>
            </div>
          ) : loadingItems ? (
            <div className="alert alert-info">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="alert alert-info">
              {itemFilter
                ? 'No items match your filter.'
                : 'No items in this collection yet.'}
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

export default ItemsPanel;

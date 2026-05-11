import type { ChangeEvent } from 'react';
import {
  useGetItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
} from '../api/firestore/firestoreApi';
import ItemActions from './ItemActions';

type SelectedCollection =
  | CollectionRecord
  | { id: 'orphaned'; name: 'Orphaned Items'; createdAt: '' };

interface ItemData {
  id: string;
  name: string;
  collectionId: string;
  createdAt: string;
  visibility?: {
    public: boolean;
  };
}

interface CollectionRecord {
  id: string;
  name: string;
  createdAt: string;
}

interface ItemsPanelProps {
  user: { uid: string } | null;
  selectedCollection: SelectedCollection | null;
  collections: CollectionRecord[];
  itemName: string;
  onItemNameChange: (name: string) => void;
  itemFilter: string;
  onItemFilterChange: (filter: string) => void;
  orphanedItems: ItemData[];
}

function ItemsPanel({
  user,
  selectedCollection,
  collections,
  itemName,
  onItemNameChange,
  itemFilter,
  onItemFilterChange,
  orphanedItems,
}: ItemsPanelProps) {
  const {
    data: items = [],
    isLoading: loadingItems,
    error: itemsError,
  } = useGetItemsQuery(
    { collectionId: selectedCollection?.id || '', userId: user?.uid || '' },
    {
      skip: !selectedCollection?.id || selectedCollection?.id === 'orphaned',
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
    if (!selectedCollection || !user) return;
    try {
      await deleteItem({
        id: itemId,
        collectionId: selectedCollection.id,
        userId: user.uid,
      }).unwrap();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleCollectionChange = async (
    itemId: string,
    currentCollectionId: string,
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    if (!user) return;

    const nextCollectionId = event.target.value;

    if (nextCollectionId === currentCollectionId) {
      return;
    }

    try {
      await updateItem({
        id: itemId,
        userId: user.uid,
        previousCollectionId: currentCollectionId,
        updates: { collectionId: nextCollectionId },
      }).unwrap();
    } catch (error) {
      event.target.value = currentCollectionId;
      console.error('Error moving item:', error);
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
  const displayItems =
    selectedCollection?.id === 'orphaned' ? orphanedItems : items;
  const filteredItems = displayItems.filter((item) =>
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
          {selectedCollection.id !== 'orphaned' &&
            selectedCollection.createdAt && (
              <p className="text-sm text-base-content/70">
                Created{' '}
                {new Date(selectedCollection.createdAt).toLocaleString()}
              </p>
            )}
          {selectedCollection.id === 'orphaned' && (
            <p className="text-sm text-base-content/70">
              Items with deleted or invalid collections
            </p>
          )}
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

        {/* Create Item - Only for regular collections */}
        {selectedCollection?.id !== 'orphaned' && (
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
        )}

        {/* Items List */}
        <div className="space-y-3">
          {selectedCollection?.id === 'orphaned' &&
          orphanedItems.length === 0 ? (
            <div className="alert alert-info">No orphaned items.</div>
          ) : itemsError && selectedCollection?.id !== 'orphaned' ? (
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
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-base-content/70">
                      Collection
                    </span>
                    <select
                      className="select select-bordered select-sm w-full sm:max-w-xs"
                      value={
                        collections.some(
                          (collection) => collection.id === item.collectionId
                        )
                          ? item.collectionId
                          : ''
                      }
                      onChange={(event) =>
                        handleCollectionChange(
                          item.id,
                          item.collectionId,
                          event
                        )
                      }
                    >
                      <option value="">No collection</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))}
                    </select>
                  </div>
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

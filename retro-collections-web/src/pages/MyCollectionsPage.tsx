import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ItemActions from '../components/ItemActions';
import {
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useDeleteCollectionMutation,
  useGetItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
} from '../api/firestore/firestoreApi';

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

  // RTK Query hooks
  const {
    data: collections = [],
    isLoading: loadingCollections,
    error: collectionsError,
  } = useGetCollectionsQuery(user?.uid || '', {
    skip: !user?.uid,
  });

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

  const [createCollection, { isLoading: isCreatingCollection }] =
    useCreateCollectionMutation();
  const [deleteCollection, { isLoading: isDeletingCollection }] =
    useDeleteCollectionMutation();
  const [createItem, { isLoading: isCreatingItem }] = useCreateItemMutation();
  const [updateItem] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();

  // Update selected collection when collections change
  useEffect(() => {
    if (collections.length > 0 && !selectedCollection) {
      setSelectedCollection(collections[0]);
    } else if (selectedCollection) {
      const match = collections.find(
        (collectionItem) => collectionItem.id === selectedCollection.id
      );
      setSelectedCollection(match || collections[0] || null);
    } else if (collections.length === 0) {
      setSelectedCollection(null);
    }
  }, [collections, selectedCollection]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !collectionName.trim()) return;

    try {
      await createCollection({
        name: collectionName.trim(),
        userId: user.uid,
      }).unwrap();
      setCollectionName('');
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCollection(collectionId).unwrap();
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

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
      setItemName('');
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
    try {
      await deleteItem(itemId).unwrap();
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

  if (collectionsError) {
    return (
      <div className="alert alert-error">
        <span>
          Error loading collections:{' '}
          {(collectionsError as Error).message || 'Unknown error'}
        </span>
      </div>
    );
  }

  // Filter items by name
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(itemFilter.toLowerCase())
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      {/* LEFT SIDEBAR - Collections Management */}
      <div className="card bg-base-100 shadow-xl h-fit">
        <div className="card-body space-y-4 p-4">
          <h2 className="card-title text-lg">Collections</h2>

          {/* Create Collection */}
          <form onSubmit={handleCreateCollection} className="space-y-2">
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="Collection name"
              disabled={isCreatingCollection}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm w-full"
              disabled={isCreatingCollection || !collectionName.trim()}
            >
              {isCreatingCollection ? 'Creating...' : 'New Collection'}
            </button>
          </form>

          <div className="divider my-2"></div>

          {/* Collections List */}
          <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
            {loadingCollections ? (
              <p className="text-sm text-base-content/70">Loading...</p>
            ) : collections.length === 0 ? (
              <p className="text-sm text-base-content/70">No collections yet</p>
            ) : (
              collections.map((collectionItem) => (
                <div
                  key={collectionItem.id}
                  className={`p-2 rounded cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                    selectedCollection?.id === collectionItem.id
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-200 hover:bg-base-300'
                  }`}
                >
                  <button
                    className="flex-1 text-left text-sm font-medium truncate"
                    onClick={() => setSelectedCollection(collectionItem)}
                  >
                    {collectionItem.name}
                  </button>
                  <button
                    className="btn btn-ghost btn-xs text-error hover:text-error-content"
                    onClick={() => handleDeleteCollection(collectionItem.id)}
                    disabled={isDeletingCollection}
                    title="Delete collection"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CENTER - Collection Content */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body space-y-4">
          {!selectedCollection ? (
            <div className="alert alert-info">
              <span>Select a collection from the left to view items</span>
            </div>
          ) : (
            <>
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
                  onChange={(e) => setItemFilter(e.target.value)}
                  placeholder="Filter items by name..."
                />
              </div>

              {/* Create Item */}
              <form onSubmit={handleCreateItem} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
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
                          Visibility:{' '}
                          {item.visibility?.public ? 'Public' : 'Private'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyCollectionsPage;

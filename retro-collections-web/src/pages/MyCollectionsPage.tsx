import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import {
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useGetItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
} from '../services/firestoreApi'

interface CollectionRecord {
  id: string
  name: string
  createdAt: string
}

function MyCollectionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<CollectionRecord | null>(null)
  const [collectionName, setCollectionName] = useState('')
  const [itemName, setItemName] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return unsubscribe
  }, [])

  // RTK Query hooks
  const { data: collections = [], isLoading: loadingCollections, error: collectionsError } = useGetCollectionsQuery(user?.uid || '', {
    skip: !user?.uid,
  })

  const { data: items = [], isLoading: loadingItems, error: itemsError } = useGetItemsQuery(selectedCollection?.id || '', {
    skip: !selectedCollection?.id,
  })

  const [createCollection, { isLoading: isCreatingCollection }] = useCreateCollectionMutation()
  const [createItem, { isLoading: isCreatingItem }] = useCreateItemMutation()
  const [updateItem] = useUpdateItemMutation()
  const [deleteItem] = useDeleteItemMutation()

  // Update selected collection when collections change
  useEffect(() => {
    if (collections.length > 0 && !selectedCollection) {
      setSelectedCollection(collections[0])
    } else if (selectedCollection) {
      const match = collections.find((collectionItem) => collectionItem.id === selectedCollection.id)
      setSelectedCollection(match || collections[0] || null)
    } else if (collections.length === 0) {
      setSelectedCollection(null)
    }
  }, [collections, selectedCollection])

  const handleCreateCollection = async () => {
    if (!user || !collectionName.trim()) return

    try {
      await createCollection({
        name: collectionName.trim(),
        userId: user.uid,
      }).unwrap()
      setCollectionName('')
    } catch (error) {
      console.error('Error creating collection:', error)
    }
  }

  const handleCreateItem = async () => {
    if (!user || !selectedCollection || !itemName.trim()) return

    try {
      await createItem({
        name: itemName.trim(),
        userId: user.uid,
        collectionId: selectedCollection.id,
        visibility: { public: false },
      }).unwrap()
      setItemName('')
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const handleEditItem = async (itemId: string, newName: string) => {
    if (!newName.trim()) return

    try {
      await updateItem({
        id: itemId,
        updates: { name: newName.trim() },
      }).unwrap()
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem(itemId).unwrap()
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleToggleItemVisibility = async (itemId: string, currentVisibility: boolean) => {
    try {
      await updateItem({
        id: itemId,
        updates: { visibility: { public: !currentVisibility } },
      }).unwrap()
    } catch (error) {
      console.error('Error toggling visibility:', error)
    }
  }

  if (!user) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">My Collections</h2>
          <p>Please log in to manage your collections and items.</p>
        </div>
      </div>
    )
  }

  if (collectionsError) {
    return (
      <div className="alert alert-error">
        <span>Error loading collections: {(collectionsError as Error).message || 'Unknown error'}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body space-y-4">
          <div>
            <h2 className="card-title">My Collections</h2>
            <p className="text-base-content/70">Create named collections and add items to each one.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="label">
                <span className="label-text">New collection</span>
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="Collection name"
                  disabled={isCreatingCollection}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleCreateCollection}
                  disabled={isCreatingCollection || !collectionName.trim()}
                >
                  {isCreatingCollection ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="label">
                <span className="label-text">Choose collection</span>
              </label>
              <div className="tabs tabs-boxed flex-wrap gap-2">
                {loadingCollections ? (
                  <span className="tab">Loading...</span>
                ) : collections.length === 0 ? (
                  <span className="tab">No collections yet</span>
                ) : (
                  collections.map((collectionItem) => (
                    <button
                      key={collectionItem.id}
                      className={'tab ' + (selectedCollection?.id === collectionItem.id ? 'tab-active' : '')}
                      onClick={() => setSelectedCollection(collectionItem)}
                    >
                      {collectionItem.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="card-title">{selectedCollection ? selectedCollection.name : 'No collection selected'}</h2>
              {selectedCollection && (
                <p className="text-sm text-base-content/70">
                  Created {selectedCollection.createdAt ? new Date(selectedCollection.createdAt).toLocaleString() : 'unknown'}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                className="input input-bordered w-full"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="New item name"
                disabled={!selectedCollection || isCreatingItem}
              />
              <button
                className="btn btn-primary"
                onClick={handleCreateItem}
                disabled={!selectedCollection || isCreatingItem || !itemName.trim()}
              >
                {isCreatingItem ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {itemsError ? (
              <div className="alert alert-error">
                <span>Error loading items: {(itemsError as Error).message || 'Unknown error'}</span>
              </div>
            ) : loadingItems ? (
              <div className="alert alert-info">Loading items...</div>
            ) : items.length === 0 ? (
              <div className="alert alert-info">No items in this collection yet.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-base-300 bg-base-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-base-content/70">
                      {item.createdAt ? `Added ${new Date(item.createdAt).toLocaleString()}` : 'No timestamp'}
                    </p>
                    <p className="text-sm text-base-content/70">Visibility: {item.visibility?.public ? 'Public' : 'Private'}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        const newName = prompt('New item name:', item.name)
                        if (newName) {
                          handleEditItem(item.id, newName)
                        }
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleToggleItemVisibility(item.id, !!item.visibility?.public)}
                    >
                      {item.visibility?.public ? 'Make Private' : 'Make Public'}
                    </button>
                    <button className="btn btn-sm btn-error" onClick={() => handleDeleteItem(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyCollectionsPage
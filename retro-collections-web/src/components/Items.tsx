import { useState, useEffect } from 'react'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { getIsAdmin } from '../lib/firebase'
import type { FirebaseApp } from 'firebase/app'

import {
  useGetAllItemsQuery,
  useGetUserItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
} from '../services/firestore/firestoreApi'

interface ItemsProps {
  app: FirebaseApp
}

function Items({ app }: ItemsProps) {
  const auth = getAuth(app)

  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        getIsAdmin().then(setIsAdmin)
      }
    })
    return unsubscribe
  }, [auth])

  // RTK Query hooks
  const { data: allItems = [], isLoading: loadingAllItems, error: allItemsError } = useGetAllItemsQuery(undefined, {
    skip: !user || !isAdmin,
  })

  const { data: userItems = [], isLoading: loadingUserItems, error: userItemsError } = useGetUserItemsQuery(user?.uid || '', {
    skip: !user || isAdmin,
  })

  const [createItem, { isLoading: isCreatingItem }] = useCreateItemMutation()
  const [updateItem] = useUpdateItemMutation()
  const [deleteItem] = useDeleteItemMutation()

  const items = isAdmin ? allItems : userItems
  const isLoading = isAdmin ? loadingAllItems : loadingUserItems
  const error = isAdmin ? allItemsError : userItemsError

  const handleAddItem = async () => {
    if (!user || !name.trim()) return

    try {
      await createItem({
        name: name.trim(),
        userId: user.uid,
        collectionId: '',
        visibility: { public: false },
      }).unwrap()
      setName('')
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem(itemId).unwrap()
    } catch (error) {
      console.error('Error deleting item:', error)
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

  if (!user) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Items</h2>
          <p>Please log in to manage items.</p>
        </div>
      </div>
    )
  }

  const adminMode = isAdmin

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="card-title">{adminMode ? 'All Items' : 'My Items'}</h2>
            {adminMode && <p className="text-sm text-base-content/70">Admin mode: showing all users</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
              disabled={isCreatingItem}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddItem}
              disabled={isCreatingItem || !name.trim()}
            >
              {isCreatingItem ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {error ? (
            <div className="alert alert-error">
              <span>Error loading items: {(error as Error).message || 'Unknown error'}</span>
            </div>
          ) : isLoading ? (
            <div className="alert alert-info">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="alert alert-info">No items found.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-base-300 bg-base-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {adminMode && <span className="text-sm text-base-content/70">Owner: {item.userId}</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      const newName = prompt('New name:', item.name)
                      if (newName) handleEditItem(item.id, newName)
                    }}
                  >
                    Edit
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
  )
}

export default Items
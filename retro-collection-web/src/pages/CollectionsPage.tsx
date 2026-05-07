import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth, db } from '../lib/firebase'

interface CollectionRecord {
  id: string
  name: string
  createdAt: string
}

interface ItemRecord {
  id: string
  name: string
  createdAt?: string
}

function CollectionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [collections, setCollections] = useState<CollectionRecord[]>([])
  const [selectedCollection, setSelectedCollection] = useState<CollectionRecord | null>(null)
  const [collectionName, setCollectionName] = useState('')
  const [itemName, setItemName] = useState('')
  const [items, setItems] = useState<ItemRecord[]>([])
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (user) {
      fetchCollections()
    } else {
      setCollections([])
      setSelectedCollection(null)
      setItems([])
    }
  }, [user])

  useEffect(() => {
    if (selectedCollection && user) {
      fetchItems(selectedCollection.id)
    } else {
      setItems([])
    }
  }, [selectedCollection, user])

  const fetchCollections = async () => {
    if (!user) return
    setLoadingCollections(true)
    try {
      const snapshot = await getDocs(query(collection(db, 'users', user.uid, 'collections'), orderBy('createdAt', 'desc')))
      const fetched = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name as string,
        createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() ?? docSnap.data().createdAt?.toString() ?? '',
      }))
      setCollections(fetched)
      if (!selectedCollection && fetched.length > 0) {
        setSelectedCollection(fetched[0])
      } else if (selectedCollection) {
        const match = fetched.find((collection) => collection.id === selectedCollection.id)
        setSelectedCollection(match || fetched[0] || null)
      }
    } catch (error) {
      console.error('Error fetching collections:', error)
    } finally {
      setLoadingCollections(false)
    }
  }

  const fetchItems = async (collectionId: string) => {
    if (!user) return
    setLoadingItems(true)
    try {
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'collections', collectionId, 'items'))
      setItems(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name as string,
          createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() ?? docSnap.data().createdAt?.toString(),
        })),
      )
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoadingItems(false)
    }
  }

  const addCollection = async () => {
    if (!user || !collectionName.trim()) return
    try {
      await addDoc(collection(db, 'users', user.uid, 'collections'), {
        name: collectionName,
        createdAt: new Date(),
      })
      setCollectionName('')
      fetchCollections()
    } catch (error) {
      console.error('Error creating collection:', error)
    }
  }

  const addItem = async () => {
    if (!user || !selectedCollection || !itemName.trim()) return
    try {
      await addDoc(collection(db, 'users', user.uid, 'collections', selectedCollection.id, 'items'), {
        name: itemName,
        createdAt: new Date(),
      })
      setItemName('')
      fetchItems(selectedCollection.id)
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const editItem = async (itemId: string, newName: string) => {
    if (!user || !selectedCollection || !newName.trim()) return
    try {
      await updateDoc(doc(db, 'users', user.uid, 'collections', selectedCollection.id, 'items', itemId), {
        name: newName,
      })
      fetchItems(selectedCollection.id)
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!user || !selectedCollection) return
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'collections', selectedCollection.id, 'items', itemId))
      fetchItems(selectedCollection.id)
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  if (!user) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Collections</h2>
          <p>Please log in to manage your collections and items.</p>
        </div>
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
                />
                <button className="btn btn-primary" onClick={addCollection}>
                  Create
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
                      className={
                        'tab ' + (selectedCollection?.id === collectionItem.id ? 'tab-active' : '')
                      }
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
                disabled={!selectedCollection}
              />
              <button className="btn btn-primary" onClick={addItem} disabled={!selectedCollection}>
                Add Item
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {loadingItems ? (
              <div className="alert alert-info">Loading items...</div>
            ) : items.length === 0 ? (
              <div className="alert alert-info">No items in this collection yet.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-base-300 bg-base-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.createdAt && <p className="text-sm text-base-content/70">Added {new Date(item.createdAt).toLocaleString()}</p>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        const newName = prompt('New item name:', item.name)
                        if (newName) {
                          editItem(item.id, newName)
                        }
                      }}
                    >
                      Edit
                    </button>
                    <button className="btn btn-sm btn-error" onClick={() => deleteItem(item.id)}>
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

export default CollectionsPage

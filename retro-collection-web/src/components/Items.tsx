import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { type FirebaseApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { getIsAdmin } from '../lib/firebase'

interface ItemsProps {
  app: FirebaseApp
}

function Items({ app }: ItemsProps) {
  const db = getFirestore(app)
  const auth = getAuth(app)

  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [items, setItems] = useState<{ id: string; name: string; userId: string }[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        getIsAdmin().then((admin) => {
          setIsAdmin(admin)
          fetchItems(currentUser, admin)
        })
      } else {
        setItems([])
      }
    })
    return unsubscribe
  }, [auth])

  const addItem = async () => {
    if (!user || !name.trim()) return

    try {
      await addDoc(collection(db, 'items'), {
        name,
        userId: user.uid,
        collectionId: '',
        visibility: { public: false },
        createdAt: new Date(),
      })
      setName('')
      if (user) fetchItems(user, isAdmin)
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const fetchItems = async (currentUser: User, adminMode = false) => {
    try {
      const itemsQuery = adminMode
        ? collection(db, 'items')
        : query(collection(db, 'items'), where('userId', '==', currentUser.uid))

      const querySnapshot = await getDocs(itemsQuery)
      const fetchedItems = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name as string,
        userId: docSnap.data().userId as string,
      }))
      setItems(fetchedItems)
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!user) return

    try {
      const itemRef = doc(db, 'items', itemId)
      await deleteDoc(itemRef)
      if (user) fetchItems(user, isAdmin)
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const editItem = async (itemId: string, newName: string) => {
    if (!user || !newName.trim()) return

    try {
      const itemRef = doc(db, 'items', itemId)
      await updateDoc(itemRef, { name: newName })
      if (user) fetchItems(user, isAdmin)
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
            />
            <button className="btn btn-primary" onClick={addItem}>
              Add Item
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
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
                      if (newName) editItem(item.id, newName)
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
  )
}

export default Items

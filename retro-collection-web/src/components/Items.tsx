import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, collectionGroup } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { type FirebaseApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'

interface ItemsProps {
  app: FirebaseApp
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'talex.tnt@gmail.com'

function Items({ app }: ItemsProps) {
  const db = getFirestore(app)
  const auth = getAuth(app)

  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [items, setItems] = useState<{ id: string; name: string; userId: string }[]>([])

  const isAdmin = (email?: string) => email === ADMIN_EMAIL

  // Track current authenticated user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        fetchItems(currentUser)
      } else {
        setItems([])
      }
    })
    return unsubscribe
  }, [auth])

  // Add item to current user's collection
  const addItem = async () => {
    if (!user || !name.trim()) return

    try {
      const userItemsRef = collection(db, 'users', user.uid, 'items')
      await addDoc(userItemsRef, { name, createdAt: new Date() })
      setName('')
      fetchItems(user)
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  // Fetch items for current user, or all items if admin
  const fetchItems = async (currentUser: User) => {
    try {
      const adminMode = isAdmin(currentUser.email)
      const itemsQuery = adminMode
        ? collectionGroup(db, 'items')
        : collection(db, 'users', currentUser.uid, 'items')

      const querySnapshot = await getDocs(itemsQuery)
      const fetchedItems = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name as string,
        userId: docSnap.ref.parent.parent?.id ?? currentUser.uid,
      }))
      setItems(fetchedItems)
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  // Delete item
  const deleteItem = async (itemId: string, ownerId: string) => {
    if (!user) return

    try {
      const itemRef = doc(db, 'users', ownerId, 'items', itemId)
      await deleteDoc(itemRef)
      fetchItems(user)
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  // Edit item
  const editItem = async (itemId: string, ownerId: string, newName: string) => {
    if (!user || !newName.trim()) return

    try {
      const itemRef = doc(db, 'users', ownerId, 'items', itemId)
      await updateDoc(itemRef, { name: newName })
      fetchItems(user)
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  if (!user) {
    return <div><p>Please log in to manage items</p></div>
  }

  const adminMode = isAdmin(user.email)

  return (
    <div>
      <h2>{adminMode ? 'All Items' : 'My Items'}</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter item name"
      />
      <button onClick={addItem}>Add Item</button>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} {adminMode && <small>(owner: {item.userId})</small>}
            <button onClick={() => {
              const newName = prompt('New name:', item.name)
              if (newName) editItem(item.id, item.userId, newName)
            }}>
              Edit
            </button>
            <button onClick={() => deleteItem(item.id, item.userId)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Items
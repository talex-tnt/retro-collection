import { useState, useEffect } from 'react'
import { type FirebaseApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore'

interface AdminProps {
  app: FirebaseApp
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'talex.tnt@gmail.com'

function Admin({ app }: AdminProps) {
  const auth = getAuth(app)
  const db = getFirestore(app)

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authorizedUsers, setAuthorizedUsers] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (user?.email === ADMIN_EMAIL) {
        fetchAuthorizedUsers()
      }
    })
    return unsubscribe
  }, [auth])

  const fetchAuthorizedUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'authorized-users'))
      const emails = snapshot.docs.map((doc) => doc.id)
      setAuthorizedUsers(emails)
    } catch (error) {
      console.error('Error fetching authorized users:', error)
      setError('Failed to load authorized users')
    }
  }

  const addAuthorizedUser = async () => {
    if (!newEmail.trim()) {
      setError('Please enter an email')
      return
    }

    try {
      setError('')
      setSuccess('')
      await setDoc(doc(db, 'authorized-users', newEmail), { addedAt: new Date() })
      setNewEmail('')
      setSuccess(`${newEmail} added successfully`)
      fetchAuthorizedUsers()
    } catch (error) {
      console.error('Error adding user:', error)
      setError('Failed to add user')
    }
  }

  const removeAuthorizedUser = async (email: string) => {
    try {
      setError('')
      setSuccess('')
      await deleteDoc(doc(db, 'authorized-users', email))
      setSuccess(`${email} removed successfully`)
      fetchAuthorizedUsers()
    } catch (error) {
      console.error('Error removing user:', error)
      setError('Failed to remove user')
    }
  }

  // Only show admin panel if user matches the env-based admin email
  if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
    return null
  }

  return (
    <div style={{ border: '2px solid blue', padding: '20px', marginBottom: '20px' }}>
      <h2>Admin Panel</h2>
      <p>Manage authorized users</p>
      <p>Admin email: <strong>{ADMIN_EMAIL}</strong></p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <div>
        <h3>Add New User</h3>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Enter email"
        />
        <button onClick={addAuthorizedUser}>Add User</button>
      </div>

      <div>
        <h3>Authorized Users ({authorizedUsers.length})</h3>
        {authorizedUsers.length === 0 ? (
          <p>No authorized users yet</p>
        ) : (
          <ul>
            {authorizedUsers.map((email) => (
              <li key={email}>
                {email}
                <button onClick={() => removeAuthorizedUser(email)} style={{ marginLeft: '10px' }}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Admin

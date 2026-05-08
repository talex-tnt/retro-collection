import { useState, useEffect } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { auth, db, getIsAdmin } from '../lib/firebase'

function Admin() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authorizedUsers, setAuthorizedUsers] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (user) {
        getIsAdmin().then((isAdmin) => {
          if (isAdmin) {
            fetchAuthorizedUsers()
          }
        })
      }
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (currentUser) {
      getIsAdmin().then(setIsAdmin)
    }
  }, [currentUser])

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
  if (!currentUser || !isAdmin) {
    return null
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Admin Panel</h2>
        <p>Manage authorized users</p>
        <p className="text-sm text-base-content/70">
          Admin email: <strong>{currentUser?.email}</strong>
        </p>

        {error && <div className="alert alert-error shadow-lg">{error}</div>}
        {success && <div className="alert alert-success shadow-lg">{success}</div>}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add New User</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                className="input input-bordered w-full"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter email"
              />
              <button className="btn btn-secondary" onClick={addAuthorizedUser}>
                Add User
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Authorized Users ({authorizedUsers.length})</h3>
            {authorizedUsers.length === 0 ? (
              <div className="alert alert-info">No authorized users yet</div>
            ) : (
              <div className="space-y-2">
                {authorizedUsers.map((email) => (
                  <div key={email} className="flex flex-col gap-2 rounded-lg border border-base-300 bg-base-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <span>{email}</span>
                    <button className="btn btn-error btn-sm" onClick={() => removeAuthorizedUser(email)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin

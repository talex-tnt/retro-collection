import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { auth, db, ADMIN_EMAIL } from '../lib/firebase'

interface UserRecord {
  id: string
  name?: string
  email?: string
  lastLogin?: string
}

function UsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (currentUser?.email === ADMIN_EMAIL) {
      fetchUsers()
    }
  }, [currentUser])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const snapshot = await getDocs(collection(db, 'users'))
      setUsers(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name as string | undefined,
          email: docSnap.data().email as string | undefined,
          lastLogin: docSnap.data().lastLogin?.toDate?.()?.toISOString() ?? docSnap.data().lastLogin?.toString(),
        })),
      )
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Users</h2>
          <p>Log in as admin to view registered users.</p>
        </div>
      </div>
    )
  }

  if (currentUser.email !== ADMIN_EMAIL) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Users</h2>
          <p className="text-base-content/70">Only admin can view the users list.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Registered Users</h2>
          <p className="text-base-content/70">All users collected from Firestore.</p>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {loading ? (
            <div className="alert alert-info">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="alert alert-info">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.name || '—'}</td>
                      <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UsersPage

import { useEffect, useState } from 'react'
import {
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db, ADMIN_EMAIL } from '../lib/firebase'

function AuthPanel() {
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string>('')
  const provider = new GoogleAuthProvider()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return unsubscribe
  }, [])

  const isUserAuthorized = async (email: string): Promise<boolean> => {
    if (email === ADMIN_EMAIL) {
      return true
    }

    try {
      const authorizedDoc = await getDoc(doc(db, 'authorized-users', email))
      return authorizedDoc.exists()
    } catch (error) {
      console.error('Error checking authorization:', error)
      return false
    }
  }

  const login = async () => {
    try {
      setError('')
      await setPersistence(auth, browserLocalPersistence)
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      const email = user.email || ''

      const authorized = await isUserAuthorized(email)

      if (!authorized) {
        await signOut(auth)
        setError(`Access denied. User ${email} is not authorized.`)
        setUser(null)
        console.log('Login rejected: user not in whitelist')
        return
      }

      await setDoc(
        doc(db, 'users', user.uid),
        {
          name: user.displayName,
          email: user.email,
          lastLogin: new Date(),
        },
        { merge: true },
      )

      console.log('Login successful:', user.displayName)
    } catch (error) {
      console.error('Login error:', error)
      setError('Login failed. Please try again.')
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setError('')
      console.log('Logout successful')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Authentication</h2>
        {error && <div className="alert alert-error shadow-lg">{error}</div>}

        {user ? (
          <div className="space-y-2">
            <p className="text-sm text-base-content/70">Logged in as:</p>
            <p className="text-lg font-semibold">{user.displayName || user.email}</p>
            <p className="text-sm">Email: {user.email}</p>
            <p className="text-sm">UID: {user.uid}</p>
            <button className="btn btn-primary mt-3" onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={login}>
            Login with Google
          </button>
        )}
      </div>
    </div>
  )
}

export default AuthPanel

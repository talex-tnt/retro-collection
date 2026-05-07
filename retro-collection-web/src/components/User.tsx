import { useEffect, useState } from 'react'
import { type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'

interface UserProps {
  app: FirebaseApp
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'talex.tnt@gmail.com'

function User({ app }: UserProps) {
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string>('')

  const auth = getAuth(app)
  const db = getFirestore(app)
  const provider = new GoogleAuthProvider()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return unsubscribe
  }, [auth])

  const isAdminEmail = (email?: string) => email === ADMIN_EMAIL

  // Check if user email is authorized
  const isUserAuthorized = async (email: string): Promise<boolean> => {
    if (isAdminEmail(email)) {
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

      // Check if user is authorized
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
    <div>
      <h1>Authentication</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {user ? (
        <div>
          <p>Logged in as:</p>
          <p><strong>{user.displayName || user.email}</strong></p>
          <p>Email: {user.email}</p>
          <p>UID: {user.uid}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={login}>Login with Google</button>
      )}
    </div>
  )
}

export default User

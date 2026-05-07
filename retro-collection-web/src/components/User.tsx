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
import { getFirestore, doc, setDoc } from 'firebase/firestore'

interface UserProps {
  app: FirebaseApp
}

function User({ app }: UserProps) {
  const [user, setUser] = useState<User | null>(null)

  const auth = getAuth(app)
  const db = getFirestore(app)
  const provider = new GoogleAuthProvider()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return unsubscribe
  }, [auth])

  const login = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence)
      const result = await signInWithPopup(auth, provider)
      const user = result.user

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
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      console.log('Logout successful')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div>
      <h1>Authentication</h1>
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

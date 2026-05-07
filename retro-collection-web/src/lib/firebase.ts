import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAsjk2rCYAaGCKiz7MlmaVKgWBv-Bv8mhc',
  authDomain: 'retro-collection-495607.firebaseapp.com',
  projectId: 'retro-collection-495607',
  storageBucket: 'retro-collection-495607.firebasestorage.app',
  messagingSenderId: '889686178738',
  appId: '1:889686178738:web:29169f0addd82a3d9f42ab',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

const isAdminEmail = (email?: string | null) => email === ADMIN_EMAIL

export { app, auth, db, ADMIN_EMAIL, isAdminEmail }

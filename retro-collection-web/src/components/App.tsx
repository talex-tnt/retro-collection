import Items from './Items'
import User from './User'
import Admin from './Admin'
import { initializeApp } from 'firebase/app'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAsjk2rCYAaGCKiz7MlmaVKgWBv-Bv8mhc',
  authDomain: 'retro-collection-495607.firebaseapp.com',
  projectId: 'retro-collection-495607',
  storageBucket: 'retro-collection-495607.firebasestorage.app',
  messagingSenderId: '889686178738',
  appId: '1:889686178738:web:29169f0addd82a3d9f42ab',
}

const app = initializeApp(firebaseConfig)

function App() {
  return (
    <>
      <Admin app={app} />
      <User app={app} />
      <Items app={app} />
    </>
  )
}

export default App

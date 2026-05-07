import FirebaseExample from './FirebaseExample'


// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsjk2rCYAaGCKiz7MlmaVKgWBv-Bv8mhc",
  authDomain: "retro-collection-495607.firebaseapp.com",
  projectId: "retro-collection-495607",
  storageBucket: "retro-collection-495607.firebasestorage.app",
  messagingSenderId: "889686178738",
  appId: "1:889686178738:web:29169f0addd82a3d9f42ab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

function App() {

  return (
    <>
        Hello World!
        <FirebaseExample app={app} />
    </>
  )
}

export default App

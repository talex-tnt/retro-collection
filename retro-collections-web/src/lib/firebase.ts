import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAsjk2rCYAaGCKiz7MlmaVKgWBv-Bv8mhc",
  authDomain: "retro-collection-495607.firebaseapp.com",
  projectId: "retro-collection-495607",
  storageBucket: "retro-collection-495607.firebasestorage.app",
  messagingSenderId: "889686178738",
  appId: "1:889686178738:web:29169f0addd82a3d9f42ab",
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Check admin via custom claims (REAL SOURCE OF TRUTH)
 */
const getIsAdmin = async () => {
  const user = auth.currentUser;
  if (!user) return false;

  const token = await user.getIdTokenResult(true);
  return token.claims.admin === true;
};


export { app, auth, db, getIsAdmin };

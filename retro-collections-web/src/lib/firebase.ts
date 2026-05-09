import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const env = import.meta.env.VITE_ENV;

const firebaseConfigProd = {
  apiKey: "AIzaSyCD8zIM4SOBkLIzzLpZuagq688BwXfohDg",
  authDomain: "retro-collections-prod.firebaseapp.com",
  projectId: "retro-collections-prod",
  storageBucket: "retro-collections-prod.firebasestorage.app",
  messagingSenderId: "509856353620",
  appId: "1:509856353620:web:6bac6b42759eb94a4e0cc1"
};
const firebaseConfigDev = {
  apiKey: "AIzaSyB4YnIk0kbBTKDiHOgXpVOaYIxLdchItzQ",
  authDomain: "retro-collections-dev.firebaseapp.com",
  projectId: "retro-collections-dev",
  storageBucket: "retro-collections-dev.firebasestorage.app",
  messagingSenderId: "473822754233",
  appId: "1:473822754233:web:0de2e6930818d3a2ea7268"
}

// Init Firebase
const app = initializeApp(env === "dev" ? firebaseConfigDev : firebaseConfigProd);
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

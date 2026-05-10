import { useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

import { auth, getIsAdmin } from '../lib/firebase';

import {
  useLazyIsUserAuthorizedQuery,
  useCreateOrUpdateUserMutation,
} from '../api/firestore/firestoreApi';

function AuthPanel() {
  const [user, setUser] = useState<User | null>(null);

  const [error, setError] = useState('');

  const provider = new GoogleAuthProvider();

  const [checkAuthorizedUser] = useLazyIsUserAuthorizedQuery();

  const [createOrUpdateUser] = useCreateOrUpdateUserMutation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      setError('');

      await setPersistence(auth, browserLocalPersistence);

      const result = await signInWithPopup(auth, provider);

      const currentUser = result.user;

      const email = currentUser.email || '';

      let authorized = false;

      const admin = await getIsAdmin();

      if (admin) {
        authorized = true;
      } else {
        const response = await checkAuthorizedUser(email);

        authorized = response.data ?? false;
      }

      if (!authorized) {
        await signOut(auth);

        setError(`Access denied. User ${email} is not authorized.`);

        setUser(null);

        console.log('Login rejected: user not in whitelist', currentUser);

        return;
      }

      await createOrUpdateUser({
        id: currentUser.uid,

        name: currentUser.displayName || '',

        email: currentUser.email || '',

        lastLogin: new Date().toISOString(),
      });

      console.log('Login successful:', currentUser);

      const tokenResult = await currentUser.getIdTokenResult();

      console.log(tokenResult.claims);
    } catch (error) {
      console.error('Login error:', error);

      setError('Login failed. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);

      setError('');

      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Authentication</h2>

        {error && <div className="alert alert-error shadow-lg">{error}</div>}

        {user ? (
          <div className="space-y-2">
            <p className="text-sm text-base-content/70">Logged in as:</p>

            <p className="text-lg font-semibold">
              {user.displayName || user.email}
            </p>

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
  );
}

export default AuthPanel;

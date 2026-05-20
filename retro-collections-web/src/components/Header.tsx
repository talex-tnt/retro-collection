import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, getIsAdmin } from '../lib/firebase';
import {
  useCreateOrUpdatePrivateUserMutation,
  useCreateOrUpdateUserMutation,
  useLazyIsUserAuthorizedQuery,
} from '../api/firestore/firestoreApi';
import { useIsAdmin } from '../hooks';

function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const isAdmin = useIsAdmin(user);

  const provider = new GoogleAuthProvider();
  const [checkAuthorizedUser] = useLazyIsUserAuthorizedQuery();
  const [createOrUpdateUser] = useCreateOrUpdateUserMutation();
  const [createOrUpdatePrivateUser] = useCreateOrUpdatePrivateUserMutation();

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
        return;
      }

      await createOrUpdateUser({
        id: currentUser.uid,
        name: currentUser.displayName || '',
      });

      await createOrUpdatePrivateUser({
        id: currentUser.uid,
        email: currentUser.email || '',
        lastLogin: new Date().toISOString(),
      });
    } catch (loginError) {
      console.error('Login error:', loginError);
      setError('Login failed. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setError('');
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
    }
  };

  return (
    <div className="space-y-4">
      <header className="rounded-box border border-base-300 bg-base-100 shadow-sm">
        <div className="navbar gap-4 px-4">
          <div className="flex-1 flex-col items-start gap-3 lg:flex-row lg:items-center">
            <div>
              <h1 className="text-2xl font-bold mb-2 ml-2 mt-2">
                Retro Collections
              </h1>
              <p className="text-sm text-base-content/70 mb-2 ml-2">
                Organize, tag, and share your retro collections. Manage
                collectibles, track items, customize tags, and control
                visibility.
              </p>
            </div>

            <nav className="tabs tabs-boxed flex-wrap gap-2">
              <NavLink
                end
                to="/"
                className={({ isActive }) =>
                  isActive ? 'tab tab-active' : 'tab'
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/my-collectibles"
                className={({ isActive }) =>
                  isActive ? 'tab tab-active' : 'tab'
                }
              >
                All My Collectibles
              </NavLink>
              <NavLink
                to="/tags"
                className={({ isActive }) =>
                  isActive ? 'tab tab-active' : 'tab'
                }
              >
                Tags
              </NavLink>

              <NavLink
                to="/collectors"
                className={({ isActive }) =>
                  isActive ? 'tab tab-active' : 'tab'
                }
              >
                Collectors
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/users"
                  className={({ isActive }) =>
                    isActive ? 'tab tab-active' : 'tab'
                  }
                >
                  Users
                </NavLink>
              )}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    isActive ? 'tab tab-active' : 'tab'
                  }
                >
                  Admin
                </NavLink>
              )}
            </nav>
          </div>

          <div className="dropdown dropdown-end">
            <button tabIndex={0} className="btn btn-ghost gap-3 px-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">
                  {user?.displayName || user?.email || 'Guest'}
                </p>
                <p className="text-xs text-base-content/70">
                  {user ? 'Signed in' : 'Not signed in'}
                </p>
              </div>
              <div className="avatar placeholder">
                <div className="w-10 rounded-full bg-primary text-primary-content">
                  <span className="text-sm font-semibold">
                    {(user?.displayName || user?.email || 'G')
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
              </div>
            </button>

            <div
              tabIndex={0}
              className="dropdown-content z-10 mt-3 w-80 rounded-box border border-base-300 bg-base-100 p-4 shadow-xl"
            >
              {error && <div className="alert alert-error mb-3">{error}</div>}

              {user ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-base-content/70">Signed in as</p>
                    <p className="font-semibold">
                      {user.displayName || user.email}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm text-base-content/80">
                    <p>{user.email}</p>
                    <p className="break-all">UID: {user.uid}</p>
                  </div>

                  <NavLink
                    to="/profile"
                    className="btn btn-ghost w-full justify-start"
                  >
                    Edit Profile
                  </NavLink>

                  <button className="btn btn-primary w-full" onClick={logout}>
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-base-content/70">
                    Sign in to manage your collections and items.
                  </p>
                  <button className="btn btn-primary w-full" onClick={login}>
                    Login with Google
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default Header;

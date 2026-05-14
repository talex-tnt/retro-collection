import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HomePage from '../pages/HomePage';
import AdminPage from '../pages/AdminPage';
import CollectorPage from '../pages/CollectorPage';
import CollectorsPage from '../pages/CollectorsPage';
import UsersPage from '../pages/UsersPage';
import MyCollectionsPage from '../pages/MyCollectionsPage';
import ProfilePage from '../pages/ProfilePage';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useGetRuntimeConfigQuery } from '../api/firestore/firestoreApi';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isLoading: isRuntimeConfigLoading, isError: isRuntimeConfigError } =
    useGetRuntimeConfigQuery(undefined, {
      skip: !isAuthenticated,
    });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setIsAuthenticated(Boolean(currentUser));
    });

    return unsubscribe;
  }, []);

  if (isAuthenticated && isRuntimeConfigLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-200 text-base-content">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <span className="loading loading-spinner loading-lg" />
            <p>Loading Firestore config...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated && isRuntimeConfigError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-200 text-base-content">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Firestore config unavailable</h2>
            <p>
              Please try again after the public runtime config is reachable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen bg-base-200 text-base-content">
        <div className="flex-1">
          <div className="mx-auto max-w-screen-2xl space-y-8 px-4 py-8">
            <Header />

            <div className="space-y-6">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route
                  path="/my-collections/:collectionId?"
                  element={<MyCollectionsPage />}
                />
                <Route
                  path="/collectors/:userId/collections/:collectionId?"
                  element={<CollectorPage />}
                />
                <Route path="/collectors" element={<CollectorsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </HashRouter>
  );
}

export default App;

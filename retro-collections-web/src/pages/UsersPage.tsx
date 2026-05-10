import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';

import { useGetUsersQuery } from '../api/firestore/firestoreApi';
import { useIsAdmin } from '../hooks';

function UsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const isAdmin = useIsAdmin(currentUser);

  const { data: users = [], isLoading } = useGetUsersQuery(undefined, {
    skip: !currentUser || !isAdmin,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  if (!currentUser) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Users</h2>
          <p>Log in as admin to view registered users.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Users</h2>
          <p className="text-base-content/70">
            Only admin can view the users list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Registered Users</h2>
          <p className="text-base-content/70">
            All users collected from Firestore.
          </p>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {isLoading ? (
            <div className="alert alert-info">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="alert alert-info">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Last Login</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.name || '—'}</td>
                      <td>
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UsersPage;

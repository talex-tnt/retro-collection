import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navigation from './Navigation'
import AuthPanel from './User'
import HomePage from '../pages/HomePage'
import AdminPage from '../pages/AdminPage'
import UsersPage from '../pages/UsersPage'
import CollectionsPage from '../pages/CollectionsPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-base-200 text-base-content">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold">Retro Collection</h1>
            <p className="mt-2 text-base-content/70">Manage admin, users, and collections with Firebase + DaisyUI.</p>
          </div>

          <Navigation />

          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,420px)]">
            <div className="space-y-6">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/collections" element={<CollectionsPage />} />
              </Routes>
            </div>
            <div>
              <AuthPanel />
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App

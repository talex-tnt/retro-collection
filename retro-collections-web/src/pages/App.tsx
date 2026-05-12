import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HomePage from '../pages/HomePage';
import AdminPage from '../pages/AdminPage';
import UsersPage from '../pages/UsersPage';
import MyCollectionsPage from '../pages/MyCollectionsPage';

function App() {
  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen bg-base-200 text-base-content">
        <div className="flex-1">
          <div className="mx-auto max-w-screen-2xl space-y-8 px-4 py-8">
            <Header />

            <div className="space-y-6">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/my-collections" element={<MyCollectionsPage />} />
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

import { NavLink } from 'react-router-dom'

function Navigation() {
  return (
    <nav className="tabs tabs-boxed flex-wrap justify-center gap-2">
      <NavLink end to="/" className={({ isActive }) => (isActive ? 'tab tab-active' : 'tab')}>
        Home
      </NavLink>
       <NavLink to="/my-collections" className={({ isActive }) => (isActive ? 'tab tab-active' : 'tab')}>
        My Collections
      </NavLink>
      <NavLink to="/users" className={({ isActive }) => (isActive ? 'tab tab-active' : 'tab')}>
        Users
      </NavLink>
      <NavLink to="/admin" className={({ isActive }) => (isActive ? 'tab tab-active' : 'tab')}>
        Admin
      </NavLink>
    </nav>
  )
}

export default Navigation

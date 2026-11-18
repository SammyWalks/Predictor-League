import { Link, useLocation } from 'react-router-dom'
import { useGame } from '../context/GameContext'

const LINKS = [
  { to: '/', label: 'Home', short: 'Home' },
  { to: '/predict', label: 'Predict', short: 'Picks' },
  { to: '/table', label: 'Table', short: 'Table' },
  { to: '/results', label: 'Results', short: 'Week' },
  { to: '/profile', label: 'Profile', short: 'You' },
]

export default function Nav() {
  const { me, logout } = useGame()
  const { pathname } = useLocation()
  if (!me) return null

  return (
    <>
      <nav className="topnav">
        <div className="nav-links">
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={pathname === link.to ? 'active' : ''}>{link.label}</Link>
          ))}
          {me.isAdmin && <Link to="/admin" className={pathname === '/admin' ? 'active' : ''}>Admin</Link>}
        </div>
        <div className="nav-user">
          <span style={{ color: me.colour }}>{me.name}</span>
          <button type="button" className="btn btn-small" onClick={logout}>Log out</button>
        </div>
      </nav>
      <nav className="bottomnav">
        {LINKS.map((link) => (
          <Link key={link.to} to={link.to} className={pathname === link.to ? 'active' : ''}>{link.short}</Link>
        ))}
      </nav>
    </>
  )
}

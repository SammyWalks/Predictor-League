import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import Ball from './Ball'
import Sprite, { kitProps } from './Sprite'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/predict', label: 'Predict' },
  { to: '/table', label: 'Table' },
  { to: '/results', label: 'Results' },
  { to: '/history', label: 'History' },
  { to: '/stats', label: 'Stats' },
  { to: '/profile', label: 'Profile' },
]

export default function Nav() {
  const { me } = useGame()
  const { pathname } = useLocation()

  useEffect(() => {
    const active = document.querySelector('.tab-row a.active')
    active?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pathname])

  if (!me) return null

  const links = me.isAdmin ? [...LINKS, { to: '/admin', label: 'Admin' }] : LINKS

  return (
    <header className="site-header">
      <div className="brand-row">
        <Link to="/" className="brand">
          <Ball />
          <span className="brand-title">PREDICTOR LEAGUE</span>
        </Link>
        <Link to="/profile" className="who">
          <Sprite {...kitProps(me)} size={26} />
          <span style={{ color: me.colour }}>{me.name}</span>
        </Link>
      </div>
      <nav className="tab-row" aria-label="Sections">
        {links.map((link) => {
          const active = pathname === link.to
          return (
            <Link key={link.to} to={link.to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

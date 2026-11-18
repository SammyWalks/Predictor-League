import { Navigate, Route, Routes } from 'react-router-dom'
import { BrowserRouter } from 'react-router-dom'
import { GameProvider, useGame } from './context/GameContext'
import Nav from './components/Nav'
import ArcadeControls from './components/ArcadeControls'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Predictions from './pages/Predictions'
import Table from './pages/Table'
import Results from './pages/Results'
import History from './pages/History'
import Stats from './pages/Stats'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Ball from './components/Ball'
import { ArtCredit } from './components/PixelArt'
import { useEffect, useState } from 'react'
import { applyArcadeClasses, secretOn, setSecret } from './arcade/settings'
import { konamiTap, useKonami } from './arcade/useKonami'

function Loading({ label }) {
  return (
    <div className="container">
      <div className="card loading-card" role="status"><Ball spin /><p>{label}</p></div>
    </div>
  )
}

function Shell() {
  const game = useGame()
  const [secretNote, setSecretNote] = useState(secretOn())
  useKonami(() => setSecretNote(true))
  useEffect(() => {
    document.documentElement.dataset.scored = game.allPicks?.some((pick) => pick.week === game.currentWeek && pick.pointsAwarded != null) ? '1' : '0'
    applyArcadeClasses()
  }, [game.allPicks, game.currentWeek])
  if (!game.ready || (game.loading && !game.me && !game.error)) {
    return <Loading label="Loading the league…" />
  }
  if (game.error && !game.me) {
    return (
      <div className="container">
        <div className="card">
          <h1><Ball />Can't reach the game</h1>
          <p className="form-error" role="alert">{game.error}</p>
          <button type="button" className="btn" onClick={game.refresh}>Try again</button>
        </div>
      </div>
    )
  }
  if (!game.me) return <Navigate to="/login" replace />

  return (
    <div className="container">
      <Nav />
      {game.error && (
        <div className="card error-banner" role="alert">
          <p>{game.error}</p>
          <button type="button" className="btn btn-small" onClick={game.refresh}>Retry</button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/predict" element={<Predictions />} />
        <Route path="/table" element={<Table />} />
        <Route path="/results" element={<Results />} />
        <Route path="/history" element={<History />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className="konami-pad" aria-label="Secret code pad">
        {['up', 'down', 'left', 'right', 'b', 'a'].map((step) => (
          <button key={step} type="button" onClick={() => konamiTap(step, () => { setSecret(true); setSecretNote(true); applyArcadeClasses() })}>{step}</button>
        ))}
      </div>
      {secretNote && <p className="note secret-note">Secret theme unlocked</p>}
      <footer className="site-footer">
        <p className="footer-label">Settings</p>
        <div className="footer-row">
          <ArcadeControls />
          <button type="button" className="settings-toggle logout-toggle" onClick={game.logout}>Log out</button>
        </div>
        <ArtCredit />
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Shell />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  )
}

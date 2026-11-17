import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Predictions from './pages/Predictions'
import Table from './pages/Table'
import { loadState, saveState } from './data/storage'

export default function App() {
  const [state, setState] = useState(loadState())

  useEffect(() => { saveState(state) }, [state])

  const currentUser = state.users.find(u => u.id === state.currentUserId)

  return (
    <BrowserRouter>
      <div className="container">
        <div className="scoreboard">
          OFFICE PREDICTOR LEAGUE<br/>
          <span style={{ fontSize: 12 }}>WEEK {state.currentWeek}</span>
        </div>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16 }}>⚽ PREDICTOR</div>
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: currentUser.colour }}>{currentUser.name}</span>
              <img src={currentUser.avatar || 'https://placehold.co/36/000/fff?text=⚽'} alt="" className="profile-pic" style={{ borderColor: currentUser.colour }} />
            </div>
          )}
        </header>
        <Routes>
          <Route path="/login" element={<Login state={state} setState={setState} />} />
          <Route path="/" element={currentUser ? <Dashboard state={state} setState={setState} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={currentUser ? <Profile state={state} setState={setState} /> : <Navigate to="/login" />} />
          <Route path="/predict" element={currentUser ? <Predictions state={state} setState={setState} /> : <Navigate to="/login" />} />
          <Route path="/table" element={currentUser ? <Table state={state} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Predictions from './pages/Predictions'
import Table from './pages/Table'
import Results from './pages/Results'
import { loadState, saveState } from './data/storage'

export default function App() {
  const [state, setState] = useState(loadState())

  useEffect(() => { saveState(state) }, [state])

  const currentUser = state.users.find(u => u.id === state.currentUserId)

  return (
    <BrowserRouter>
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login state={state} setState={setState} />} />
          <Route path="/" element={currentUser ? <Dashboard state={state} setState={setState} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={currentUser ? <Profile state={state} setState={setState} /> : <Navigate to="/login" />} />
          <Route path="/predict" element={currentUser ? <Predictions state={state} setState={setState} /> : <Navigate to="/login" />} />
          <Route path="/table" element={currentUser ? <Table state={state} /> : <Navigate to="/login" />} />
          <Route path="/results" element={currentUser ? <Results state={state} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

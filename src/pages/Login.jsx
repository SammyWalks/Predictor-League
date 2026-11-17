import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login({ state, setState }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    const user = state.users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.password === password)
    if (user) {
      setState({ ...state, currentUserId: user.id })
      navigate('/')
    } else {
      alert('Invalid name or password (try "office")')
    }
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: '60px auto' }}>
      <h2 style={{ marginBottom: 20 }}>Log in</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 12 }}>
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: 10, marginTop: 4, borderRadius: 8, background: '#0f1419', border: '1px solid #2f3336', color: 'white' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 10, marginTop: 4, borderRadius: 8, background: '#0f1419', border: '1px solid #2f3336', color: 'white' }} />
        </div>
        <button className="btn" type="submit">Log in</button>
      </form>
      <p style={{ marginTop: 16, color: '#71767b', fontSize: 14 }}>Demo password for all: <strong>office</strong></p>
    </div>
  )
}

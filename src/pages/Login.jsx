import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { friendlyError } from '../supabase'

export default function Login() {
  const { me, ready, login } = useGame()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (ready && me) return <Navigate to="/" replace />

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(name, password)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <p className="eyebrow">Office Predictor League</p>
        <h1>Log in</h1>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Log in'}</button>
        <p className="hint">Shared office password: office</p>
      </form>
    </div>
  )
}

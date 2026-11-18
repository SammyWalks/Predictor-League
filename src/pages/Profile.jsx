import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { friendlyError } from '../supabase'
import { badgesFor } from '../data/extras'
import Badges from '../components/Badges'
import Ball from '../components/Ball'
import Sprite, { KITS } from '../components/Sprite'
import XpBar from '../components/XpBar'

export default function Profile() {
  const { me, players, allPicks, updateProfile, changePassword, logout } = useGame()
  const gamePlayers = players
  const gamePicks = allPicks
  const [name, setName] = useState(me.name)
  const [colour, setColour] = useState(me.colour || '#ffd700')
  const [avatar, setAvatar] = useState(me.avatar || '')
  const [sprite, setSprite] = useState(me.sprite || 'striker')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveProfile(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await updateProfile({ name, colour, avatar, sprite })
      setMessage('Profile saved')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function savePassword(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (newPass !== confirmPass) {
      setError('New passwords do not match')
      return
    }
    setBusy(true)
    try {
      await changePassword(currentPass, newPass)
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
      setMessage('Password changed')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card profile-card">
      <h1><Ball />Edit profile</h1>
      <Badges badges={badgesFor(me, gamePlayers, gamePicks)} />
      <XpBar points={me.points} />
      <p className="lede">Pick a kit. The shirt uses your colour on the table.</p>
      <div className="kit-picker">
        {KITS.map((kit) => (
          <button type="button" key={kit} className={sprite === kit ? 'kit-choice on' : 'kit-choice'} onClick={() => setSprite(kit)}>
            <Sprite kit={kit} colour={colour} />
            <span>{kit}</span>
          </button>
        ))}
      </div>
      <div className="avatar-row">
        <img src={avatar || 'https://placehold.co/80x80/111/fff?text=PL'} alt="" style={{ borderColor: colour }} />
      </div>
      <form onSubmit={saveProfile}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Colour
          <input type="color" value={colour} onChange={(event) => setColour(event.target.value)} />
        </label>
        <label>
          Avatar URL
          <input value={avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="https://" />
        </label>
        <button className="btn" type="submit" disabled={busy}>Save profile</button>
      </form>

      <form onSubmit={savePassword}>
        <h2>Change password</h2>
        <label>
          Current password
          <input type="password" value={currentPass} onChange={(event) => setCurrentPass(event.target.value)} />
        </label>
        <label>
          New password
          <input type="password" value={newPass} onChange={(event) => setNewPass(event.target.value)} />
        </label>
        <label>
          Confirm new password
          <input type="password" value={confirmPass} onChange={(event) => setConfirmPass(event.target.value)} />
        </label>
        <button className="btn secondary" type="submit" disabled={busy}>Change password</button>
      </form>
      {message && <p className="note" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {me.isAdmin && <p className="hint"><a href="/admin">Open the admin screen</a></p>}
      <button type="button" className="btn secondary logout-mobile" onClick={logout}>Log out</button>
    </div>
  )
}

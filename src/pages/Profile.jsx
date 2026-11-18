import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { friendlyError } from '../supabase'
import { badgesFor } from '../data/extras'
import Badges from '../components/Badges'
import Ball from '../components/Ball'
import Sprite, { KITS } from '../components/Sprite'
import XpBar from '../components/XpBar'
import { h2hLabel } from '../data/h2h'

export default function Profile() {
  const { me, players, allPicks, updateProfile, changePassword } = useGame()
  const gamePlayers = players
  const gamePicks = allPicks
  const [name, setName] = useState(me.name)
  const [colour, setColour] = useState(me.colour || '#ffd700')
  const [sprite, setSprite] = useState(me.sprite || 'striker')
  const [kitShirt, setKitShirt] = useState(me.kitShirt || me.colour || '#ffd700')
  const [kitShorts, setKitShorts] = useState(me.kitShorts || '#ffffff')
  const [kitSocks, setKitSocks] = useState(me.kitSocks || me.kitShirt || me.colour || '#ffd700')
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
      await updateProfile({ name, colour, sprite, kitShirt, kitShorts, kitSocks })
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
      <p className="h2h-record">Head to head {h2hLabel(me.h2h)}</p>
      <p className="lede">Build your kit. This little player is your icon.</p>
      <div className="kit-preview">
        <Sprite kit={sprite} colour={colour} shirt={kitShirt} shorts={kitShorts} socks={kitSocks} size={64} />
        <span className="player-name" style={{ color: colour }}>{name}</span>
      </div>
      <div className="kit-picker">
        {KITS.map((kit) => (
          <button type="button" key={kit} className={sprite === kit ? 'kit-choice on' : 'kit-choice'} onClick={() => setSprite(kit)}>
            <Sprite kit={kit} colour={colour} shirt={kitShirt} shorts={kitShorts} socks={kitSocks} />
            <span>{kit}</span>
          </button>
        ))}
      </div>
      <form onSubmit={saveProfile}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="kit-colours">
          {[
            ['Name colour', colour, setColour],
            ['Shirt', kitShirt, setKitShirt],
            ['Shorts', kitShorts, setKitShorts],
            ['Socks', kitSocks, setKitSocks],
          ].map(([label, value, setValue]) => (
            <label key={label} className="swatch-row">
              <span>{label}</span>
              <span className="swatch-control">
                <input type="color" value={String(value).toLowerCase()} aria-label={label} onChange={(event) => setValue(event.target.value)} />
                <span className="swatch-hex">{value.toLowerCase()}</span>
              </span>
            </label>
          ))}
        </div>
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
    </div>
  )
}

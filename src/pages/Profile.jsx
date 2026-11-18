import { useState } from 'react'
import Nav from '../components/Nav'

export default function Profile({ state, setState }) {
  const user = state.users.find(u => u.id === state.currentUserId)
  const [name, setName] = useState(user.name)
  const [colour, setColour] = useState(user.colour)
  const [avatar, setAvatar] = useState(user.avatar)
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const saveProfile = () => {
    const updated = state.users.map(u => u.id === user.id ? { ...u, name, colour, avatar } : u)
    setState({ ...state, users: updated })
    alert('Profile saved')
  }

  const changePassword = () => {
    if (currentPass !== user.password) {
      alert('Current password incorrect')
      return
    }
    if (newPass !== confirmPass || newPass.length < 4) {
      alert('New passwords do not match or too short')
      return
    }
    const updated = state.users.map(u => u.id === user.id ? { ...u, password: newPass } : u)
    setState({ ...state, users: updated })
    setCurrentPass(''); setNewPass(''); setConfirmPass('')
    alert('Password changed')
  }

  return (
    <div>
      <Nav state={state} setState={setState} />
      <div className="card" style={{ maxWidth: 520 }}>
        <h2 style={{ fontSize: 14 }}>PROFILE</h2>
        <div style={{ margin: '16px 0' }}>
          <img src={avatar || 'https://placehold.co/80'} alt="" style={{ width: 70, height: 70, border: `3px solid ${colour}` }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4, background: '#000', border: '2px solid #fff', color: '#fff' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Colour</label><br />
          <input type="color" value={colour} onChange={e => setColour(e.target.value)} style={{ marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Avatar URL</label>
          <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: 8, marginTop: 4, background: '#000', border: '2px solid #fff', color: '#fff' }} />
        </div>
        <button className="btn" onClick={saveProfile}>SAVE PROFILE</button>

        <h3 style={{ fontSize: 12, marginTop: 32 }}>CHANGE PASSWORD</h3>
        <div style={{ marginBottom: 10 }}>
          <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="Current password" style={{ width: '100%', padding: 8, background: '#000', border: '2px solid #fff', color: '#fff' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password" style={{ width: '100%', padding: 8, background: '#000', border: '2px solid #fff', color: '#fff' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm new password" style={{ width: '100%', padding: 8, background: '#000', border: '2px solid #fff', color: '#fff' }} />
        </div>
        <button className="btn" onClick={changePassword}>CHANGE PASSWORD</button>
      </div>
    </div>
  )
}

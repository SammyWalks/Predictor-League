import { useState } from 'react'

export default function Profile({ state, setState }) {
  const user = state.users.find(u => u.id === state.currentUserId)
  const [name, setName] = useState(user.name)
  const [colour, setColour] = useState(user.colour)
  const [avatar, setAvatar] = useState(user.avatar)

  const save = () => {
    const updated = state.users.map(u => u.id === user.id ? { ...u, name, colour, avatar } : u)
    setState({ ...state, users: updated })
    alert('Profile saved')
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2>Your Profile</h2>
      <div style={{ margin: '20px 0' }}>
        <img src={avatar || 'https://placehold.co/80'} alt="" style={{ width: 80, height: 80, borderRadius: '50%', border: `3px solid ${colour}` }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 4, borderRadius: 8, background: '#0f1419', border: '1px solid #2f3336', color: 'white' }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Colour</label>
        <input type="color" value={colour} onChange={e => setColour(e.target.value)} style={{ width: 60, height: 40, marginTop: 4 }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label>Avatar URL</label>
        <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: 10, marginTop: 4, borderRadius: 8, background: '#0f1419', border: '1px solid #2f3336', color: 'white' }} />
      </div>
      <button className="btn" onClick={save}>Save Profile</button>
    </div>
  )
}

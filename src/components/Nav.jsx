import { Link, useNavigate } from 'react-router-dom'

export default function Nav({ state, setState }) {
  const user = state.users.find(u => u.id === state.currentUserId)
  const navigate = useNavigate()

  const logout = () => {
    setState({ ...state, currentUserId: null })
    navigate('/login')
  }

  if (!user) return null

  return (
    <nav style={{
      background: '#000',
      borderBottom: '3px solid #fff',
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      fontSize: 11
    }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <Link to="/" style={{ color: '#ffd700' }}>HOME</Link>
        <Link to="/predict" style={{ color: '#fff' }}>PREDICT</Link>
        <Link to="/table" style={{ color: '#fff' }}>TABLE</Link>
        <Link to="/results" style={{ color: '#fff' }}>RESULTS</Link>
        <Link to="/profile" style={{ color: '#fff' }}>PROFILE</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: user.colour }}>{user.name}</span>
        <button onClick={logout} className="btn" style={{ padding: '6px 12px', fontSize: 9 }}>LOG OUT</button>
      </div>
    </nav>
  )
}

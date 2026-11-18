import Nav from '../components/Nav'

export default function Results({ state }) {
  return (
    <div>
      <Nav state={state} />
      <div className="card">
        <h2 style={{ fontSize: 14, marginBottom: 16 }}>PREVIOUS WEEK RESULTS</h2>
        <table style={{ textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>NAME</th>
              <th>LEEDS 1-0</th>
              <th>IPSWICH 1-2</th>
              <th>MAN UTD 4-4</th>
              <th>GW PTS</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ textAlign: 'left', color: '#1d9bf0' }}>Sam Walker</td><td>0-1 (0)</td><td>1-2 (3)</td><td>1-1 (1)</td><td><strong>4</strong></td></tr>
            <tr><td style={{ textAlign: 'left', color: '#e11d48' }}>Reuben Swinfield</td><td>1-2 (0)</td><td>1-3 (1)</td><td>2-2 (1)</td><td><strong>2</strong></td></tr>
            <tr><td style={{ textAlign: 'left', color: '#f59e0b' }}>Saj Ali</td><td>1-1 (0)</td><td>0-1 (1)</td><td>2-1 (0)</td><td><strong>1</strong></td></tr>
            <tr><td style={{ textAlign: 'left', color: '#10b981' }}>Sam Morrell</td><td>0-0 (0)</td><td>1-2 (3)</td><td>2-2 (1)</td><td><strong>4</strong></td></tr>
            <tr><td style={{ textAlign: 'left', color: '#8b5cf6' }}>Matthew Iles</td><td>3-1 (0)</td><td>0-2 (1)</td><td>3-3 (1)</td><td><strong>2</strong></td></tr>
            <tr><td style={{ textAlign: 'left', color: '#f97316' }}>Kieran Savage</td><td>1-1 (0)</td><td>1-2 (3)</td><td>1-1 (1)</td><td><strong>4</strong></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

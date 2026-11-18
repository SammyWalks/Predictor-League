import { badgesFor, formFor, movements, pointsBand } from '../data/extras'
import Badges from './Badges'
import Sprite, { kitProps } from './Sprite'

export default function LeagueTable({ players, picks }) {
  const arrows = movements(players, picks)

  return (
    <div className="table-wrap">
      <table className="league">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Player</th>
            <th>Form</th>
            <th>Week</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const rows = [...players]
              .map((player) => {
                const weekPicks = (picks || []).filter((pick) => pick.userId === player.id && pick.pointsAwarded != null)
                const latest = weekPicks.reduce((max, pick) => Math.max(max, pick.week), 0)
                const latestPoints = weekPicks.filter((pick) => pick.week === latest).reduce((sum, pick) => sum + pick.pointsAwarded, 0)
                return { ...player, weekPoints: latest ? latestPoints : null }
              })
              .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
            return rows.map((player, index) => (
              <tr key={player.id}>
                <td>
                  <span className={`arrow arrow-${arrows[player.id] || 'same'}`} aria-label={arrows[player.id] || 'same'} />
                  {index + 1}
                </td>
                <td>
                  <Sprite {...kitProps(player)} size={22} />
                  <span className="player-name" style={{ color: player.colour || '#94a3b8' }}>{player.name}</span>
                  <Badges badges={badgesFor(player, players, picks)} compact />
                </td>
                <td>
                  <span className="form">
                    {formFor(player.id, picks).map((block) => (
                      <span key={block.week} className={`form-block form-${pointsBand(block.points)}`} title={block.points == null ? `Week ${block.week}` : `Week ${block.week}: ${block.points}`} />
                    ))}
                  </span>
                </td>
                <td>{player.weekPoints == null ? '–' : player.weekPoints}</td>
                <td className="points">{player.points}</td>
              </tr>
            ))
          })()}
        </tbody>
      </table>
    </div>
  )
}

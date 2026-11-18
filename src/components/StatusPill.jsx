const COPY = {
  open: 'Not locked',
  locked: 'Locked',
  partial: 'Part scored',
  scored: 'Scored',
}

export default function StatusPill({ status }) {
  return <span className={`pill pill-${status}`}>{COPY[status] || COPY.open}</span>
}

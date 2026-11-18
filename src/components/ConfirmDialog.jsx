export default function ConfirmDialog({ title, children, confirmLabel, busy, onConfirm, onCancel }) {
  return (
    <div className="modal-back" role="presentation" onClick={onCancel}>
      <div
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title">{title}</h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onCancel} disabled={busy}>Back</button>
          <button type="button" className="btn" onClick={onConfirm} disabled={busy}>{busy ? 'Locking…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

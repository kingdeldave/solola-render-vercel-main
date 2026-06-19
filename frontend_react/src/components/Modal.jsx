// Modal légère sans dépendance externe.
export default function Modal({ title, children, onClose }) {
  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modalCard" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modalHeader">
          <h3>{title}</h3>
          <button type="button" className="iconButton" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

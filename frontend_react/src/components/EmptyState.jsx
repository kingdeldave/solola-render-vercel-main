// État vide affiché dans les listes.
export default function EmptyState({ title, text }) {
  return (
    <div className="emptyState">
      <div className="emptyIcon">◇</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

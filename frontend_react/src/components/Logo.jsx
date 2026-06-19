// Logo Solola réutilisable.
export default function Logo({ size = 64, showText = false }) {
  return (
    <div className="logoBlock">
      <img
        src="/solola_logo.png"
        alt="Solola"
        className="logoImage"
        style={{ width: size, height: size }}
      />
      {showText && (
        <div className="logoTextBlock">
          <h1>SOLOLA</h1>
          <p>COMMUNIQUER • CONNECTER • PARTAGER</p>
        </div>
      )}
    </div>
  );
}

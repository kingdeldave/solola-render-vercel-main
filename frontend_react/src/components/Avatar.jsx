// Avatar utilisateur avec image ou initiales.
import { initials } from '../utils/format';

export default function Avatar({ src, name, size = 44 }) {
  const hasImage = Boolean(src);

  return (
    <div className="avatar" style={{ width: size, height: size, minWidth: size }}>
      {hasImage ? <img src={src} alt={name || 'Avatar'} /> : <span>{initials(name)}</span>}
    </div>
  );
}

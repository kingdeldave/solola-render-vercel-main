// Protection simple des écrans connectés/admin.
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ adminOnly = false, children }) {
  const { loading, isAuthenticated, isAdmin } = useAuth();

  if (loading) {
    return <div className="fullCenter">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <div className="fullCenter">Connexion requise.</div>;
  }

  if (adminOnly && !isAdmin) {
    return <div className="fullCenter">Accès réservé aux administrateurs.</div>;
  }

  return children;
}

// Racine applicative : affiche la connexion, la vérification email ou l'application connectée.
import { sendEmailVerification } from 'firebase/auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { logout } from './services/authService';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import Logo from './components/Logo';

function EmailVerificationGate() {
  const { firebaseUser } = useAuth();

  async function handleReload() {
    await firebaseUser.reload();
    window.location.reload();
  }

  async function handleResend() {
    await sendEmailVerification(firebaseUser);
    alert('Email de vérification renvoyé.');
  }

  return (
    <main className="authScreen">
      <section className="authHero">
        <Logo size={86} showText />
        <div className="heroCopy">
          <h2>Vérifie ton email</h2>
          <p>Firebase a créé ton compte, mais l’adresse email doit être vérifiée avant d’ouvrir Solola.</p>
        </div>
      </section>
      <section className="authCard glassCard formStack">
        <h2>Adresse à vérifier</h2>
        <p>{firebaseUser.email}</p>
        <button className="primaryButton" onClick={handleReload}>J’ai vérifié, continuer</button>
        <button className="secondaryButton" onClick={handleResend}>Renvoyer l’email</button>
        <button className="secondaryButton" onClick={logout}>Se déconnecter</button>
      </section>
    </main>
  );
}

function AppContent() {
  const { loading, isAuthenticated, firebaseUser } = useAuth();

  if (loading) {
    return <div className="fullCenter">Chargement de Solola...</div>;
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (firebaseUser?.email && !firebaseUser.emailVerified) {
    return <EmailVerificationGate />;
  }

  return <HomePage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

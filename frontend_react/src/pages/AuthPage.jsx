// Page connexion/inscription : Firebase email et téléphone.
import { useState } from 'react';
import Logo from '../components/Logo';
import {
  confirmPhoneLogin,
  loginWithEmail,
  registerWithEmail,
  startPhoneLogin,
} from '../services/authService';
import { firebaseConfigIsValid, firebaseMissingKeys } from '../services/firebase';
import { friendlyFirebaseError } from '../utils/format';

export default function AuthPage() {
  const [tab, setTab] = useState('email');
  const [mode, setMode] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'register') {
        if (!displayName.trim()) throw new Error('Entre ton nom ou ton pseudo.');
        await registerWithEmail({ email, password, displayName });
        setMessage('Compte créé. Vérifie ta boîte mail, puis reconnecte-toi.');
      } else {
        const user = await loginWithEmail({ email, password });
        if (!user.emailVerified) {
          setMessage('Connexion acceptée, mais ton email n’est pas encore vérifié. Vérifie ta boîte mail.');
        }
      }
    } catch (err) {
      setError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleStartPhone(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!phoneNumber.startsWith('+')) {
        throw new Error('Utilise le format international, par exemple +243XXXXXXXXX.');
      }
      const result = await startPhoneLogin(phoneNumber);
      setConfirmationResult(result);
      setMessage('Code SMS envoyé. Entre le code reçu.');
    } catch (err) {
      setError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPhone(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await confirmPhoneLogin(confirmationResult, smsCode);
      setMessage('Téléphone vérifié. Connexion en cours.');
    } catch (err) {
      setError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authScreen">
      <section className="authHero">
        <Logo size={86} showText />
        <div className="heroCopy">
          <h2>Messagerie Solola sans Render</h2>
          <p>
            Cette version utilise React, Firebase Authentication, Firestore et Firebase Storage.
            Netlify héberge l’interface, Firebase gère la connexion et les données.
          </p>
        </div>
      </section>

      <section className="authCard glassCard">
        {!firebaseConfigIsValid && (
          <div className="alert error">
            Firebase n’est pas encore configuré : {firebaseMissingKeys.join(', ')}.
          </div>
        )}

        <div className="tabRow">
          <button className={tab === 'email' ? 'active' : ''} onClick={() => setTab('email')} type="button">
            Email
          </button>
          <button className={tab === 'phone' ? 'active' : ''} onClick={() => setTab('phone')} type="button">
            Téléphone
          </button>
        </div>

        {tab === 'email' && (
          <form className="formStack" onSubmit={handleEmailSubmit}>
            <div className="switchRow">
              <button type="button" className={mode === 'login' ? 'pill active' : 'pill'} onClick={() => setMode('login')}>
                Connexion
              </button>
              <button type="button" className={mode === 'register' ? 'pill active' : 'pill'} onClick={() => setMode('register')}>
                Inscription
              </button>
            </div>

            {mode === 'register' && (
              <label>
                Nom ou pseudo
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="David" />
              </label>
            )}

            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@email.com" required />
            </label>

            <label>
              Mot de passe
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 caractères" required />
            </label>

            <button className="primaryButton" disabled={loading || !firebaseConfigIsValid} type="submit">
              {loading ? 'Traitement...' : mode === 'register' ? 'Créer le compte' : 'Se connecter'}
            </button>
          </form>
        )}

        {tab === 'phone' && (
          <div className="formStack">
            {!confirmationResult ? (
              <form className="formStack" onSubmit={handleStartPhone}>
                <label>
                  Numéro de téléphone
                  <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+243XXXXXXXXX" />
                </label>
                <div id="recaptcha-container" />
                <button className="primaryButton" disabled={loading || !firebaseConfigIsValid} type="submit">
                  {loading ? 'Envoi...' : 'Recevoir le code SMS'}
                </button>
              </form>
            ) : (
              <form className="formStack" onSubmit={handleConfirmPhone}>
                <label>
                  Code SMS
                  <input value={smsCode} onChange={(event) => setSmsCode(event.target.value)} placeholder="123456" />
                </label>
                <button className="primaryButton" disabled={loading} type="submit">
                  {loading ? 'Vérification...' : 'Confirmer le code'}
                </button>
                <button className="secondaryButton" type="button" onClick={() => setConfirmationResult(null)}>
                  Changer de numéro
                </button>
              </form>
            )}
          </div>
        )}

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}
      </section>
    </main>
  );
}

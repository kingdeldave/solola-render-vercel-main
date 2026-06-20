// Page connexion/inscription : Firebase email et téléphone avec OTP RDC/Kinshasa.
import { useMemo, useState } from 'react';
import Logo from '../components/Logo';
import {
  confirmPhoneLogin,
  loginWithEmail,
  normalizeDrcPhoneNumber,
  registerWithEmail,
  startPhoneLogin,
  validateDrcPhoneNumber,
} from '../services/authService';
import { firebaseConfigIsValid, firebaseMissingKeys } from '../services/firebase';
import { friendlyFirebaseError } from '../utils/format';

export default function AuthPage() {
  const [tab, setTab] = useState('phone');
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

  // Prévisualise le numéro normalisé pour rassurer l'utilisateur avant l'envoi du SMS.
  const phonePreview = useMemo(() => {
    if (!phoneNumber.trim()) return '';
    return normalizeDrcPhoneNumber(phoneNumber);
  }, [phoneNumber]);

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
      const validation = validateDrcPhoneNumber(phoneNumber);
      if (!validation.isValid) throw new Error(validation.message);

      const result = await startPhoneLogin(validation.normalized);
      setConfirmationResult(result);
      setMessage(`Code OTP envoyé au ${validation.normalized}. Entre le code reçu par SMS.`);
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

  function resetPhoneFlow() {
    setConfirmationResult(null);
    setSmsCode('');
    setMessage('');
    setError('');
  }

  return (
    <main className="authScreen authScreenPremium">
      <section className="authHero authHeroPremium">
        <div className="heroGlow heroGlowOne" />
        <div className="heroGlow heroGlowTwo" />

        <Logo size={92} showText />

        <div className="heroCopy">
          <span className="eyebrow">SOLOLA • Kinshasa Ready</span>
          <h2>Une messagerie propre, moderne et sécurisée.</h2>
          <p>
            Interface React premium, connexion Firebase, OTP SMS pour les numéros RDC
            et données en temps réel avec Firestore. Plus besoin de Render pour faire tourner le TP.
          </p>
        </div>

        <div className="heroStats">
          <article>
            <strong>+243</strong>
            <span>OTP RDC</span>
          </article>
          <article>
            <strong>Firebase</strong>
            <span>Auth + Data</span>
          </article>
          <article>
            <strong>Netlify</strong>
            <span>Frontend</span>
          </article>
        </div>
      </section>

      <section className="authCard glassCard authCardPremium">
        {!firebaseConfigIsValid && (
          <div className="alert error">
            Firebase n’est pas encore configuré : {firebaseMissingKeys.join(', ')}.
          </div>
        )}

        <div className="authHeaderMini">
          <span className="eyebrow dark">Accès sécurisé</span>
          <h2>Connexion</h2>
          <p>Choisis email ou téléphone. Pour Kinshasa, le numéro local est automatiquement converti en +243.</p>
        </div>

        <div className="tabRow premiumTabs">
          <button className={tab === 'phone' ? 'active' : ''} onClick={() => setTab('phone')} type="button">
            Téléphone RDC
          </button>
          <button className={tab === 'email' ? 'active' : ''} onClick={() => setTab('email')} type="button">
            Email
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
          <div className="formStack phoneOtpBox">
            {!confirmationResult ? (
              <form className="formStack" onSubmit={handleStartPhone}>
                <div className="otpBanner">
                  <span>🇨🇩</span>
                  <div>
                    <strong>Service OTP RDC/Kinshasa</strong>
                    <small>Exemples acceptés : 0812345678, 812345678, 243812345678 ou +243812345678.</small>
                  </div>
                </div>

                <label>
                  Numéro de téléphone
                  <div className="phoneInputWrap">
                    <span>+243</span>
                    <input
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      placeholder="812345678"
                      autoComplete="tel"
                    />
                  </div>
                </label>

                {phonePreview && (
                  <div className="phonePreview">
                    Numéro envoyé à Firebase : <strong>{phonePreview}</strong>
                  </div>
                )}

                <div id="recaptcha-container" className="recaptchaBox" />

                <button className="primaryButton" disabled={loading || !firebaseConfigIsValid} type="submit">
                  {loading ? 'Envoi du SMS...' : 'Recevoir le code OTP'}
                </button>
              </form>
            ) : (
              <form className="formStack" onSubmit={handleConfirmPhone}>
                <div className="otpBanner successTone">
                  <span>✓</span>
                  <div>
                    <strong>Code envoyé</strong>
                    <small>Entre les 6 chiffres reçus par SMS.</small>
                  </div>
                </div>

                <label>
                  Code OTP
                  <input
                    value={smsCode}
                    onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </label>

                <button className="primaryButton" disabled={loading || smsCode.length !== 6} type="submit">
                  {loading ? 'Vérification...' : 'Confirmer le code'}
                </button>
                <button className="secondaryButton" type="button" onClick={resetPhoneFlow}>
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

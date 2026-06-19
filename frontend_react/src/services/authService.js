// Service d'authentification Firebase : email/mot de passe et téléphone/SMS.
import {
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function ensureUserProfile(user, extra = {}) {
  // Crée ou met à jour le profil public minimal dans Firestore.
  if (!user) return null;

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  const safeName =
    extra.displayName ||
    user.displayName ||
    user.phoneNumber ||
    (user.email ? user.email.split('@')[0] : 'Utilisateur');

  const baseProfile = {
    uid: user.uid,
    displayName: safeName,
    email: user.email || '',
    phoneNumber: user.phoneNumber || extra.phoneNumber || '',
    avatarUrl: user.photoURL || '',
    bio: extra.bio || '',
    role: snap.exists() ? snap.data().role || 'USER' : 'USER',
    privacy: snap.exists() ? snap.data().privacy || 'contacts' : 'contacts',
    updatedAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(userRef, {
      ...baseProfile,
      createdAt: serverTimestamp(),
    });
  } else {
    await setDoc(userRef, baseProfile, { merge: true });
  }

  const freshSnap = await getDoc(userRef);
  return freshSnap.data();
}

export async function registerWithEmail({ email, password, displayName }) {
  // Crée un compte Firebase email/password, puis envoie l'email de vérification.
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: displayName.trim() });
  await sendEmailVerification(credential.user);
  await ensureUserProfile(credential.user, { displayName });
  return credential.user;
}

export async function loginWithEmail({ email, password }) {
  // Connecte l'utilisateur par email/password.
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export function createRecaptcha(containerId = 'recaptcha-container') {
  // Réinitialise le reCAPTCHA pour éviter les doublons dans une SPA.
  if (window.sololaRecaptchaVerifier) {
    try {
      window.sololaRecaptchaVerifier.clear();
    } catch (_) {
      // Ne bloque pas l'utilisateur si l'ancien widget est déjà détruit.
    }
  }

  window.sololaRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'normal',
    callback: () => undefined,
  });

  return window.sololaRecaptchaVerifier;
}

export async function startPhoneLogin(phoneNumber, containerId = 'recaptcha-container') {
  // Démarre la connexion téléphone. Le numéro doit être au format international : +243...
  const verifier = createRecaptcha(containerId);
  return signInWithPhoneNumber(auth, phoneNumber.trim(), verifier);
}

export async function confirmPhoneLogin(confirmationResult, code) {
  // Valide le code SMS reçu et crée/actualise le profil Firestore.
  const credential = await confirmationResult.confirm(code.trim());
  await ensureUserProfile(credential.user, { phoneNumber: credential.user.phoneNumber });
  return credential.user;
}

export async function logout() {
  // Déconnecte l'utilisateur courant.
  await signOut(auth);
}

// Service d'authentification Firebase : email/mot de passe et téléphone/SMS.
// Ce fichier centralise la connexion Firebase Auth et la création du profil Firestore.
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

// Indicatif téléphonique de la République Démocratique du Congo.
export const DRC_PHONE_PREFIX = '+243';

/**
 * Nettoie un numéro de téléphone saisi par l'utilisateur.
 * On retire les espaces, tirets, parenthèses et points pour éviter les erreurs Firebase.
 */
export function cleanPhoneNumber(value = '') {
  return String(value)
    .trim()
    .replace(/[\s().-]/g, '');
}

/**
 * Convertit un numéro local RDC/Kinshasa vers le format international +243.
 * Exemples acceptés :
 * - 0812345678  -> +243812345678
 * - 812345678   -> +243812345678
 * - +243812345678 -> +243812345678
 * - 00243812345678 -> +243812345678
 */
export function normalizeDrcPhoneNumber(value = '') {
  let phone = cleanPhoneNumber(value);

  // Convertit le format 00243... en +243...
  if (phone.startsWith('00243')) {
    phone = `+243${phone.slice(5)}`;
  }

  // Conserve directement le format international correct.
  if (phone.startsWith('+243')) {
    return phone;
  }

  // Si l'utilisateur écrit 243..., on ajoute uniquement le +.
  if (phone.startsWith('243')) {
    return `+${phone}`;
  }

  // Si l'utilisateur écrit un numéro local avec 0 initial, on retire ce 0.
  if (phone.startsWith('0')) {
    phone = phone.slice(1);
  }

  // Sinon, on suppose que c'est un numéro local RDC sans indicatif.
  return `${DRC_PHONE_PREFIX}${phone}`;
}

/**
 * Valide simplement le format final attendu pour Firebase : +243 + 9 chiffres.
 * Cette validation reste volontairement souple sur l'opérateur, car les plages
 * peuvent changer selon les opérateurs mobiles et la portabilité des numéros.
 */
export function validateDrcPhoneNumber(value = '') {
  const normalized = normalizeDrcPhoneNumber(value);
  const isValid = /^\+243\d{9}$/.test(normalized);

  return {
    isValid,
    normalized,
    message: isValid
      ? ''
      : 'Entre un numéro RDC valide : +243 suivi de 9 chiffres. Exemple : +243812345678.',
  };
}

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

  // reCAPTCHA visible : plus stable pour un TP, plus facile à expliquer et à corriger.
  window.sololaRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'normal',
    callback: () => undefined,
    'expired-callback': () => undefined,
  });

  return window.sololaRecaptchaVerifier;
}

export async function startPhoneLogin(phoneNumber, containerId = 'recaptcha-container') {
  // Démarre la connexion téléphone pour la RDC/Kinshasa.
  // L'utilisateur peut saisir 081..., 81..., 243..., 00243... ou +243...
  const validation = validateDrcPhoneNumber(phoneNumber);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  const verifier = createRecaptcha(containerId);
  return signInWithPhoneNumber(auth, validation.normalized, verifier);
}

export async function confirmPhoneLogin(confirmationResult, code) {
  // Valide le code SMS reçu et crée/actualise le profil Firestore.
  if (!confirmationResult) {
    throw new Error('Demande d’abord un code OTP.');
  }

  const cleanCode = String(code || '').trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('Le code OTP doit contenir 6 chiffres.');
  }

  const credential = await confirmationResult.confirm(cleanCode);
  await ensureUserProfile(credential.user, { phoneNumber: credential.user.phoneNumber });
  return credential.user;
}

export async function logout() {
  // Déconnecte l'utilisateur courant.
  await signOut(auth);
}

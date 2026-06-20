// Fonctions de présentation réutilisables.
export function initials(value) {
  const text = String(value || '?').trim();
  return text.substring(0, Math.min(2, text.length)).toUpperCase();
}

export function formatHour(value) {
  if (!value) return '';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(value) {
  if (!value) return '';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function previewMessage(conversation) {
  const message = conversation?.lastMessage;
  if (!message) return 'Aucun message';
  if (message.type === 'encrypted') return '🔐 Message chiffré';
  return message.text || 'Message';
}

export function friendlyFirebaseError(error) {
  const code = error?.code || '';
  if (code.includes('auth/invalid-credential')) return 'Identifiants invalides.';
  if (code.includes('auth/email-already-in-use')) return 'Cet email est déjà utilisé.';
  if (code.includes('auth/weak-password')) return 'Mot de passe trop faible.';
  if (code.includes('auth/invalid-email')) return 'Adresse email invalide.';
  if (code.includes('auth/missing-password')) return 'Mot de passe manquant.';
  if (code.includes('auth/too-many-requests')) return 'Trop de tentatives. Réessaie plus tard.';
  if (code.includes('auth/invalid-verification-code')) return 'Code SMS invalide.';
  if (code.includes('auth/invalid-phone-number')) return 'Numéro de téléphone invalide. Utilise le format RDC +243XXXXXXXXX.';
  if (code.includes('auth/quota-exceeded')) return 'Quota SMS Firebase dépassé. Réessaie plus tard ou utilise un numéro de test Firebase.';
  if (code.includes('auth/captcha-check-failed')) return 'La vérification reCAPTCHA a échoué. Recharge la page puis réessaie.';
  if (code.includes('auth/api-key-not-valid')) return 'Clé API Firebase invalide dans Netlify. Vérifie VITE_FIREBASE_API_KEY puis redéploie sans cache.';
  if (code.includes('auth/operation-not-allowed')) return 'La méthode de connexion n’est pas activée dans Firebase Authentication.';
  if (code.includes('permission-denied')) return 'Action refusée par les règles Firebase.';
  return error?.message || 'Erreur inconnue.';
}

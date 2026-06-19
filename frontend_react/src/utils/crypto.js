// Chiffrement local compatible navigateur : AES-GCM + PBKDF2.
// Le PIN n'est jamais envoyé à Firebase. Seul le contenu chiffré est stocké.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function deriveKey(pin, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 200000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText({ text, pin, hint }) {
  // Chiffre un texte avec un PIN utilisateur.
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));

  return {
    encrypted: true,
    mode: 'pin',
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2',
    iterations: 200000,
    hint: hint || '',
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

export async function decryptText({ payload, pin }) {
  // Déchiffre un texte avec le PIN correct.
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const encrypted = fromBase64(payload.ciphertext);
  const key = await deriveKey(pin, salt);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return decoder.decode(clear);
}

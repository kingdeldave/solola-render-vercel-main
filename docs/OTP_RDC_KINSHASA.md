# OTP RDC/Kinshasa — Solola

Cette mise à jour ajoute une expérience OTP adaptée aux numéros de téléphone de la RDC.

## Formats acceptés

L'utilisateur peut saisir son numéro sous plusieurs formes :

```txt
0812345678
812345678
243812345678
00243812345678
+243812345678
```

Le code transforme automatiquement ces formats vers :

```txt
+243812345678
```

## Fichiers modifiés

```txt
frontend_react/src/pages/AuthPage.jsx
frontend_react/src/services/authService.js
frontend_react/src/services/firebase.js
frontend_react/src/styles/global.css
```

## Firebase à vérifier

Dans Firebase Console :

```txt
Authentication > Sign-in method > Phone : activé
Authentication > Settings > Authorized domains : ajouter le domaine Netlify
Google Cloud > API key Firebase : Identity Toolkit API autorisée si la clé est restreinte
```

## Netlify

Les variables doivent commencer par `VITE_` :

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Après modification des variables, relancer :

```txt
Deploys > Trigger deploy > Clear cache and deploy site
```

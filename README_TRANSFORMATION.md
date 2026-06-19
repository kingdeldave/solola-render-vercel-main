# Transformation effectuée

L'ancien projet utilisait :

```txt
Flutter Web + Backend Python/FastAPI + Render + Firebase Auth partiel
```

Cette version utilise maintenant :

```txt
React + Firebase Auth + Firestore + Firebase Storage + Netlify
```

## Ce qui a été remplacé

- Les appels HTTP vers le backend FastAPI ont été remplacés par des lectures/écritures Firestore.
- Les uploads backend ont été remplacés par Firebase Storage.
- La session backend a été supprimée.
- `API_BASE_URL` a été supprimé.
- Le déploiement Netlify pointe vers `frontend_react`.

## Ce qui reste à faire dans ton compte Firebase

- Activer Email/Password.
- Activer Phone.
- Créer Firestore.
- Créer Storage.
- Publier les règles dans `firebase/firestore.rules` et `firebase/storage.rules`.
- Mettre tes vraies variables `VITE_FIREBASE_*` dans Netlify.

## Important

Cette version est une refonte fonctionnelle React + Firebase. Elle ne reprend pas ligne par ligne tout le code Flutter, parce que Flutter et React n'ont pas la même structure. Elle reprend les fonctions principales : auth, profils, discussions, groupes, messages, fichiers, statuts, admin et messages chiffrés.

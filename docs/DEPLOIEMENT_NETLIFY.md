# Déploiement Netlify

## 1. Copier cette version dans ton dossier GitHub

Dézippe le projet puis copie son contenu dans :

```bat
C:\Users\DAVID KALOMBO\Videos\solola-render-vercel-main
```

Remplace les anciens fichiers si Windows demande confirmation.

## 2. Envoyer sur GitHub

```bat
cd /d "C:\Users\DAVID KALOMBO\Videos\solola-render-vercel-main"
git status
git add .
git commit -m "Transform Solola to React Firebase Netlify"
git push
```

## 3. Netlify

Netlify utilisera automatiquement `netlify.toml`.

Dans les variables d'environnement Netlify, importer ou créer :

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Ne mets pas `API_BASE_URL`. Cette version n'utilise plus Render.

## 4. Firebase

Dans Firebase Authentication, ajoute ton domaine Netlify sans `https://` :

```txt
nom-du-site.netlify.app
```

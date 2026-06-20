# Solola — React + Firebase + Netlify

Cette version transforme Solola en application **React + Firebase** sans backend Render.

## Architecture

- **React/Vite** : interface web.
- **Firebase Authentication** : connexion par email/mot de passe et téléphone/SMS.
- **Cloud Firestore** : utilisateurs, conversations, messages, groupes, statuts.
- **Firebase Storage** : avatars, images, fichiers et médias de statut.
- **Netlify** : hébergement gratuit de l'interface.

Aucun `API_BASE_URL` n'est nécessaire dans cette version.

## Dossiers importants

```txt
frontend_react/              Application React
firebase/firestore.rules     Règles de sécurité Firestore
firebase/storage.rules       Règles de sécurité Firebase Storage
netlify.toml                 Configuration Netlify
netlify_firebase_react.env   Variables à importer dans Netlify
```

## Configuration Firebase obligatoire

Dans Firebase Console :

1. Créer un projet Firebase.
2. Activer **Authentication > Sign-in method > Email/Password**.
3. Activer **Authentication > Sign-in method > Phone**.
4. Créer une application Web Firebase.
5. Copier la configuration Web Firebase dans les variables Netlify.
6. Créer une base **Cloud Firestore**.
7. Activer **Firebase Storage**.
8. Publier les règles dans `firebase/firestore.rules` et `firebase/storage.rules`.
9. Ajouter le domaine Netlify dans **Authentication > Settings > Authorized domains**.

## Variables Netlify

Dans Netlify, importer le fichier `netlify_firebase_react.env` puis remplacer les valeurs d'exemple par les vraies valeurs Firebase :

```env
VITE_FIREBASE_API_KEY=ta_vraie_api_key
VITE_FIREBASE_AUTH_DOMAIN=ton_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ton_project_id
VITE_FIREBASE_STORAGE_BUCKET=ton_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=ton_sender_id
VITE_FIREBASE_APP_ID=ton_app_id
```

## Paramètres Netlify

Si Netlify lit `netlify.toml`, il n'y a rien à remplir manuellement. Sinon :

```txt
Commande de build : cd frontend_react && npm install && npm run build
Dossier de publication : frontend_react/dist
Répertoire des fonctions : vide
```

## Lancement local

```bat
cd frontend_react
npm install
npm run dev
```

Puis ouvrir l'URL affichée par Vite.

## Créer un administrateur

Sans backend Render, l'application ne peut pas créer un admin secret côté serveur.

Méthode simple :

1. Créer ton compte dans l'application.
2. Aller dans Firebase Console > Firestore Database.
3. Ouvrir `users/{ton_uid}`.
4. Changer le champ :

```txt
role = ADMIN
```

Après reconnexion, l'onglet **Admin** apparaît.


## Mise à jour design + OTP RDC/Kinshasa

Cette version contient une interface plus premium : écran de connexion retravaillé, fond dynamique, cartes glassmorphism, navigation plus propre et parcours OTP adapté à la RDC.

Le numéro peut être saisi en format local ou international. Exemples acceptés :

```txt
0812345678
812345678
243812345678
00243812345678
+243812345678
```

L’application convertit automatiquement le numéro en format Firebase :

```txt
+243812345678
```

Le guide détaillé est dans :

```txt
docs/OTP_RDC_KINSHASA.md
```

## Fonctionnalités incluses

- Connexion par email/mot de passe.
- Vérification email obligatoire.
- Connexion par numéro de téléphone/SMS Firebase.
- Profil utilisateur avec avatar.
- Liste des utilisateurs.
- Discussions privées.
- Groupes.
- Messages temps réel Firestore.
- Envoi d'images/fichiers via Firebase Storage.
- Messages chiffrés localement par PIN avec AES-GCM/PBKDF2.
- Statuts avec texte et média.
- Tableau admin pour utilisateurs/conversations/statuts.
- Thème clair/sombre et couleur principale.

## Limites assumées

Cette version supprime le backend Python/FastAPI. Les fonctions serveur avancées comme notifications push automatiques, modération serveur, paiement, tâches planifiées ou secrets backend nécessiteraient Firebase Cloud Functions ou un autre backend.

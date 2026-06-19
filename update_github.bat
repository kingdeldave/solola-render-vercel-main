@echo off
REM Script à lancer depuis la racine du projet après avoir remplacé les fichiers.
REM Il prépare un commit et pousse la version React + Firebase vers GitHub.

git status
git add .
git commit -m "Transform Solola to React Firebase Netlify"
git push
pause

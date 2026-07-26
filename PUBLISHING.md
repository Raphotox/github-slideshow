# Publier Atlas sur le Google Play Store

Guide pratique, dans l'ordre. L'app est une PWA (fichier unique + manifest + service worker) à empaqueter en **TWA** (Trusted Web Activity) — la voie recommandée par Google pour ce type d'app.

## 0. Ce qui est déjà prêt dans ce repo

- ✅ `atlas_MOBILE_v45_petitbac_glace_bilingue.html` — l'application, auditée et corrigée
- ✅ `atlas.webmanifest` — manifest PWA (nom, icônes, couleurs, `display: standalone`)
- ✅ `atlas-sw.js` — service worker (démarrage instantané + mise à jour en arrière-plan)
- ✅ `icons/` — icônes 192/512 + variantes *maskable* + apple-touch-icon
- ✅ `privacy.html` — politique de confidentialité + licences open source (URL exigée par Play Console)
- ✅ Polices embarquées (plus aucune requête Google Fonts), faux abonnement supprimé, placeholders purgés

## 1. Héberger en HTTPS

Le TWA exige un domaine HTTPS public servant ces fichiers.

Option simple : **GitHub Pages** de ce repo (une fois la branche fusionnée dans `master`) :
`https://raphotox.github.io/github-slideshow/atlas_MOBILE_v45_petitbac_glace_bilingue.html`

Option propre : un domaine dédié (ex. `atlas-monde.app`) — recommandé avant publication, car le
nom de domaine est visible et le package Android en dérive (`app.atlas-monde.twa`).

> Astuce : renommer le fichier en `index.html` (ou mettre une redirection) rend l'URL racine
> utilisable comme `start_url`. Si vous le faites, mettez à jour `start_url` dans
> `atlas.webmanifest` et la liste `SHELL` dans `atlas-sw.js`.

Vérifier ensuite avec Lighthouse (onglet PWA) : manifest détecté, SW actif, icônes OK.

## 2. Mettre à jour les métadonnées

Dans le HTML, remplacer les 3 occurrences de `https://REMPLACER-PAR-TON-DOMAINE.com/`
(`og:url`, `og:image`, `twitter:image`) par le domaine réel, et créer une image OG 1200×630.

## 3. Générer l'application Android (Bubblewrap)

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://VOTRE-DOMAINE/atlas.webmanifest
# répondre aux questions (package id, nom, couleurs — les défauts viennent du manifest)
bubblewrap build
# → app-release-signed.apk + app-release-bundle.aab
```

Alternative sans ligne de commande : [PWABuilder.com](https://www.pwabuilder.com) (coller l'URL, télécharger le package Android).

## 4. Digital Asset Links (supprime la barre d'URL)

1. Dans Play Console → *Configuration → Signature d'application*, copier l'empreinte **SHA-256**.
2. Compléter `assetlinks.example.json` (package + empreinte) et le publier à :
   `https://VOTRE-DOMAINE/.well-known/assetlinks.json`
   (sur GitHub Pages : créer le dossier `.well-known/` à la racine du site).
3. Vérifier avec l'outil « Statement List Generator and Tester » de Google.

## 5. Fiche Play Console

- **Politique de confidentialité** : URL publique de `privacy.html` (obligatoire).
- **Data safety (Sécurité des données)** : déclarer honnêtement —
  - Aucune donnée collectée ni partagée par l'app elle-même.
  - L'app contacte des services tiers (OWID, NASA, USGS, NOAA, Wikimedia, GDELT, Apple iTunes,
    YouTube, Hugging Face, jsDelivr, flagcdn) qui voient l'adresse IP : cocher « données
    traitées de façon éphémère » si le formulaire le demande ; pas de localisation, pas d'identifiants.
- **Classification du contenu (IARC)** : déclarer « contenu généré/tiers non modéré » (actualités
  temps réel) et références musicales — viser PEGI 12 plutôt que 3 ; ne pas déclarer « Tout public ».
- **Fonctionnalité IA locale** : le modèle (~370 Mo) n'est téléchargé qu'après consentement explicite
  dans l'app — le mentionner dans la description pour éviter toute surprise.

## 6. Reste à faire côté produit (non bloquant mais recommandé)

- [ ] Domaine + image OG définitifs (étape 2)
- [ ] Compléter les motifs de traduction dynamiques allemands (l'app est déjà 100 % utilisable en DE)
- [ ] Remplacer le hotlinking audio iTunes par l'API iTunes Search avec attribution, ou retirer
      l'audio du thème rap avant publication (risque CGU Apple)
- [ ] Captures d'écran Play Store (téléphone + tablette 7" et 10")

## 7. Cycle de mise à jour

Le service worker sert la version en cache et télécharge la nouvelle en arrière-plan : une mise à
jour du site est visible au **second** lancement. Pour forcer une mise à jour : incrémenter le nom
du cache (`atlas-shell-v1` → `v2`) dans `atlas-sw.js` en même temps que la nouvelle version, et
mettre à jour `RELEASE.id` dans le bloc notes de version de l'app (la fiche s'affichera une fois).

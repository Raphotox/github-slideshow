# Contrôle parental IA — Spécification produit & architecture technique

> **Statut** : v0.1 — document de cadrage (fondation avant développement)
> **Cible** : Android d'abord, marché français d'abord
> **Nature** : application de contrôle parental **transparente** (non cachée) pilotée par IA
> **Principe directeur** : *reprendre le contrôle en famille, sans ficher son enfant*

---

## 0. Résumé exécutif

L'idée est bonne et le marché est réel. Le contrôle parental pèse **~1,55–1,76 Md$ en 2025** et croît de **~10–12 %/an**. Le socle (temps d'écran, blocage d'apps, filtrage web, géoloc) est **banalisé et attaqué par le gratuit** (Google Family Link, Apple Screen Time) : impossible de gagner là-dessus. En revanche, **la couche « IA-first » est un espace blanc** : personne ne propose aujourd'hui le triptyque visé —

1. **agent conversationnel côté parent** (on définit les règles en parlant, pas en cochant 40 menus) ;
2. **mode simulation** (tester une règle avant de l'appliquer) ;
3. **boucle d'apprentissage** (quand le parent autorise une demande refusée, la politique s'affine).

Fenêtre d'avance estimée : **12–24 mois** avant que les gros (Google, Bark, Qustodio) n'ajoutent un LLM conversationnel.

**Contexte français = vent porteur immédiat.** La loi « majorité numérique à 15 ans » (votée le 22 juillet 2026, application 1er sept. 2026, désactivation des comptes existants au 1er janv. 2027) et le débat sur la vérification d'âge mettent la sensibilité parentale à son pic. Notre positionnement *privacy-first, sans collecte d'identité de l'enfant, transparent* est le contre-pied exact du stalkerware **et** de la vérification d'identité intrusive.

**Deux vérités techniques à assumer dès maintenant :**

- **« Invisible / indétectable » est mort-né.** C'est la définition du *stalkerware*, interdit sur le Play Store, et c'est ce qui a fait bloquer la demande initiale. On fait **« visible mais inviolable »** : l'enfant sait qu'un contrôle existe (notification persistante + icône), mais ne peut pas le contourner sans le code parent.
- **Aucun contrôle n'est inviolable à 100 %** sur Android grand public. Le seul vrai verrou est le mode **Device Owner**, qui impose une réinitialisation du téléphone enfant à l'installation. On vise donc **« résistant et dissuasif »**, complété par un *heartbeat* qui alerte le parent si l'agent est désactivé.

---

## 1. Vision & positionnement

| | |
|---|---|
| **Promesse** | Reprendre le contrôle des écrans **en famille**, sans surveiller ni ficher l'enfant. |
| **Ton de marque** | Complice du parent, respectueux de l'enfant, **jamais anxiogène** (ne pas vendre la peur comme les acteurs US). |
| **Anti-modèle** | mSpy / Eyezy (mouchards cachés, hors Play Store, fuites de données). On est **l'anti-mSpy**. |
| **Différenciateur défendable** | IA conversationnelle + simulation + boucle d'apprentissage + **non-collecte de l'historique**. |
| **Slogan de travail** | *« Vos règles. Pas de fichage. La paix à la maison. »* |

**Ce qu'on NE fait pas** (par conviction et par conformité) : pas de lecture des conversations/SMS, pas d'historique de navigation détaillé remonté au parent, pas de vocabulaire « espion / mouchard / caché », pas de tracking permanent d'un ado sans motif.

---

## 2. Marché & concurrence

### Taille & croissance
- Mondial : ~1,55–1,76 Md$ (2025) → ~4–4,9 Md$ (2034), CAGR ~10–12 %.
- Amérique du Nord dominante (~33,5 %). **Europe/France sous-pénétrées** = marge de croissance.

### Cartographie des concurrents

| Acteur | Modèle | Prix (indicatif) | Force | Faiblesse exploitable |
|---|---|---|---|---|
| **Google Family Link** | Gratuit, natif Android (compte supervisé) | 0 € | Intégration OS, anti-désinstallation via compte | Pas de filtrage de contenu généralisé, « lâche » l'ado, ergonomie basique, aucun contrôle des apps de messagerie tierces |
| **Qustodio** | Payant complet | ~43–76 €/an | Filtrage web, multi-appareils | Batterie, désinstallation possible par l'enfant, bugs |
| **Bark** (US) | Alertes IA (signaux de risque) | ~5–14 $/mois | Détection IA respectueuse (n'affiche pas tout) | Orienté US, localisation FR faible, pas d'agent conversationnel de config |
| **Canopy** | Filtrage image IA temps réel | ~10–16 $/mois | Floutage d'images explicites en direct | Centré nudité, pas de config par IA |
| **Norton Family / Kaspersky Safe Kids** | Bundles antivirus | ~15–50 $/an | Prix bas | Kaspersky = éditeur russe **banni US / restreint UE** → utilisateurs FR à récupérer |
| **Xooloo** (FR) | Payant « confiance/dialogue » | 2,99–6,99 €/mois | Aligné culture FR, reconnu Éducation nationale | Pas d'IA conversationnelle ni de simulation → **concurrent frontal à battre par l'IA** |
| **mSpy / Eyezy** | Stalkerware | — | — | **Hors Play Store, illégal/zone grise** — contre-modèle marketing |

### Où est l'IA aujourd'hui ?
Bark (classification ML de risques), Canopy (vision temps réel sur images), Qustodio (« alertes IA »). Ce sont des modèles de **détection/classification**, **pas** des LLM conversationnels de configuration. **Personne** ne propose config-en-langage-naturel + simulation + boucle d'apprentissage. → **C'est notre créneau.**

### Contexte réglementaire FR (tailwind)
- **Loi « majorité numérique 15 ans »** votée 22/07/2026 : interdiction de création de compte réseaux sociaux < 15 ans dès le 01/09/2026 ; désactivation des comptes existants au 01/01/2027 (« jeton d'âge anonymisé »).
- **Loi SREN** (n° 2024-449) + **référentiel ARCOM** : vérification d'âge « double anonymat » pour les sites porno (effectif depuis 11/01/2025) — **pas notre obligation**, mais un complément légitime que le législateur appelle de ses vœux.
- **Loi 2 mars 2022** : tout appareil connecté vendu en France doit proposer un contrôle parental (depuis 13/07/2024).

---

## 3. Différenciation produit

Trois piliers, aucun présent chez les concurrents réunis :

1. **Agent conversationnel côté parent.** Interface = un **chat**, pas un tableau de réglages. Le parent écrit *« pas de TikTok en semaine avant 17h et jamais après 21h »* → l'IA propose une règle structurée, la résume en clair, demande confirmation.
2. **Mode simulation.** Avant d'activer, le parent voit *« sur le téléphone de ton enfant, voici ce qui serait bloqué / autorisé »*, sur des exemples concrets. Argument de **confiance** unique.
3. **Boucle d'apprentissage.** Quand l'enfant conteste (« je trouve ça injuste ») et que le parent **autorise**, le système ajoute une règle/exception explicite **et** enregistre l'exemple pour affiner les décisions futures — **sans jamais réentraîner de modèle**.

---

## 4. Architecture système (vue d'ensemble)

```
┌────────────────────────┐         ┌────────────────────────┐
│   APP PARENT (Android)  │         │   APP ENFANT (Android)  │
│  « Centre de contrôle » │         │   Agent inviolable/     │
│                         │         │   visible               │
│  • Chat IA (règles)     │         │  • Notification persist. │
│  • Mode simulation      │◄──push──│  • Écran transparence   │
│  • Demandes d'accès     │  paire  │  • Moteur de règles     │
│  • Dashboard minimal    │────────►│    (déterministe, local)│
│                         │  règles │  • Cascade IA (3 étages)│
└───────────┬────────────┘  (JSON)  │  • Filtrage (VPN local) │
            │                        │  • Blocage apps         │
            │                        │  • Bouton « injuste »   │
            ▼                        └───────────┬────────────┘
   ┌─────────────────────┐                       │
   │   BACKEND (UE)      │◄──────heartbeat────────┘
   │  • Appairage        │       + demandes d'accès
   │  • Sync règles      │
   │  • LLM cloud (cas   │   ⚠ Ne stocke PAS l'historique
   │    ambigus, Haiku)  │      de navigation de l'enfant
   │  • Play Billing     │
   └─────────────────────┘
```

**Trois composants :**
- **App parent** — le produit visible, centré sur le chat IA.
- **App enfant** — l'agent d'exécution, transparent mais protégé.
- **Backend UE** — appairage, synchronisation des règles (JSON versionné), *heartbeat*, appels LLM cloud pour les cas ambigus, facturation. **Ne reçoit ni ne stocke l'historique de navigation.**

---

## 5. Architecture IA (le cœur)

**Principe cardinal : un appel LLM cloud à chaque URL n'est PAS viable** (latence 300 ms–2 s, coût, batterie, et surtout vie privée = constituer un historique serveur). L'évaluation doit être tranchée **localement** dans l'immense majorité des cas.

### Cascade hybride à 3 étages (sur le téléphone enfant)

| Étage | Rôle | Techno | Couverture visée |
|---|---|---|---|
| **0 — Règles + listes locales** | Horaires, catégories, allow/blocklist, base de domaines embarquée | Moteur déterministe, offline, ~1 ms | ~majorité du trafic |
| **1 — Classifieur on-device** | Catégoriser un domaine/contenu nouveau | ML Kit GenAI (Gemini Nano) si dispo, sinon **classifieur LiteRT/TFLite** embarqué | cas non couverts par l'étage 0 |
| **2 — LLM cloud** | Cas ambigus + explications | **Claude Haiku 4.5**, structured output `{catégorie, décision, confiance, explication}` | **< 10–15 %** du trafic |

- **Déclencheur d'escalade** = seuil de **confiance**, pas règle binaire. Chaque étage renvoie `{catégorie, confiance}`.
- **Cache local LRU** des verdicts par domaine → jamais deux fois la même évaluation.
- **Fail-safe réseau** : si le cloud est injoignable, appliquer la politique locale la plus prudente configurée par le parent (jamais « tout autoriser »).
- **Dégradation propre** : détecter AICore/Gemini Nano à l'exécution ; fallback LiteRT ; fallback cloud.

### Confidentialité par construction
- URL traitée **en mémoire puis jetée** ; on ne journalise (localement, agrégé) que **catégorie + verdict**.
- Vers le cloud : **jamais l'URL brute** — au pire domaine haché ou seulement catégories candidates.
- Côté enfant : ne persister qu'un **compteur agrégé par catégorie** (« 20 min jeux aujourd'hui »), pas la liste des sites.
- Côté parent : UI de catégories et de demandes ponctuelles, **jamais un historique**.

### Agent conversationnel parent (génération de règles)
- **Claude Sonnet 5** + **structured outputs** → émet le JSON du **schéma de règles** (versionné).
- **Prompt caching** sur les préfixes (schéma, instructions, règles courantes).
- On n'envoie au LLM **que les intentions du parent**, jamais de données de l'enfant.

### Mode simulation
- Moteur de règles = **fonction pure déterministe** `évaluer(règles, contexte_site) -> verdict`.
- Simulation = rejouer le **jeu de règles courant** contre un **corpus d'exemples étiquetés** (quelques centaines, embarqués + enrichis).
- Sonnet peut **générer des cas de test** à partir de l'intention du parent.
- **Crucial** : versionner le schéma de règles et garantir la **même version de moteur** côté enfant et en simulation.

### Boucle d'apprentissage (sans réentraînement)
Quand le parent autorise une demande refusée :
1. **Ajouter une règle/exception explicite** (allowlist domaine, « catégorie X autorisée le week-end ») — mécanisme principal, transparent, auditable, révocable.
2. **Enregistrer l'exemple few-shot** réinjecté dans le prompt cloud pour les futurs cas ambigus similaires (apprentissage *par contexte*, pas par poids).
3. **Préférences en JSON structuré** synchronisées parent → enfant, versionnées et *diffables*.

Cette **mémoire de règles** *est* le vrai « modèle » : instantané, explicable (droit à l'explication RGPD art. 22), sans dérive.

### Modèles Claude & coûts (ordre de grandeur, à valider par mesure)
- **Parent** : Claude Sonnet 5 (`claude-sonnet-5`) + structured outputs.
- **Cloud enfant** : Claude Haiku 4.5 (`claude-haiku-4-5`) — rapide, économique.
- Estimation : **~0,5–1,5 €/enfant/mois** avec prompt caching + cache local. **Levier économique n°1 du freemium = minimiser la part cloud.**

---

## 6. Technique Android — inviolabilité (visible mais protégé)

### Le seul vrai verrou : Device Owner
| Niveau | Ce qu'il permet | Verdict |
|---|---|---|
| **Device Admin API** (legacy, 2010) | Déprécié Android 9/10, ne bloque plus la désinstallation | ❌ Mort |
| **Profile Owner** | Gère seulement un *work profile* isolé | ❌ Inadapté (téléphone enfant global) |
| **Device Owner / fully managed** | `setUninstallBlocked()`, `DISALLOW_SAFE_BOOT`, `DISALLOW_FACTORY_RESET`, lock task, désactiver dual-apps | ✅ **La seule voie crédible** |

### Provisioning (la friction n°1)
Device Owner ne s'active **qu'à la configuration d'un appareil neuf ou après *factory reset*, AVANT tout compte Google**. Méthodes : QR code / token EMM (`afw#setup`), ou `adb shell dpm set-device-owner …` (câble + appli desktop de provisioning). → **L'onboarding assume une réinitialisation du téléphone enfant**, guidée pas-à-pas.

**Deux voies à trancher tôt :**
- **Android Management API** (backend Google + agent « Android Device Policy ») : rapide, mais **pensé entreprise** → dépendance + conditions d'usage familial à confirmer auprès de Google.
- **DPC maison** (Device Policy Controller natif avec `DevicePolicyManager`) : souverain, pas de dépendance EMM, **plus lourd** à construire.

### Parades anti-contournement (efficaces surtout en Device Owner)
| Contournement enfant | Parade |
|---|---|
| Safe mode | `DISALLOW_SAFE_BOOT` |
| Factory reset | `DISALLOW_FACTORY_RESET` + FRP (re-provisioning au reboot) |
| Effacer données / désactiver l'app | `setUninstallBlocked` + Device Owner |
| Dual apps / second utilisateur | `DISALLOW_ADD_USER`, `DISALLOW_USER_SWITCH` |
| Changer date/heure | `DISALLOW_CONFIG_DATE_TIME` + heure auto |
| Désactiver le VPN filtrant | `setAlwaysOnVpnPackage(lockdown=true)` |
| DNS custom / DoH | Private DNS verrouillé + blocage IP des résolveurs DoH |
| ADB / bootloader | `DISALLOW_DEBUGGING_FEATURES`, `DISALLOW_OEM_UNLOCK` |

### Limites HONNÊTES (à assumer contractuellement)
- **Sans Device Owner** (app installée simplement) : l'enfant peut désinstaller, forcer l'arrêt, effacer les données, entrer en safe mode. **Aucune protection fiable.**
- **Même avec Device Owner** : reset via recovery/boutons hardware possible selon OEM ; flash d'une ROM custom (bootloader déverrouillable) efface tout ; un **deuxième téléphone** non géré échappe à tout.
- **Message produit** : *« résistant et dissuasif »*, pas *« inviolable à 100 % »*.
- **Parade humaine** : un **heartbeat serveur** — si l'agent ne répond plus (safe mode, reset, app tuée), le parent reçoit une **alerte immédiate**. C'est la meilleure compensation aux failles techniques résiduelles.

---

## 7. Technique Android — filtrage temps réel

**Le MITM HTTPS est mort** sur appareil non-rooté (Android 7+ ne fait plus confiance aux CA « user » + certificate pinning). On **ne verra jamais l'URL complète ni le contenu de page au niveau réseau**. C'est pourquoi Qustodio/Bark **imposent un navigateur maison**.

### Architecture de filtrage en couches (défense en profondeur, sans MITM)
1. **VpnService LOCAL always-on** avec lockdown (aucun trafic hors tunnel). VPN 100 % sur l'appareil, pas de serveur distant.
2. **Résolveur DNS filtrant embarqué** (NXDOMAIN + catégories). Faible coût batterie.
3. **Blocage des IP/ports des résolveurs DoH/DoT connus** (liste type `hagezi/dns-blocklists`) pour re-forcer notre DNS.
4. **Filtrage par SNI** pour les domaines résiduels.
5. **Neutralisation d'ECH** en contrôlant la réponse DNS (retirer/refuser les clés ECH des records HTTPS/SVCB) → le navigateur retombe sur un ClientHello classique avec SNI en clair. *Ne tient que si l'on maîtrise totalement le DNS de l'appareil.*
6. **Navigateur maison** (WebView filtrée) pour le web fin ; blocage/whitelist des autres navigateurs.

### Menaces 2026 à connaître
- **ECH (Encrypted Client Hello)** : chiffre le SNI (déployé Chrome/Cloudflare/Firefox). Gérable seulement via contrôle DNS.
- **DoH** (port 443, indistinguable du HTTPS) : contourne le DNS système. Nécessite le blocage par liste d'IP.
- **QUIC/HTTP3** (UDP/443) : complique le filtrage → option **bloquer QUIC** pour forcer TCP/TLS où le SNI reste exploitable.

### Blocage des applications (vs sites)
- **`UsageStatsManager.queryEvents()`** (fenêtre glissante ~10 s, polling ~700 ms) pour détecter l'app au premier plan + **overlay plein écran** (`SYSTEM_ALERT_WINDOW`) qui masque l'app interdite. Garder la dernière valeur connue en cache (queryEvents peut renvoyer vide).
- Plus robuste : blocage/masquage au niveau système via **Device Owner / DPC**.

### AccessibilityService — à éviter au MVP
Puissant (lire l'écran, l'URL du navigateur) **mais politique Play Store très restrictive** (maj 30/10/2025 : plus d'actions autonomes, déclaration + *prominent disclosure* + consentement obligatoires). **Red flag de review majeur.** → Hors MVP ; si utilisé plus tard, déclaré honnêtement avec plan B.

---

## 8. Conformité (Play Store + RGPD/CNIL)

### Google Play — anti-stalkerware (motif de rejet n°1)
Le monitoring n'est autorisé que *« exclusively designed and marketed for parents to monitor their children »*. Exigences **cumulatives, non négociables** :
1. Déclarer le flag `isMonitoringTool` (`value="child_monitoring"`) dans le manifest de **tous** les builds/tracks.
2. **Notification persistante** en permanence quand l'app tourne.
3. **Icône unique** clairement identifiable.
4. Divulguer la surveillance dans la description Play Store.
5. **Jamais** de vocabulaire « espion / caché » ; pas de mode dissimulé.

→ Notre design transparent **coche déjà ces cases**. L'anti-désinstallation est permise **si activée par un parent via une app de contrôle parental**.

Autres points : ne **pas** déclarer l'app enfant « primarily child-directed » (sinon contraintes *Families Policy*) → audience = **parents/adultes**. Chaque permission sensible (VpnService, Device Admin, `QUERY_ALL_PACKAGES`, usage stats, localisation) exige une **justification dédiée** dans le formulaire Play Console. **Data Safety** strictement cohérente avec le comportement réel (incohérence = suspension).

### RGPD / CNIL
- **Base légale = exercice de l'autorité parentale** (protection de l'enfant), **PAS le consentement du mineur**. → contourne le blocage « majorité numérique 15 ans » (qui vise les traitements fondés sur le consentement).
- Rôles à formaliser : **parent = responsable de traitement**, éditeur = **sous-traitant** (ou co-responsabilité) + **DPA/CGU** clairs.
- **AIPD** (analyse d'impact) obligatoire (données de mineurs à grande échelle) ; **registre** ; y inscrire la **non-collecte de l'historique** comme mesure de minimisation.
- **CNIL Reco 5 (2024)** : proportionnalité selon l'âge, non-intrusivité. → catégories/règles plutôt que lecture de contenu ; **granularité décroissante avec l'âge**.
- **15–17 ans** : surveillance légale mais proportionnée à un **risque réel** + **accord de l'ado** → mode plus léger, info renforcée, co-décision intégrée.
- **IA + mineurs** : garder le **parent dans la boucle** (human-in-the-loop, déjà le cas via « demande d'accès → validation ») ; minimiser les données envoyées au LLM ; hébergement **UE** ; attention **AI Act** (2025-2027).

---

## 9. UX

### Onboarding (< 10 min, parents non-techniques)
1. Parent installe l'app « centre de contrôle », crée le compte famille, répond à **3-4 questions** à l'IA (âge, préoccupations, philosophie souple/stricte) → l'IA génère un **pack de règles par défaut**.
2. L'app génère un **QR code d'appairage**.
3. Sur le tel enfant : installer l'app enfant (Play Store), scanner le QR → appareils liés.
4. Permissions demandées **une par une**, avec explication en langage clair + écran de transparence + notification persistante.
5. **MVP** : API standards + notification persistante (pas de reset). **V2** : provisioning Device Owner renforcé (avec reset).

### App parent — le chat IA est le cœur
- Interface principale = **chat**. Le parent parle, l'IA propose une règle structurée, la résume, demande confirmation.
- **Dashboard minimal délibérément** (anti-fichage) : cartes de haut niveau (« 3 demandes en attente », « temps d'écran vs objectif », « règles actives »), **pas de timeline** d'activité.
- **Simulation** avant activation.
- **Demandes d'accès** : push → contexte + boutons *Autoriser* (une fois / toujours / créneau) / *Refuser* avec message. Chaque « Autoriser toujours » alimente la boucle d'apprentissage.

### App enfant — transparence + agentivité
- **Écran d'accueil de transparence** : « Tes parents ont mis en place des règles avec [nom]. Voici ce qui est en place et pourquoi. »
- **Blocage bienveillant, jamais punitif** : « YouTube est en pause jusqu'à 17h. Tu veux demander une exception ? »
- **Bouton « Je trouve ça injuste »** : l'enfant écrit sa raison, l'IA l'aide à formuler une demande claire, l'envoie au parent → transforme la frustration en **dialogue**.
- **Aucune donnée cachée à l'enfant** : il voit exactement ce que le parent voit de lui.

---

## 10. Modèle économique

- **Freemium** : essai **1 mois** via Google Play (**sans CB préalable** → moins de friction et de litiges).
- **Tarif par FAMILLE** (enfants illimités), pas par enfant — attente française post-Family Link gratuit.
- **Prix cible** : **4,99 €/mois** ou **39,99 €/an** (annuel ≈ 2 mois offerts). Rester bas car le concurrent de référence est **gratuit**.
- **Gratuit** : 1 enfant, règles de base via IA, temps d'écran, blocage par app, demandes d'accès limitées, transparence enfant.
- **Payant** : enfants illimités, mode simulation, boucle d'apprentissage avancée, plannings fins, filtrage web/contenu, demandes illimitées, rapports hebdo de haut niveau.
- **Google Play Billing obligatoire** pour l'abo (pas de Stripe sur Android) : **15 %** de commission (Small Business Program ≤ 1 M$/an) → reste ~**4,24 €** sur 4,99 €. TVA FR (20 %) collectée/reversée par Google.
- **S'inscrire au Small Business Program dès le départ.**

### Noms candidats (à vérifier INPI / domaine / package / réseaux)
*Balise · Repère · Cap · Alliance · Boussole · Palier · Ondes.* Éviter tout terme « monitor/track/spy » et tout nom infantilisant.

---

## 11. Roadmap

| Phase | Contenu | Objectif |
|---|---|---|
| **Prototype** (6-8 sem.) | App parent (chat IA → règles temps d'écran + allowlist apps), appairage QR, app enfant (transparence + notif persistante + blocage apps via API standards + bouton « demander »), boucle demande/réponse en push. **1 seul type de règle bien fait.** | Démontrable |
| **MVP** (3-5 mois) | Le prototype durci + test sur **5-10 familles réelles**. **Hors MVP** : filtrage web profond, géoloc, Accessibility, Device Owner/reset, iOS. | Publiable Play Store |
| **V1.1** | Mode simulation, boucle d'apprentissage (« Autoriser toujours » → règle), plannings fins | Différenciation IA complète |
| **V1.2** | Filtrage web/contenu par catégorie (VpnService + navigateur maison), rapports hebdo | Parité fonctionnelle |
| **V2** | Provisioning renforcé (Device Owner), géoloc opt-in, iOS | Robustesse + expansion |

**Métriques de succès du MVP** : taux d'onboarding réussi < 10 min, usage du bouton « demander une exception », conversion après le mois d'essai.

---

## 12. Risques & limites (honnêtes)

- **Concurrence gratuite forte** (Family Link) : disposition à payer faible → la valeur doit venir de l'IA, pas du volume de features. Risque d'échec du passage payant.
- **Rejet Play Store** si l'app ressemble à du stalkerware (flag manquant, notif masquable, marketing ambigu) ou si permissions sensibles mal justifiées. **Prévoir plusieurs allers-retours de review.**
- **Friction Device Owner** (reset usine) = risque n°1 d'abandon → repoussé en V2.
- **Coût/latence LLM** : danger direct pour le freemium si la cascade est mal calibrée.
- **Limites techniques dures** : bootloader déverrouillable, deuxième appareil non géré, ECH/DoH.
- **Dépendance Android Management API** (conditions entreprise) à confirmer.
- **Risque réputationnel** (débat surveillance des ados) → transparence + boucle parentale comme réponse.

---

## 13. Décisions à trancher maintenant

1. **Device Owner dès le MVP** (robuste mais friction reset) **ou** app standard (simple mais contournable) ?
2. **Android Management API** (rapide, dépendance Google) **ou** **DPC maison** (souverain, lourd) ?
3. **Tranche d'âge prioritaire** : 8-12 ans (contrôle accepté) ou 13-15 ans (là où Family Link lâche, mais l'ado résiste) ?
4. **LLM parent** : on-device (confidentialité max, modèles limités) ou serveur UE (plus puissant) ?
5. **Complémentarité Family Link** (socle compte) + notre couche IA, ou tout reconstruire ?
6. **Nom** : vérifier disponibilité (INPI, .fr, package Play, réseaux) avant tout marketing.

---

## 14. Prochaines étapes proposées

1. Valider les **6 décisions** ci-dessus (au moins Device Owner vs standard, et tranche d'âge).
2. **Échafauder le projet Android** : structure multi-modules (app parent, app enfant, backend), schéma de règles JSON versionné, squelette du moteur de règles déterministe.
3. Construire le **prototype** (chat IA → règles + appairage QR + blocage apps + bouton « demander »).
4. Tester sur **de vrais téléphones Android**.

---

*Document de cadrage — sources : recherche multi-dimensions (marché, technique Android, IA, droit FR/RGPD, Play Store, produit/business), 2025-2026. À faire relire par un juriste RGPD avant lancement commercial.*

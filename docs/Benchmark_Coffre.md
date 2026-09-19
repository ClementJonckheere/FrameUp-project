# Mesure du coffre et décision KDF — G0 ouvert

19 septembre 2026. **Aucune mesure sur appareil cible disponible ; aucun arbitrage final inventé.** Le POC v1 reste PBKDF2-SHA256/600k. Argon2id était une cible proposée dans la spécification, pas l'algorithme exécuté. La spécification est corrigée pour distinguer ces deux états.

## Protocole prêt à exécuter

Sur le plus lent des appareils physiques desktop que Clément retient pour J0-Web, utiliser le navigateur installé et renseigner modèle, processeur, RAM, OS, version exacte du navigateur et conditions d'alimentation. L'appareil et le budget de latence n'étaient pas encore identifiés dans le projet. Une CI, une VM ou un CPU artificiellement ralenti ne remplace pas cette mesure. Le mobile reste hors de cette clôture.

Depuis la branche `codex/j0-browser-matrix`, Node ≥22 installé :

```sh
npm ci
npm run benchmark:build
npm run serve
```

Ouvrir `http://127.0.0.1:4173/benchmark.html`. Ce build n'exige ni Rust ni compilation OpenMLS. Conserver l'onglet visible ; faire la mesure sans throttling DevTools. Exporter le JSON. Répéter dans Firefox et Chromium sur cet appareil, avec les conditions notées ; relever le pic mémoire du processus via l'outil de l'OS si possible. Une session interrompue/masquée doit être répétée.

## Comparaison

- PBKDF2-SHA256, 600 000 itérations via WebCrypto, exactement `passwordKey()` du POC.
- Argon2id v1.3, m=65 536 Kio, t=3, p=4, sortie 32 octets, via hash-wasm 4.12.0 (WASM local, pas de CDN). Ce candidat reprend la seconde configuration de la [RFC 9106, section 4](https://www.rfc-editor.org/rfc/rfc9106.html#section-4). Quatre lanes ne signifient pas quatre workers JS.
- Pour les deux : sel aléatoire 16 octets, même passphrase fictive, même clair JSON de 1 Mio plus en-tête, AES-256-GCM et écriture/lecture IndexedDB identiques. Première invocation séparée puis 10 répétitions, ordre alterné pour limiter le biais de chauffe.
- Chronométrage KDF, chiffrement, transaction d'écriture et déverrouillage (ouverture DB, lecture, KDF, déchiffrement et vérification). Dix essais du véritable Vault PBKDF2 mesurent aussi création, ouverture et begin/commit. Le comparateur Argon2 ne modifie pas le format du coffre existant.
- Travail dans un Worker. Échantillons bruts, médiane, p95 empirique (10 essais : proche du maximum), erreurs, délai maximal du timer UI, versions et SHA-256 des sources/bundles exportés. Le premier essai inclut l'initialisation KDF mais exclut téléchargement et démarrage de page/worker ; ce n'est pas une mesure complète du démarrage de l'application.
- 64 Mio est la mémoire configurée d'Argon2, **pas le pic RSS mesuré**. L'API navigateur n'expose pas de pic portable fiable ; champ manuel et valeur manquante explicites. La passphrase et les clés ne sont pas exportées. Un abandon peut laisser uniquement des bases fictives avec préfixe benchmark ; pas de coffre utilisateur touché.

## Règle d'arbitrage à appliquer aux mesures

Budget de travail proposé pour le POC : déverrouillage p95 ≤2 s avec le clair de 1 Mio, pas d'erreur/OOM et délai UI maximal ≤100 ms en onglet visible. Ces seuils sont des critères d'essai explicites, pas des exigences produit déjà acceptées. Le snapshot réel maximal reste à dimensionner avant pilote.

1. Si Argon2id tient le budget sur la cible, le retenir pour la suite avec paramètres et référence de mesures. Prévoir un nouveau format de coffre et une migration testée ; ne pas changer silencieusement le sens de format=1.
2. Si seul PBKDF2 tient le budget, documenter le compromis de résistance aux attaques hors ligne avant de le retenir ; ne pas conclure que le KDF le plus rapide est le plus sûr. Examiner aussi le coût de l'implémentation Argon2 choisie.
3. Si aucun candidat ne tient le budget, ou si la mesure n'est pas représentative, G0 reste ouvert ; aucun abaissement automatique des paramètres.

La décision finale doit enregistrer appareil, navigateur, SHA du benchmark, rapport brut, paramètres retenus, latence, mémoire observée ou non mesurable, limites et décisionnaire/date. **Champ décision : EN ATTENTE DE MESURE CIBLE.** L'acceptation des contrats ADR-011 ne ferme pas ce sous-point.

La documentation de l'[implémentation hash-wasm](https://github.com/Daninet/hash-wasm) définit notamment memorySize en Kio et la sortie binaire. Son emploi dans cet outil de comparaison ne constitue pas une adoption auditée dans le produit.

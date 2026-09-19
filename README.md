# FrameUp

FrameUp vise un espace collaboratif chiffré avec un client web et une application mobile. Le dépôt préparé contient aujourd'hui le **harnais cryptographique J0**, les décisions d'architecture et les scénarios ; l'application métier et le client mobile ne sont pas encore implémentés.

## État du jalon

- Matrice de référence CI du 19 septembre 2026 : 38 entrées PASS, 0 FAIL, 0 BLOCKED (Chromium/Chromium, Firefox/Firefox, Chromium/Firefox et deux suites identité/récupération).
- Tests unitaires de référence : 4 PASS. Versions, OS, commit réellement exécuté et empreinte WASM [archivés](reports/reference/ci-35442939182/provenance.json).
- Contrats POC : ADR-003/005/006/010/011 acceptés dans leur périmètre limité ; [formats, ancres, sérialisation et limites](docs/Contrats_POC_J0.md).
- **G0 reste ouvert : mesure sur appareil physique cible et arbitrage KDF manquants.** [Benchmark prêt à exécuter](docs/Benchmark_Coffre.md), sans Rust : `npm ci`, `npm run benchmark:build`, `npm run serve`, puis `/benchmark.html`.
- Application mobile : exigence confirmée ; route du pilote ouverte (PWA, WebView ou natif). Aucun chantier mobile avant clôture J0-Web ; Android/iOS restent une hypothèse de cible.

**J0 reste ouvert.** Les preuves desktop ne valent pas validation de l'application mobile.

## Construire et exécuter

Prérequis : Node.js 22 ou ultérieur, npm, Rust installé via rustup. Le projet fixe Rust 1.98.1 et wasm-bindgen 0.2.128. Depuis la racine, dans Bash ou PowerShell :

```sh
npm ci
rustup show
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.128 --locked
npm run build
npx playwright install --only-shell chromium firefox
npm run test:unit
npm test
```

Sur un runner Linux adapté, `npx playwright install --with-deps --only-shell chromium firefox` installe aussi les bibliothèques système nécessaires. `cargo` et `wasm-bindgen` doivent être dans le PATH. Le dépôt source ne contient pas les navigateurs, le WASM précompilé ou les profils de test ; la construction les prépare localement.

Le test démarre son serveur sur `127.0.0.1:4173`. Ne pas lancer `npm run serve` en parallèle sur ce port. Les résultats sont écrits dans `reports/j0-results.json`. Un FAIL ou BLOCKED entraîne un code de sortie non nul. Les profils fictifs sont recréés dans `test-profiles/`, sans utiliser les profils personnels.

Après construction, `npm run serve` ouvre la page du harnais sur `http://127.0.0.1:4173`. Cette page est pilotée par les tests ; ce n'est pas une interface utilisateur de FrameUp.

## Organisation

| Chemin | Rôle |
| --- | --- |
| `mls/` | Adaptateur Rust/OpenMLS compilé en WASM pour le harnais desktop. |
| `web/` | WebCrypto, coffre IndexedDB et API de test. |
| `scripts/run-tests.mjs` | Matrice Chromium/Chromium, Firefox/Firefox et Chromium/Firefox. |
| `tests/` | Tests unitaires de support. |
| `.github/workflows/j0.yml` | Construction et exécution de la matrice sur Ubuntu, avec rapports conservés en artefacts. |
| `docs/` | Architecture, charte, scénarios et historique des décisions. |
| `docs/ADR-016_Application_mobile.md` | Révision 0.2 : alternatives, capacité, gates et natif conditionnel. |
| `docs/Matrice_J0_mobile.md` | Backlog conditionnel : M01–M03 puis M04/M05/M08 si route native retenue ; autres scénarios différés. |
| `docs/Integration_GitHub.md` | État du dépôt, erreur d'accès et intégration prévue. |

Les dépendances résolues sont figées par `package-lock.json` et `mls/Cargo.lock`. Playwright 1.55.1 cible les binaires Chromium 140.0.7339.186 et Firefox 141.0. C'est une base reproductible, pas une validation des versions stables actuelles.

## Documents de référence

Lire `docs/Architecture_J0.md` pour les limites concrètes de cette implémentation. `docs/Rapport_J0.md` décrit la référence CI et le gate actuel ; les résultats locaux antérieurs sont conservés dans `docs/history/`. Les noms v0.1 sont conservés pour les liens ; le registre ADR contient les acceptations datées du 19 septembre. ADR-016 remplace explicitement l’exclusion du mobile à l’échelle du produit, tout en maintenant J0-Web comme validation initiale desktop. Le schéma `docs/Sequencage_FrameUp.svg` résume les gates.

Les clés d'identité et de wrapping des archives sont séparées par usage, mais dérivent du même kit racine. Le coffre protège les secrets au repos ; le POC ne garantit pas une protection contre du code client compromis, un rollback complet du profil ou une coupure électrique. Le contrôle d'autorisation métier reste à coupler aux opérations MLS avant le pilote.

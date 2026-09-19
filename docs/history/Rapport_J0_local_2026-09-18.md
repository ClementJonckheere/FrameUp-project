# FrameUp — Rapport J0, POC cryptographique v0.1

Date : 18 septembre 2026. **Verdict : faisabilité démontrée sur Chromium pour les scénarios exécutés ; J0 reste ouvert.**

Le harnais intègre réellement OpenMLS en WebAssembly, WebCrypto et IndexedDB. Il comprend des profils d’appareils distincts, des enveloppes chiffrées, des politiques et certificats signés, une récupération par kit et une injection de pannes aux frontières de persistance. Il ne contient pas encore le backend métier de FrameUp.

## Relance de la matrice

Une nouvelle exécution le 18 septembre 2026, de 14:26:35 à 14:26:58 UTC, confirme 13 PASS, 0 FAIL et 3 BLOCKED. Le blocage Firefox reste reproductible dans cet environnement. Les tests unitaires n’ont pas été relancés : leurs résultats conservés proviennent de la première exécution, et les sources testées sont inchangées. Aucun run GitHub Actions n’a été lancé ; aucun dépôt FrameUp n’a été identifié dans les dépôts accessibles. Le workflow est prêt dans l’archive, mais le dépôt cible doit être précisé. L’ancien résultat navigateur est conservé dans `reports/history/j0-results-initial.json`.

## Résultats constatés

| Ensemble | Résultat | Portée exacte |
| --- | --- | --- |
| Identité/récupération sous Chromium | Réussi | 20 contrôles regroupés dans une entrée du rapport. |
| MLS, coffre et pannes Chromium/Chromium | Réussi | 12 scénarios, dont ajout, retrait, redémarrage, doublons et file persistée. |
| Tests unitaires Node | Réussi | 4 tests de support. |
| Identité/récupération sous Firefox | Bloqué | Initialisation du contexte interrompue après 20 s ; aucune validation cryptographique Firefox. |
| MLS Firefox/Firefox | Non exécuté | Dépend du navigateur bloqué. |
| MLS Chromium/Firefox | Non exécuté | Dépend du navigateur bloqué. |

Le fichier JSON compte **13 PASS, 0 FAIL et 3 BLOCKED**. Les 20 contrôles internes ne sont pas 20 entrées supplémentaires. Les trois BLOCKED représentent une indisponibilité de navigateur et deux combinaisons dépendantes, pas seulement trois assertions restantes. La commande retourne volontairement un code d’échec tant que cette matrice est incomplète.

Le journal Firefox contient notamment `Sandbox: writing /proc/self/uid_map: EPERM`. Le processus Firefox peut démarrer, mais le contexte de test n’aboutit pas. Ce résultat ne permet pas de conclure à une incompatibilité d’OpenMLS avec Firefox. Le rapport conserve l’erreur de lancement. Aucune exécution à distance du workflow CI n’a été effectuée.

## Preuves utiles pour la décision

- **Échange réel et persistance :** deux appareils échangent dans les deux sens, puis reprennent après fermeture complète du contexte et rechargement de l’état chiffré depuis le même profil.
- **Ajout d’appareil :** le commit et le Welcome sont persistés avant livraison ; une panne injectée suivie d’un redémarrage permet de terminer l’ajout sans cloner la session du nouvel appareil.
- **Retrait :** le nouveau ciphertext est remis directement à l’appareil exclu, sans protection par le relais. OpenMLS le refuse avec `ValidationError(WrongEpoch)`, tandis que le membre conservé le déchiffre.
- **Altération :** un ciphertext modifié est rejeté avec `ValidationError(UnableToDecrypt(AeadError))`.
- **Coffre incertain :** une panne injectée après mutation mais avant persistance conduit à `RECOVERY_REQUIRED`. Le code refuse de réutiliser automatiquement l’ancien état.
- **Identité et archives :** bon kit, mauvais kit, usages de dérivation distincts, signature de politique, empreinte attendue, certificat d’appareil et clé MLS réelle sont vérifiés. La restauration d’une clé d’archive permet de déchiffrer un document fictif exact.

Une erreur trouvée pendant les essais a été corrigée : l’empreinte SPKI requiert une clé publique exportable. La clé publique est désormais importée avec cette capacité ; la correction ne rend pas les clés privées exportables par cette opération. Les résultats joints correspondent à l’exécution après correction.

## Décisions expérimentales consignées

| Sujet | Choix du POC | Conséquence |
| --- | --- | --- |
| MLS | OpenMLS 0.9.0, RustCrypto 0.6.0, X25519/AES-128-GCM/SHA-256/Ed25519 | État interne lié aux versions verrouillées. |
| Identité et signatures applicatives | ECDSA P-256 ; empreinte SHA-256 du SPKI | Distinct des clés de signature MLS. |
| Coffre local | AES-256-GCM ; PBKDF2-SHA256, 600 000 itérations, sel aléatoire | Paramètres expérimentaux ; coût et robustesse sur matériel cible non mesurés. |
| Kit | 24 mots anglais BIP39 encodant 256 bits d’entropie | Pas de dérivation de portefeuille ni de chiffrement direct des fichiers par les mots. |
| Séparation de récupération | HKDF avec domaines `identity-wrap` et `archives-wrap` | Clés distinctes mais une racine commune : vol du kit + blobs = exposition des deux usages. |
| Reprise | Web Lock, marqueur dirty, transaction chiffrée et file sortante | Résistance aux exceptions injectées démontrée ; coupure électrique non testée. |

Le kit doit être accompagné des paquets nécessaires. Récupérer l’identité n’accorde pas automatiquement une appartenance actuelle au projet. Le contrôle REC-09 vérifie seulement cette règle sur une politique locale authentifiée ; il ne démontre pas une procédure serveur de récupération et de réadmission.

## Points ouverts et ordre de travail

| Priorité | Travail restant | Preuve attendue |
| --- | --- | --- |
| Avant clôture J0 | Exécuter Firefox et la matrice mixte sur un poste/runner compatible. | Rapport complet sans FAIL/BLOCKED, avec versions et empreinte WASM. |
| Avant clôture J0 | Revoir formats, trust anchors, sérialisation et limites de persistance ; mesurer le coffre sur matériel cible. | Décisions documentées et acceptation explicite des limites du POC. |
| Avant pilote | Distinguer entrée invalide sans mutation et état réellement incertain. | Un message malformé ne doit pas imposer inutilement la récupération de l’appareil. |
| J1 / accès | Rendre obligatoire le contrôle de politique/certificat à l’admission ; délégation quotidienne du propriétaire, expirations et défis d’origine. | Une tentative non autorisée échoue avant toute modification du groupe. |
| J1–J4 / récupération | Génération atomique côté serveur, révocation d’anciennes sessions, nouvel appareil, propriétaire récupéré et réadmission explicite. | Scénarios métier complets de récupération, dont ancien membre exclu. |
| J4 / persistance | Arrêts brutaux, durabilité disque, rollback et checkpoints externes. | Preuve de non-réutilisation d’état ou remise en état sûre après chaque frontière de panne. |
| Avant mise en service | Navigateurs cibles actualisés, dépendances et revue de sécurité indépendante. | Validation de la combinaison effectivement déployée. |

Les clés privées existent en mémoire JS/WASM ; le chiffrement au repos ne protège pas contre un code client malveillant. La conservation d’archives n’efface pas les anciennes copies des membres retirés. Les APIs de laboratoire ne sont pas des interfaces de production.

## Reproduction et livrables

L’archive `FrameUp_J0_Harness_v0.1.zip` contient sources Rust/JavaScript, lockfiles, WASM et page compilés, documentation technique, scénarios, workflow CI, inventaire de dépendances et notices. Les profils navigateur, secrets aléatoires générés pendant les tests, caches et toolchains sont exclus. Le mot de passe fictif du harnais reste explicitement présent dans les sources.

Après décompression, ouvrir un terminal dans `frameup-j0` :

```sh
npm ci
npx playwright install --only-shell chromium firefox
npm run test:unit
npm test
```

Le README détaille la reconstruction du WASM et les prérequis Linux/Windows. `reports/reference/j0-results.json` et `reports/reference/unit-results.tap` conservent les preuves de cette livraison. Une nouvelle exécution écrit les résultats courants sans modifier ces références.

## Traçabilité de l’exécution

- Début UTC : `2026-09-18T14:26:35.771Z`.
- Fin UTC : `2026-09-18T14:26:58.729Z`.
- Node : `v24.19.0` ; plateforme : `linux` ; Playwright : `1.55.1`.
- Navigateur effectivement testé : Chromium Headless Shell 140.0.7339.186. Firefox ciblé : 141.0, sans exécution de ses scénarios.
- SHA-256 du module WASM exécuté : `1b9c53a6a1ccfb2f04e215e39bd848ee07c7a77d5b412659c8a385fb86139604`.

### Détail des entrées du rapport

| Identifiant | Statut | Durée du scénario (ms) |
| --- | --- | --- |
| `chromium/identity-recovery` | PASS | 23 |
| `firefox/browser` | BLOCKED | — |
| `chromium-chromium/MLS-01-join` | PASS | 482 |
| `chromium-chromium/MLS-02-exchange` | PASS | 29 |
| `chromium-chromium/VAULT-01-ciphertext-at-rest` | PASS | 3 |
| `chromium-chromium/VAULT-02-second-tab` | PASS | 50 |
| `chromium-chromium/MLS-03-browser-restart` | PASS | 229 |
| `chromium-chromium/MLS-04-out-of-order-and-replay` | PASS | 23 |
| `chromium-chromium/FAULT-01-durable-outbox` | PASS | 238 |
| `chromium-chromium/MLS-05-add-second-device` | PASS | 534 |
| `chromium-chromium/MLS-06-removal-cryptographic` | PASS | 44 |
| `chromium-chromium/MLS-07-tampered-ciphertext` | PASS | 9 |
| `chromium-chromium/FAULT-02-dirty-state-after-operation` | PASS | 331 |
| `chromium-chromium/VAULT-03-wrong-passphrase` | PASS | 374 |
| `firefox-firefox/MLS` | BLOCKED | — |
| `chromium-firefox/MLS` | BLOCKED | — |

Les durées servent à la traçabilité ; elles ne constituent pas un benchmark sur matériel représentatif.

### Références techniques

La documentation OpenMLS indique que la cible WASM est compilée mais non testée par sa CI amont : [OpenMLS Book](https://book.openmls.tech/). Cela justifie la validation spécifique dans les navigateurs. Les binaires utilisés sont liés à la version de Playwright : [Navigateurs Playwright](https://playwright.dev/docs/browsers). Le format des mots suit l’encodage de l’entropie de [BIP39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki).

# FrameUp — Rapport J0 v0.2

19 septembre 2026. **Matrice navigateur verte ; G0 encore ouvert pour mesure physique du coffre et arbitrage KDF.** Ce rapport remplace l'état courant v0.1 ; le [rapport local du 18 septembre](history/Rapport_J0_local_2026-09-18.md) reste conservé.

## Référence exécutée et provenance

[Run GitHub Actions 35442939182](https://github.com/ClementJonckheere/FrameUp-project/actions/runs/35442939182), tentative 1, job 105896817978, succès. Fenêtre de la matrice : `2026-09-19T12:30:56.133Z` → `2026-09-19T12:31:25.505Z`.

| Élément | Valeur vérifiée |
| --- | --- |
| Branche de la PR | `8b64559df2c171b93370ebbe3cc371a0dc9bb310` |
| Checkout réellement exécuté | `671dc8fd5d174b8181cd9113b341e1c2bf366e09` — fusion temporaire `refs/pull/1/merge` |
| Base main | `c2f36e2ec3674dc793b1186e253209ea0b3de050` |
| Arbre testé | `6ff0e610682a29b9ae19999ce685864eeb20ab5e` — identique à l'arbre de la branche |
| OS | Ubuntu 24.04.5 LTS, x64, runner hébergé GitHub |
| Image / runner | ubuntu-24.04, image `20260907.300.1`, runner `2.337.0` |
| Conteneur | Aucun conteneur de job déclaré ; pas de digest Docker à attribuer |
| Firefox | **141.0**, build Playwright **1490**, binaire firefox-ubuntu-24.04, headless |
| Chromium | Headless Shell **140.0.7339.186** |
| Toolchain | Node 24.20.0 ; Rust 1.98.1 ; Playwright 1.55.1 ; OpenMLS 0.9.0 ; wasm-bindgen 0.2.128 |
| SHA-256 WASM exécuté | `032e6221a9fc389aa2c87cd22c9773ac3f22df7a9337dd39b8837c0e8651e6c9` |

Sources conservées dans le dépôt : [provenance JSON](../reports/reference/ci-35442939182/provenance.json), [rapport navigateur intégral](../reports/reference/ci-35442939182/j0-results.json), [extraits datés des logs](../reports/reference/ci-35442939182/log-excerpts.txt). Le JSON est extrait de la sortie du rapport dans les logs du job, sans réexécution ni synthèse de résultats. La version du noyau n'était pas enregistrée ; elle n'est pas inventée. L'empreinte identifie le WASM testé, sans preuve de reproductibilité binaire.

[Artefact original](https://github.com/ClementJonckheere/FrameUp-project/actions/runs/35442939182/artifacts/10584139557), SHA-256 ZIP `bdb687179a7d90bb897c78254f460c30dbaa3c432a0edd6ea6f92fd163a100a4`, expiration annoncée 18 décembre 2026. Les références textuelles versionnées ci-dessus restent disponibles après cette expiration. L'image du runner est documentée par le [manifest GitHub](https://github.com/actions/runner-images/blob/ubuntu24/20260907.300/images/ubuntu/Ubuntu2404-Readme.md).

## Résultats

| Ensemble | Résultat |
| --- | --- |
| Chromium/Chromium | 12 PASS |
| Firefox/Firefox | 12 PASS |
| Chromium/Firefox | 12 PASS |
| Identité/récupération Chromium | 1 suite PASS, 20 contrôles internes |
| Identité/récupération Firefox | 1 suite PASS, 20 contrôles internes |
| Tests unitaires, séparément | 4 PASS |

Rapport navigateur : **38 entrées PASS, 0 FAIL, 0 BLOCKED**. Chaque suite de 20 contrôles compte comme une seule entrée. Retrait négatif : WrongEpoch ; altération : AeadError. Réouverture du coffre et reprise de l'état MLS passent. Les timings de CI ne sont pas une mesure sur matériel cible.

Cette référence se rapporte au commit ci-dessus. Une modification ultérieure a son propre run ; elle ne reçoit pas rétroactivement la preuve de cette référence.

## Gate G0 — état de clôture

| Condition | État | Preuve / travail restant |
| --- | --- | --- |
| Matrice réelle Chromium/Firefox | Fait | Référence complète ci-dessus |
| Provenance Firefox, OS, WASM et commit | Fait | Fichiers versionnés, checkout temporaire identifié |
| Formats, ancres, sérialisation et limites | Fait pour le POC | [Contrats figés](Contrats_POC_J0.md) |
| ADR-003/005/006/010/011 acceptés, datés et attribués | Fait pour le POC | [Registre révisé](FrameUp_Architecture_ADR_v0.1.md), décisionnaire Clément, transcription Codex |
| Mesure sur appareil physique le plus lent retenu | **À faire** | Appareil non identifié/non accessible ; [benchmark](Benchmark_Coffre.md) |
| Décision PBKDF2-600k / Argon2id | **À faire** | Choisir à partir du rapport cible, documenter compromis et paramètres ; aucun verdict déduit de la CI |

L'acceptation de l'ADR-011 porte sur le contrat du coffre POC et ses limites ; elle ne déclare pas le choix du KDF cible résolu. **G0 n'est pas clos.**

## Limites acceptées et jalons suivants

Pour le détail opposable du POC, voir les [contrats, section 6](Contrats_POC_J0.md#6-limites-explicitement-acceptées-pour-ce-poc). Les tests de panne injectent des exceptions puis ferment/reprennent proprement le navigateur ; pas de coupure électrique ou kill OS. Le relais est en mémoire. Secrets présents en mémoire JS/WASM ; code client malveillant et rollback complet du profil non couverts. La racine des mots est commune aux usages identité et archives, malgré des clés dérivées distinctes.

J1 : admission métier imposée, certificats/délégations/générations. J4 : récupération serveur/propriétaire, rollback/checkpoints, pannes brutales. Avant données sensibles : revue indépendante et validation des versions déployées. Ces réserves sont acceptées au stade POC et ne deviennent pas de nouveaux travaux bloquants G0. Le chantier mobile reste conditionné au franchissement du gate.

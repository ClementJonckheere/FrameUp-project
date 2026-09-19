# ADR-016 — Exigence mobile, alternatives et séquençage

Révision 0.2 — 19 septembre 2026.

**Exigence confirmée : FrameUp doit proposer une application mobile. Choix d'implémentation : ouvert. Décision de séquençage : terminer J0-Web avant de lancer un chantier mobile.** Android et iOS restent une hypothèse de cible, pas deux plateformes déjà validées. Aucun framework n'est retenu et aucune extraction FFI n'est engagée par ce document.

Cette révision retire l'orientation native par défaut de la v0.1 et remplace son lancement global de M01–M12 par des étapes conditionnelles. La rigueur de la matrice ne démontre ni la disponibilité de l'équipe ni la faisabilité de son exécution.

## 1. Décisions remplacées et traçabilité

| Référence | Décision antérieure | Effet explicite de cette révision |
| --- | --- | --- |
| Spécification v0.1, §1, paragraphe « Plateformes du pilote » | Mobile exclu de la validation initiale. | **Remplacement partiel de la portée produit** : une application mobile est désormais requise. **Maintien de la portée de la validation initiale** : J0-Web reste desktop. L'ajout au pilote attend une décision après J0-Web. |
| ADR-002 | Client web Next.js statique. | Maintenu pour le web ; ne prescrit plus implicitement l'unique forme de client du produit. |
| ADR-016 v0.1, « Décision de travail » | OpenMLS natif + FFI comme architecture candidate principale. | Remplacé par une comparaison PWA / WebView / natif. Natif-first non justifié à ce jour. |
| ADR-016 v0.1, « Critère d'acceptation » et matrice v0.1 | M01–M12 et cinq combinaisons comme lot mobile. | Remplacé par une sélection de route, puis des preuves minimales successives. La matrice complète devient un backlog conditionnel. |
| ADR-003 / 005 / 010 / 011 | MLS, identité, récupération, coffre. | Invariants conservés ; adaptateurs supplémentaires seulement si la route mobile retenue les exige. |

Les versions précédentes sont conservées dans `history/ADR-016_v0.1.md` et `history/Matrice_mobile_v0.1.md`. Les documents historiques de la spécification et du registre signalent ce remplacement. Il n'est pas acté que le premier pilote doit être livré simultanément sur trois plateformes.

## 2. Constat et décision immédiate

J0-Web reste ouvert : Chromium a exécuté les scénarios prévus, Firefox n'a pas encore exécuté sa partie ni la matrice mixte. Le lancement distant est également bloqué par un refus d'écriture de la connexion GitHub. Ces blocages ne justifient pas de détourner la capacité vers une deuxième intégration.

Travail actif : obtenir l'exécution Firefox dans un navigateur réel sur un poste de référence, puis la matrice complète sur un environnement compatible ; conserver versions, commit, empreinte WASM et résultats. La clôture exige aussi de traiter ou d'accepter explicitement les réserves de formats et de persistance du rapport J0. Un simple démarrage de Firefox ou un résultat Chromium ne remplace pas ces preuves.

Travail différé : extraction du cœur Rust, UniFFI, applications natives, plugins de coffre, distribution stores et push. Ce document prépare les décisions ; il n'autorise pas leur développement simultané.

## 3. Alternatives pour le pilote mobile

| Route | Réutilisation visée | Effort nouveau et limites | Quand la retenir |
| --- | --- | --- | --- |
| PWA d'abord | Réutiliser le module WASM, le protocole et une grande partie du client web. | Valider les moteurs mobiles, installation, stockage, éviction, reprise et mises à jour. Pas de clé matérielle native présumée ; pas de garantie de service continu en arrière-plan. | Option à examiner en premier si usage au premier plan et reprise à l'ouverture satisfont le pilote. |
| Conteneur WebView, tel que Capacitor | Réutiliser JS/WASM avec un shell mobile et des adaptateurs limités. | Construire et maintenir les projets iOS/Android, vérifier origine et APIs du WebView, surface des bridges et éventuels plugins de coffre. Un plugin ne rend pas les clés MLS matérielles. | Si la PWA manque une intégration OS précise, et qu'un petit adaptateur suffit sans réécrire le moteur. |
| Moteur natif + FFI | Réutiliser OpenMLS et un futur cœur Rust, pas le binding actuel. | Refactor Rust, bindings, contrats d'erreur, deux toolchains et stockage natif ; coût de maintenance le plus important à démontrer. | Si une exigence mesurable ne peut pas être satisfaite de manière acceptable par les deux routes précédentes, et si la capacité est affectée. |
| Reporter le client mobile après le pilote web | Aucun nouveau chantier au pilote initial. | Retarde le retour terrain mobile. | Si le besoin existe pour le produit mais ne conditionne pas la validation de valeur du premier pilote, ou si la capacité manque. |

Une PWA exploite une base web commune ; cela ne prouve pas une réutilisation intégrale ni une compatibilité automatique avec les moteurs mobiles. La validation desktop doit être complétée sur les navigateurs mobiles effectivement retenus, dont Safari/WebKit pour le parcours iOS prévu. [Documentation PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

Capacitor permet un conteneur basé sur les technologies web et des accès aux SDK natifs par plugins. Ces possibilités font de WebView une alternative réelle ; elles ne valident ni notre bridge cryptographique ni sa persistance. [Documentation Capacitor](https://capacitorjs.com/docs)

**Arbitrage actuel : aucune raison documentée ne permet de retenir natif-first.** Une présence sur les stores n'impose pas, à elle seule, un moteur MLS natif. Un besoin de push ou d'arrière-plan ne prouve pas non plus qu'une application native aura une exécution continue garantie. La décision portera sur un besoin concret et un essai, pas sur l'étiquette « application mobile ».

Après J0-Web, consigner : appareils et OS réellement visés ; installation attendue ; besoin ou non de stores ; comportement hors ligne ; politique de déverrouillage ; intégration OS indispensable ; budget et capacité. Une PWA ne sera pas déclarée équivalente à l'application mobile attendue sans vérifier ces critères produit.

## 4. Capacité et limites du spike

L'expérience Rust-natif/mobile et la capacité disponible ne sont pas établies. Leurs insuffisances éventuelles constituent un risque à lever, pas une caractéristique de l'équipe que ce document invente.

Avant un spike, nommer le responsable de réalisation et le relecteur, disposer du matériel et des accès SDK, fixer un budget maximal en jours-personne et une date d'arrêt. Sans allocation explicite, pas de lancement. Une personne seule peut porter plusieurs rôles, mais le temps de revue et le besoin d'aide spécialisée doivent rester visibles.

Aucune estimation chiffrée n'est présentée comme acquise : découper et estimer les livrables avant engagement. À la limite convenue, un échec ou une preuve incomplète déclenche un retour à l'arbitrage PWA/WebView/natif ou un report. Aucun élargissement silencieux du périmètre pour « finir le spike ».

## 5. Si le natif est retenu : refactor réel du cœur

Le code actuel de `mls/src/lib.rs` est couplé à wasm-bindgen : `MlsDevice`, signatures de méthodes, `JsError`, JSON et snapshots. Il ne contient pas déjà un cœur indépendant qu'il suffirait de compiler avec une autre cible.

Livrables distincts, après clôture J0-Web et choix de route :

1. Figer les vecteurs et résultats du harnais existant comme référence de non-régression.
2. Extraire un cœur Rust sans wasm-bindgen, sans `JsError` et sans types UniFFI ; exposer structures, octets et erreurs Rust typées. Définir les opérations et leur effet sur l'état.
3. Garder un adaptateur WASM mince. Convertir les erreurs vers JS à cette frontière seulement et faire repasser la matrice web.
4. Définir l'interface native : possession et durée de vie des objets, sérialisation des appels par appareil, annulation, erreurs, tailles de buffers, copies et libération des snapshots sensibles. Un blob volumineux traversant FFI ne se traite pas comme une simple chaîne JS.
5. Réaliser un aller-retour UniFFI vers Kotlin et Swift incluant une erreur typée et une sauvegarde/restauration de fixture. Mesurer les copies et la mémoire ; ne pas revendiquer une absence de copies ou un effacement garanti sans preuve.

UniFFI impose une représentation explicite des erreurs exposées ; le choix proposé est une enum d'erreurs stable avec codes contrôlés, non un export de chaînes de debug pouvant contenir des données sensibles. [Erreurs UniFFI](https://mozilla.github.io/uniffi-rs/latest/types/errors.html)

Critère de sortie : bindings utilisables dans les deux toolchains cibles, comportement d'état vérifié, absence de régression web et effort résiduel estimé. Une compilation de la bibliothèque seule ne satisfait pas ce critère.

## 6. Sérialisation signée : une seule implémentation

Pour toute route comportant du natif, **l'encodage des données signées et des contextes authentifiés appartient au cœur Rust partagé**, appelé depuis WASM comme depuis FFI. Swift et Kotlin ne réimplémentent pas `canonical()` ; le JS ne conserve pas une deuxième implémentation de production pour ces opérations.

Le cœur produit les octets exacts à signer/vérifier. Les adaptateurs cryptographiques signent ces octets sans les réencoder. La vérification des structures distantes utilise le même contrat de décodage et de validation. Partager le code ne supprime pas les erreurs de version, de données d'entrée ou de conversions FFI : M03 reste obligatoire.

Le contrat doit fixer : schémas et domaines versionnés ; champs obligatoires et inconnus ; rejet des clés JSON dupliquées ; entiers et limites ; ordre des clés ; encodage UTF-8 et politique Unicode ; encodages de clés, signatures, nonces et données associées. Aucun appel automatique à une normalisation Unicode n'est ajouté sans décision de format. `serde_json::to_string` seul n'est pas une définition de canonicalisation.

La migration compare les octets au JS existant sur un corpus comportant ordre différent des champs, limites numériques, accents, caractères non BMP, valeurs invalides et champs ambigus. Si le format change, versionner le domaine et définir le traitement des anciennes signatures. Ne jamais changer silencieusement les octets d'un format déjà identifié par une version.

**M03 passe avant toute UI mobile**, d'abord sur fixtures et appels de bindings, puis avec signatures et enveloppes réelles dans les deux sens. Cette extraction n'est pas un prérequis ajouté rétroactivement à J0-Web ou à une PWA qui garde la même implémentation JS/WASM.

## 7. iOS : nommer les limites sans généralisation excessive

Le chemin d'intégration prévu avec `SecureEnclave.P256` utilise P-256. Il ne prend pas en charge les clés X25519 et Ed25519 de notre suite MLS. **Les clés MLS de ce provider logiciel ne seront donc pas exécutées ni conservées comme clés natives de cette API d'enclave.** Une clé P-256 créée dans l'enclave peut participer à une construction standard de protection du coffre ; elle n'est pas une clé AES et ne doit pas être décrite comme chiffrant directement tout le snapshot. Le mécanisme exact de protection/dérivation reste à choisir et revoir. [Guide Apple, accès via Security](https://developer.apple.com/documentation/security/protecting-keys-with-the-secure-enclave)

Ne pas transformer cette limite du chemin choisi en affirmation universelle « le Secure Enclave ne gère que P-256 » : le catalogue CryptoKit consulté expose également des familles ML-KEM et ML-DSA, avec disponibilité dépendante des SDK/OS. Cela n'établit aucun support X25519/Ed25519 pour notre suite ni aucune compatibilité automatique avec OpenMLS. [Catalogue SecureEnclave](https://developer.apple.com/documentation/cryptokit/secureenclave)

La clé privée de l'enclave doit être créée via l'API concernée ; une identité P-256 récupérée à partir du kit n'est pas présumée importable dans l'enclave. Keychain et Secure Enclave sont deux mécanismes distincts. Quand le coffre est ouvert, ses secrets MLS existent en mémoire du processus. La protection matérielle et la politique de déverrouillage doivent être testées sur un appareil réel, avec indisponibilité traitée explicitement.

## 8. Entropie : vérifier chaque cible et chaque version

Le lockfile contient `getrandom` **0.2.17 et 0.4.3**. La présence de la feature `js` sur l'alias 0.2 ne décrit donc pas tout le graphe cryptographique. L'inspection du graphe WASM relie aussi 0.4.3 à OpenMLS et à ses dépendances ; ce constat n'est pas une vérification native.

Pour 0.2.17, `js` concerne le WASM `unknown-unknown` et ne remplace pas le backend des cibles natives prises en charge. Pour 0.4.3, l'activation web passe par `wasm_js`. Les documentations associent Android à la source OS et iOS à `CCRandomGenerateBytes`. [getrandom 0.2.17](https://docs.rs/getrandom/0.2.17/getrandom/), [getrandom 0.4.3](https://docs.rs/getrandom/0.4.3/getrandom/)

Dans M01, archiver le graphe de dépendances et de features par cible, identifier chaque chemin d'entropie du provider et exécuter génération de clés/nonce sur les plateformes réelles. Vérifier aussi le chemin WebCrypto du code JS. Séparer la configuration des adaptateurs web/natif ; ne pas ajouter un backend déterministe pour faire compiler une cible.

Injecter un échec de la dépendance d'entropie dans des tests isolés pour vérifier l'arrêt de l'opération et l'absence de message publié. Cette injection ne prouve pas une panne du RNG système. Des clés différentes ou des tests statistiques ne démontrent pas à eux seuls la qualité de l'entropie ; la preuve repose aussi sur la configuration et les appels réellement utilisés.

## 9. Séquence conditionnelle et critères d'arrêt

| Étape | Entrée | Preuve attendue / décision |
| --- | --- | --- |
| G0 — J0-Web | Travail déjà engagé. | Firefox réel + matrice complète et réserves J0 traitées ; sinon rester sur J0-Web. |
| G1 — Route du pilote | G0 clos, besoin et capacité explicités. | Examiner PWA d'abord, puis WebView/natif seulement pour des écarts identifiés ; reporter si capacité absente. |
| S1 — Si natif : cœur, FFI, interop | Choix natif justifié et spike borné. | M01–M03, RNG et non-régression web ; commencer par un seul OS disponible, puis le second avant d'affirmer la faisabilité Android+iOS. Échec bloquant : retour à G1, aucune UI mobile. |
| S2 — Si S1 passe : coffre et pannes | Interop/FFI établies. | M04, M05 et M08 sur un appareil physique par OS retenu ; vérifier le mécanisme réel de protection et son comportement en cas d'indisponibilité. |
| G2 — Suite du pilote | Preuves de la route choisie et effort restant acceptés. | Seulement alors engager l'UI mobile et les composants métier nécessaires. Les autres scénarios restent des gates avant les fonctions correspondantes. |

M06/M07/M09 sont reportés hors du spike minimal, mais restent requis avant un pilote autorisant révocation hors ligne, migration ou sauvegarde. M10–M12 sont reportés aux lots compte/récupération, synchronisation et notifications. Reporter les tests d'intégration ne permet pas de livrer les fonctions correspondantes sans leurs contrôles.

Aucun état MLS actif ne doit être cloné par une sauvegarde ou un appairage. L'identité récupérée n'accorde pas d'admission automatique. Ces contraintes s'appliquent à toutes les routes, même si leurs scénarios complets sont différés.

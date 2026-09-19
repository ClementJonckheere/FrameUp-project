# FrameUp — décisions d'implémentation J0

Version 0.1 — 18 septembre 2026. Complément expérimental à ADR-003, ADR-005 et ADR-010 ; les ADR initiaux ne sont pas déclarés validés par ce document.

## 1. Frontières du harnais

Un serveur statique local distribue les fichiers compilés. Playwright orchestre des profils navigateur séparés. Chaque profil détient un appareil, un provider OpenMLS, un coffre IndexedDB et une file de messages sortants. Les données échangées sont des fixtures aléatoires ou fictives.

Le serveur statique et le relais n'ont pas besoin des secrets. L'orchestrateur de test est une composante de confiance et reçoit les contenus fictifs pour vérifier les assertions. Il ne représente pas un serveur de production. Aucun backend de compte, annuaire authentifié, stockage de fichiers ou API de groupe n'est implémenté ici.

## 2. ADR-003 / OpenMLS dans le navigateur

Choix : OpenMLS 0.9.0 avec feature `js`, provider `openmls_rust_crypto` 0.6.0 et liaison wasm-bindgen 0.2.128. Suite fixe `MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519` : X25519, AES-128-GCM, SHA-256 et Ed25519. Aucun remplacement de MLS par une clé de groupe fixe.

Le wrapper réalise les opérations via la bibliothèque : KeyPackage validé, création de groupe, Welcome, Add, Remove, messages et commits. L'arbre est inclus via l'extension ratchet tree. Les mutations mettent à jour le provider avant de rendre le message disponible à l'orchestrateur.

Le snapshot contient l'ensemble du magasin en mémoire du provider, l'identité de l'appareil, sa clé publique et l'identifiant du groupe. C'est un format interne sensible lié aux versions verrouillées, pas un format durable interopérable. Il est sérialisé puis chiffré dans le coffre. La restauration recharge ce magasin et l'état du groupe ; elle ne doit servir qu'au même appareil.

L'amont indique compiler la cible `wasm32-unknown-unknown` en CI sans la tester comme les plateformes prises en charge. Notre exécution navigateur est donc une preuve nécessaire et distincte de la compilation. [OpenMLS Book](https://book.openmls.tech/)

Limites : un groupe par appareil dans ce harnais ; pas de migration du snapshot, de résolution de commits concurrents, d'admission métier, ni de test systématique de guérison après compromission. Le refus `WrongEpoch` d'un appareil retiré est un résultat fonctionnel pertinent ; il ne constitue pas à lui seul un audit de la confidentialité du protocole.

## 3. ADR-005 / Identité, appareils et politiques

L'identité de compte est une paire ECDSA P-256. L'empreinte est SHA-256 de l'encodage SPKI de sa clé publique. Le coffre local de l'appareil contient une autre paire ECDSA P-256 et les clés Ed25519 propres à son instance MLS. Aucune clé d'appareil n'est copiée entre profils.

L'autorité d'identité signe un certificat avec domaine, compte, génération, appareil, clé de signature quotidienne et clé publique MLS. Un test valide le lien entre la clé MLS du certificat et celle d'un vrai KeyPackage. Le vérificateur attend compte, génération, appareil et clé MLS. La provenance authentifiée de ces valeurs est une obligation de l'intégration ultérieure.

Une politique contient domaine, projet, version, propriétaire et membres. Elle est signée par la clé d'identité du propriétaire **pour les seuls essais de primitives**. Le vérificateur exige l'empreinte de confiance fournie par l'appelant, le projet attendu et une version minimale. Les variantes altérées, obsolètes, signées par un tiers ou relatives à un autre projet sont rejetées.

Cette signature de test n'est pas le mécanisme quotidien final : l'autorité racine ne doit pas être stockée dans le coffre d'usage courant. Avant J1, préciser une délégation bornée autorisant les appareils du propriétaire à signer les politiques, sa révocation et la vérification de sa chaîne. Le certificat de ce POC ne contient pas encore d'expiration, de preuve d'origine ou de défi à usage unique. Les politiques ne comportent pas encore de lien cryptographique à la précédente.

Les appels bruts `add` et `remove` restent accessibles à l'orchestrateur. La vérification de politique/certificat et l'admission MLS sont testées séparément. **Leur couplage obligatoire n'est pas encore implémenté** : il ne faut pas exposer cette API comme une autorisation métier.

## 4. Coffre et ordre de persistance

Le mot de passe local sert à dériver une clé AES-256-GCM via PBKDF2-SHA256, sel aléatoire de 16 octets, 600 000 itérations. Minimum technique de 12 caractères pour les fixtures ; aucune estimation de robustesse d'un vrai mot de passe n'est revendiquée. Ce choix permet un POC utilisant WebCrypto seul. Il ne valide pas le coût sur les appareils cibles et ne tranche pas définitivement le choix d'un KDF de production.

Les enveloppes utilisent un nonce aléatoire de 12 octets, un tag de 128 bits et des données associées authentifiées. Le contexte du coffre contient son domaine versionné, l'identifiant du coffre et sa révision. Les enveloppes publiques sont `{format:1, iv, ciphertext}` avec encodage base64. `ciphertext` inclut le tag WebCrypto. Les métadonnées KDF sont visibles ; elles ne contiennent aucun secret.

Ordre d'une mutation :

1. Détenir le Web Lock de l'appareil pendant toute la session déverrouillée.
2. Vérifier la révision et écrire `dirty=true` dans une transaction IndexedDB achevée.
3. Appliquer l'opération MLS en mémoire.
4. Chiffrer ensemble snapshot, file sortante, boîte reçue et identifiants de déduplication.
5. Écrire atomiquement l'enveloppe, la nouvelle révision et `dirty=false`.
6. Rendre le message disponible pour livraison ; le retirer de la file seulement après accusé.

Une interruption avant l'étape 5 laisse l'appareil en `RECOVERY_REQUIRED`. Le harnais refuse alors de reprendre automatiquement l'ancien état. Une interruption après l'étape 5 permet de rejouer les mêmes octets de la file sans rechiffrer le message. Le relais de test refuse un même identifiant associé à d'autres octets.

La transaction IndexedDB utilise la durabilité par défaut du navigateur. L'achèvement de la transaction ne prouve pas un flush physique résistant à une coupure électrique. Les tests ferment proprement le navigateur après l'exception injectée. Le protocole de récupération d'un coffre marqué incertain reste à définir : conserver les brouillons récupérables puis créer un nouvel appareil et le réadmettre, sans relancer une session MLS potentiellement déjà utilisée.

Toute erreur survenue dans la mutation, y compris un message reçu invalide, marque actuellement le coffre comme incertain. Ce choix conservateur bloque la réutilisation d'état mais permet un déni de service. C'est une limite du harnais à corriger avant un pilote, en délimitant les erreurs garanties sans mutation et celles qui rendent l'état incertain.

Le marqueur `dirty` n'est pas une ancre de confiance. Modifier les métadonnées ou remettre un ancien snapshot complet n'est pas couvert. Il manque un checkpoint extérieur authentifié et un protocole de resynchronisation. Les clés et les messages en mémoire restent accessibles à du code malveillant exécuté dans la même origine ; aucun effacement mémoire complet JS/WASM n'est garanti.

## 5. ADR-010 / Kit, identité et archives

Les 24 mots anglais BIP39 représentent une entropie aléatoire de 256 bits et un contrôle de transcription. Le POC récupère cette entropie avec `mnemonicToEntropy`. Il n'utilise pas la dérivation BIP39 destinée aux portefeuilles (`mnemonicToSeed`). [Spécification BIP39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)

HKDF-SHA256 utilise le sel de domaine `frameup-j0/recovery/v1` et un champ `info` canonique contenant `accountId` et `purpose`.

| Usage | `purpose` | Secret protégé / contexte authentifié |
| --- | --- | --- |
| Coffre d'identité | `identity-wrap` | Paire racine / domaine `frameup-j0/identity-vault/v1`, compte. |
| Sauvegarde d'archives | `archives-wrap` | Liste de clés d'archives / domaine `frameup-j0/archive-backup/v1`, compte. |
| Document fictif | Sans dérivation du kit | Clé indépendante aléatoire de 32 octets / projet et version de document. |

Les mots ne sont pas des clés de document. Le kit doit être accompagné du coffre d'identité et, pour les archives, du paquet de clés et des données encore disponibles. Utiliser la clé de wrapping des archives sur le coffre d'identité échoue. Un paquet absent, altéré ou lié au mauvais contexte n'autorise pas une restauration annoncée comme réussie.

**Les deux clés dérivent néanmoins de la même racine.** Posséder le kit et les blobs nécessaires expose les deux usages. Si le produit exige qu'un voleur du kit d'identité ne puisse pas ouvrir les archives, il faut un second secret indépendant : ce n'est pas le modèle de cette version.

Le POC utilise le kit transitoirement dans la suite de récupération. L'appareil quotidien créé par `create` ne reçoit ni kit ni clé racine. Le provisionnement quotidien de la seule capacité de sauvegarde reste à implémenter ; l'API `backupArchives(words, ...)` est un utilitaire de laboratoire, pas l'API définitive de sauvegarde de l'application.

Une vérification locale prouve qu'une identité récupérée absente d'une politique authentifiée reste absente. Elle ne démontre pas une récupération complète du compte. Il manque : défi serveur, changement atomique de génération, invalidation des anciennes sessions, nouvel appareil, réadmission et réinitialisation par un propriétaire récupéré. Le format des paquets par appareil, leur version et leur disponibilité doivent aussi être complétés.

## 6. Formats, menaces et critères de sortie

L'encodage signé trie les clés des objets JSON et n'accepte que les valeurs prises en charge par les fixtures, notamment les nombres entiers sûrs. Il s'agit d'un encodeur restreint de POC, **pas d'une implémentation revendiquée de RFC 8785**. Le contrôle exhaustif des schémas, limites de taille, profondeur, Unicode et clés dupliquées au décodage reste à fixer avant une API exposée.

| Menace | Preuve ou limite de cette version |
| --- | --- |
| Altération de ciphertext ou de contexte | Rejet démontré sous Chromium via les primitives réelles. |
| Lecture de nouveaux messages par appareil retiré | Rejet OpenMLS au nouvel epoch démontré ; ancien contenu déjà reçu hors garantie d'effacement. |
| Substitution d'identité ou de politique | Tests locaux avec empreinte ancrée fournie par le test ; canal de vérification humain non construit. |
| Doublons, ordre inversé, accusé perdu | Scénarios exécutés ; pas de preuve de convergence sous partitions et commits concurrents. |
| Copie froide du coffre | Données chiffrées vérifiées ; résistance à l'attaque dictionnaire non mesurée. |
| Code client compromis, profil déverrouillé, rollback complet | Hors garantie de ce harnais ; pas de résistance revendiquée. |

J0 pourra être proposé à clôture après réussite de la matrice Chromium/Firefox, revue des formats et des menaces, mesure du coffre sur matériel cible et acceptation explicite des limites de persistance. Les suites métier J1/J4 devront ensuite fermer les parcours complets d'autorisation et de récupération. Aucun test de ce lot ne justifie d'annoncer que T01–T36 sont couverts.

# FrameUp — Spécification du prototype v0.1

> Remplacement partiel au 18 septembre 2026 — [ADR-016, révision 0.2](ADR-016_Application_mobile.md) : l’exclusion du mobile est remplacée à l’échelle du produit. La validation initiale J0-Web reste limitée au desktop. Route mobile et entrée au pilote restent conditionnelles ; la [matrice mobile](Matrice_J0_mobile.md) est un backlog, pas un chantier lancé.

Date : 16 septembre 2026. Statut : proposition de conception, à implémenter et à vérifier. Aucun test décrit ici n'a été exécuté sur une application FrameUp.

Ce document précise les règles d'accès, d'historique, de récupération et de synchronisation. Il complète le cadrage fourni ; il ne constitue ni une preuve de sécurité ni un protocole cryptographique audité.

## 1. Objectif et limites du prototype

Démontrer qu'une petite équipe peut transformer une discussion confidentielle en tâche, joindre un fichier, travailler temporairement hors connexion et retirer un membre sans lui donner accès aux nouvelles publications.

### Décisions structurantes

| Référence | Décision du prototype |
|---|---|
| D01 | Un projet représente une audience unique : tous ses membres lisent tous ses contenus conservés. |
| D02 | Trois rôles : propriétaire, contributeur, lecteur. Un propriétaire unique par projet. |
| D03 | Tout nouveau membre reçoit l'historique conservé complet, après admission vérifiée. |
| D04 | Tout appareil possède ses propres clés et son propre statut ; aucun clonage d'état MLS entre appareils. |
| D05 | Une révocation bloque les accès serveur immédiatement après validation ; les nouvelles publications attendent la rotation cryptographique. |
| D06 | Les contenus sont durables. Pas de messages éphémères ni de suppression irréversible dans cette version. |
| D07 | Les modifications concurrentes d'une même carte produisent un conflit explicite ; aucun écrasement silencieux. |
| D08 | Les changements d'accès, d'appareil et les récupérations nécessitent une connexion. Les modifications de contenu peuvent rester en brouillon hors connexion. |
| D09 | La récupération du compte exige un kit personnel ; la récupération des contenus exige aussi des sauvegardes et des données encore disponibles. |
| D10 | Une instance pilote exploitée par l'équipe du prototype avec Docker Compose ; pas d'offre d'auto-hébergement supportée à ce stade. |

Périmètre fonctionnel : un fil de discussion, un tableau à trois colonnes fixes (« À faire », « En cours », « Terminé »), cartes avec titre/description/échéance, commentaires, fichiers, membres, appareils et récupération. Une tâche créée depuis un message conserve sa référence dans le même projet. Pas de copie entre projets.

Hors périmètre : appels, calendrier complet, invitations par email automatisées, liens publics, éditeur de texte collaboratif, permissions par carte, sous-groupes privés, transfert de propriété, automatisations, notifications push externes, messages éphémères et modération avancée. Les échéances sont visibles dans l'application ; aucun rappel garanti lorsque celle-ci est fermée.

Charge de validation proposée : 10 comptes, 2 appareils par compte, 1 projet principal, 5 000 événements, 100 cartes, 50 fichiers de 10 Mio maximum. Ces valeurs délimitent les essais ; elles ne sont pas des performances mesurées.

**Décision de portée initiale — partiellement remplacée par ADR-016 révision 0.2 :**

> Plateformes du pilote : navigateurs de bureau Chromium et Firefox, dont les versions exactes seront consignées à J0. Le mobile, les extensions de navigateur et les terminaux administrés avec politiques particulières ne sont pas inclus dans la validation initiale.

Portée courante : le produit doit inclure une application mobile. L’exclusion reste applicable à J0-Web ; elle ne signifie plus que le produit reste desktop. Le mobile entre éventuellement au pilote après clôture J0-Web et arbitrage de la route et de la capacité. Les autres exclusions de ce paragraphe sont maintenues.

## 2. Modèle de confiance

### Ce que le prototype cherche à protéger

- Un lecteur de la base, du stockage objet ou des sauvegardes serveur ne doit pas retrouver les contenus en clair ou les secrets de déchiffrement.
- Une modification de contenu ou de contexte d'un événement doit être détectée par les clients.
- Un appareil retiré ne doit plus lire ni publier via les API ; même muni des nouveaux blobs, il ne doit pas déchiffrer les publications postérieures à la rotation.
- Un membre ne doit pas pouvoir élargir ses droits par un client modifié ou une modification SQL du rôle opérée sur le serveur.
- Les opérations hors connexion ne doivent pas effacer silencieusement une modification acceptée entre-temps.

### Limites reconnues

- Un destinataire autorisé peut copier ce qu'il lit ; sa copie ne peut pas être révoquée à distance.
- Un appareil infecté ou déverrouillé peut exposer les données et clés qu'il utilise.
- Le serveur voit les adresses réseau pendant les connexions, les appartenances, les appareils, les rôles, les tailles et rythmes d'activité. Ce prototype ne garantit pas l'anonymat réseau.
- Le code web livré par un serveur compromis peut voler du contenu. Une CSP ne protège pas contre toutes les modifications malveillantes du code de première partie. Cette limite est explicitée par le modèle de sécurité de WebCrypto. [W3C](https://www.w3.org/TR/webcrypto/#security-considerations)
- Le serveur est supposé respecter l'ordre et la disponibilité des opérations pour la convergence. Les signatures et points de contrôle détectent certaines altérations ou régressions, mais ne prouvent pas à eux seuls l'absence d'une vue divergente présentée à un nouvel appareil.
- Un membre autorisé malveillant peut publier un contenu invalide ou partager une clé. Les clients rejettent les opérations invalides ; la prévention complète du déni de service interne est hors périmètre.

## 3. Identités, accès et invitations

### 3.1 Identité et appareils

Un compte possède un identifiant aléatoire et une clé publique d'identité stable. Un appareil possède un identifiant distinct, une clé de signature et des clés propres au protocole de groupe. Le serveur ne reçoit que les clés publiques et des secrets chiffrés.

L'identité initiale et le premier appareil sont créés localement. L'autorité de récupération du compte est conservée dans le coffre de secours chiffré, pas dans les clés d'usage quotidien des appareils. Le kit permet de rouvrir ce coffre. Une génération de compte monotone permet à une récupération d'invalider toutes les délégations d'appareils antérieures.

Un appareil déjà autorisé peut certifier un nouvel appareil de la même génération, après comparaison d'un code d'appairage. La chaîne de délégation doit remonter à l'identité connue, et ses signataires doivent être valides au moment de l'admission. Une nouvelle délégation ne donne pas automatiquement les clés des projets : chaque projet impose son admission cryptographique.

Une session serveur provient d'une preuve de possession de la clé d'appareil sur un défi unique, court et lié à l'origine/à l'instance. Aucun secret de récupération ne sert directement de mot de passe transmis au serveur. Les sessions, même encore valides en durée, sont rejetées si le compte, la génération ou l'appareil est révoqué. Le détail du format de certification et d'authentification appartient au jalon de validation cryptographique, avant toute utilisation sensible.

### 3.2 Matrice d'autorisation

| Action | Propriétaire | Contributeur | Lecteur |
|---|---|---|---|
| Lire l'historique, les cartes et fichiers | Oui | Oui | Oui |
| Chercher localement / télécharger un fichier lisible | Oui | Oui | Oui |
| Écrire un message ou commentaire | Oui | Oui | Non |
| Créer, modifier, déplacer ou archiver une carte | Oui | Oui | Non |
| Ajouter un fichier | Oui | Oui | Non |
| Créer une tâche à partir d'un message du projet | Oui | Oui | Non |
| Inviter ou retirer un membre | Oui | Non | Non |
| Changer un rôle | Oui | Non | Non |
| Finaliser une admission d'appareil dans le projet | Oui | Non | Non |
| Archiver le projet | Oui | Non | Non |
| Quitter le projet | Non | Oui | Oui |
| Révoquer un de ses propres appareils au niveau du compte | Oui | Oui | Oui |

Le propriétaire ne peut pas supprimer son compte, quitter son projet ni rétrograder son propre rôle dans le prototype. Le transfert de propriété est reporté. Cette limite doit être visible avant la création d'un projet.

Un lecteur reçoit des clés de lecture : l'interdiction d'écrire repose sur la vérification des opérations signées et des rôles, côté serveur et côté client. Posséder une clé de groupe ne confère pas une permission d'écriture.

Le propriétaire signe une politique versionnée liant projet, membres, rôles, appareils admis, génération de compte et référence de la politique précédente. Les clients vérifient cette politique en plus des contrôles REST. Ils n'acceptent pas une élévation de rôle sur la seule foi de PostgreSQL.

### 3.3 Invitation

1. Le propriétaire crée une invitation avec rôle, expiration de 24 h et jeton aléatoire à usage unique. Le serveur ne conserve qu'un condensat du jeton.
2. L'invitation est copiée et transmise par l'utilisateur ; FrameUp n'envoie aucun message externe dans ce prototype.
3. Le destinataire ouvre le lien et soumet son identité publique et son premier appareil. Il reste « En attente » et ne reçoit aucun contenu.
4. Les deux personnes comparent les empreintes d'identité via un canal déjà authentifié, idéalement en face à face. Vérifier seulement une empreinte affichée par le même serveur ne suffit pas.
5. Le propriétaire confirme la personne, le rôle et la mention « Cette personne verra tout l'historique conservé ».
6. L'admission publie la politique signée, le changement de groupe et le paquet d'archives. Le client invité vérifie ces éléments avant de passer à l'état « Actif ».

Un lien transféré ou volé ne suffit donc pas à entrer. La consommation du jeton est atomique lors de l'acceptation finale ; plusieurs demandes éventuelles ne deviennent jamais plusieurs admissions automatiques.

## 4. Historique et cycle des clés

### 4.1 Politique d'historique

- Nouveau membre : tout l'historique conservé, y compris les versions de cartes et cartes archivées.
- Nouvel appareil d'un membre actif : même historique, après appairage et admission dans le projet.
- Membre retiré : ses anciennes copies restent potentiellement lisibles ; le serveur ne lui fournit plus de contenu, ancien ou nouveau.
- Membre réinvité : nouvelle admission, puis tout l'historique conservé, y compris la période d'absence. L'interface avertit explicitement de ce rétablissement d'accès.
- Projet archivé : lecture possible pour les membres actifs, aucune modification de contenu ; les révocations et opérations de sécurité restent possibles.
- Message et commentaire publiés : immuables dans le prototype. Une correction est un nouveau message. Une carte est versionnée ; son archivage est un état, pas un effacement.

L'index de recherche est local, reconstructible, et chiffré au repos comme le cache. Aucun résultat ne doit révéler un projet dont le client a reçu la révocation ; l'effacement de la copie locale reste une action du client conforme, pas une garantie contre un client hostile.

### 4.2 Architecture cryptographique à valider

MLS est le candidat retenu pour les groupes d'appareils. Il fournit une gestion de clés de groupe, mais ne définit pas toute l'identité métier, la politique d'historique ou la récupération de FrameUp. Ces couches doivent être validées ensemble. [RFC 9420](https://www.rfc-editor.org/rfc/rfc9420.html)

| Élément | Rôle et durée |
|---|---|
| Identité publique du compte | Point d'ancrage vérifié lors de l'invitation ; stable après récupération ordinaire. |
| Autorité privée de récupération | Permet de restaurer l'identité et remplacer la génération d'appareils ; protégée dans le coffre de secours. |
| Clé privée d'appareil | Signe les opérations quotidiennes ; jamais réutilisée sur un autre appareil. |
| État MLS par appareil et projet | Échanges de contrôle et renouvellement des secrets de groupe ; pas de restauration d'une vieille session comme session active. |
| Clé d'archives de période | Protège les enveloppes des contenus persistants ; renouvelée lors des changements de groupe et conservée pour l'historique. |
| Clé de contenu | Aléatoire et distincte par événement/version ou fichier ; protégée par la clé d'archives de sa période. |
| Clé du coffre local | Protège cache, brouillons, index et états locaux ; déverrouillée localement. |
| Clé de sauvegarde personnelle | Protège les paquets de récupération ; distincte des clés de projet et de session. |

Un projet a un identifiant stable, une génération de groupe et une époque MLS. La clé d'archives est indépendante des clés de messages internes à MLS, créée sur un terminal autorisé et distribuée sous la protection du groupe courant. Les changements d'époque, de politique et de clé d'archives sont liés par le même manifeste de transition vérifié. Une intégration existante et examinée doit être privilégiée ; aucune nouvelle primitive cryptographique n'est inventée.

Chaque nouvelle version d'objet et chaque nouveau fichier utilisent une nouvelle clé de contenu. Après une révocation, on ne réutilise pas une clé de fichier connue du membre exclu pour publier une nouvelle version. Les anciennes données ne sont pas rechiffrées : une copie déjà acquise reste acquise.

Le paquet d'historique distribué aux membres admis contient les clés d'archives anciennes nécessaires et les références de politiques, jamais une ancienne session MLS à reprendre. Les paquets sont authentifiés et limités au projet. Leur distribution est une autorisation explicite d'accéder au passé.

**Compromis assumé :** les archives restent déchiffrables grâce à des clés conservées et sauvegardées. Une compromission de ces clés peut donc exposer le passé archivé. Les propriétés de protection des anciennes clés de session MLS ne rendent pas ces copies persistantes irrécupérables.

Les détails binaires, suites, nonces et fonctions de dérivation doivent provenir de bibliothèques reconnues et être fixés au jalon J0. Les en-têtes sont liés cryptographiquement au contenu ; encodage canonique, séparation des usages et versions de format sont obligatoires. OpenMLS est un candidat d'implémentation ; son intégration dans les navigateurs retenus doit être effectivement testée. [Dépôt OpenMLS](https://github.com/openmls/openmls)

### 4.3 Révocation d'un membre ou appareil

1. Une demande autorisée et signée est acceptée dans une transaction qui verrouille le contrôle d'accès du projet.
2. À cet instant serveur T0, les sessions et accès concernés sont refusés, les transferts en attente ne peuvent plus être finalisés, et le projet passe à `REKEY_REQUIRED`.
3. Toutes les nouvelles publications de contenu sont suspendues. Les membres restants peuvent lire leurs données et préparer des brouillons.
4. Un appareil du propriétaire actualisé retire les appareils concernés du groupe, renouvelle la clé d'archives et produit la nouvelle politique signée. Si le propriétaire est hors ligne, le projet reste suspendu.
5. La nouvelle transition est enregistrée atomiquement ; aucun état partiellement publié n'est utilisable. Un appareil restant vérifie et enregistre la transition avant d'envoyer sous la nouvelle époque.
6. Les opérations de l'ancienne époque sont rejetées. Un appareil toujours autorisé récupère l'état courant, résout les conflits et rechiffre ses brouillons avant un nouvel envoi.

Les publications validées avant T0 appartiennent à l'ancien état. Une date locale antérieure à T0 ne donne aucun droit à une opération reçue ensuite. La garantie porte sur les nouvelles publications acceptées sous le groupe actualisé ; un appareil ignorant la révocation peut encore produire localement un brouillon sous un ancien état. Il ne doit pas l'envoyer avant synchronisation du contrôle d'accès.

Une rétrogradation contributeur vers lecteur met à jour la politique et invalide les écritures encore en attente, sans retirer l'accès de lecture. Une compromission signalée exige la révocation de l'appareil, pas une simple rétrogradation.

## 5. Récupération et sauvegardes

### 5.1 Création du kit

Un secret de récupération aléatoire de 256 bits est généré localement et présenté dans un format avec contrôle de transcription. Le kit contient aussi l'identifiant du compte, la référence de l'instance et la version de format. Le secret ne doit pas être envoyé en clair, mis dans une URL, les logs ou une télémétrie.

L'utilisateur confirme avoir sauvegardé le kit par une vérification de saisie avant de rejoindre un projet. Les clés de sauvegarde et de protection du coffre d'identité sont séparées par une dérivation adaptée ; les paramètres exacts sont fixés à J0.

Les appareils quotidiens ne reçoivent que la clé dédiée aux sauvegardes d'archives, jamais le secret maître du kit ni la clé permettant d'ouvrir l'autorité de récupération. Cette séparation est indispensable : voler un appareil ne doit pas suffire à récupérer l'autorité racine et à annuler indéfiniment ses révocations. Pendant une récupération, l'autorité racine n'est utilisée que transitoirement pour établir la nouvelle génération.

Le kit n'est pas un fichier de toutes les données. Il ouvre le coffre d'identité et les sauvegardes personnelles disponibles. Une personne qui le possède avec accès aux blobs nécessaires peut usurper la récupération et lire les archives concernées. Le remplacement d'un kit compromis nécessite une procédure de rotation d'identité plus large, hors prototype ; une récupération ordinaire ne résout pas ce cas.

### 5.2 Deux catégories de sauvegarde

**Sauvegarde personnelle chiffrée :** clés d'archives reçues, références des projets, politiques signées connues et points de contrôle de synchronisation. Chaque appareil publie sa propre suite de paquets immuables authentifiés ; on ne remplace pas un coffre global par le dernier appareil à écrire. Le coffre d'identité contient l'autorité de récupération, protégée séparément. Les sessions actives, anciennes clés de signature d'appareils et brouillons non synchronisés ne sont pas restaurés comme état actif.

**Sauvegarde de l'instance :** PostgreSQL et fichiers chiffrés avec manifeste cohérent. Snapshot quotidien et conservation de 7 jours pour le pilote. Cible de perte maximale en cas de sinistre : 24 h si les sauvegardes quotidiennes sont effectivement réussies. Objectif de remise en service : 4 h, à mesurer lors d'un exercice ; aucune garantie de service n'est revendiquée.

Une instance restaurée démarre en mode de récupération, sans publication de contenu ni réactivation automatique des anciennes sessions. Le propriétaire réconcilie les politiques avec un point de contrôle fiable, confirme les membres et appareils courants, puis établit une nouvelle génération de groupe avant réouverture. Si aucun état de référence fiable n'existe, le projet reste en lecture seule jusqu'à une réadmission vérifiée. Une restauration ne doit pas remettre silencieusement en vigueur des accès révoqués après le snapshot.

Les clés nouvellement reçues déclenchent un paquet personnel. L'interface affiche le dernier point de sauvegarde confirmé, distinct de « contenu synchronisé ». Une sauvegarde indisponible n'empêche pas le travail ordinaire mais produit une alerte persistante « Récupération incomplète ». Un propriétaire doit avoir un paquet personnel confirmé pour une nouvelle clé d'archives avant de rouvrir les publications de cette période.

### 5.3 Perte d'un appareil avec un autre appareil encore disponible

L'appareil sain révoque celui perdu. Les projets affectés passent en attente de renouvellement. Les données déjà présentes sur le terminal sain restent lisibles. Pour ajouter un remplaçant : nouvelles clés d'appareil, appairage, autorisation locale explicite, puis admission par le propriétaire de chaque projet. Aucune copie brute d'état MLS de l'appareil perdu.

### 5.4 Perte de tous les appareils

1. Depuis une installation propre, l'utilisateur fournit le kit et télécharge le coffre d'identité chiffré. Ce téléchargement ne requiert pas une ancienne session perdue ; la protection repose sur le secret de forte entropie et une limitation des essais.
2. Le client déchiffre localement le coffre et prouve la possession de l'autorité de récupération sur un défi du serveur.
3. La génération du compte augmente atomiquement, tous les appareils et sessions antérieurs deviennent invalides, et le nouvel appareil reçoit de nouvelles clés.
4. Les sauvegardes personnelles disponibles sont déchiffrées. Leurs points de contrôle sont conservés ; un historique partiel n'est jamais présenté comme complet.
5. Dans chaque projet dont la personne reste membre, le propriétaire approuve le nouvel appareil et renouvelle le groupe. Il peut retransmettre les clés d'archives manquantes.
6. Si la personne récupérée est le propriétaire, son autorité restaurée autorise une nouvelle génération de groupe. Les appareils restants utilisent des KeyPackages valides ou se réinscrivent ; les anciennes sessions MLS ne sont pas reprises. Le propriétaire doit récupérer ses clés d'archives sauvegardées, ou les obtenir d'un membre restant, avant de certifier l'historique comme disponible.
7. Sans propriétaire disponible, les contenus récupérables peuvent être lus, mais les publications restent bloquées jusqu'à finalisation. Sans clé d'archive sauvegardée ni autre membre pouvant la transmettre, les contenus concernés sont irrécupérables, même si le compte est restauré.

Si un compte a été retiré d'un projet, récupérer son identité ne le réadmet pas. Les anciennes clés éventuellement présentes dans sa sauvegarde ne donnent pas les nouvelles clés. Une sauvegarde restaurée peut rouvrir des contenus déjà obtenus auparavant : la révocation n'est pas un effacement rétroactif.

Sans kit et sans appareil autorisé, aucun reset par l'administrateur ne restitue l'identité ni les contenus. Un nouveau compte peut être invité à nouveau par le propriétaire ; il possède une nouvelle identité vérifiée.

### 5.5 Coffre local

Cache, index, états de groupe et brouillons sont chiffrés dans le stockage local. Le mot de passe de déverrouillage reste local ; la cible initiale proposait Argon2id. Au 19 septembre 2026, le POC exécuté dérive directement la clé AES avec PBKDF2-SHA256/600 000 itérations et un sel aléatoire de 16 octets. Ce choix de faisabilité n'est pas encore l'arbitrage cible. La comparaison mesurée et la décision restent bloquantes G0 ; voir [le protocole](Benchmark_Coffre.md). [Libsodium](https://doc.libsodium.org/password_hashing/default_phf)

Verrouillage après 10 minutes d'inactivité et au clic « Verrouiller ». L'application retire les références aux secrets en mémoire au mieux, sans promettre un effacement matériel garanti en JavaScript. Aucun contenu ni clé dans `localStorage`, URL ou logs. Un seul onglet actif en écriture par profil navigateur ; les autres onglets affichent un état bloqué afin d'éviter des mises à jour concurrentes du même état MLS local.

## 6. Synchronisation, ordre et conflits

### 6.1 Autorité et transport

PostgreSQL porte le journal durable ordonné. Les WebSockets signalent seulement que des événements sont disponibles ; une coupure WebSocket ne peut pas perdre un événement accepté. Le client reprend le journal par curseur via REST et vérifie les signatures, politiques, versions et contenus avant application.

L'ordre de référence est celui des validations serveur, jamais celui des horloges des appareils. Un timestamp client n'est qu'une indication de création affichable. Le serveur voit l'heure de réception ; elle ne révèle pas l'échéance chiffrée d'une carte.

### 6.2 Enveloppe d'une opération

| Champ | Visible serveur | Utilité |
|---|---|---|
| `project_id`, `object_id`, `event_id` | Oui | Routage, idempotence, identification opaque. |
| `account_id`, `device_id`, `account_generation` | Oui | Autorisation et attribution de l'opération. |
| `operation_kind` | Oui | Contrôles create/update/archive et validation de la structure externe. |
| `policy_version`, `group_generation`, `epoch` | Oui | Refus d'un état de sécurité périmé. |
| `base_version`, `previous_object_hash` | Oui | Contrôle de concurrence et liaison de la chaîne d'un objet. |
| Clé de contenu enveloppée, nonce, ciphertext | Oui, sous forme cryptographique | Stockage sans lecture du contenu. |
| Signature de l'appareil | Oui | Authenticité et liaison de l'en-tête au contenu chiffré. |
| Texte, titre, description, échéance, nom/MIME du fichier | Non | Charge utile chiffrée. |

L'enveloppe authentifiée inclut l'instance et la version du protocole pour empêcher les substitutions interprojets ou entre installations. Son format canonique exact doit être fixé avant codage des signatures. La confidentialité ne masque pas le type d'opération, les identifiants opaques ou la taille.

L'événement reçoit après validation un numéro de séquence serveur et un reçu. Le reçu n'est pas une preuve absolue contre un serveur malveillant. Les clients conservent leurs derniers points de contrôle et refusent une régression connue.

### 6.3 Transaction d'acceptation

Sous verrouillage du projet et de l'objet concerné, le serveur vérifie dans cet ordre : session et génération actives ; appareil autorisé ; état du projet ; politique/époque courantes ; signature ; idempotence ; rôle ; version de l'objet ; disponibilité des blobs référencés et quotas.

Puis il ajoute l'événement et actualise la version dans une transaction unique. La réponse est envoyée après commit. Une notification WebSocket émise ensuite est facultative pour la durabilité.

`event_id` est unique par projet. Une répétition strictement identique renvoie le même résultat si l'appelant reste autorisé. Réutiliser cet identifiant avec d'autres octets est refusé. Après rechiffrement ou résolution d'un conflit, le client emploie un nouvel identifiant d'événement ; un identifiant local d'intention garde le lien UX, sans déclencher une deuxième publication si la première a été acceptée.

### 6.4 Hors connexion et reprise

1. Lecture possible des contenus déjà téléchargés, après déverrouillage local.
2. Édition enregistrée dans une file de brouillons chiffrée. L'état affiché est « En attente », jamais « Synchronisé ».
3. À la reconnexion, synchroniser d'abord générations, révocations, politiques et transitions cryptographiques.
4. Résoudre les accusés de réception manquants : rechercher l'événement avant tout renvoi.
5. Télécharger les événements récents et calculer les conflits de versions.
6. Si toujours autorisé, préparer une nouvelle enveloppe sous l'époque courante et publier.
7. Si l'accès est retiré, ne rien transmettre. Le client conforme purge clés/cache de projet et brouillons associés, puis indique la perte des modifications non publiées.

Une période d'inactivité qui empêche de reprendre l'état MLS conduit à une réadmission d'appareil. L'historique provient alors des archives ; aucune restauration d'une ancienne session pour contourner le renouvellement.

### 6.5 Règles de conflits

| Cas | Règle fixée |
|---|---|
| Deux messages nouveaux | Ajouts indépendants, ordonnés par séquence d'acceptation. |
| Deux modifications de la même version d'une carte | La première acceptée produit N+1 ; l'autre reçoit `VERSION_CONFLICT`. |
| Champs différents d'une même carte | Même règle ; aucune fusion automatique dans ce prototype. |
| Modification contre archivage de carte | La seconde opération reçoit un conflit ; pas de réactivation implicite. |
| Déplacement de carte | Nouvelle version de carte ; colonne et position chiffrées. Égalité de position départagée localement par `object_id`. |
| Commentaire contre archivage | Le commentaire porte aussi la version attendue du parent ; un parent archivé le fait refuser. |
| Retrait de membre contre écriture | L'ordre transactionnel décide ; après T0, aucune nouvelle acceptation pour le membre retiré. |

L'écran de conflit montre la version publiée et le brouillon, et propose « Abandonner mon brouillon » ou « Reprendre avec la version actuelle ». Le deuxième choix produit une nouvelle modification explicite sur la dernière version, avec nouvel identifiant. Les deux textes restent visibles avant décision ; aucun bouton ne réécrit silencieusement la version distante.

### 6.6 Fichiers

Le client génère une clé par fichier, chiffre avant upload, envoie dans un espace de transit et vérifie l'intégrité avant d'annoncer le fichier disponible. Le stockage objet est privé ; aucun nom original dans les chemins ni les métadonnées serveur.

La finalisation associe atomiquement le blob à un événement autorisé. Les téléchargements passent par une API qui revérifie les droits ; pas d'URL publique ou de lien de téléchargement durable contournant la révocation. Les uploads interrompus restent invisibles. Les blobs sans référence finalisée sont nettoyés après 24 h. Un téléchargement déjà effectué ne peut pas être repris au destinataire.

Pour un upload commencé avant un changement d'époque et finalisé après : refuser l'ancien événement, puis créer une nouvelle enveloppe si la personne reste autorisée. Si l'ancienne clé du fichier a pu être communiquée au groupe révoqué, générer une nouvelle clé et réenvoyer un nouveau blob chiffré. Aucun fichier n'est publié sous un ancien secret par commodité.

## 7. Architecture et données

Client React/Next.js utilisé côté navigateur : interface, coffre local chiffré, file de brouillons, recherche locale, validation des politiques et événements, bibliothèque MLS et chiffrement des objets. Le rendu serveur ne reçoit aucun contenu déchiffré.

Backend Rust : authentification par appareil, contrôle d'accès, séquencement, transactions, quotas, invitations, transfert de blobs et diffusion de notifications WebSocket. Il ne déchiffre pas les contenus métier et ne prétend pas valider le sens des textes ou des échéances.

PostgreSQL : comptes, appareils, projets, politiques signées, membres, invitations, transitions de groupe, événements, versions opaques d'objets, références de fichiers et paquets de secours chiffrés. Les autorisations et changements de clés sont traités dans le même domaine transactionnel.

Stockage objet compatible S3 : ciphertexts, avec chiffrement d'infrastructure supplémentaire possible mais sans le confondre avec le chiffrement côté client.

### Schéma logique minimal

| Entité | Champs structurants / contrainte |
|---|---|
| `accounts` | id, identity_public_key, generation, status. |
| `devices` | id, account_id, generation, public_keys, certificate, state ; historique des révocations conservé. |
| `projects` | id, owner_id, state, policy_version, group_generation, epoch, next_sequence. |
| `memberships` | project_id + account_id uniques, role, status ; projection vérifiable des politiques. |
| `project_devices` | project_id + device_id, état d'admission, référence de transition. |
| `policies` | project_id + version uniques, previous_hash, signed_payload. |
| `invitations` | id, project_id, role, token_hash, expires_at, status, approved_identity. |
| `group_transitions` | id, project_id, base_epoch, target_epoch, generation, signed_manifest, MLS_payload, archive_packet_refs. |
| `objects` | id, project_id, kind, current_version, last_event_hash, archived ; pas de titre ou échéance en clair. |
| `events` | enveloppe, ciphertext, signature, server_sequence ; unicité project/event et project/sequence. |
| `blobs` | id, project_id, opaque_storage_key, cipher_size, cipher_digest, state, finalized_event_id. |
| `recovery_packets` | account_id, device_id, génération, numéro de paquet, ciphertext, signature, checkpoint ; paquets immuables. |
| `recovery_identity_vaults` | account_id, format_version, ciphertext de l'autorité d'identité ; accès dédié à la récupération. |

Les noms et pseudonymes affichés peuvent être chiffrés dans les profils partagés. L'exploitant connaît néanmoins les correspondances d'identifiants compte/appareil/projet. Les liens techniques entre un blob et son événement peuvent révéler la structure de collaboration ; ils font partie des métadonnées assumées.

### Contrats API indicatifs

| Action | Endpoint indicatif | Résultat attendu |
|---|---|---|
| Défi et connexion appareil | `POST /auth/challenges`, `POST /auth/sessions` | Session liée à un appareil et une génération. |
| Politique courante | `GET /projects/{id}/control` | Politique signée, état et transitions à récupérer. |
| Lire les événements | `GET /projects/{id}/events?after=cursor` | Page ordonnée, curseur de reprise. |
| Publier | `POST /projects/{id}/events` | Reçu stable ou erreur métier explicite. |
| Préparer une révocation | `POST /projects/{id}/revocations` | Accès coupé, projet suspendu. |
| Finaliser un changement de groupe | `POST /projects/{id}/transitions` | Transition atomique et nouvelle politique. |
| Envoyer/finaliser un fichier | `POST /projects/{id}/uploads`, `POST /uploads/{id}/finalize` | Blob inaccessible aux lecteurs avant finalisation valide. |
| Récupérer un blob | `GET /projects/{id}/blobs/{blob_id}` | Flux chiffré après contrôle d'accès courant. |
| Ajouter un paquet de secours | `POST /recovery/packets` | Reçu de sauvegarde indépendant du reçu de contenu. |
| Récupérer le compte | `POST /recovery/challenges`, `POST /recovery/complete` | Preuve vérifiée, nouvelle génération atomique. |

Erreurs : `ACCESS_REVOKED`/403, `ROLE_FORBIDDEN`/403, `VERSION_CONFLICT`/409, `SECURITY_STATE_STALE`/409, `REKEY_REQUIRED`/409, `EVENT_ID_REUSED`/409, `INVALID_SIGNATURE`/422, `BLOB_NOT_READY`/409. Les messages externes évitent de confirmer l'existence d'un projet à un non-membre. Une autorisation est vérifiée avant de rendre un ancien reçu d'idempotence.

### Métadonnées, logs et exploitation

Le serveur voit : IP pendant la connexion, identifiants et clés publiques, graphe d'appartenance, rôles, états, opérations, heures de réception, versions et volumes. Il ne voit pas : contenu des messages/cartes, échéances, noms de fichiers, clés privées non chiffrées, index de recherche et secrets de secours.

Logs du pilote : codes d'erreur et mesures agrégées ; pas de corps HTTP, jetons, URLs d'invitation, contenus, clés ou identifiants utilisateur dans les erreurs applicatives. Logs de proxy sans IP persistée pour l'exploitation courante ; limites anti-abus en mémoire. Traces techniques minimales supprimées après 7 jours. Cette configuration doit être contrôlée sur le proxy, Rust, le stockage, les traces navigateur et les outils d'erreur ; ne pas qualifier les logs d'anonymes sans examen.

## 8. États visibles dans l'interface

L'état fonctionnel du projet (actif ou archivé) et son état de sécurité (prêt ou renouvellement requis) sont deux champs indépendants. Un projet archivé peut donc nécessiter une rotation sans redevenir modifiable.

| Objet | États |
|---|---|
| Membre | Invitation demandée → empreinte à vérifier → admission en cours → actif → révoqué. |
| Appareil | Local → appairé au compte → en attente par projet → admis → révoqué. |
| Modification | Brouillon → en attente → en envoi → synchronisée ; ou conflit, bloquée par sécurité, refusée. |
| Projet | Actif → renouvellement des accès → actif ; ou archivé. Un projet archivé peut aussi attendre une rotation. |
| Récupération | Identité restaurée → archives partielles/complètes → projets en attente d'admission → opérationnel. |

Écrans du prototype : création d'identité et kit ; projets ; discussion/Kanban/fichiers ; membres et vérification ; appareils ; conflits ; récupération. Dans le projet, un indicateur distinct montre l'état de synchronisation, l'état des accès et le dernier point de sauvegarde personnelle.

## 9. Scénarios vérifiables

Jeu commun : Alice propriétaire, Bruno contributeur, Chloé lectrice, Diane non-membre. Appareils A1/A2, B1/B2, C1, D1. Projet P et projet Q séparés. Carte K en version 3. Les clés et contenus utilisés sont exclusivement fictifs.

Chaque scénario produit un rapport : préconditions, action, assertions client/API/base, traces expurgées, résultat pass/fail. Les refus doivent être testés par appels directs et clients modifiés, pas seulement par boutons désactivés.

| ID | Étant donné / Quand | Alors : résultat observable obligatoire |
|---|---|---|
| T01 | Diane connaît l'ID de P et tente de lire événements ou blobs. | Aucun contenu ni clés ; requête refusée ; aucun changement d'état. |
| T02 | Chloé soumet une création de carte signée avec sa vraie clé via appel direct. | `ROLE_FORBIDDEN` ; aucun événement accepté. Un client recevant artificiellement cette écriture la rejette aussi. |
| T03 | Bruno tente de s'attribuer propriétaire ou modifie directement la projection SQL du rôle dans le banc de test. | Pas de politique valide signée par Alice ; clients refusent l'élévation et les opérations correspondantes. |
| T04 | Diane détient un lien valide mais Alice ne confirme pas son empreinte. | État en attente ; aucun Welcome ni paquet d'archives remis. |
| T05 | Le même jeton est accepté deux fois simultanément, ou utilisé après 24 h. | Une seule admission au maximum ; usage expiré refusé ; consommation atomique. |
| T06 | Le serveur substitue une autre identité lors de la comparaison d'empreintes. | Désaccord avec l'empreinte obtenue hors bande ; admission bloquée. |
| T07 | Diane est admise après publication de 10 messages, 2 versions de K et 1 fichier. | Elle retrouve exactement les 10 messages, les versions et le fichier, après vérification du paquet d'archives. |
| T08 | Un message de P est converti en tâche. | Nouvelle carte liée à l'ID source, audience P inchangée ; tentative de référence à Q rejetée par clients. |
| T09 | Alice retire Bruno à T0 alors que B1 est connecté et B2 hors ligne. | B1 et B2 perdent leurs API et sessions de projet ; P passe en attente de renouvellement. |
| T10 | P est en attente de renouvellement ; Alice essaie de publier un nouveau message. | `REKEY_REQUIRED` ; message conservé en brouillon, pas de publication sous l'ancienne clé. |
| T11 | Après rotation, un fichier et un message sont publiés ; on remet leurs nouveaux ciphertexts à B1 avec toutes ses anciennes clés. | B1 échoue à les déchiffrer ; A1 et C1 y parviennent. Vérification indépendante du seul refus HTTP. |
| T12 | B2 revient avec un brouillon daté avant T0. | Aucun envoi accepté ; la date locale n'accorde aucun droit ; client conforme purge les données de P. |
| T13 | Chloé passe de contributrice à lectrice pendant qu'elle prépare une modification. | Lecture conservée ; envoi de la modification refusé selon le rôle courant. |
| T14 | A1 et B1 modifient K depuis la version 3 ; A1 est accepté d'abord. | K passe à 4 ; B1 reçoit `VERSION_CONFLICT` ; aucune version 5 automatique. |
| T15 | Après T14, Bruno résout explicitement le conflit sur version 4. | Nouvel événement signé/chiffré ; version 5 ; tous les clients convergent sur le choix explicite. |
| T16 | Une carte est archivée pendant qu'un autre appareil prépare un commentaire ou une modification. | Conflit ou refus parent archivé ; pas de réactivation implicite ni commentaire attaché en silence. |
| T17 | Un événement est accepté puis la réponse réseau est perdue ; le client renvoie exactement les mêmes octets et ID. | Même reçu et même séquence ; une seule ligne d'événement, un seul message affiché. |
| T18 | Le même `event_id` est réutilisé avec un autre contenu ou nonce. | `EVENT_ID_REUSED` ; aucune seconde publication. |
| T19 | Les notifications WebSocket sont perdues, dupliquées ou reçues dans le désordre. | La reprise REST par curseur reconstruit chaque événement une seule fois ; état final identique. |
| T20 | Un octet du contenu, du projet, de l'auteur ou de la version liée est modifié. | Signature ou authentification échoue ; l'objet n'est pas appliqué ni présenté comme valide. |
| T21 | A1 est arrêté après écriture locale d'un brouillon, avant envoi. | Au redémarrage et déverrouillage, brouillon retrouvé ; aucun affichage « synchronisé » injustifié. |
| T22 | A2 est appairé mais pas encore admis à P. | Compte reconnu, contenus de P indisponibles ; après validation d'Alice, nouvelles clés et historique disponibles. |
| T23 | Tous les appareils de Bruno sont perdus ; kit et sauvegardes valides sont disponibles. | Nouvelle génération, anciennes sessions refusées, archives restaurées jusqu'au point connu ; nouvel appareil en attente dans P puis admis par Alice. |
| T24 | Récupération avec mauvais kit, coffre absent, ou absence de tout kit et appareil. | Aucun contournement administrateur ; erreur explicite sans annoncer une restauration réussie. |
| T25 | Le dernier paquet personnel manque, mais Alice possède les clés d'archives récentes. | Historique signalé partiel puis complété après retransmission autorisée ; aucune perte masquée. |
| T26 | Alice récupère son compte après perte de A1 et A2. | Anciennes générations refusées ; nouveau groupe créé et vérifié ; archives restaurées séparément ; aucun recyclage d'une ancienne session MLS. |
| T27 | Bruno, déjà retiré de P, restaure son compte avec un ancien kit valide. | Il ne redevient pas membre de P ; aucune nouvelle clé de P remise. Ses anciennes copies restent hors garantie d'effacement. |
| T28 | La rotation échoue après blocage des accès, ou Rust redémarre avant finalisation. | P reste suspendu ; reprise idempotente de la transition ; aucun retour automatique à l'ancienne clé. |
| T29 | Un upload s'interrompt à 50 %, ou son auteur est révoqué avant finalisation. | Aucun fichier disponible aux membres ; finalisation révoquée refusée ; blob orphelin nettoyé après délai. |
| T30 | Le serveur, PostgreSQL, stockage objet et logs sont inspectés après usage de marqueurs en clair uniques. | Aucun marqueur de contenu ni secret en clair trouvé ; les métadonnées prévues restent visibles. Ce test ne prouve pas l'absence de toutes les fuites. |
| T31 | Restauration d'un snapshot cohérent sur une instance de test, puis retour d'un client possédant un point de contrôle plus récent. | Ancien historique récupérable ; recul détecté, synchronisation bloquée jusqu'à réconciliation explicite ; pas de réutilisation silencieuse de sessions cryptographiques restaurées. |
| T32 | Deux onglets du même profil tentent d'écrire en parallèle. | Un seul détient l'état crypto en écriture ; l'autre est bloqué sans consommation concurrente de l'état MLS. |
| T33 | Une révocation et une écriture sont déclenchées simultanément à répétition. | Chaque résultat correspond à un ordre transactionnel unique : avant T0 accepté, après T0 refusé ; aucune acceptation sous l'ancien état après le seuil. |
| T34 | Le projet P est archivé, puis un appareil est déclaré compromis. | Contenu non modifiable ; révocation et rotation toujours exécutables. |
| T35 | Après révocation puis réinvitation de Bruno, une période intermédiaire contient 3 messages. | Avertissement d'historique complet ; après nouvelle admission les 3 messages deviennent lisibles, conformément à D03. |
| T36 | Une sauvegarde personnelle échoue après réception de nouvelles clés. | Travail possible avec alerte explicite ; « sauvegarde à jour » absent. Une nouvelle période créée par Alice reste suspendue tant que son paquet nécessaire n'est pas confirmé. |

### Exemple de test détaillé : révocation pendant coupure réseau

Préconditions : Bruno a B1 et B2, tous deux admis ; B2 est hors ligne ; K est en version 3 ; A1 est connecté. Préparer sur B2 un brouillon qui change le titre de K.

Action : A1 retire Bruno ; relever T0 et la politique signée ; tenter un POST de B1 ; terminer la rotation ; A1 publie un fichier F2 et K version 4 ; reconnecter B2 ; fournir manuellement à B2 les ciphertexts F2/K4 dans un harnais de test.

Assertions : POST B1 refusé ; aucun événement de B2 accepté ; A1 voit K4 ; C1 déchiffre F2 ; B2 ne déchiffre ni F2 ni K4 avec ses anciennes clés ; le cache de B2 est purgé par le client conforme ; une copie préalable de K3 peut rester lisible hors application. Rapport distinct pour contrôle d'accès et résultat cryptographique.

## 10. Plan de réalisation et critères de passage

| Jalon | Livrable concret | Condition de passage |
|---|---|---|
| J0 — Faisabilité crypto et navigateur | Deux clients réels, bibliothèque et versions figées, identité vérifiée, groupe, archives, ajout/retrait et reprise après redémarrage. Formats documentés et menaces revues. | Déchiffrement autorisé, échec après retrait, authentification du contexte et récupération d'archives démontrés. Si l'intégration échoue, revoir le choix avant le Kanban. |
| J1 — Identité et accès | Comptes, kit, appareils, invitations, politiques signées, API avec contrôles d'accès. | T01 à T06, T22 et récupération d'identité isolée. |
| J2 — Parcours de contenu | Discussion, carte depuis message, Kanban et fichiers chiffrés. | T07, T08, T20, T29, T30. |
| J3 — Synchronisation | Journal durable, file locale, idempotence, versions et écran de conflit. | T14 à T21, T32. |
| J4 — Cycle de vie complet | Révocations, rekey, compte perdu, sauvegardes, reprise après crash. | T09 à T13, T23 à T28, T31, T33 à T36. |
| J5 — Essai utilisateur | Trois petites équipes réalisent un parcours guidé avec données fictives, puis un parcours sans aide. | Aucun blocage de sécurité ouvert ; difficultés d'invitation, compréhension de l'audience et récupération documentées. |

Cibles de mesure, à qualifier sur un environnement décrit : 10 sessions concurrentes ; convergence en ligne sous 2 s pour 95 % des événements sur réseau local contrôlé ; reprise de 100 événements sous 5 s ; absence de doublons, pertes silencieuses ou acceptations interdites dans tous les essais. Mesurer client, Rust/PostgreSQL, taille des fichiers, navigateur et latence ; ne pas transformer ces cibles en promesses avant résultat.

La validation exige trois niveaux : tests de règles et d'états ; intégration avec transactions concurrentes et pannes injectées ; parcours dans de vrais navigateurs et avec la vraie bibliothèque cryptographique. Un mock de chiffrement ne valide pas T11, T20, T23 ou T26.

Les tests décrits constituent un plan de vérification. Avant usage avec données sensibles, la composition identité/MLS/archives/récupération, la distribution du code web et l'implémentation doivent faire l'objet d'une revue indépendante.

## 11. Décisions prises et points de blocage techniques

Les règles produit du document sont proposées comme base : audience unique, historique complet, rôles simples, reprise avec conflits explicites, récupération par kit et suspension des écritures pendant rotation.

Restent à figer à J0 : versions et plateformes de la bibliothèque MLS, formats de certification d'appareils, suites et formats d'enveloppes, traitement des nonces, encodage signé, dérivation du coffre, paramètres du verrouillage local et format des checkpoints. Ce sont des conditions d'implémentation et de revue, pas des fonctions à inventer au fil du développement par génération de code.

Le prototype est considéré comme démontré lorsque tous les scénarios applicables passent sur une implémentation réelle et que les limites ci-dessus sont visibles dans l'expérience utilisateur et dans sa documentation.

# Contrats figés du POC J0 — révision 1

19 septembre 2026. Code de référence : `8b64559df2c171b93370ebbe3cc371a0dc9bb310`. Ces contrats décrivent le POC exécuté, pas un protocole de production. Décisionnaire : Clément Jonckheere, sur son instruction de clôture ; transcription technique : Codex. Acceptation des ADR-003/005/006/010/011 limitée à ce périmètre, sans revue indépendante présumée.

## 1. Sérialisation et octets

`web/crypto.js:canonical()` est l'encodeur commun des objets signés et des données associées AES du POC web, suivi de `TextEncoder` UTF-8.

- null, booléens, chaînes, entiers JS sûrs, tableaux denses et objets ordinaires JSON. Flottants, NaN, infinis, undefined et instances de classe sont refusés. Les producteurs du laboratoire ne fournissent ni tableaux creux, ni accesseurs, ni cycles ; leur rejet exhaustif n'est pas implémenté.
- Clés triées par `Object.keys().sort()` (unités UTF-16), noms et chaînes échappés par `JSON.stringify`, sans espace ; tableaux dans leur ordre ; `-0` devient `0`. Aucune normalisation Unicode. Les surrogates isolés suivent l'échappement JSON.
- **Pas de conformité RFC 8785 revendiquée.** Les clés JSON dupliquées ne sont pas rejetées avant parsing ; les champs supplémentaires sont signés mais généralement non rejetés. Pas encore de validateur exhaustif de schéma, profondeur et taille.
- Octets applicatifs en base64 standard avec padding, pas base64url. JWK P-256 pour les signatures applicatives ; ECDSA/SHA-256 WebCrypto, signature r||s de 64 octets en base64, pas DER. Empreinte d'identité : SHA-256 du SPKI DER, 64 caractères hexadécimaux minuscules.
- MLS : sérialisation TLS OpenMLS, transport JS en tableaux d'octets. Snapshot Rust en JSON interne lié aux dépendances ; ce n'est ni une sauvegarde inter-version garantie, ni la sérialisation des politiques.

Vecteur minimal : `{b:2,a:[true,null,"é"]}` → `{"a":[true,null,"é"],"b":2}` ; hex UTF-8 : `7b2261223a5b747275652c6e756c6c2c22c3a9225d2c2262223a327d`.

ADR-016 reste applicable : avant interop native, encoder dans le noyau commun, sans réimplémentations indépendantes Swift/Kotlin.

## 2. Enveloppes authentifiées

Format : `{format:1,iv:<base64>,ciphertext:<base64>}`. AES-256-GCM ; IV aléatoire 12 octets ; tag 128 bits concaténé au ciphertext. Clair et contexte sont canonicalisés séparément ; contexte utilisé comme AAD et fourni par l'appelant, non transporté dans l'enveloppe. Version différente refusée ; contexte erroné et altération refusés par AES-GCM. Le parseur n'impose pas encore une liste stricte de champs autorisés.

| Usage | AAD exacte | Clair |
| --- | --- | --- |
| Coffre local | `{domain:"frameup-j0/local-vault/v1",vault:<nom>,revision:<entier>}` | État appareil |
| Identité | `{domain:"frameup-j0/identity-vault/v1",accountId}` | `{privateJwk,publicJwk}` |
| Archives | `{domain:"frameup-j0/archive-backup/v1",accountId}` | `{archiveKeys:[<base64>,...]}` |
| Document REC-05/08 | `{project:"P",version:1}` | `{text:"archive-canary"}` |

La dernière ligne est une fixture, pas une enveloppe métier complète. La liaison instance/projet/objet/événement/génération/politique de l'architecture cible n'est pas encore implémentée. Rotation des archives par période, clés distinctes par fichier et partage de tout l'historique ne sont pas démontrés par REC-05.

## 3. Ancres de confiance

| Objet | Format et contrôles réels | Ancre extérieure obligatoire |
| --- | --- | --- |
| Politique | `{policy,signature}` ; fixture `policy={domain:"frameup-j0/policy/v1",projectId,version,ownerAccount,members:[{id,role}]}`. Vérification domaine, projet, version entière minimale, signature. | Clé propriétaire liée à une empreinte épinglée ; projet et minimum de version déjà fiables. |
| Certificat | `{certificate,signature}` ; `certificate={domain:"frameup-j0/device/v1",accountId,generation,deviceId,mlsPublic,signingPublic}`. Vérification domaine, compte, génération, appareil, clé de signature MLS, signature. | Clé d'identité préalablement authentifiée ; compte, génération et appareil attendus. |
| KeyPackage | TLS validé par OpenMLS ; BasicCredential et clé de signature comparées au certificat dans ID-10. | Certificat vérifié ; BasicCredential seule ne prouve pas l'identité du compte. |
| Bundle identité | `{accountId,identityPublic,identityVault}` ; restauration, comparaison SPKI et preuve de possession par signature. | Mots hors ligne et empreinte d'identité connue avant récupération ; cohérence interne du bundle insuffisante pour identifier un tiers. |

Les ancres sont injectées par le harnais. Vérification humaine, ancrage de génération serveur, expirations, défis d'origine et délégation restent J1. Les vérificateurs ne contrôlent pas encore tous les rôles, l'unicité des membres, la correspondance ownerAccount/clé ni une chaîne complète de certificats. Les méthodes MLS n'imposent pas les contrôles applicatifs d'admission : leur liaison testée localement n'est pas une preuve d'autorisation serveur.

## 4. Mots et récupération

24 mots anglais BIP39 encodent 256 bits aléatoires et leur checksum. L'entropie est la racine HKDF-SHA256, avec sel UTF-8 `frameup-j0/recovery/v1`, info canonique `{accountId,purpose}`, sortie AES-256. `purpose` vaut `identity-wrap` ou `archives-wrap`.

Clés distinctes par usage, **racine commune** : vol des mots et des paquets correspondants expose identité et archives. Les mots ne contiennent pas les données ; les paquets restent nécessaires. La clé d'identité restaurée ne déchiffre pas directement le paquet d'archives. REC-09 contrôle une politique locale authentifiée, pas une récupération serveur. Aucun état MLS actif n'est restauré à partir des mots.

## 5. Coffre et persistance

IndexedDB `frameup-j0:<nom>`, version 1, object store `vault`, clés `meta` et `sealed`. Métadonnées en clair : `{format:1,kdf:"PBKDF2-SHA256",iterations:600000,salt:<base64 16 octets>,revision:0,dirty:false}`. Version/KDF/itérations vérifiés à l'ouverture. PBKDF2 dérive **directement** la clé AES du coffre ; pas d'étage DEK/KEK distinct. Passphrase ≥12 unités UTF-16 sans normalisation ni mesure d'entropie. Le KDF cible reste [à arbitrer sur mesures](Benchmark_Coffre.md).

Clair : `{format:1,deviceId,signing:{privateJwk,publicJwk},mls:<chaîne snapshot>,outbox:[],inbox:[],seen:[]}`. Snapshot Rust : `{format:1,name,public,group,storage}` ; octets en tableaux, group nullable, storage en paires triées par clé. Ce stockage contient des secrets et ne doit jamais être publié en clair. Compatibilité attachée aux lockfiles, migration inter-version non démontrée.

Le harnais prend le Web Lock `frameup-j0:<nom>` pendant toute la session ; la classe Vault seule ne l'acquiert pas. Une mutation persiste dirty=true avant de modifier MLS, puis écrit snapshot chiffré, outbox, révision suivante et dirty=false dans une transaction unique. Sortie réseau disponible après commit seulement. Révision liée à l'AAD ; empreintes reçues dans seen ; répétition sortante avec les mêmes octets. Exception : fermeture ; dirty à la reprise : RECOVERY_REQUIRED.

## 6. Limites explicitement acceptées pour ce POC

- Fin de transaction IndexedDB observée, pas preuve de fsync, coupure électrique, kill OS ou durabilité matérielle. Les pannes sont des exceptions injectées suivies de fermeture/reprise propre.
- Rejeu d'un ancien snapshot complet avec ses métadonnées possible ; révision locale et dirty ne sont pas un compteur monotone externe. Checkpoint fiable et restauration serveur restent J4.
- Éviction/effacement du profil peut supprimer le coffre. Aucune persistance navigateur garantie ni UX de récupération produit validée. Les mots ne sauvegardent ni brouillons ni état MLS.
- Secrets et JWK privés présents en mémoire JS/WASM, export transitoire pour stockage chiffré, effacement au mieux. Ni protection contre un client distribué malveillant ni garantie matérielle.
- Une entrée malformée peut imposer récupération. Classification fine des erreurs, bornage des buffers/listes, uploads, purge et verrouillage d'inactivité restent à construire.
- Relais en mémoire, pas de révocation serveur transactionnelle prouvée. Récupération propriétaire/générations/réadmission restent J1/J4 ; revue indépendante avant données sensibles.

Cette acceptation ferme la revue des contrats du POC, sans prétendre livrer les fonctions de production correspondantes. G0 exige encore la mesure physique et la décision KDF. Aucun scénario métier J1/J4 n'est ajouté rétroactivement au gate G0.

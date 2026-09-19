# Coffre — mesure physique Chrome et arbitrage intermédiaire

Analyse du 19 septembre 2026 par Codex, dans le cadre de l'arbitrage demandé par Clément Jonckheere. **Argon2id satisfait le budget sur la cible déclarée sous Chrome ; G0 reste ouvert jusqu'au complément Firefox et à la version complète de Chrome.** La cible desktop n'est pas étendue au mobile par cette mesure.

## Référence et provenance vérifiée

- [Rapport brut fourni par Clément](../reports/reference/target-2026-09-19-chrome/frameup-coffre-mesure.json), conservé sans modification ; SHA-256 `f640ccc0881a03ade12206bfd7c4752bb32bbd25a98a12cd31dd83e88ace4d9b`.
- Exécution : `2026-09-19T17:47:33.876Z` → `2026-09-19T17:47:46.767Z`, statut COMPLETE ; 10 répétitions, clair JSON de 1 048 601 octets.
- Machine déclarée : MSI MAG B550M BAZOOKA (MS-7C95 rev 2.0), AMD Ryzen 5 3600 6C/12T 3,6 GHz, 16 Go RAM. Windows 11 Pro 10.0.26200 build 26200, secteur, économie désactivée. `declaredSlowestPhysicalTarget=true` : cible la plus lente retenue, selon la déclaration de l'opérateur.
- Navigateur identifié par le User-Agent : Chrome 145 sur Windows x64. **Version complète non fournie** : `metadata.system` contient encore `[Firefox/Chrome VERSION EXACTE]`. La chaîne `Chrome/145.0.0.0` ne permet pas d'inventer le numéro de build complet.
- Commit déclaré propre : `0553526fae84823211917881272837abb4e65136`, fusion effective de la PR #1, vérifiée sur GitHub ; arbre `a5572f700cf04aae926a5a5aa82e471fc22d92fd`. Ce n'est donc pas un commit inconnu ou une divergence du benchmark livré.
- Les 8 empreintes de fichiers sources/lockfile correspondent aux octets Git après conversion LF→CRLF (checkout Windows). Les 2 bundles ont été reconstruits depuis les sources Git et le lockfile : empreintes identiques à celles de l'export. Cela vérifie le rattachement au benchmark, sans prétendre certifier à distance l'appareil ou l'exécution physique.
- Bundle worker : `7fb46288177b82417c7c3d3a6443ec7fea76a6eeaae45ae3d4fe2177553fad10` ; bundle page : `ac8e460072712171b28c9f3abaa97c32d5f9e94687575c91d0b9b51e931a9489`.

Le matériel annoncé a 16 Go ; `deviceMemoryHintGiB=8` est un indice exposé par le navigateur et n'est pas traité comme une mesure contradictoire de RAM installée. Les détails matériels restent déclaratifs.

## Résultats recalculés depuis les échantillons

| Mesure | PBKDF2-SHA256 / 600k | Argon2id / 64 Mio, t=3, p=4 |
| --- | ---: | ---: |
| Dérivation médiane | 87,6 ms | 177,5 ms |
| Déverrouillage médian, comparateur identique | 170,75 ms | 259,25 ms |
| Déverrouillage p95 empirique / maximum | 181,2 ms | 269,9 ms |
| Déverrouillage de la première invocation | 185,0 ms | 267,2 ms |

Les médianes, p95 et maxima publiés correspondent aux 10 valeurs brutes pour chaque métrique. Avec 10 observations et l'estimateur utilisé, le p95 est le maximum observé ; ce n'est pas une garantie statistique sur une population d'appareils.

Surcoût médian Argon2id pour le déverrouillage comparable : **88,5 ms**. Son maximum observé reste environ 7,4 fois sous le plafond de travail de 2 s. Le véritable `Vault` PBKDF2 se déverrouille en médiane en 164,1 ms, au maximum en 173,3 ms ; begin/commit en médiane en 49,6 ms, au maximum en 52,6 ms.

Délai maximal du timer UI : **18,4 ms**, inférieur au budget proposé de 100 ms ; onglet resté visible. Aucun échec dans les tours terminés. Le timer couvre la session entière, pas un score distinct par KDF. Les opérations de comparaison tournent dans un Worker ; cela ne prouve pas la réactivité d'une intégration produit qui les exécuterait sur le thread principal.

## Décision technique consignée

**Retenir Argon2id comme choix cible provisoire, sous réserve de la mesure Firefox prévue au protocole et du complément de provenance Chrome.** Paramètres : version 19, mémoire 65 536 Kio, 3 passes, 4 lanes, sel aléatoire 16 octets, clé 32 octets. Ne pas abaisser les paramètres pour gagner les 88,5 ms observées.

Justification : le candidat respecte largement le budget de latence sur la cible déclarée ; son coût mémoire correspond au second profil de la [RFC 9106, section 4](https://www.rfc-editor.org/rfc/rfc9106.html#section-4). Ce coût mémoire est un élément de résistance aux essais de mots de passe hors ligne ; le benchmark ne mesure pas directement le coût d'attaque ni une équivalence de sécurité avec PBKDF2.

Il n'existe donc ici aucun motif de performance pour préférer PBKDF2. Cette conclusion concerne Chrome sur cette cible, pas tous les navigateurs ni le mobile. La sélection définitive du KDF et l'acceptation de l'implémentation restent distinctes : hash-wasm 4.12.0 est l'implémentation du comparateur, pas une bibliothèque déjà auditée pour FrameUp.

**Le coffre v1 continue d'utiliser PBKDF2-600k.** Cette mise à jour documentaire ne migre aucun coffre. Passer à Argon2id exige un format versionné et une migration testée ; ne jamais réinterpréter le format=1 existant. La clôture de faisabilité G0 ne vaut pas déploiement de cette migration.

## Compléments nécessaires, sans élargissement du gate

1. Fournir la version complète de Chrome utilisée (`chrome://version`, numéro de version uniquement), en indiquant toute mise à jour depuis le run. Le rapport brut restera inchangé ; ajouter un complément daté plutôt que réécrire sa provenance.
2. Refaire le même benchmark dans Firefox sur cet appareil, avec la version complète dans le champ système, et transmettre son JSON. Cette répétition était déjà demandée dans `Benchmark_Coffre.md` avant réception du résultat.

Pic mémoire : les champs de mesure sont nuls. **64 Mio est le paramètre Argon2, pas un pic de consommation mesuré.** La collecte OS était facultative ; son absence est une limite consignée, pas un nouveau blocage. Aucun budget de mémoire totale validé n'est revendiqué.

G0 reste **ouvert, mesure cible Chrome reçue et vérifiée, arbitrage Argon2id provisoire**. La matrice MLS Firefox verte ne remplace pas le benchmark Argon2id Firefox sur ce matériel. Les autres limites J1/J4 et de revue indépendante restent celles déjà acceptées pour le POC.

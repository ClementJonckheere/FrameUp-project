# Matrice mobile — backlog conditionnel, révision 0.2

19 septembre 2026. **Aucun scénario mobile exécuté. Aucun chantier mobile lancé.** Cette matrice remplace la v0.1 qui présentait M01–M12 comme un lot global. L'ordre actif est : clôturer J0-Web, choisir la route du pilote, puis lancer seulement les preuves nécessaires à cette route.

## Route PWA ou WebView : preuves préalables au pilote

| ID | Essai après G0/G1 | Attendu |
| --- | --- | --- |
| W01 | Charger le WASM et utiliser les APIs nécessaires dans les moteurs mobiles retenus. | Résultat réel par moteur/OS, sans déduire le succès de celui de Chromium desktop. |
| W02 | Créer, joindre et échanger avec un navigateur desktop de référence ; vérifier signatures et enveloppes. | Interopérabilité des mêmes formats et refus des variantes négatives. |
| W03 | Fermer, reprendre, perdre le stockage et mettre à jour le code. | Reprise sûre ou récupération explicite ; jamais réactivation silencieuse d'un ancien état. |
| W04 | Vérifier installation, déverrouillage et intégration OS indispensable. | Besoin du pilote satisfait. Pour un WebView : origine, plugins et bridge audités dans le périmètre du spike. |

Ce lot n'est pas exécuté en parallèle du lot natif. Son périmètre, sa durée et ses plateformes sont bornés avant lancement. Une lacune rédhibitoire ramène à G1.

## Route native seulement : ordre réduit

| Ordre | ID | Preuve | Critère d'arrêt |
| --- | --- | --- | --- |
| S1a | M01 | Cœur Rust indépendant, compilation sur une cible réelle, configuration RNG prouvée ; premiers appels de bindings, puis deuxième OS retenu. | Couplage non maîtrisé ou backend d'entropie non justifié : pas de suite fonctionnelle. |
| S1b, avant UI | M03 | Un seul encodeur Rust ; corpus JS historique, WASM et FFI ; octets signés/empreintes/AEAD identiques et erreurs typées cohérentes. | Divergence non expliquée, format ambigu ou FFI non viable : retour G1. |
| S1c | M02 | Groupe, admission et messages réels web ↔ natif dans les deux sens, avec clés propres ; rejouer les tests web après refactor. | Échec d'interop ou régression web : pas de coffre/UI en parallèle pour masquer le blocage. |
| S2a | M04 | Coffre local protégé, fermeture et reprise du même appareil sur matériel réel. | Protection ou reprise indéterminée : pas d'UI métier. |
| S2b | M05 | Arrêt réel du processus aux frontières de persistance/livraison ; reprise avec octets persistés ou refus d'état incertain. | Réutilisation possible d'état crypto : échec bloquant. |
| S2c | M08 | Verrouillage, refus d'authentification, indisponibilité/invalidations de la clé de protection ; Android physique et iPhone physique si les deux OS sont retenus. | Repli silencieux non autorisé ou coffre illisible sans état explicite : échec bloquant. |

Un seul OS et un seul navigateur web de référence pour découvrir d'abord les erreurs d'interface ; le second OS devient nécessaire avant de conclure sur les deux plateformes. Une petite fixture hors UI suffit au contrôle FFI initial ; elle doit inclure succès, erreur et snapshot. La borne du spike est fixée avant S1, pas inventée après un dépassement.

## Combinaisons : ne plus les lancer toutes d'emblée

| Combinaison | Moment |
| --- | --- |
| Navigateur de référence / premier OS natif | S1 exploratoire, seulement si route native choisie. |
| Même navigateur / second OS natif | Fin S1 avant toute conclusion Android+iOS. |
| Second navigateur / Android, second navigateur / iOS | Qualification élargie après viabilité ; avant annonce du support complet. |
| Android / iOS | Qualification élargie et échanges réels avant pilote promettant cette combinaison. |

Les essais de qualification permutent créateur, invité, émetteur et destinataire. Le code de référence doit rester identifié par commit et empreinte de build. Un test de viewport mobile n'est pas un test d'application native.

## Scénarios reportés, jamais supprimés

| ID | Sujet | Dépendance et moment de validation |
| --- | --- | --- |
| M06 | Retrait et rejet des nouveaux ciphertexts par appareil exclu. | Couplage autorisation/admission ; avant pilote multi-appareils avec révocation. |
| M07 | Brouillons hors ligne et génération révoquée au retour. | Accès serveur et sync ; avant publication hors ligne différée. |
| M09 | Sauvegarde, réinstallation et migration, sans clonage MLS. | Politique de sauvegarde ; avant activation de ces parcours. Pas de sauvegarde migrable d'état actif entre-temps. |
| M10 | Kit, récupération de compte et archives, membre exclu. | Lots identité/récupération complets ; avant annonce de récupération mobile. |
| M11 | Doublons, ordre, accusés perdus et reprise sans push. | Lot sync complet ; avant pilote avec synchronisation réelle. L'invariant de persistance minimal reste déjà testé par M05. |
| M12 | Push générique, aperçu multitâche et logs expurgés. | Lot notification/UX confidentielle ; aucun push dans le spike. Pas de secrets dans les logs du spike. |

La réussite S1/S2 démontre une faisabilité limitée. Elle ne signifie ni application prête, ni clôture des contrôles d'accès, ni qualification complète du pilote. Conserver les preuves de plateformes, les limites et l'estimation révisée avant G2.

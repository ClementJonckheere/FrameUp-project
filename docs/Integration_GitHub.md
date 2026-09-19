> Mise à jour du 19 septembre 2026 : droits rétablis, PR #1 ouverte, matrice CI réussie. Le [rapport J0 v0.2](Rapport_J0.md) et ses références versionnées font foi pour le gate actuel. Le texte ci-dessous conserve la trace de la préparation antérieure.

# Intégration GitHub — état au 18 septembre 2026

Dépôt demandé : https://github.com/ClementJonckheere/FrameUp-project

## Constat

Le dépôt a été lu par la connexion GitHub : il est public, vide, et sa branche par défaut déclarée est `main`. Les lectures de README et AGENTS ont confirmé l'absence de contenu.

La tentative de création du README initial a été refusée par GitHub : HTTP 403, `Resource not accessible by integration`. Aucun commit, branche, PR ou workflow n'a donc été créé par cette tentative. Le résultat ne doit pas être confondu avec les droits du propriétaire : l'identité utilisateur peut avoir accès au dépôt alors que l'intégration ne dispose pas des autorisations nécessaires à l'écriture.

## Dossier préparé

Le dossier correspond à la racine du futur dépôt : sources J0 et lockfiles, workflow, tests et documentation. Il inclut ADR-016 révision 0.2 et un backlog mobile conditionnel. Le natif n’est plus la route par défaut ; J0-Web doit être clos avant tout spike mobile. Les binaires compilés, dépendances installées et profils navigateur sont exclus ; la CI reconstruit le WASM.

Les résultats locaux restent ceux du rapport J0 : 13 entrées réussies, aucun échec, trois blocs liés à Firefox non exécutés. La préparation GitHub n'ajoute aucune preuve cryptographique ni mobile.

## Accès à vérifier

Dans la configuration de la connexion GitHub utilisée avec ChatGPT/Codex, vérifier que `FrameUp-project` est inclus dans les dépôts autorisés et que l'intégration peut écrire du contenu. La publication d'un fichier de workflow peut nécessiter une autorisation supplémentaire spécifique aux workflows. Pour la PR et le suivi CI, les capacités correspondantes doivent également être accordées.

Il ne faut pas partager de jeton personnel dans le chat. Si cette connexion ne permet pas ces opérations, un dépôt des fichiers depuis le poste du propriétaire reste possible ; ce n'est pas une modification des protections du dépôt.

## Séquence prévue après rétablissement de l'accès

1. Relire l'état du dépôt : il a pu être initialisé entre-temps ; conserver tout contenu existant et lire les instructions éventuelles.
2. Initialiser seulement s'il est encore vide, puis créer une branche de travail dédiée.
3. Déposer les sources et le workflow dans une PR brouillon. Ne pas fusionner automatiquement.
4. Construire le WASM, exécuter les tests unitaires puis la matrice Chromium/Firefox sur le runner.
5. Lire les résultats et artefacts du commit testé, corriger les échecs et consigner les points restant ouverts.
6. Après clôture J0-Web seulement, arbitrer la route mobile et le budget ; aucun spike natif n’est lancé par défaut et aucun test mobile n’est câblé à cette CI.

## Révision documentaire après revue

Le séquençage a été corrigé sans modifier les sources cryptographiques ni relancer des tests identiques. Le refactor Rust/FFI et la migration de canonicalisation sont décrits comme travaux futurs conditionnels, pas comme implémentés. Aucun nouvel essai d’écriture GitHub n’a été effectué dans cette révision ; le dernier état constaté reste le refus 403.

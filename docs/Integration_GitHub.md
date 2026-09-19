# Intégration GitHub — 19 septembre 2026

Dépôt : https://github.com/ClementJonckheere/FrameUp-project

## État courant

Le propriétaire a initialisé `main` avec un README (commit `c2f36e2ec3674dc793b1186e253209ea0b3de050`) et a modifié les droits du connecteur. La création de la branche `codex/j0-browser-matrix` a ensuite réussi. Les anciens refus 403 sont des incidents historiques, pas le statut courant.

Le harnais est intégré sur cette branche et proposé en PR brouillon, sans fusion automatique. La CI reconstruit le WASM à partir des lockfiles puis lance les tests unitaires et les navigateurs réels. Le résultat dépend du commit et du run affichés dans GitHub Actions ; la seule présence du workflow ne valide pas J0.

## Périmètre

Les sources cryptographiques sont celles du harnais local. Les données et mots de passe des tests sont fictifs. Les profils, états secrets générés, dépendances installées et binaires ne sont pas versionnés.

J0-Web reste le seul chantier actif. Le mobile reste une exigence à arbitrer après clôture J0-Web ; aucun framework, extraction native ou test mobile n'est lancé ici. Les documents historiques de rapports locaux conservent leurs résultats et leur contexte de blocage Firefox.

## Preuves attendues

Chaque run conserve `reports/j0-results.json` et `reports/unit-results.tap` en artefacts. La synthèse navigateur est aussi imprimée dans les logs, sans secrets. Un FAIL ou BLOCKED du runner rend le job non réussi. Les scénarios de panne restent des exceptions injectées suivies d'une fermeture/réouverture, et ne démontrent pas la résistance à une coupure électrique.

La réussite navigateur, si elle est obtenue, ne clôt pas à elle seule les réserves sur autorisation métier, rollback, formats et revue cryptographique.

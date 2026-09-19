# Matrice J0-Mobile — spécification à exécuter

18 septembre 2026. **Aucun des tests de cette page n'est implémenté ou exécuté dans le harnais livré.** Une compilation native, un test navigateur avec viewport mobile ou un navigateur émulé ne vaut pas exécution dans l'application mobile.

Hypothèse de cible : Android et iOS. Le choix des versions minimales et des appareils physiques reste à fixer. Pour chaque résultat, conserver commit, version OpenMLS, suite crypto, version d'OS, type d'appareil et logs expurgés de secrets.

## Combinaisons requises

| Combinaison | Rôles à permuter | Statut |
| --- | --- | --- |
| Web Chromium / Android natif | Créateur, invité, émetteur, destinataire | À implémenter |
| Web Firefox / Android natif | Créateur, invité, émetteur, destinataire | À implémenter |
| Web Chromium / iOS natif | Créateur, invité, émetteur, destinataire | À implémenter |
| Web Firefox / iOS natif | Créateur, invité, émetteur, destinataire | À implémenter |
| Android natif / iOS natif | Créateur, invité, émetteur, destinataire | À implémenter |

## Scénarios

| ID | Précondition et action | Résultat attendu |
| --- | --- | --- |
| M01 | Compiler le moteur pour les deux OS ; charger la bibliothèque et générer deux appareils. | Clés propres à chaque installation ; suite et versions exactes consignées. |
| M02 | Sur chaque paire, créer le groupe depuis chaque plateforme, admettre l'autre via un KeyPackage certifié et échanger. | Welcome et messages compris des deux côtés, mêmes membres/epochs après convergence. |
| M03 | Soumettre les mêmes vecteurs de certificats, politiques, empreintes et enveloppes aux deux plateformes ; altérer contexte et signature. | Décisions identiques et contenus exacts ; rejet des variantes altérées. |
| M04 | Persister, fermer normalement l'app, relancer puis recevoir un nouveau message. | Reprise du même appareil, sans perte d'état ni création d'identité supplémentaire. |
| M05 | Arrêter réellement le processus avant/après persistance et avant/après transmission ; relancer. | Réémission des mêmes octets persistés ou récupération explicitement requise ; aucune réutilisation silencieuse d'un état incertain. |
| M06 | Ajouter un appareil puis retirer le mobile resté hors ligne ; lui remettre le nouveau ciphertext. | Membres conservés lisent ; appareil retiré échoue cryptographiquement même si le relais lui transmet les octets. |
| M07 | Créer des brouillons hors ligne, révoquer l'appareil, puis reprendre l'app. | Pas de publication sous l'ancienne génération ; information explicite sur le contenu non envoyé. |
| M08 | Verrouiller le téléphone, annuler le déverrouillage, invalider la clé locale selon les possibilités de l'OS. | Pas d'ouverture sans la capacité attendue ; état de récupération défini, sans crash silencieux ni recréation autorisée d'office. |
| M09 | Restaurer une sauvegarde sur le même téléphone et sur un autre ; réinstaller l'app. | Aucun clonage d'une session MLS active. Ancien enrôlement non réutilisé sans vérification ; parcours de nouvel appareil si nécessaire. |
| M10 | Récupérer avec le kit sur installation propre ; inclure mauvais kit, paquet manquant et ancien membre exclu. | Identité/archives selon les données disponibles, nouvelle admission séparée, anciennes sessions refusées après renouvellement serveur. |
| M11 | Couper le réseau, dupliquer et réordonner les événements, perdre un accusé, reprendre sans notification reçue. | Déduplication, rattrapage et état convergent ou erreur explicite ; aucune dépendance au push pour l'exactitude. |
| M12 | Produire une notification sur téléphone verrouillé, ouvrir le multitâche et inspecter les logs. | Aucun contenu confidentiel dans le payload générique, les aperçus protégés et les logs. |

M01–M09 constituent le noyau technique du spike mobile. M10–M12 nécessitent aussi les composants de compte, de synchronisation et de notification ; leur préparation ne vaut pas validation de ces composants.

Mesurer en complément démarrage, admission, chiffrement d'un message, reprise d'un backlog et coût du coffre sur les appareils cibles. Fixer les seuils avec le responsable du projet après ces mesures. Les résultats sur simulateur et sur terminal physique doivent rester identifiables séparément.

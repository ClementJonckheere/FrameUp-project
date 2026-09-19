# FrameUp — scénarios vérifiables J0

Les codes ci-dessous sont propres au harnais. Ils ne remplacent pas T01–T36 de la spécification fonctionnelle. Chaque combinaison de navigateur dispose de profils frais A et B. A2 représente un appareil supplémentaire, avec clés indépendantes ; la certification de son appartenance au même compte reste une intégration ultérieure.

## MLS, persistance et pannes

| ID | Précondition et action | Résultat attendu |
| --- | --- | --- |
| MLS-01 | A crée le groupe, valide le KeyPackage de B, ajoute B ; B traite le Welcome. | Clés A/B distinctes, identité/clé du KeyPackage concordantes, epochs égaux. |
| MLS-02 | A envoie à B, puis B à A. | Les deux contenus fictifs exacts sont retrouvés. |
| VAULT-01 | Après un échange, lire les enregistrements du coffre. | Présence de ciphertext ; absence des chaînes canaris et champs sensibles recherchés. Test ciblé, pas analyse forensique de tout le profil. |
| VAULT-02 | A est déverrouillé ; un second onglet tente d'ouvrir le même coffre. | Rejet explicite `DEVICE_ALREADY_OPEN`. |
| MLS-03 | Fermer complètement le contexte B, le relancer avec le même profil et déverrouiller. | B déchiffre un nouveau message de A. |
| MLS-04 | Générer deux messages ; livrer le second avant le premier, puis répéter le premier. | Les deux messages sont acceptés ; le doublon est reconnu par le wrapper. |
| FAULT-01 | Lever une exception après persistance d'un envoi ; redémarrer A. Simuler réception par relais, accusé perdu, restauration du relais et réémission. | Même événement disponible, une entrée relais, déchiffrement exact, doublon reconnu, acquittement possible. |
| MLS-05 | Ajouter A2, injecter une panne après persistance du commit, redémarrer A. Livrer commit à B et Welcome à A2. | Le contrôle persisté est récupéré ; A et B lisent un message de A2. |
| MLS-06 | Retirer B pendant qu'il reste hors ligne ; faire appliquer le commit à A2 ; remettre à B le nouveau ciphertext sans filtre de relais. | A2 le lit ; B est rejeté par OpenMLS, et non par une simple ACL du relais. |
| MLS-07 | Altérer un octet du nouveau ciphertext destiné à A2. | Rejet cryptographique, distinct d'une erreur de coffre verrouillé. |
| FAULT-02 | Lever une exception après mutation MLS mais avant snapshot ; fermer et rouvrir le navigateur. | Déverrouillage refusé par `RECOVERY_REQUIRED`. |
| VAULT-03 | Fermer le coffre, tenter un mauvais mot de passe puis le bon. | Le mauvais échoue ; le bon ouvre le coffre sans recréer les clés. |

Matrice demandée : Chromium/Chromium, Firefox/Firefox et Chromium/Firefox. Les rôles émetteur/récepteur échangent dans les deux sens ; le scénario mixte conserve Chromium comme créateur du groupe. Une indisponibilité de Firefox bloque la suite Firefox et les deux combinaisons qui en dépendent.

## Identité et récupération — suite de 20 contrôles par navigateur

| ID | Action / invariant attendu |
| --- | --- |
| REC-01 | Kit de 24 mots valide : récupérer la même empreinte d'identité. |
| REC-02 | 24 mots avec checksum invalide : rejet. |
| REC-03 | Autre kit valide : rejet du coffre d'identité. |
| REC-04 | Clé dérivée pour les archives appliquée à l'identité : rejet. |
| REC-05 | Restaurer le paquet de clés puis déchiffrer un document fictif exact. |
| REC-06 | Présenter l'enveloppe d'identité comme paquet d'archives : rejet. |
| REC-07 | Paquet d'archives altéré : rejet. |
| REC-08 | Même ciphertext de document, autre projet dans les données associées : rejet. |
| REC-09 | Restaurer l'identité puis vérifier une politique signée qui l'exclut : elle reste absente. Ce contrôle local ne teste pas encore la réadmission côté serveur. |
| REC-10 | Paquet d'archives absent : rejet. |
| ID-01 | Politique signée du bon propriétaire, bon projet et bonne version : acceptation. |
| ID-02 | Politique modifiée après signature : rejet. |
| ID-03 | Politique d'un autre projet : rejet. |
| ID-04 | Politique sous la version minimale attendue : rejet. |
| ID-05 | Politique signée par une autre clé, vérifiée avec la clé attendue : rejet. |
| ID-06 | Substitution simultanée de clé et signature, empreinte de confiance inchangée : rejet. |
| ID-07 | Certificat d'appareil signé correspondant au contexte attendu : acceptation. |
| ID-08 | Certificat de génération précédente : rejet. |
| ID-09 | Clé MLS attendue substituée : rejet. |
| ID-10 | Inspecter un vrai KeyPackage OpenMLS : appareil et clé publique concordent avec le certificat. |

Les contrôles négatifs utilisent de vraies opérations WebCrypto/OpenMLS. La suite s'arrête au premier échec et n'annonce pas ses contrôles restants comme réussis.

## Tests unitaires de support

Quatre tests Node : encodage canonique restreint ; authentification du projet par AES-GCM ; idempotence et collision d'identifiant du relais ; conservation du refus d'un destinataire révoqué après restauration du relais.

## Preuves non fournies

Pas de test d'arrêt brutal par le système, de coupure électrique, de retour malveillant à un ancien profil, de suppression sûre sur disque, de commits concurrents, de renouvellement complet de génération de compte, de reprise du propriétaire ou de parcours complet d'historique à l'admission. Les tests de faux mots de passe et d'altération ne mesurent pas la robustesse contre un adversaire contrôlant le code client.

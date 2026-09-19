# FrameUp — Charte graphique et interface

> Remplacement partiel au 18 septembre 2026 — [ADR-016, révision 0.2](ADR-016_Application_mobile.md) : l’exclusion du mobile est remplacée à l’échelle du produit. La validation initiale J0-Web reste limitée au desktop. Route mobile et entrée au pilote restent conditionnelles ; la [matrice mobile](Matrice_J0_mobile.md) est un backlog, pas un chantier lancé.

Version 0.1 · 17 septembre 2026 · Direction proposée, à valider visuellement

Cette charte fournit une première identité cohérente pour FrameUp et les règles d'interface nécessaires au prototype. Son aperçu visuel est `FrameUp_Charte_Graphique_v0.1.pdf`. Les maquettes sont illustratives : elles ne sont ni une application ni une preuve de chiffrement.

## 1. Intention

FrameUp aide une petite équipe à faire avancer un projet confidentiel sans disperser ses échanges. L'identité doit exprimer la clarté, la continuité du travail et une maîtrise compréhensible des accès.

Signature proposée : **« Vos projets, dans le même cadre. »** Elle accompagne les supports de présentation ; elle n'est pas répétée dans chaque écran.

Ton : direct, calme et concret. Dire ce qui se passe, ce qui reste disponible et l'action utile. Éviter les promesses « inviolable », « anonymat total », « sécurité absolue ». Le cadenas ne remplace jamais une explication de qui peut lire le contenu.

Direction visuelle : fonds clairs, surfaces blanches, navigation bleu nuit, accent turquoise, formes rectangulaires adoucies et beaucoup d'espace autour des décisions importantes. Pas de fond animé, néon ou décor évoquant une alerte permanente.

## 2. Marque et signe

Nom toujours écrit **FrameUp**, sans espace ni changement de casse. Le mot-symbole utilise une graisse forte ; la priorité est sa lisibilité, pas l'ajout d'un effet typographique.

Signe proposé : deux demi-cadres opposés, avec un court trait ascendant dans l'angle supérieur droit. Il évoque le projet délimité et sa progression. C'est un concept vectoriel provisoire, pas une identité dont l'originalité ou la disponibilité a été vérifiée.

| Règle | Valeur |
|---|---|
| Construction du symbole | Grille 24 × 24 ; traits de 2 unités ; terminaisons arrondies. |
| Taille minimale du symbole | 24 px en interface ; version simplifiée à étudier pour le favicon 16 px. |
| Mot-symbole seul | Taille de texte minimale 20 px. |
| Zone de protection | Au moins 1/2 hauteur du symbole sur chaque côté. |
| Fond clair | Symbole turquoise foncé et mot bleu nuit. |
| Fond bleu nuit | Symbole menthe et mot blanc. |
| Monochrome | Une seule couleur sombre ou blanche, selon le fond. |

Interdits : déformer, incliner, ajouter ombre/gradient, remplacer le « U » par un cadenas, utiliser le symbole de marque pour signaler qu'un message a été vérifié. La marque et les états de sécurité ont des fonctions différentes.

## 3. Palette et contrastes

Les tokens sémantiques sont la référence d'implémentation. Les couleurs d'état n'expriment jamais l'information seules : icône, texte et action éventuelle les accompagnent.

| Token | Hex | Usage |
|---|---|---|
| `brand-navy` | `#142B3B` | Navigation, titre de marque, grands aplats. |
| `brand-teal` | `#087F8C` | Action principale, élément actif, lien souligné. |
| `brand-mint` | `#5EEAD4` | Accent sur fond bleu nuit ; jamais texte courant sur blanc. |
| `surface-page` | `#F5F7FA` | Fond général. |
| `surface-card` | `#FFFFFF` | Cartes et panneaux. |
| `text-primary` | `#172B3A` | Texte principal. |
| `text-secondary` | `#526575` | Texte secondaire, aide et métadonnées. |
| `border-subtle` | `#CBD5E1` | Séparateurs décoratifs, pas contour unique d'un champ essentiel. |
| `border-control` | `#7A8B99` | Contours de champs et contrôles quand leur forme doit être identifiable. |
| `focus-ring` | `#1D4ED8` | Focus sur surfaces claires. |
| `success` / `success-bg` | `#166534` / `#EDF8F0` | Synchronisé, action terminée. |
| `warning` / `warning-bg` | `#92400E` / `#FFF4DB` | Conflit, attente ou récupération incomplète. |
| `danger` / `danger-bg` | `#B42318` / `#FFF0EE` | Retrait d'accès, erreur bloquante ou action destructive. |

Contrastes calculés selon la luminance relative sRGB :

| Texte / fond | Rapport | Usage retenu |
|---|---:|---|
| Blanc / turquoise | 4,75:1 | Bouton primaire. |
| Blanc / bleu nuit | 14,60:1 | Navigation. |
| Texte principal / blanc | 14,55:1 | Lecture courante. |
| Texte secondaire / blanc | 6,04:1 | Aide et métadonnées. |
| Texte secondaire / fond de page | 5,63:1 | Légendes. |
| Bleu nuit / menthe | 9,87:1 | Accent de marque. |
| Succès / fond succès | 6,55:1 | Badge avec texte. |
| Attention / fond attention | 6,49:1 | Bannière de conflit. |
| Danger / fond danger | 5,93:1 | Alerte. |
| Contour contrôle / blanc | 3,51:1 | Délimitation de champ. |
| Focus bleu / blanc | 6,70:1 | Anneau de focus. |

La cible est WCAG 2.2 AA pour l'application : 4,5:1 pour le texte courant, 3:1 pour le grand texte concerné et les éléments graphiques essentiels. Ces mesures ne constituent pas à elles seules un audit de conformité. [Contraste du texte](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [critères WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## 4. Typographie

Police principale proposée : **DejaVu Sans**, auto-hébergée dans l'application, graisses 400 et 700. Elle est utilisée dans le PDF pour que les exemples correspondent au choix. Le caractère de l'identité vient de la composition et du contraste de tailles. Le système ne dépend pas d'un service de polices externe.

Fallback : `system-ui, -apple-system, "Segoe UI", sans-serif`. Mono pour références techniques uniquement : `"DejaVu Sans Mono", ui-monospace, monospace`. Avant distribution des fichiers de police, conserver leur licence et vérifier les formats web retenus ; les fichiers de police ne sont pas livrés dans cette version de la charte.

| Style | Taille / interligne | Graisse | Usage |
|---|---|---|---|
| Présentation | 40 / 48 px | 700 | Couverture, page d'accueil hors application. |
| Titre de page | 28 / 36 px | 700 | Nom du projet ou écran. |
| Titre de section | 20 / 28 px | 700 | Panneau, titre de modal. |
| Titre de carte | 16 / 24 px | 700 | Carte Kanban. |
| Corps | 16 / 24 px | 400 | Messages, descriptions, formulaires. |
| Texte compact | 14 / 20 px | 400 | Boutons et navigation dense. |
| Métadonnées | 12 / 18 px | 400 | Date, auteur, badge ; pas les instructions critiques. |

Limiter les paragraphes à environ 65–75 caractères par ligne. Éviter les capitales sur les phrases et les longues suites de labels. Les éléments réduits des maquettes PDF sont des vues d'ensemble à l'échelle, pas les tailles CSS finales.

## 5. Grille, espacement et formes

Base de 4 px ; échelle : 4, 8, 12, 16, 24, 32, 48, 64. Espacement interne d'une carte : 16 px ; entre cartes : 12 px ; entre grandes sections : 32 px. Rayon standard : 8 px pour champs/boutons, 12 px pour cartes et dialogues. Bordure : 1 px. Ombre discrète uniquement pour les éléments surélevés, pas sur chaque ligne.

Sur bureau : barre latérale 240 px, en-tête 64 px, contenu avec marges 32 px. À partir de 1 280 px, un panneau de détail optionnel de 360 px peut apparaître. Entre 768 et 1 023 px, navigation repliée et détail dans une page/panneau dédié. Sous 768 px, navigation en tiroir et liste de tâches à une colonne. Pas de Kanban trois colonnes comprimé illisible.

Les bornes CSS sont des choix de mise en page ; le POC technique valide d'abord Chromium et Firefox sur bureau. Les variantes étroites sont conçues pour le reflow et les futurs usages mobiles, sans annoncer un support mobile déjà testé.

## 6. Navigation et composants

Navigation globale : **Projets**, puis accès à **Appareils**, **Récupération**, **Paramètres**. Dans un projet : **Discussion · Tableau · Fichiers · Membres**. L'échéance reste dans la carte ; aucun onglet calendrier inactif n'est affiché. La recherche indique « Rechercher dans ce projet » et n'étend pas implicitement son audience.

| Composant | Règles |
|---|---|
| Bouton principal | Fond turquoise, texte blanc, hauteur cible 44 px, libellé d'action (« Créer une tâche »). Hover `#066773`, actif `#05545E`. |
| Bouton secondaire | Fond blanc, texte principal, contour de contrôle ; pas un second accent concurrent. |
| Bouton destructif | Texte/fond danger selon priorité ; confirmation explique la portée avant « Retirer l'accès ». |
| Focus | Anneau de 3 px, décalé de 2 px ; bleu sur fond clair, menthe sur navigation sombre. Jamais supprimé. |
| Champ | Label permanent au-dessus, aide en dessous, erreur textuelle associée ; placeholder distinct du label. |
| Carte Kanban | Titre, échéance, auteur ou indicateur utile, menu « Déplacer vers… » ; pas d'information uniquement au survol. |
| Badge | Texte + icône simple ; pas d'ombre et pas de badge « sécurisé » permanent. |
| Dialogue | Titre clair, portée de l'action, annulation visible, focus initial pertinent et retour au déclencheur. |
| Toast | Confirmation courte non critique ; les blocages persistent dans l'écran. |
| Skeleton / chargement | Réserve les dimensions ; mention textuelle si attente prolongée ; pas de faux pourcentage. |

Icônes : contours de 2 px sur grille 24 px, angles arrondis. Taille 20 ou 24 px ; conteneur interactif 44 × 44 px quand l'icône est seule. L'icône de fermeture ou le menu a un nom accessible. Le système peut utiliser une bibliothèque cohérente vérifiée au développement ; ne pas mélanger plusieurs styles ni utiliser des emojis comme pictogrammes fonctionnels.

## 7. États métier et microtextes

Les trois dimensions suivantes restent distinctes : **synchronisation du contenu**, **disponibilité des accès**, **sauvegarde de récupération**. Le vert « Synchronisé » ne prouve pas que le kit ou les archives sont sauvegardés.

| État | Message principal | Aide / action |
|---|---|---|
| Invitation reçue | « Accès en attente » | « Le propriétaire doit vérifier votre identité avant de vous donner accès au projet. » |
| Avant admission | « Cette personne verra tout l'historique conservé. » | Identité et rôle visibles ; confirmer après vérification. |
| Hors connexion | « Hors connexion · 2 modifications en attente » | « Vos brouillons restent sur cet appareil. » |
| Publication confirmée | « Synchronisé » | Heure de dernière confirmation facultative. |
| Conflit | « Cette tâche a changé pendant votre modification. » | « Comparer les versions » ; ne jamais proposer seulement « Réessayer ». |
| Rotation en cours | « Mise à jour des accès » | « L'envoi est suspendu. Vous pouvez préparer un brouillon. » |
| Accès retiré | « Vous n'avez plus accès à ce projet. » | « Vos modifications non envoyées ne peuvent pas être publiées. » |
| Sauvegarde incomplète | « Récupération incomplète » | « Certaines clés ne sont pas encore sauvegardées. » |
| Compte récupéré | « Votre identité est restaurée. » | « Certains projets attendent encore l'autorisation de ce nouvel appareil. » |
| Fichier interrompu | « Fichier non envoyé » | « Réessayer » uniquement après contrôle des droits courants. |

Le kit est visible uniquement dans un écran dédié, après action explicite, avec avertissement de portée. Autoriser copier/coller et gestionnaires ; ne jamais afficher une vraie phrase de récupération dans une maquette, un screenshot de diagnostic ou une session replay.

Le verrouillage après 10 min d'inactivité a un préavis : « L'application va se verrouiller » avec « Rester connecté ». Les brouillons sont sauvegardés localement avant verrouillage quand cela est possible ; le retour reprend le contexte après authentification locale. Le libellé « Rester connecté » concerne ici le maintien du déverrouillage local, à tester auprès des utilisateurs pour éviter l'ambiguïté.

## 8. Accessibilité et mouvement

- Objectif WCAG 2.2 AA ; aucune conformité revendiquée avant audit de l'application.
- Taille d'action visée 44 × 44 px par choix produit. Le minimum AA WCAG 2.2 est 24 × 24 px sous conditions et exceptions ; ne pas confondre ces deux valeurs. [Taille des cibles](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Navigation entièrement au clavier ; lien d'évitement, focus visible et non masqué, labels et erreurs associés, annonces `aria-live` modérées pour les statuts.
- Le Kanban dispose d'un menu « Déplacer vers… » utilisable au clavier et au clic ; le drag-and-drop n'est jamais l'unique moyen. [Alternative aux mouvements de glissement](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- À 200 % de zoom, aucun texte tronqué essentiel ; tester le reflow à largeur équivalente 320 CSS px. Les comparaisons de conflit se superposent verticalement sur écran étroit. [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- Les erreurs et conflits ne sont pas distingués par la couleur seule. Les confirmations sensibles présentent les conséquences avec le nom de la personne/projet concerné.
- Animations de 120–180 ms, limitées à opacité et changements discrets ; respect de `prefers-reduced-motion`. Aucun clignotement ou boucle décorative.
- Autoriser le collage des secrets et les gestionnaires de mots de passe ; ne pas imposer de test de mémoire comme seul moyen d'authentification. [Authentification accessible](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)

Ces exigences s'appuient sur [WCAG 2.2](https://www.w3.org/TR/WCAG22/) ; la durée d'animation et les tailles cibles sont des choix de design FrameUp.

## 9. Tokens CSS de départ

```css
:root {
  --fu-brand-navy: #142b3b;
  --fu-brand-teal: #087f8c;
  --fu-brand-mint: #5eead4;
  --fu-surface-page: #f5f7fa;
  --fu-surface-card: #ffffff;
  --fu-text: #172b3a;
  --fu-text-muted: #526575;
  --fu-border: #cbd5e1;
  --fu-control-border: #7a8b99;
  --fu-primary: #087f8c;
  --fu-primary-hover: #066773;
  --fu-primary-active: #05545e;
  --fu-on-primary: #ffffff;
  --fu-focus: #1d4ed8;
  --fu-success: #166534;
  --fu-success-bg: #edf8f0;
  --fu-warning: #92400e;
  --fu-warning-bg: #fff4db;
  --fu-danger: #b42318;
  --fu-danger-bg: #fff0ee;
  --fu-font: "DejaVu Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --fu-font-mono: "DejaVu Sans Mono", ui-monospace, monospace;
  --fu-space-1: 4px;
  --fu-space-2: 8px;
  --fu-space-3: 12px;
  --fu-space-4: 16px;
  --fu-space-6: 24px;
  --fu-space-8: 32px;
  --fu-space-12: 48px;
  --fu-space-16: 64px;
  --fu-radius-control: 8px;
  --fu-radius-card: 12px;
  --fu-touch-target: 44px;
  --fu-motion-fast: 120ms;
  --fu-motion-normal: 180ms;
}
:focus-visible { outline: 3px solid var(--fu-focus); outline-offset: 2px; }
.fu-sidebar { --fu-focus: var(--fu-brand-mint); }
@media (prefers-reduced-motion: reduce) {
  :root { --fu-motion-fast: 0ms; --fu-motion-normal: 0ms; }
}
```

Les styles de composants doivent consommer ces tokens. Les états désactivés gardent un libellé lisible et expliquent pourquoi l'action est indisponible ; ne pas réduire l'opacité de tout un panneau contenant du texte utile.

## 10. Vérification de la charte et prochaine validation

Effectué pour cette proposition : calcul des contrastes listés ; création et inspection visuelle du PDF. Non effectué : tests clavier, lecteur d'écran, accessibilité de l'application, audit du logo ou essais utilisateurs. Le PDF est un support visuel ; son accessibilité documentaire complète n'est pas certifiée. La version Markdown donne accès à toutes les règles et valeurs sous forme textuelle.

À valider visuellement : direction bleu nuit/turquoise, symbole de cadre, choix typographique et densité du tableau. À vérifier lors de l'implémentation : tous les états listés, variantes responsive, focus, sélection et annonce des erreurs. Le mode sombre est reporté ; ne pas produire une simple inversion automatique des couleurs.

# Publier une version Agentibou

## Le parcours habituel

1. Modifier l’application, incrémenter `version` dans `package.json` et `package-lock.json`, puis actualiser `docs/RELEASE-NOTES.md`.
2. Vérifier localement avec `npm test`, `npm run test:background`, `npm run test:recovery` et `npm run test:ui`.
3. Pousser les changements sur `main`.
4. Dans [Actions → Publish Agentibou](https://github.com/MattDevBzh/Agentibou/actions/workflows/release.yml), cliquer **Run workflow**. Un tag `vX.Y.Z` poussé déclenche également cette publication.
5. Attendre la réussite complète du workflow. Windows et Mac sont construits sur leurs systèmes respectifs, les paquets sont attachés à un brouillon, puis leurs empreintes et métadonnées de mise à jour sont vérifiées avant publication.

La release n’est rendue publique que lorsque les deux plateformes ont réussi. Une publication existante n’est jamais remplacée par ce workflow : pour un correctif, créer un numéro supérieur. Un brouillon d’un autre commit doit être examiné avant de relancer. Pour publier une ancienne branche, synchroniser d’abord la version choisie dans `main` afin de conserver le site et les notes cohérents.

Le site Atelier est actualisé après la release. Les binaires sont hébergés dans GitHub Releases, pas dans le dépôt ni GitHub Pages. Le site contient seulement les pages, les illustrations et les liens vers les fichiers effectivement publiés. Les checksums SHA-256 sont disponibles dans chaque release ; les flux de l’updater utilisent SHA-512.

## Signatures (secrets GitHub du dépôt)

Les secrets ne doivent jamais être commités ni écrits dans un ticket.

| Cible | Noms des secrets |
|---|---|
| Windows | `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` |
| Mac | `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` |

Sans certificat, Windows produit une bêta non signée. L’updater conserve les vérifications intégrées d’electron-updater ; aucun contournement de signature n’est ajouté. La signature de l’installateur doit être configurée avant de présenter la distribution comme signée.

Mac active la signature, la notarisation et les mises à jour natives uniquement quand les cinq secrets sont présents. Sinon, la compilation reste explicitement non signée et l’application se limite à signaler une nouvelle version avec un lien de téléchargement. Ne pas forcer `agentibouUpdates.macSigned` à `true` pour une application non signée.

## Comportement de l’application

- Recherche 15 secondes après le démarrage, puis toutes les six heures ; bouton de recherche manuelle.
- Windows : téléchargement automatique, installation uniquement après « Redémarrer pour installer ».
- Mac non signé : notification dans le tableau de bord et téléchargement via GitHub Releases.
- Aucune vérification réseau quand l’application est lancée en développement.
- Les échecs réseau restent récupérables et n’arrêtent pas le suivi des compagnons.
- Les anciennes données `.avatai` sont conservées. Les anciens ZIP nécessitent une première installation de la distribution équipée de l’updater.

Une release publiée et des tests automatisés réussis ne prouvent pas encore une migration réelle entre deux versions installées. Valider cette migration sur un poste Windows, puis sur un Mac signé, lors des versions suivantes. Contrôler notamment la conservation des préférences, les raccourcis, les hooks et la reprise après redémarrage.

## Diagnostiquer un compagnon immobile

Dans le tableau de bord, le réglage **Animations** distingue **Selon le système**, **Activées** et **Réduites**. Le premier suit les préférences d’accessibilité du système ; **Activées** permet explicitement de les remplacer pour les sprites Agentibou. Un changement d’état peut fonctionner avec une image fixe lorsque la réduction des mouvements est active. Les compagnons conservent `backgroundThrottling: false` indépendamment de ce réglage.

Le test `test:background` retire les commutateurs ajoutés par Playwright qui désactivent normalement les limitations d’arrière-plan. Il vérifie les images des compagnons sans focus, avec le tableau de bord actif, masqué puis minimisé. Il simule ensuite la préférence système de réduction des mouvements : respect par défaut, animation de chaque état après activation explicite, et retour au mode réduit ou système. La simulation du réglage et la variation des positions de sprites ne prouvent pas le rendu visuel sur chaque PC utilisateur.

# Agentibou

**Du code. Et un peu de compagnie.**

Agentibou est une application de bureau qui donne vie à tes sessions Codex, Claude Code et GitHub Copilot. Vic et Toktokette réfléchissent, travaillent et célèbrent la fin des réponses, dans de petites fenêtres flottantes.

[Découvrir le site](https://mattdevbzh.github.io/Agentibou/) · [Télécharger](https://github.com/MattDevBzh/Agentibou/releases/latest) · [Signaler un problème](https://github.com/MattDevBzh/Agentibou/issues)

## Installer

- **Windows x64** : télécharger l’installateur `.exe` et le lancer. L’application s’installe pour ton utilisateur et conserve ses préférences en dehors du dossier du programme. [Guide Windows](docs/INSTALLER-WINDOWS.md).
- **Mac Apple Silicon** : ouvrir le `.dmg`, puis glisser Agentibou dans Applications. Le `.zip` est également disponible.
- Linux et Mac Intel ne sont pas distribués pour le moment.

Les premières distributions sont en bêta, sans signature éditeur ni notarisation. Le système peut en bloquer l’ouverture : vérifier la provenance du fichier avant de l’autoriser. Les paquets sont construits sur GitHub Actions ; les résultats des tests automatisés ne garantissent pas chaque configuration de bureau.

## Un compagnon, à ton rythme

- Quatre animations : repos, réflexion, travail et fin de réponse.
- Personnage, position, taille et visibilité indépendants pour chaque outil.
- Plusieurs sessions suivies, avec des bulles distinctes.
- Import de planches animées PNG/WebP. [Créer un compagnon](docs/CREER-UN-COMPAGNON.md).
- Animations réduites et préférences du système respectées.

« Terminé » signifie que l’agent a fini sa réponse. Ce n’est pas une validation du code, des tests ou d’un déploiement.

## Connecter les outils

| Outil | Connexion | Limites |
|---|---|---|
| Codex local | Journaux de l’app / CLI détectés automatiquement | Format interne ; sessions cloud non synchronisées |
| Claude Code | Bouton « Connecter sur ce poste », puis redémarrage des sessions | Hooks locaux |
| Copilot / VS Code | Bouton VS Code pour chaque projet | Mode Agent, hooks autorisés dans le projet |
| Copilot / Visual Studio | Bouton Visual Studio pour chaque solution, outil `agentibou_state` activé dans le chat | MCP indicatif : dépend des appels de l’agent |

Dans Visual Studio, demander à l’agent d’appeler `agentibou_state` au début et à la fin de son travail. Les sessions WSL, SSH, conteneurs et cloud ne sont pas automatiquement synchronisées avec le bureau local.

## Mises à jour

Windows recherche une version au démarrage puis toutes les six heures. Le téléchargement se fait en arrière-plan ; **« Redémarrer pour installer »** déclenche l’installation, uniquement à ton initiative. Un bouton permet aussi de rechercher une version manuellement.

Sur Mac, tant que la distribution n’est pas signée, Agentibou signale la nouvelle version et ouvre son téléchargement. La chaîne de publication peut activer les mises à jour natives Mac lorsque les certificats et la notarisation Apple sont configurés. [Publier une version](docs/PUBLIER.md).

En venant des anciens ZIP AvatAI / Agentibou, installer une première fois la nouvelle distribution et reconnecter les outils : le chemin de l’exécutable a changé.

## Données locales

Le suivi des agents reste sur ton ordinateur. Le bridge ne conserve pas les prompts, arguments d’outils ou réponses : uniquement fournisseur, session, projet, chemin, état et heure. La recherche de mises à jour contacte GitHub ; elle ne transmet pas ces conversations.

Les données sont dans `~/.agentibou` (`%USERPROFILE%\.agentibou` sur Windows). Si `~/.avatai` existe déjà, il est réutilisé pour préserver les anciens hooks, préférences et compagnons. Les variables `AGENTIBOU_HOME` et `AGENTIBOU_CLAUDE_DESKTOP_HOME` permettent d’isoler les tests ; les anciennes variables `AVATAI_*` restent compatibles.

Les connexions sauvegardent les configurations modifiées. Pour déconnecter, retirer les entrées Agentibou des hooks Claude, du fichier `.github/hooks/agentibou.json` ou du serveur `agentibou` dans `.vs/mcp.json`. Désinstaller l’application ne supprime pas automatiquement les données personnelles. Aucun démarrage automatique à la connexion du système n’est installé.

## Développer

Node.js 22+ et npm :

```sh
npm ci
npm start
npm test
npm run test:background
npm run test:recovery
npm run test:ui
```

Les tests Electron utilisent des dossiers temporaires isolés. Ils ne modifient pas les préférences ni les connexions personnelles.

```sh
npm run dist:win
npm run dist:mac
npm run site:build
npm run site:serve
```

Le site Atelier est généré dans `output/site/`. Pour générer la version publique avec les liens GitHub Releases : `node scripts/build-site.cjs --remote`. [Documentation du site](website/README.md).

## Illustrations

Vic et Toktokette sont les illustrations personnalisées incluses dans Agentibou. Leurs planches utilisent une grille 8 × 9 de 1536 × 1872 pixels. Elles ne sont pas au format Codex v2 à 11 lignes. La publication du dépôt ne constitue pas une licence générale de réutilisation de ces illustrations.

# Installer Agentibou sur Windows

1. Télécharger l’installateur Windows x64 `.exe` depuis [le site officiel](https://mattdevbzh.github.io/Agentibou/) ou [GitHub Releases](https://github.com/MattDevBzh/Agentibou/releases/latest).
2. Lancer l’installateur. Il installe Agentibou dans le compte utilisateur et crée un raccourci. Il n’est pas nécessaire d’installer Node.js.
3. Ouvrir Agentibou. Vic et Toktokette sont déjà inclus dans la bibliothèque des compagnons.

La bêta initiale n’est pas signée. Windows peut afficher un avertissement : vérifier que le fichier provient de la publication officielle avant de l’autoriser.

## Connecter les agents

- **Codex local** : ses sessions sont détectées automatiquement.
- **Claude Code** : cliquer « Connecter sur ce poste », puis redémarrer les sessions.
- **Copilot CLI** : cliquer « CLI · Ce poste », puis redémarrer les sessions du CLI. Connexion pour tous les projets locaux via les hooks utilisateur ; une version récente de Copilot CLI est nécessaire.
- **Copilot dans VS Code** : cliquer « VS Code », choisir le projet, puis utiliser le mode Agent. Refaire la connexion pour chaque projet.
- **Copilot dans Visual Studio** : cliquer « Visual Studio », choisir la solution et activer `agentibou_state` dans les outils du chat. Demander à l’agent de signaler le début et la fin : le suivi reste indicatif.

## Mettre à jour

Agentibou vérifie les versions au démarrage puis toutes les six heures. Il télécharge les nouvelles versions et affiche « Redémarrer pour installer ». L’installation n’est pas déclenchée sans ce clic. Le bouton « Chercher une mise à jour » relance une vérification en cas de besoin.

## Depuis un ancien ZIP AvatAI ou Agentibou

Quitter l’ancienne application depuis son icône de notification, puis installer cette nouvelle distribution. Refaire les connexions Claude Code / Copilot depuis Agentibou pour actualiser le chemin de l’exécutable. Redémarrer les sessions des outils. Retirer les anciens raccourcis pour éviter de relancer l’ancienne version.

Si `%USERPROFILE%\.avatai` existe, Agentibou le réutilise. Sinon les préférences, compagnons importés et événements sont dans `%USERPROFILE%\.agentibou`. Le bouton « Données locales » ouvre le dossier réellement utilisé.

## Retrouver un compagnon

Ouvrir Agentibou depuis l’icône de notification, puis cliquer « Réafficher tous les compagnons ». Les tailles et les positions sont conservées ; un compagnon non attribué attend la prochaine session de son outil.

## Désinstaller

Quitter Agentibou puis le désinstaller dans les paramètres Windows. Les données locales restent conservées. Pour déconnecter complètement les agents, retirer les hooks et le serveur MCP Agentibou dans les configurations des outils. Le README décrit les emplacements.

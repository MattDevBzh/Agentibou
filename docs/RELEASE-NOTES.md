# Agentibou 0.7.3

- GitHub Copilot CLI rejoint les outils suivis, avec son propre compagnon et ses réglages de taille et de visibilité.
- Le bouton « CLI · Ce poste » connecte tous les projets locaux via les hooks utilisateur de Copilot CLI, en respectant aussi `COPILOT_HOME`.
- Suivi du début des prompts, des appels d’outils, de la fin de chaque réponse et des erreurs. Les prompts, arguments et réponses ne sont pas conservés.
- Les configurations tierces sont préservées et les reconnexions ne dupliquent pas les hooks Agentibou.
- Le retour à une session CLI ouvre le dossier du projet ; retrouve la conversation dans ton terminal.

Pour activer le suivi après la mise à jour : cliquer sur **CLI · Ce poste** dans la carte GitHub Copilot, puis redémarrer les sessions de Copilot CLI. Une version récente du CLI prenant en charge les hooks utilisateur est nécessaire. Les sessions WSL, SSH, conteneurs et cloud ne sont pas synchronisées automatiquement.

Les hooks et l’interface ont été testés avec des événements simulés ; une conversation Copilot réelle reste à valider.

Bêta non signée / non notariée. Sous Windows, rechercher la mise à jour dans Agentibou puis cliquer sur « Redémarrer pour installer ». Sur Mac non signé, télécharger la nouvelle version.

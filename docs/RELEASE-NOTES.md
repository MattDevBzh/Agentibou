# Agentibou 0.8.0

- **Quota Copilot CLI** : affichage du pourcentage utilisé du compte connecté, actualisé toutes les cinq minutes. Lecture via le CLI installé, sans prompt ni appel de modèle ; une information absente est signalée comme indisponible.
- **Modèle dans les bulles de session** : nom du modèle fourni par Codex, Copilot CLI ou les hooks, avec extraction des métadonnées Claude si nécessaire. Les outils qui ne communiquent pas cette information sont signalés.
- **Menu au clic droit sur les avatars** : afficher ou masquer séparément modèles, sessions et consommation. Les réglages sont conservés par outil au redémarrage.
- **Prompt de création prêt à copier** : disponible dans les Compagnons de l’application et sur le site, pour générer une planche au format Agentibou (1536 × 1872 px, 8 × 9 cases transparentes).
- **Mode fun facultatif** : 200 blagues familiales intégrées, sans contenu raciste, misogyne ou sexuel. Nombre quotidien et horaires réglables, tirage aléatoire sans répétition avant épuisement du stock, uniquement sur un compagnon visible au repos. Le compteur est conservé au redémarrage, sans rafale après une veille.

Le mode fun est désactivé par défaut. Il affiche au maximum le nombre choisi selon la disponibilité des compagnons et la durée de la plage horaire ; deux apparitions sont espacées d’au moins cinq minutes.

Pour le quota Copilot CLI, une installation récente et connectée du CLI est nécessaire. Les hooks déjà installés restent compatibles. Les sessions WSL, SSH, conteneurs et cloud ne sont pas synchronisées automatiquement.

Bêta non signée / non notariée. Sous Windows, rechercher la mise à jour dans Agentibou puis cliquer sur « Redémarrer pour installer ». Sur Mac non signé, télécharger la nouvelle version. Les préférences et compagnons importés sont conservés.

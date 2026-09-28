# Agentibou 0.7.2

- Récupération automatique d’un compagnon dont le rendu est bloqué ou n’a pas démarré après 20 secondes, en complément de la récupération après crash.
- Réparation des fenêtres minimisées ou ayant perdu leur présence au premier plan ; reconstruction des surfaces transparentes après retour de veille, déverrouillage ou arrêt du processus graphique.
- « Réafficher tous les compagnons » reconstruit maintenant les fenêtres : plus besoin de redémarrer toute l’application pour tenter de récupérer un avatar invisible.
- Journaux locaux accessibles via « Journaux de diagnostic », avec rotation automatique et sans contenu de conversations.
- Tests de récupération exécutés sur Windows et macOS avant publication, y compris blocage du rendu et simulations de veille/perte du processus graphique.

La disparition intermittente sur le PC utilisateur n’a pas été reproduite directement. Ces correctifs couvrent plusieurs causes possibles ; les journaux permettront d’identifier un éventuel cas restant.

Bêta non signée / non notariée. Sous Windows, rechercher la mise à jour dans Agentibou puis cliquer sur « Redémarrer pour installer ». Sur Mac non signé, télécharger la nouvelle version.

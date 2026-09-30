# Agentibou 0.8.1

- Corrige le paquet Mac 0.8.0 dont la signature interne Electron incomplète provoquait le message « Agentibou.app est endommagé » après téléchargement.
- Range les documents embarqués dans le répertoire Resources prévu par macOS, afin de permettre le scellement correct du bundle.
- Applique une signature locale ad hoc au bundle Mac quand aucun certificat développeur Apple n’est configuré. Cette signature protège l’intégrité du paquet, mais ne remplace pas l’identification du développeur ni la notarisation Apple.
- Bloque désormais la publication si la vérification stricte des signatures échoue dans le DMG ou le ZIP, si leur contenu diffère, ou si l’application empaquetée ne démarre pas dans le test isolé.
- Clarifie les instructions d’installation Mac sur le site.

Sur Mac : éjecter les anciens DMG, télécharger la 0.8.1 et copier **Agentibou.app dans Applications**. La bêta reste non notariée par Apple ; après un premier essai d’ouverture, une autorisation peut être nécessaire dans **Réglages Système → Confidentialité et sécurité → Ouvrir quand même**.

Les fonctionnalités de la 0.8.0 sont conservées : quota Copilot CLI, modèles dans les bulles, réglages au clic droit, prompt de création et mode fun. Les données personnelles sont conservées. La version Windows reste disponible via la mise à jour habituelle.

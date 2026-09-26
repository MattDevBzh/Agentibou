# Créer un compagnon pour Agentibou 0.4

Le format ci-dessous correspond à Agentibou, qui réutilise l’atlas legacy de Vic. Il ne décrit pas le format des nouveaux pets Codex. Tu peux importer et nommer tes compagnons depuis l’app, sans recompiler.

## Prompt à copier

Remplacer les passages entre crochets. Joindre éventuellement l’image du personnage et le spritesheet `src/assets/vic.webp`, en précisant que ce dernier sert seulement de référence de disposition.

```text
Crée une planche d’animation (spritesheet) pour un petit compagnon de bureau.

PERSONNAGE : [description précise : espèce, silhouette, visage, vêtements, couleurs et accessoires].
STYLE : [exemple : personnage 3D cartoon doux, expressif, proportions chibi].
ACTIVITÉ AU REPOS : [exemple : jouer avec une petite balle].
ACTIVITÉ AU TRAVAIL : [exemple : taper sur un ordinateur portable].
CÉLÉBRATION : [exemple : petit saut joyeux, les bras levés].

Utilise l’image de personnage jointe comme référence d’identité si présente. Si une planche de référence est jointe, conserve seulement sa grille et l’emplacement des animations, pas son personnage.

FORMAT IMPÉRATIF
- Une seule image de 1536 × 1872 pixels.
- Grille invisible de 8 colonnes × 9 lignes.
- Chaque cellule mesure exactement 192 × 208 pixels.
- Fond réellement transparent avec canal alpha, sans damier dessiné.
- Aucun texte, chiffre, trait de grille, cadre, décor ou watermark.
- Une pose complète par cellule utilisée, sans débordement vers les cellules voisines.
- Même personnage, mêmes proportions, même tenue, même éclairage et même cadrage sur toutes les poses.
- Personnage centré horizontalement dans chaque cellule, pieds alignés vers y = 198 pixels, sauf pendant un saut. Conserver des marges pour les accessoires.
- Dessiner des étapes successives d’un mouvement, pas des illustrations indépendantes. Les poses de début et de fin doivent permettre une boucle sans saut visuel.

DISPOSITION — numérotation à partir de 1, du haut vers le bas et de gauche à droite
- Ligne 1, colonnes 1 à 6 : repos. Pose neutre, clignement, puis quatre étapes d’une petite activité au repos.
- Ligne 5, colonnes 1 à 5 : célébration. Préparation, départ du mouvement, sommet joyeux, retour, pose proche du départ.
- Ligne 6, colonnes 1 à 6 : petit contretemps. Expression perplexe ou contrariée, sans agressivité. Les colonnes 3, 4 et 5 doivent former une petite boucle expressive cohérente.
- Ligne 8, colonnes 1 à 6 : travail. Six étapes d’une frappe au clavier, mouvements subtils des mains et du regard, matériel immobile, boucle continue.
- Ligne 9, colonnes 1 à 6 : réflexion et attente d’une réponse, main au menton. Six poses calmes, regard interrogatif, petit mouvement de tête, boucle continue.
- Toutes les cellules non citées doivent être entièrement transparentes, notamment les lignes 2, 3, 4 et 7.

Le personnage doit rester lisible lorsqu’une cellule est affichée à sa taille réelle de 192 × 208 pixels. Éviter les détails minuscules et les variations de taille entre les poses.

Livrer l’image en PNG transparent, ou en véritable WebP avec transparence si cet export est disponible.
```

Une consigne ne garantit pas une grille exacte. Vérifier les dimensions, la transparence réelle, le centrage et les boucles avant installation. Une grille décalée se traduira par des morceaux de personnage ou des tremblements. Garder le fichier original si une préparation ou un recalage est nécessaire.

## Installer et choisir le compagnon

1. Ouvrir **Agentibou → Compagnons** dans la barre latérale.
2. Donner un nom dans **Nouveau compagnon**, puis cliquer **Importer sa planche**.
3. Choisir le PNG ou WebP. Agentibou vérifie que l’image est lisible et mesure exactement **1536 × 1872 pixels**, puis la copie dans sa bibliothèque locale. Le fichier d’origine reste intact.
4. Pour le même personnage partout, garder **Le même pour tous les outils** coché et choisir le **Compagnon par défaut**.
5. Pour des personnages différents, décocher cette option puis choisir pour **Codex**, **Claude Code**, **Copilot · VS Code** et **Copilot · Visual Studio**. « Par défaut » suit le choix commun. Les outils suivis affichent chacun leur compagnon, côte à côte. L’option « Garder les compagnons attribués visibles au repos » maintient tes personnages même sans tâche ; décoche-la pour un affichage limité à l’activité. Tes choix sont conservés au redémarrage.
6. Pour examiner toutes ses animations immédiatement, le choisir temporairement comme compagnon par défaut avec le mode commun, puis utiliser **Repos**, **Réflexion**, **Travail** et **Terminé**. Rétablir ensuite les choix souhaités. Le mode commun conserve les affectations par outil.

Les dimensions seules ne garantissent pas une bonne animation : Agentibou ne recadre pas l’image et ne corrige pas les cases vides ou décalées. La bibliothèque accepte jusqu’à 100 imports, de 20 Mo maximum chacun. Les planches Codex v2 à 11 lignes ne sont pas compatibles avec cette version.

Les compagnons importés se trouvent dans `~/.agentibou/companions` (Windows : `%USERPROFILE%\.agentibou\companions`). Ils survivent aux mises à jour d’Agentibou. Sur un autre poste, réimporter la même planche et refaire les choix : aucune synchronisation distante n’est installée.

Compatibilité des données : si le dossier historique `.avatai` existe dans ton dossier utilisateur, Agentibou le réutilise pour conserver les préférences, les compagnons et les événements des anciens hooks. Sinon il utilise `.agentibou`. Après changement du nom de l’exécutable, refaire les connexions depuis Agentibou puis redémarrer les sessions des agents.

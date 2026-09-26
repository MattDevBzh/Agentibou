# Agentibou — Site Atelier

Direction retenue : Atelier, fond crème, accents orange, typographie éditoriale et démo interactive des vrais compagnons.

La source est `atelier.html`, avec `style.css`, `app.js` et `assets/`. Le générateur produit `index.html` ainsi qu’un alias `atelier.html`.

```sh
npm run site:build                 # archives locales dans dist/
npm run site:serve                 # http://127.0.0.1:4173
node scripts/build-site.cjs --remote  # liens vers les GitHub Releases publiées
npm run site:test
```

Le site généré est dans `output/site/`. Ce dossier est régénéré entièrement : ne pas y conserver de sources ou fichiers personnels.

Le workflow Pages publie le site après une modification sur `main` ou une release. Il ne copie pas les gros binaires dans GitHub Pages. Les architectures sans paquet ne reçoivent pas de faux bouton de téléchargement ; avant la première release, le site renvoie vers les publications à venir.

Le site n’a ni framework, backend, police distante, compte, cookie publicitaire ni outil d’analyse. Les démos s’arrêtent dans les onglets masqués et respectent les préférences d’animations réduites. Les guides et archives sont disponibles depuis la page.

Les deux directions non retenues restent des explorations locales, exclues de la publication.

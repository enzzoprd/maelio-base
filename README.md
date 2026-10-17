# Maelio Base

Crée le socle visuel de Maelio, une application étudiante tout-en-un (matières = dossiers, notes, scanner, IA, devoirs). Interface 100 % en français.

Règles strictes :
- Aucune fausse donnée, aucun faux résultat, aucun faux crédit : afficher des états vides clairs (« Aucune matière pour l'instant »).
- Design sobre, moderne, minimaliste, accessible (contraste, focus visible, boutons tactiles, prefers-reduced-motion), confortable pour les étudiants dyslexiques. Pas de dashboard chargé de statistiques, pas de dégradés partout, pas d'ombres fortes.
- Responsive : sidebar réductible sur ordinateur, navigation basse sur mobile.

À faire maintenant (Phase 1, interface uniquement) :
1. Nom et logo simple « Maelio » partout.
2. Sidebar : Accueil, Matières, IA, Notes, Scanner, Transformer, Formules & Outils, Mes devoirs, Paramètres ; en bas avatar, prénom, compte (prénom jamais codé en dur).
3. Barre supérieure : recherche, bouton IA, avatar.
4. Page Accueil : « Mes matières », fichiers récents, notes récentes, raccourcis IA / Scanner / Transformer / Formules & Outils, devoirs à venir discrets — tout en états vides.
5. Pages vides propres pour chaque rubrique de la sidebar.
6. Skeletons de chargement réalistes.

Ne pas brancher d'authentification, de base de données ni d'IA pour l'instant : ils seront connectés ensuite à un projet Supabase dédié.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/79f7cc7d-9d06-4951-b4b6-4e6ae2570ae9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

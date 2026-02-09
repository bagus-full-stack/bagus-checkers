# Angular Checkers Master 🎮

Jeu de dames en ligne développé avec Angular 21+ et NestJS.

## 🚀 Fonctionnalités

### Modes de jeu
- **Joueur vs Joueur (Local)** - Deux joueurs sur le même écran
- **Joueur vs IA** - 3 niveaux de difficulté (Facile, Moyen, Difficile)
- **Multijoueur en ligne** - Affrontez des joueurs via WebSocket

### Règles supportées
- **Dames Internationales** (10x10) - Par défaut
- **Dames Anglaises** (8x8)
- **Dames Brésiliennes** (8x8 avec règles internationales)

### Fonctionnalités avancées
- Drag & Drop fluide avec Angular CDK
- Surbrillance des coups valides
- Prise obligatoire (majoritaire)
- Promotion en Dame (volante)
- Historique des coups avec Undo/Redo
- Chat en temps réel (multijoueur)

## 📦 Installation

```bash
# Installer les dépendances du frontend
npm install

# Installer les dépendances du serveur
cd server && npm install && cd ..
```

## 🎯 Démarrage

### Mode développement

**Terminal 1 - Frontend Angular:**
```bash
npm start
```
L'application sera disponible sur `http://localhost:4200`

**Terminal 2 - Serveur WebSocket (pour le multijoueur):**
```bash
npm run start:server
```
Le serveur sera disponible sur `http://localhost:3000`

### Mode production

```bash
# Build du frontend
npm run build

# Build du serveur
npm run build:server

# Démarrer le serveur SSR
npm run serve:ssr:checkers
```

## 🏗️ Architecture

```
src/
├── app/
│   ├── core/
│   │   ├── models/       # Modèles de données (Position, Piece, Move, etc.)
│   │   └── services/     # Services (GameEngine, AI, Online, etc.)
│   ├── components/       # Composants réutilisables (Board, Piece, Square)
│   └── pages/           # Pages de l'application
│       ├── home/        # Page d'accueil
│       ├── game-local/  # Partie locale
│       ├── game-ai/     # Partie vs IA
│       ├── lobby/       # Lobby multijoueur
│       ├── game-online/ # Partie en ligne
│       ├── tutorial/    # Règles du jeu
│       └── settings/    # Paramètres
server/
├── src/
│   ├── game/
│   │   ├── game.gateway.ts   # WebSocket Gateway
│   │   ├── game.service.ts   # Logique de jeu serveur
│   │   └── room.service.ts   # Gestion des salles
│   └── main.ts               # Point d'entrée NestJS
```

## 🧠 Intelligence Artificielle

L'IA utilise plusieurs algorithmes selon le niveau de difficulté :

- **Facile** - Coups aléatoires
- **Moyen** - Algorithme Minimax (profondeur 3)
- **Difficile** - Alpha-Beta Pruning (profondeur 5)

## 🎨 Technologies

- **Frontend:** Angular 21+, Signals, Standalone Components
- **Styling:** Tailwind CSS
- **Drag & Drop:** Angular CDK
- **Backend:** NestJS
- **WebSocket:** Socket.IO
- **State Management:** Signals (reactive)

## 📝 Règles du jeu (Dames Internationales)

1. Le plateau est de 10x10 cases
2. Chaque joueur commence avec 20 pions
3. Les blancs jouent en premier
4. Les pions se déplacent en diagonale vers l'avant
5. **Prise obligatoire** - Si vous pouvez capturer, vous devez le faire
6. **Prise majoritaire** - Vous devez choisir la séquence qui capture le plus de pièces
7. Un pion atteignant la dernière rangée devient une **Dame**
8. Les Dames peuvent se déplacer de plusieurs cases (volantes)

## 📄 Licence

MIT

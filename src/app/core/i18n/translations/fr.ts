/**
 * French translations
 */
export const FR_TRANSLATIONS = {
  // Common
  'common.back': 'Retour',
  'common.home': 'Accueil',
  'common.settings': 'Paramètres',
  'common.play': 'Jouer',
  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.close': 'Fermer',
  'common.loading': 'Chargement...',
  'common.error': 'Erreur',
  'common.success': 'Succès',
  'common.confirm': 'Confirmer',
  'common.yes': 'Oui',
  'common.no': 'Non',
  'common.or': 'ou',

  // Home page
  'home.title': 'Angular Checkers Master',
  'home.subtitle': 'Jeu de Dames Internationales',
  'home.playLocal': 'Jouer en Local',
  'home.playLocalDesc': 'Deux joueurs sur le même écran',
  'home.playAI': 'Jouer contre l\'IA',
  'home.playAIDesc': 'Affrontez l\'ordinateur',
  'home.playOnline': 'Jouer en Ligne',
  'home.playOnlineDesc': 'Affrontez des joueurs du monde entier',
  'home.tutorial': 'Tutoriel',
  'home.tutorialDesc': 'Apprenez les règles du jeu',
  'home.replays': 'Replays',
  'home.replaysDesc': 'Revoyez vos parties',
  'home.spectate': 'Spectateur',
  'home.spectateDesc': 'Regardez des parties en cours',
  'home.leaderboard': 'Classement',
  'home.leaderboardDesc': 'Meilleurs joueurs',
  'home.profile': 'Profil',
  'home.profileDesc': 'Vos statistiques',

  // Settings page
  'settings.title': 'Paramètres',
  'settings.backToHome': 'Retour à l\'accueil',
  'settings.gameVariant': 'Variante de jeu',
  'settings.boardTheme': 'Thème du plateau',
  'settings.pieceStyle': 'Style des pions',
  'settings.options': 'Options',
  'settings.soundEnabled': 'Sons activés',
  'settings.animations': 'Animations',
  'settings.showValidMoves': 'Afficher les coups valides',
  'settings.showLastMove': 'Afficher le dernier coup',
  'settings.flyingKings': 'Dames volantes',
  'settings.classicKings': 'Dames classiques',
  'settings.mandatoryCapture': 'Prise maximale obligatoire',
  'settings.freeCapture': 'Prise libre',
  'settings.language': 'Langue',

  // Board themes
  'theme.wood': 'Bois',
  'theme.classic': 'Classique',
  'theme.futuristic': 'Futuriste',
  'theme.dark': 'Sombre',

  // Piece styles
  'pieceStyle.flat': '2D Plat',
  'pieceStyle.3d': '3D Simulé',
  'pieceStyle.minimal': 'Minimaliste',

  // Game
  'game.yourTurn': 'C\'est votre tour',
  'game.opponentTurn': 'Tour de l\'adversaire',
  'game.whiteTurn': 'Tour des blancs',
  'game.blackTurn': 'Tour des noirs',
  'game.mandatoryCapture': 'Prise obligatoire !',
  'game.thinking': 'L\'IA réfléchit...',
  'game.undo': 'Annuler',
  'game.redo': 'Rétablir',
  'game.resign': 'Abandonner',
  'game.offerDraw': 'Proposer nul',
  'game.newGame': 'Nouvelle partie',
  'game.rematch': 'Revanche',
  'game.backToMenu': 'Retour au menu',
  'game.moveHistory': 'Historique des coups',
  'game.noMoves': 'Aucun coup joué',

  // Game over
  'gameOver.victory': 'Victoire !',
  'gameOver.defeat': 'Défaite',
  'gameOver.draw': 'Match nul',
  'gameOver.whiteWins': 'Les blancs gagnent !',
  'gameOver.blackWins': 'Les noirs gagnent !',
  'gameOver.noMoves': 'Plus de coups possibles',
  'gameOver.timeout': 'Temps écoulé',
  'gameOver.resignation': 'Abandon',

  // Timer
  'timer.blitz': 'Blitz',
  'timer.rapid': 'Rapide',
  'timer.classic': 'Classique',
  'timer.none': 'Sans limite',

  // AI levels
  'ai.level1': 'Facile',
  'ai.level2': 'Moyen',
  'ai.level3': 'Difficile',
  'ai.selectLevel': 'Sélectionnez le niveau de l\'IA',

  // Online
  'online.connecting': 'Connexion au serveur...',
  'online.connected': 'Connecté',
  'online.disconnected': 'Déconnecté',
  'online.reconnecting': 'Reconnexion...',
  'online.waitingForOpponent': 'En attente d\'un adversaire...',
  'online.opponentDisconnected': 'L\'adversaire s\'est déconnecté',
  'online.joinRoom': 'Rejoindre une partie',
  'online.createRoom': 'Créer une partie',
  'online.quickMatch': 'Partie rapide',
  'online.roomCode': 'Code de la partie',
  'online.copyCode': 'Copier le code',
  'online.codeCopied': 'Code copié !',
  'online.enterCode': 'Entrez le code de la partie',
  'online.invalidCode': 'Code invalide',

  // Lobby
  'lobby.title': 'Lobby',
  'lobby.availableGames': 'Parties disponibles',
  'lobby.noGames': 'Aucune partie disponible',
  'lobby.refresh': 'Actualiser',
  'lobby.join': 'Rejoindre',
  'lobby.waiting': 'En attente',
  'lobby.inProgress': 'En cours',

  // Spectate
  'spectate.title': 'Spectateur',
  'spectate.liveGames': 'Parties en cours',
  'spectate.noGames': 'Aucune partie en cours',
  'spectate.watch': 'Regarder',
  'spectate.viewers': 'spectateurs',

  // Replays
  'replays.title': 'Replays',
  'replays.noReplays': 'Aucun replay disponible',
  'replays.play': 'Rejouer',
  'replays.delete': 'Supprimer',
  'replays.export': 'Exporter',
  'replays.import': 'Importer',
  'replays.date': 'Date',
  'replays.players': 'Joueurs',
  'replays.result': 'Résultat',

  // Replay viewer
  'replayViewer.speed': 'Vitesse',
  'replayViewer.autoPlay': 'Lecture auto',
  'replayViewer.pause': 'Pause',
  'replayViewer.previous': 'Précédent',
  'replayViewer.next': 'Suivant',
  'replayViewer.first': 'Début',
  'replayViewer.last': 'Fin',

  // Leaderboard
  'leaderboard.title': 'Classement',
  'leaderboard.rank': 'Rang',
  'leaderboard.player': 'Joueur',
  'leaderboard.rating': 'Classement',
  'leaderboard.wins': 'Victoires',
  'leaderboard.losses': 'Défaites',
  'leaderboard.draws': 'Nuls',

  // Profile
  'profile.title': 'Profil',
  'profile.username': 'Nom d\'utilisateur',
  'profile.rating': 'Classement ELO',
  'profile.gamesPlayed': 'Parties jouées',
  'profile.winRate': 'Taux de victoire',
  'profile.statistics': 'Statistiques',
  'profile.recentGames': 'Parties récentes',
  'profile.logout': 'Déconnexion',
  'profile.login': 'Connexion',
  'profile.register': 'Inscription',

  // Tutorial
  'tutorial.title': 'Tutoriel',
  'tutorial.basics': 'Les bases',
  'tutorial.movement': 'Déplacement',
  'tutorial.capture': 'Prise',
  'tutorial.promotion': 'Promotion',
  'tutorial.winning': 'Victoire',
  'tutorial.next': 'Suivant',
  'tutorial.previous': 'Précédent',
  'tutorial.finish': 'Terminer',

  // Pieces
  'piece.pawn': 'Pion',
  'piece.king': 'Dame',
  'piece.white': 'blanc',
  'piece.black': 'noir',

  // Accessibility
  'a11y.board': 'Plateau de jeu de dames',
  'a11y.square': 'Case',
  'a11y.validTarget': 'destination possible',

  // Keyboard shortcuts
  'keyboard.title': 'Raccourcis clavier',
  'keyboard.escape': 'Fermer / Annuler',
  'keyboard.space': 'Sélectionner / Confirmer',
  'keyboard.arrows': 'Navigation',
  'keyboard.undo': 'Annuler le coup',
  'keyboard.redo': 'Rétablir le coup',
  'keyboard.newGame': 'Nouvelle partie',
  'keyboard.help': 'Afficher l\'aide',
} as const;

export type TranslationKey = keyof typeof FR_TRANSLATIONS;


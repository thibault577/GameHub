export type Language = "nl" | "en" | "fr" | "de" | "es" | "it" | "pt";
const supported: Language[] = ["nl", "en", "fr", "de", "es", "it", "pt"];
export function getInitialLanguage(): Language {
  const stored = localStorage.getItem("gamehub-language-v1");
  if (stored && supported.includes(stored as Language)) return stored as Language;
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const entry of preferred) {
    const code = entry.toLowerCase().split("-")[0] as Language;
    if (supported.includes(code)) return code;
  }
  return "en";
}
const translations: Record<string, Partial<Record<Language, string>>> = {
  "Home": {
    "en": "Home",
    "fr": "Accueil",
    "de": "Startseite",
    "es": "Inicio",
    "it": "Home",
    "pt": "Início"
  },
  "Library": {
    "en": "Library",
    "fr": "Bibliothèque",
    "de": "Bibliothek",
    "es": "Biblioteca",
    "it": "Libreria",
    "pt": "Biblioteca"
  },
  "Favorites": {
    "en": "Favorites",
    "fr": "Favoris",
    "de": "Favoriten",
    "es": "Favoritos",
    "it": "Preferiti",
    "pt": "Favoritos"
  },
  "Recently Played": {
    "en": "Recently played",
    "fr": "Récemment joués",
    "de": "Zuletzt gespielt",
    "es": "Jugados recientemente",
    "it": "Giocati di recente",
    "pt": "Jogados recentemente"
  },
  "Virtual Reality": {
    "en": "Virtual reality",
    "fr": "Réalité virtuelle",
    "de": "Virtuelle Realität",
    "es": "Realidad virtual",
    "it": "Realtà virtuale",
    "pt": "Realidade virtual"
  },
  "Single Player": {
    "en": "Single player",
    "fr": "Solo",
    "de": "Einzelspieler",
    "es": "Un jugador",
    "it": "Giocatore singolo",
    "pt": "Um jogador"
  },
  "Racing": {
    "en": "Racing",
    "fr": "Course",
    "de": "Rennspiele",
    "es": "Carreras",
    "it": "Corse",
    "pt": "Corridas"
  },
  "Horror": {
    "en": "Horror",
    "fr": "Horreur",
    "de": "Horror",
    "es": "Terror",
    "it": "Horror",
    "pt": "Terror"
  },
  "Settings": {
    "en": "Settings",
    "fr": "Paramètres",
    "de": "Einstellungen",
    "es": "Ajustes",
    "it": "Impostazioni",
    "pt": "Definições"
  },
  "LIBRARY": {
    "en": "LIBRARY",
    "fr": "BIBLIOTHÈQUE",
    "de": "BIBLIOTHEK",
    "es": "BIBLIOTECA",
    "it": "LIBRERIA",
    "pt": "BIBLIOTECA"
  },
  "CATEGORIEËN": {
    "en": "CATEGORIES",
    "fr": "CATÉGORIES",
    "de": "KATEGORIEN",
    "es": "CATEGORÍAS",
    "it": "CATEGORIE",
    "pt": "CATEGORIAS"
  },
  "YOUR GAME SPACE": {
    "en": "YOUR GAME SPACE",
    "fr": "VOTRE ESPACE DE JEU",
    "de": "DEIN SPIELBEREICH",
    "es": "TU ESPACIO DE JUEGO",
    "it": "IL TUO SPAZIO DI GIOCO",
    "pt": "O TEU ESPAÇO DE JOGO"
  },
  "YOUR PERSONAL GAME LIBRARY": {
    "en": "YOUR PERSONAL GAME LIBRARY",
    "fr": "VOTRE BIBLIOTHÈQUE DE JEUX",
    "de": "DEINE SPIELEBIBLIOTHEK",
    "es": "TU BIBLIOTECA PERSONAL",
    "it": "LA TUA LIBRERIA PERSONALE",
    "pt": "A TUA BIBLIOTECA PESSOAL"
  },
  "YOUR NEXT ADVENTURE STARTS HERE": {
    "en": "YOUR NEXT ADVENTURE STARTS HERE",
    "fr": "VOTRE PROCHAINE AVENTURE COMMENCE ICI",
    "de": "DEIN NÄCHSTES ABENTEUER BEGINNT HIER",
    "es": "TU PRÓXIMA AVENTURA EMPIEZA AQUÍ",
    "it": "LA TUA PROSSIMA AVVENTURA INIZIA QUI",
    "pt": "A TUA PRÓXIMA AVENTURA COMEÇA AQUI"
  },
  "GAMEHUB • PERSONAL LAUNCHER": {
    "en": "GAMEHUB • PERSONAL LAUNCHER",
    "fr": "GAMEHUB • LANCEUR PERSONNEL",
    "de": "GAMEHUB • PERSÖNLICHER LAUNCHER",
    "es": "GAMEHUB • LANZADOR PERSONAL",
    "it": "GAMEHUB • LAUNCHER PERSONALE",
    "pt": "GAMEHUB • LANÇADOR PESSOAL"
  },
  "App actief": {
    "en": "App running",
    "fr": "Application active",
    "de": "App aktiv",
    "es": "Aplicación activa",
    "it": "App attiva",
    "pt": "Aplicação ativa"
  },
  "games ingeladen": {
    "en": "games loaded",
    "fr": "jeux chargés",
    "de": "Spiele geladen",
    "es": "juegos cargados",
    "it": "giochi caricati",
    "pt": "jogos carregados"
  },
  "Zoek een game...": {
    "en": "Search for a game...",
    "fr": "Rechercher un jeu...",
    "de": "Spiel suchen...",
    "es": "Buscar un juego...",
    "it": "Cerca un gioco...",
    "pt": "Pesquisar um jogo..."
  },
  "Instellingen": {
    "en": "Settings",
    "fr": "Paramètres",
    "de": "Einstellungen",
    "es": "Ajustes",
    "it": "Impostazioni",
    "pt": "Definições"
  },
  "Personaliseer GameHub en beheer je gamebibliotheek.": {
    "en": "Customize GameHub and manage your game library.",
    "fr": "Personnalisez GameHub et gérez votre bibliothèque.",
    "de": "Passe GameHub an und verwalte deine Spielebibliothek.",
    "es": "Personaliza GameHub y gestiona tu biblioteca.",
    "it": "Personalizza GameHub e gestisci la libreria.",
    "pt": "Personaliza o GameHub e gere a tua biblioteca."
  },
  "Jouw profiel": {
    "en": "Your profile",
    "fr": "Votre profil",
    "de": "Dein Profil",
    "es": "Tu perfil",
    "it": "Il tuo profilo",
    "pt": "O teu perfil"
  },
  "De naam die GameHub op het welkomstscherm toont.": {
    "en": "The name GameHub displays on the welcome screen.",
    "fr": "Le nom affiché sur l'écran d'accueil.",
    "de": "Der Name auf dem Willkommensbildschirm.",
    "es": "El nombre que aparece en la pantalla de bienvenida.",
    "it": "Il nome mostrato nella schermata iniziale.",
    "pt": "O nome apresentado no ecrã inicial."
  },
  "Jouw naam": {
    "en": "Your name",
    "fr": "Votre nom",
    "de": "Dein Name",
    "es": "Tu nombre",
    "it": "Il tuo nome",
    "pt": "O teu nome"
  },
  "Naam opslaan": {
    "en": "Save name",
    "fr": "Enregistrer le nom",
    "de": "Namen speichern",
    "es": "Guardar nombre",
    "it": "Salva nome",
    "pt": "Guardar nome"
  },
  "GameHub-updates": {
    "en": "GameHub updates",
    "fr": "Mises à jour GameHub",
    "de": "GameHub-Updates",
    "es": "Actualizaciones de GameHub",
    "it": "Aggiornamenti GameHub",
    "pt": "Atualizações do GameHub"
  },
  "Controleer of er een nieuwe versie beschikbaar is via GitHub Releases.": {
    "en": "Check for new versions through GitHub Releases.",
    "fr": "Recherchez les nouvelles versions sur GitHub Releases.",
    "de": "Suche über GitHub Releases nach neuen Versionen.",
    "es": "Busca nuevas versiones en GitHub Releases.",
    "it": "Controlla le nuove versioni su GitHub Releases.",
    "pt": "Procura novas versões no GitHub Releases."
  },
  "Controleren op updates": {
    "en": "Check for updates",
    "fr": "Rechercher des mises à jour",
    "de": "Nach Updates suchen",
    "es": "Buscar actualizaciones",
    "it": "Controlla aggiornamenti",
    "pt": "Procurar atualizações"
  },
  "Uiterlijk en stijl": {
    "en": "Appearance and style",
    "fr": "Apparence et style",
    "de": "Darstellung und Stil",
    "es": "Apariencia y estilo",
    "it": "Aspetto e stile",
    "pt": "Aspeto e estilo"
  },
  "Kies je favoriete interface. Je keuze wordt automatisch bewaard.": {
    "en": "Choose your favorite interface. Your choice is saved automatically.",
    "fr": "Choisissez votre interface. Votre choix est enregistré.",
    "de": "Wähle deine Oberfläche. Deine Wahl wird gespeichert.",
    "es": "Elige tu interfaz. Tu elección se guarda.",
    "it": "Scegli la tua interfaccia. La scelta viene salvata.",
    "pt": "Escolhe a tua interface. A escolha é guardada."
  },
  "Vertrouwd en praktisch": {
    "en": "Familiar and practical",
    "fr": "Familier et pratique",
    "de": "Vertraut und praktisch",
    "es": "Familiar y práctico",
    "it": "Familiare e pratico",
    "pt": "Familiar e prático"
  },
  "Strak en minimalistisch": {
    "en": "Sleek and minimal",
    "fr": "Épuré et minimaliste",
    "de": "Schlicht und minimalistisch",
    "es": "Elegante y minimalista",
    "it": "Elegante e minimale",
    "pt": "Elegante e minimalista"
  },
  "Diep zwart en rustig": {
    "en": "Deep black and calm",
    "fr": "Noir profond et sobre",
    "de": "Tiefschwarz und ruhig",
    "es": "Negro intenso y discreto",
    "it": "Nero profondo e sobrio",
    "pt": "Preto profundo e discreto"
  },
  "Licht en helder": {
    "en": "Light and bright",
    "fr": "Clair et lumineux",
    "de": "Hell und freundlich",
    "es": "Claro y luminoso",
    "it": "Chiaro e luminoso",
    "pt": "Claro e luminoso"
  },
  "Transparant glas en reflecties": {
    "en": "Transparent glass and reflections",
    "fr": "Verre transparent et reflets",
    "de": "Transparentes Glas und Reflexionen",
    "es": "Cristal transparente y reflejos",
    "it": "Vetro trasparente e riflessi",
    "pt": "Vidro transparente e reflexos"
  },
  "Animaties": {
    "en": "Animations",
    "fr": "Animations",
    "de": "Animationen",
    "es": "Animaciones",
    "it": "Animazioni",
    "pt": "Animações"
  },
  "Animaties uitschakelen": {
    "en": "Disable animations",
    "fr": "Désactiver les animations",
    "de": "Animationen deaktivieren",
    "es": "Desactivar animaciones",
    "it": "Disattiva animazioni",
    "pt": "Desativar animações"
  },
  "Schakelt zwevende achtergronden en de meeste overgangseffecten uit.": {
    "en": "Disables floating backgrounds and most transitions.",
    "fr": "Désactive les fonds flottants et la plupart des transitions.",
    "de": "Deaktiviert schwebende Hintergründe und die meisten Übergänge.",
    "es": "Desactiva los fondos flotantes y la mayoría de transiciones.",
    "it": "Disattiva gli sfondi animati e quasi tutte le transizioni.",
    "pt": "Desativa fundos flutuantes e a maioria das transições."
  },
  "Game scanner": {
    "en": "Game scanner",
    "fr": "Analyseur de jeux",
    "de": "Spielesuche",
    "es": "Escáner de juegos",
    "it": "Scanner giochi",
    "pt": "Pesquisa de jogos"
  },
  "Scan een map met EXE-bestanden, snelkoppelingen en BAT-bestanden.": {
    "en": "Scan a folder for EXE files, shortcuts and BAT files.",
    "fr": "Analysez un dossier contenant des EXE, raccourcis et BAT.",
    "de": "Durchsuche einen Ordner nach EXE-, Verknüpfungs- und BAT-Dateien.",
    "es": "Busca archivos EXE, accesos directos y BAT en una carpeta.",
    "it": "Cerca file EXE, collegamenti e BAT in una cartella.",
    "pt": "Pesquisa ficheiros EXE, atalhos e BAT numa pasta."
  },
  "Bladeren...": {
    "en": "Browse...",
    "fr": "Parcourir...",
    "de": "Durchsuchen...",
    "es": "Examinar...",
    "it": "Sfoglia...",
    "pt": "Procurar..."
  },
  "Scannen...": {
    "en": "Scanning...",
    "fr": "Analyse...",
    "de": "Suche läuft...",
    "es": "Escaneando...",
    "it": "Scansione...",
    "pt": "A pesquisar..."
  },
  "Scan folder": {
    "en": "Scan folder",
    "fr": "Analyser le dossier",
    "de": "Ordner durchsuchen",
    "es": "Escanear carpeta",
    "it": "Scansiona cartella",
    "pt": "Pesquisar pasta"
  },
  "Game-launchers": {
    "en": "Game launchers",
    "fr": "Lanceurs de jeux",
    "de": "Game-Launcher",
    "es": "Lanzadores de juegos",
    "it": "Launcher di giochi",
    "pt": "Launchers de jogos"
  },
  "Scan de lokale installatiegegevens van je launchers. Games worden aan je bestaande bibliotheek toegevoegd.": {
    "en": "Scan local launcher installations. Games are added to your library.",
    "fr": "Analysez les installations locales des lanceurs pour ajouter des jeux.",
    "de": "Durchsuche lokale Launcher-Installationen und füge Spiele hinzu.",
    "es": "Busca instalaciones locales y añade juegos a tu biblioteca.",
    "it": "Cerca le installazioni dei launcher e aggiungi i giochi.",
    "pt": "Pesquisa instalações dos launchers e adiciona jogos."
  },
  "Alle scanners voegen gevonden games samen met je huidige bibliotheek. Een launcher moet geïnstalleerd zijn en lokale installatiegegevens beschikbaar hebben.": {
    "en": "Scanned games are merged into your library. The launcher must be installed locally.",
    "fr": "Les jeux détectés sont ajoutés à la bibliothèque. Le lanceur doit être installé.",
    "de": "Gefundene Spiele werden der Bibliothek hinzugefügt. Der Launcher muss installiert sein.",
    "es": "Los juegos encontrados se añaden a tu biblioteca. El lanzador debe estar instalado.",
    "it": "I giochi trovati vengono aggiunti alla libreria. Il launcher deve essere installato.",
    "pt": "Os jogos encontrados são adicionados à biblioteca. O launcher tem de estar instalado."
  },
  "Automatisch artwork": {
    "en": "Automatic artwork",
    "fr": "Illustrations automatiques",
    "de": "Automatische Cover",
    "es": "Arte automático",
    "it": "Immagini automatiche",
    "pt": "Imagens automáticas"
  },
  "Haal ontbrekende covers en achtergronden op. Bestaande afbeeldingen blijven behouden.": {
    "en": "Download missing covers and backgrounds. Existing images are preserved.",
    "fr": "Téléchargez les images manquantes sans remplacer les images existantes.",
    "de": "Lade fehlende Cover und Hintergründe herunter. Vorhandene Bilder bleiben erhalten.",
    "es": "Descarga imágenes que faltan sin reemplazar las existentes.",
    "it": "Scarica le immagini mancanti senza sostituire quelle esistenti.",
    "pt": "Transfere imagens em falta sem substituir as existentes."
  },
  "Artwork ophalen...": {
    "en": "Fetching artwork...",
    "fr": "Téléchargement des images...",
    "de": "Bilder werden geladen...",
    "es": "Descargando imágenes...",
    "it": "Download immagini...",
    "pt": "A transferir imagens..."
  },
  "Artwork ophalen voor alle games": {
    "en": "Get artwork for all games",
    "fr": "Obtenir les images de tous les jeux",
    "de": "Bilder für alle Spiele laden",
    "es": "Obtener imágenes para todos los juegos",
    "it": "Scarica immagini per tutti i giochi",
    "pt": "Obter imagens para todos os jogos"
  },
  "Artwork voor alle games": {
    "en": "Artwork for all games",
    "fr": "Images pour tous les jeux",
    "de": "Bilder für alle Spiele",
    "es": "Imágenes para todos los juegos",
    "it": "Immagini per tutti i giochi",
    "pt": "Imagens para todos os jogos"
  },
  "Verwijderde games": {
    "en": "Removed games",
    "fr": "Jeux retirés",
    "de": "Entfernte Spiele",
    "es": "Juegos eliminados",
    "it": "Giochi rimossi",
    "pt": "Jogos removidos"
  },
  "games verborgen. De gamebestanden worden niet verwijderd.": {
    "en": "games hidden. Game files are not deleted.",
    "fr": "jeux masqués. Les fichiers ne sont pas supprimés.",
    "de": "Spiele ausgeblendet. Spieldateien werden nicht gelöscht.",
    "es": "juegos ocultos. Los archivos no se eliminan.",
    "it": "giochi nascosti. I file non vengono eliminati.",
    "pt": "jogos ocultos. Os ficheiros não são eliminados."
  },
  "Herstel verwijderde games": {
    "en": "Restore removed games",
    "fr": "Restaurer les jeux retirés",
    "de": "Entfernte Spiele wiederherstellen",
    "es": "Restaurar juegos eliminados",
    "it": "Ripristina giochi rimossi",
    "pt": "Restaurar jogos removidos"
  },
  "Weergave bibliotheek": {
    "en": "Library view",
    "fr": "Affichage de la bibliothèque",
    "de": "Bibliotheksansicht",
    "es": "Vista de biblioteca",
    "it": "Vista libreria",
    "pt": "Vista da biblioteca"
  },
  "Grote tegels": {
    "en": "Large tiles",
    "fr": "Grandes vignettes",
    "de": "Große Kacheln",
    "es": "Mosaicos grandes",
    "it": "Riquadri grandi",
    "pt": "Mosaicos grandes"
  },
  "Kleine tegels": {
    "en": "Small tiles",
    "fr": "Petites vignettes",
    "de": "Kleine Kacheln",
    "es": "Mosaicos pequeños",
    "it": "Riquadri piccoli",
    "pt": "Mosaicos pequenos"
  },
  "Lijst": {
    "en": "List",
    "fr": "Liste",
    "de": "Liste",
    "es": "Lista",
    "it": "Elenco",
    "pt": "Lista"
  },
  "Welkom terug,": {
    "en": "Welcome back,",
    "fr": "Bon retour,",
    "de": "Willkommen zurück,",
    "es": "Bienvenido de nuevo,",
    "it": "Bentornato,",
    "pt": "Bem-vindo de volta,"
  },
  "gamer": {
    "en": "gamer",
    "fr": "joueur",
    "de": "Gamer",
    "es": "jugador",
    "it": "giocatore",
    "pt": "jogador"
  },
  "Je persoonlijke gamebibliotheek. Kies een game en duik meteen in je volgende avontuur.": {
    "en": "Your personal game library. Pick a game and start your next adventure.",
    "fr": "Votre bibliothèque personnelle. Choisissez un jeu et lancez-vous.",
    "de": "Deine Spielebibliothek. Wähle ein Spiel und starte dein nächstes Abenteuer.",
    "es": "Tu biblioteca personal. Elige un juego y empieza tu aventura.",
    "it": "La tua libreria personale. Scegli un gioco e inizia l'avventura.",
    "pt": "A tua biblioteca pessoal. Escolhe um jogo e começa a aventura."
  },
  "Verder spelen": {
    "en": "Continue playing",
    "fr": "Continuer",
    "de": "Weiterspielen",
    "es": "Seguir jugando",
    "it": "Continua a giocare",
    "pt": "Continuar a jogar"
  },
  "Game bekijken": {
    "en": "View game",
    "fr": "Voir le jeu",
    "de": "Spiel ansehen",
    "es": "Ver juego",
    "it": "Visualizza gioco",
    "pt": "Ver jogo"
  },
  "Bibliotheek openen": {
    "en": "Open library",
    "fr": "Ouvrir la bibliothèque",
    "de": "Bibliothek öffnen",
    "es": "Abrir biblioteca",
    "it": "Apri libreria",
    "pt": "Abrir biblioteca"
  },
  "games": {
    "en": "games",
    "fr": "jeux",
    "de": "Spiele",
    "es": "juegos",
    "it": "giochi",
    "pt": "jogos"
  },
  "favorieten": {
    "en": "favorites",
    "fr": "favoris",
    "de": "Favoriten",
    "es": "favoritos",
    "it": "preferiti",
    "pt": "favoritos"
  },
  "recent gespeeld": {
    "en": "recently played",
    "fr": "récemment joués",
    "de": "zuletzt gespielt",
    "es": "jugados recientemente",
    "it": "giocati di recente",
    "pt": "jogados recentemente"
  },
  "Je favorieten": {
    "en": "Your favorites",
    "fr": "Vos favoris",
    "de": "Deine Favoriten",
    "es": "Tus favoritos",
    "it": "I tuoi preferiti",
    "pt": "Os teus favoritos"
  },
  "Je favoriete games, altijd binnen handbereik.": {
    "en": "Your favorite games, always close at hand.",
    "fr": "Vos jeux préférés à portée de main.",
    "de": "Deine Lieblingsspiele immer griffbereit.",
    "es": "Tus juegos favoritos siempre a mano.",
    "it": "I tuoi giochi preferiti sempre a portata di mano.",
    "pt": "Os teus jogos favoritos sempre à mão."
  },
  "Alle favorieten": {
    "en": "All favorites",
    "fr": "Tous les favoris",
    "de": "Alle Favoriten",
    "es": "Todos los favoritos",
    "it": "Tutti i preferiti",
    "pt": "Todos os favoritos"
  },
  "Recentste games": {
    "en": "Recent games",
    "fr": "Jeux récents",
    "de": "Letzte Spiele",
    "es": "Juegos recientes",
    "it": "Giochi recenti",
    "pt": "Jogos recentes"
  },
  "Je 10 laatst via GameHub gestarte games": {
    "en": "Your 10 most recently launched games",
    "fr": "Vos 10 derniers jeux lancés",
    "de": "Deine 10 zuletzt gestarteten Spiele",
    "es": "Tus últimos 10 juegos iniciados",
    "it": "Gli ultimi 10 giochi avviati",
    "pt": "Os últimos 10 jogos iniciados"
  },
  "Volledige bibliotheek": {
    "en": "Full library",
    "fr": "Bibliothèque complète",
    "de": "Gesamte Bibliothek",
    "es": "Biblioteca completa",
    "it": "Libreria completa",
    "pt": "Biblioteca completa"
  },
  "Je hebt nog geen games gestart via GameHub. Gestarte games verschijnen hier, tot maximaal 10.": {
    "en": "You haven't launched any games yet. Your 10 most recent games will appear here.",
    "fr": "Vous n'avez encore lancé aucun jeu. Les 10 derniers apparaîtront ici.",
    "de": "Du hast noch keine Spiele gestartet. Die letzten 10 erscheinen hier.",
    "es": "Aún no has iniciado juegos. Aquí aparecerán los últimos 10.",
    "it": "Non hai ancora avviato giochi. Qui appariranno gli ultimi 10.",
    "pt": "Ainda não iniciaste jogos. Os últimos 10 aparecerão aqui."
  },
  "Naar Library": {
    "en": "Go to library",
    "fr": "Aller à la bibliothèque",
    "de": "Zur Bibliothek",
    "es": "Ir a biblioteca",
    "it": "Vai alla libreria",
    "pt": "Ir à biblioteca"
  },
  "games weergegeven": {
    "en": "games displayed",
    "fr": "jeux affichés",
    "de": "Spiele angezeigt",
    "es": "juegos mostrados",
    "it": "giochi visualizzati",
    "pt": "jogos apresentados"
  },
  "Scannerinstellingen": {
    "en": "Scanner settings",
    "fr": "Paramètres de recherche",
    "de": "Scanner-Einstellungen",
    "es": "Ajustes del escáner",
    "it": "Impostazioni scanner",
    "pt": "Definições da pesquisa"
  },
  "Favorietenfilter": {
    "en": "Favorites filter",
    "fr": "Filtre favoris",
    "de": "Favoritenfilter",
    "es": "Filtro de favoritos",
    "it": "Filtro preferiti",
    "pt": "Filtro de favoritos"
  },
  "Je hebt nog geen favoriete games.": {
    "en": "You have no favorite games yet.",
    "fr": "Vous n'avez pas encore de favoris.",
    "de": "Du hast noch keine Favoriten.",
    "es": "Aún no tienes favoritos.",
    "it": "Non hai ancora preferiti.",
    "pt": "Ainda não tens favoritos."
  },
  "Je hebt nog geen games gestart.": {
    "en": "You haven't launched any games yet.",
    "fr": "Vous n'avez encore lancé aucun jeu.",
    "de": "Du hast noch keine Spiele gestartet.",
    "es": "Aún no has iniciado juegos.",
    "it": "Non hai ancora avviato giochi.",
    "pt": "Ainda não iniciaste jogos."
  },
  "Geen games gevonden. Scan je gamemappen of launchers via Settings.": {
    "en": "No games found. Scan game folders or launchers in Settings.",
    "fr": "Aucun jeu trouvé. Analysez vos dossiers ou lanceurs dans Paramètres.",
    "de": "Keine Spiele gefunden. Durchsuche Ordner oder Launcher in Einstellungen.",
    "es": "No se encontraron juegos. Escanea carpetas o lanzadores en Ajustes.",
    "it": "Nessun gioco trovato. Scansiona cartelle o launcher nelle Impostazioni.",
    "pt": "Nenhum jogo encontrado. Pesquisa pastas ou launchers nas Definições."
  },
  "Start game": {
    "en": "Launch game",
    "fr": "Lancer le jeu",
    "de": "Spiel starten",
    "es": "Iniciar juego",
    "it": "Avvia gioco",
    "pt": "Iniciar jogo"
  },
  "Start": {
    "en": "Play",
    "fr": "Jouer",
    "de": "Spielen",
    "es": "Jugar",
    "it": "Gioca",
    "pt": "Jogar"
  },
  "Verwijderen uit GameHub": {
    "en": "Remove from GameHub",
    "fr": "Retirer de GameHub",
    "de": "Aus GameHub entfernen",
    "es": "Quitar de GameHub",
    "it": "Rimuovi da GameHub",
    "pt": "Remover do GameHub"
  },
  "Verwijder favoriet": {
    "en": "Remove favorite",
    "fr": "Retirer des favoris",
    "de": "Favorit entfernen",
    "es": "Quitar favorito",
    "it": "Rimuovi preferito",
    "pt": "Remover favorito"
  },
  "Voeg favoriet toe": {
    "en": "Add favorite",
    "fr": "Ajouter aux favoris",
    "de": "Favorit hinzufügen",
    "es": "Añadir favorito",
    "it": "Aggiungi ai preferiti",
    "pt": "Adicionar favorito"
  },
  "Favoriet": {
    "en": "Favorite",
    "fr": "Favori",
    "de": "Favorit",
    "es": "Favorito",
    "it": "Preferito",
    "pt": "Favorito"
  },
  "Zoeken...": {
    "en": "Searching...",
    "fr": "Recherche...",
    "de": "Suche läuft...",
    "es": "Buscando...",
    "it": "Ricerca...",
    "pt": "A pesquisar..."
  },
  "Auto artwork": {
    "en": "Auto artwork",
    "fr": "Images automatiques",
    "de": "Automatische Bilder",
    "es": "Imágenes automáticas",
    "it": "Immagini automatiche",
    "pt": "Imagens automáticas"
  },
  "Speelstatistieken": {
    "en": "Play statistics",
    "fr": "Statistiques de jeu",
    "de": "Spielstatistiken",
    "es": "Estadísticas de juego",
    "it": "Statistiche di gioco",
    "pt": "Estatísticas de jogo"
  },
  "Totale speelduur": {
    "en": "Total playtime",
    "fr": "Temps de jeu total",
    "de": "Gesamtspielzeit",
    "es": "Tiempo total de juego",
    "it": "Tempo di gioco totale",
    "pt": "Tempo total de jogo"
  },
  "Aantal starts": {
    "en": "Launch count",
    "fr": "Anzahl Starts",
    "de": "Anzahl Starts",
    "es": "Número de inicios",
    "it": "Numero di avvii",
    "pt": "Número de arranques"
  },
  "Laatste sessie": {
    "en": "Last session",
    "fr": "Dernière session",
    "de": "Letzte Sitzung",
    "es": "Última sesión",
    "it": "Ultima sessione",
    "pt": "Última sessão"
  },
  "Over deze game": {
    "en": "About this game",
    "fr": "À propos de ce jeu",
    "de": "Über dieses Spiel",
    "es": "Acerca del juego",
    "it": "Informazioni sul gioco",
    "pt": "Sobre este jogo"
  },
  "Ophalen...": {
    "en": "Loading...",
    "fr": "Chargement...",
    "de": "Laden...",
    "es": "Cargando...",
    "it": "Caricamento...",
    "pt": "A carregar..."
  },
  "Gegevens vernieuwen": {
    "en": "Refresh details",
    "fr": "Actualiser les détails",
    "de": "Details aktualisieren",
    "es": "Actualizar datos",
    "it": "Aggiorna dettagli",
    "pt": "Atualizar detalhes"
  },
  "Game-informatie ophalen...": {
    "en": "Fetching game information...",
    "fr": "Chargement des informations...",
    "de": "Spielinformationen werden geladen...",
    "es": "Obteniendo información...",
    "it": "Caricamento informazioni...",
    "pt": "A obter informações..."
  },
  "Geen betrouwbare game-informatie gevonden. Je kunt de game gewoon blijven starten en beheren.": {
    "en": "No reliable game information found. You can still launch and manage the game.",
    "fr": "Aucune information fiable trouvée. Vous pouvez toujours lancer et gérer ce jeu.",
    "de": "Keine verlässlichen Informationen gefunden. Du kannst das Spiel weiter starten und verwalten.",
    "es": "No se encontró información fiable. Puedes seguir iniciando y gestionando el juego.",
    "it": "Nessuna informazione attendibile. Puoi comunque avviare e gestire il gioco.",
    "pt": "Não foram encontradas informações fiáveis. Podes continuar a iniciar e gerir o jogo."
  },
  "Releasedatum": {
    "en": "Release date",
    "fr": "Date de sortie",
    "de": "Erscheinungsdatum",
    "es": "Fecha de lanzamiento",
    "it": "Data di uscita",
    "pt": "Data de lançamento"
  },
  "Ontwikkelaar": {
    "en": "Developer",
    "fr": "Développeur",
    "de": "Entwickler",
    "es": "Desarrollador",
    "it": "Sviluppatore",
    "pt": "Programador"
  },
  "Uitgever": {
    "en": "Publisher",
    "fr": "Éditeur",
    "de": "Publisher",
    "es": "Editor",
    "it": "Editore",
    "pt": "Editora"
  },
  "Genres": {
    "en": "Genres",
    "fr": "Genres",
    "de": "Genres",
    "es": "Géneros",
    "it": "Generi",
    "pt": "Géneros"
  },
  "Bron:": {
    "en": "Source:",
    "fr": "Source :",
    "de": "Quelle:",
    "es": "Fuente:",
    "it": "Fonte:",
    "pt": "Fonte:"
  },
  "Categorieën": {
    "en": "Categories",
    "fr": "Catégories",
    "de": "Kategorien",
    "es": "Categorías",
    "it": "Categorie",
    "pt": "Categorias"
  },
  "Artwork aanpassen": {
    "en": "Customize artwork",
    "fr": "Modifier les images",
    "de": "Artwork anpassen",
    "es": "Personalizar imágenes",
    "it": "Personalizza immagini",
    "pt": "Personalizar imagens"
  },
  "Eigen cover kiezen": {
    "en": "Choose custom cover",
    "fr": "Choisir une couverture",
    "de": "Eigenes Cover auswählen",
    "es": "Elegir portada",
    "it": "Scegli copertina",
    "pt": "Escolher capa"
  },
  "Achtergrond kiezen": {
    "en": "Choose background",
    "fr": "Choisir un fond",
    "de": "Hintergrund wählen",
    "es": "Elegir fondo",
    "it": "Scegli sfondo",
    "pt": "Escolher fundo"
  },
  "Je afbeeldingen worden lokaal in GameHub opgeslagen. Automatisch artwork vereist je SteamGridDB-configuratie.": {
    "en": "Your images are stored locally. Automatic artwork requires SteamGridDB configuration.",
    "fr": "Vos images sont stockées localement. Les images automatiques nécessitent SteamGridDB.",
    "de": "Deine Bilder werden lokal gespeichert. Automatische Bilder erfordern SteamGridDB.",
    "es": "Tus imágenes se guardan localmente. Las imágenes automáticas requieren SteamGridDB.",
    "it": "Le immagini vengono salvate localmente. Le immagini automatiche richiedono SteamGridDB.",
    "pt": "As imagens são guardadas localmente. As imagens automáticas requerem SteamGridDB."
  },
  "Gereed": {
    "en": "Done",
    "fr": "Terminé",
    "de": "Fertig",
    "es": "Listo",
    "it": "Fatto",
    "pt": "Concluído"
  },
  "Sluiten": {
    "en": "Close",
    "fr": "Fermer",
    "de": "Schließen",
    "es": "Cerrar",
    "it": "Chiudi",
    "pt": "Fechar"
  },
  "GameHub-update beschikbaar": {
    "en": "GameHub update available",
    "fr": "Mise à jour GameHub disponible",
    "de": "GameHub-Update verfügbar",
    "es": "Actualización de GameHub disponible",
    "it": "Aggiornamento GameHub disponibile",
    "pt": "Atualização GameHub disponível"
  },
  "Nieuwe versie:": {
    "en": "New version:",
    "fr": "Nouvelle version :",
    "de": "Neue Version:",
    "es": "Nueva versión:",
    "it": "Nuova versione:",
    "pt": "Nova versão:"
  },
  "Later": {
    "en": "Later",
    "fr": "Plus tard",
    "de": "Später",
    "es": "Más tarde",
    "it": "Più tardi",
    "pt": "Mais tarde"
  },
  "Bezig...": {
    "en": "Working...",
    "fr": "En cours...",
    "de": "Bitte warten...",
    "es": "Procesando...",
    "it": "In corso...",
    "pt": "Em curso..."
  },
  "Nu updaten": {
    "en": "Update now",
    "fr": "Mettre à jour",
    "de": "Jetzt aktualisieren",
    "es": "Actualizar ahora",
    "it": "Aggiorna ora",
    "pt": "Atualizar agora"
  },
  "Welkom bij GameHub!": {
    "en": "Welcome to GameHub!",
    "fr": "Bienvenue sur GameHub !",
    "de": "Willkommen bei GameHub!",
    "es": "¡Bienvenido a GameHub!",
    "it": "Benvenuto in GameHub!",
    "pt": "Bem-vindo ao GameHub!"
  },
  "Hoe mogen we je noemen? We gebruiken je naam op het welkomstscherm. Je kunt hem later wijzigen in Instellingen.": {
    "en": "What should we call you? Your name appears on the welcome screen and can be changed in Settings.",
    "fr": "Comment vous appeler ? Votre nom s'affichera à l'accueil et pourra être modifié dans Paramètres.",
    "de": "Wie dürfen wir dich nennen? Dein Name erscheint auf dem Startbildschirm und kann später geändert werden.",
    "es": "¿Cómo te llamamos? Tu nombre aparecerá en el inicio y podrás cambiarlo en Ajustes.",
    "it": "Come possiamo chiamarti? Il tuo nome apparirà nella schermata iniziale e potrai cambiarlo.",
    "pt": "Como te podemos chamar? O teu nome aparece no início e podes alterá-lo nas Definições."
  },
  "Vul je naam in...": {
    "en": "Enter your name...",
    "fr": "Saisissez votre nom...",
    "de": "Namen eingeben...",
    "es": "Escribe tu nombre...",
    "it": "Inserisci il tuo nome...",
    "pt": "Introduz o teu nome..."
  },
  "GameHub starten": {
    "en": "Start GameHub",
    "fr": "Lancer GameHub",
    "de": "GameHub starten",
    "es": "Iniciar GameHub",
    "it": "Avvia GameHub",
    "pt": "Iniciar GameHub"
  },
  "Je naam blijft lokaal op deze pc opgeslagen.": {
    "en": "Your name is stored locally on this PC.",
    "fr": "Votre nom reste enregistré sur ce PC.",
    "de": "Dein Name wird lokal auf diesem PC gespeichert.",
    "es": "Tu nombre se guarda en este PC.",
    "it": "Il tuo nome resta salvato su questo PC.",
    "pt": "O teu nome fica guardado neste PC."
  },
  "Bekijk game-informatie, beheer categorieën of start de game vanuit GameHub.": {
    "en": "View game information, manage categories or launch the game from GameHub.",
    "fr": "Consultez les informations, gérez les catégories ou lancez le jeu.",
    "de": "Zeige Spielinformationen an, verwalte Kategorien oder starte das Spiel.",
    "es": "Consulta la información, gestiona categorías o inicia el juego.",
    "it": "Visualizza informazioni, gestisci categorie o avvia il gioco.",
    "pt": "Consulta informações, gere categorias ou inicia o jogo."
  },
  "Automatische speelduurmeting werkt voorlopig bij rechtstreeks gestarte .exe- en .bat-games. Bij Steam, Epic, Ubisoft en snelkoppelingen telt GameHub momenteel alleen het aantal starts.": {
    "en": "Automatic playtime tracking currently works for directly launched .exe and .bat games. For launchers and shortcuts, only launches are counted.",
    "fr": "Le suivi du temps de jeu fonctionne pour les fichiers .exe et .bat. Pour les lanceurs et raccourcis, seuls les démarrages sont comptés.",
    "de": "Die Spielzeiterfassung funktioniert derzeit für direkt gestartete .exe- und .bat-Spiele. Bei Launchern werden nur Starts gezählt.",
    "es": "El tiempo se registra en juegos .exe y .bat directos. Para lanzadores y accesos directos solo se cuentan los inicios.",
    "it": "Il tempo viene registrato per i giochi .exe e .bat avviati direttamente. Per i launcher si contano solo gli avvii.",
    "pt": "O tempo é registado para jogos .exe e .bat iniciados diretamente. Nos launchers contam-se apenas os arranques."
  },
  "Speelduur wordt gemeten zolang het gestarte proces actief is. Bij games die een tweede proces openen, kan de meting afwijken.": {
    "en": "Playtime is measured while the launched process is running. Games that start another process may report inaccurate time.",
    "fr": "Le temps est mesuré tant que le processus reste actif. Certains jeux peuvent présenter des écarts.",
    "de": "Die Spielzeit wird gemessen, solange der Prozess läuft. Bei weiteren Prozessen kann die Messung abweichen.",
    "es": "El tiempo se mide mientras el proceso está activo. Puede variar si el juego abre otro proceso.",
    "it": "Il tempo viene misurato finché il processo è attivo. Può variare se il gioco apre altri processi.",
    "pt": "O tempo é medido enquanto o processo está ativo. Pode variar se o jogo abrir outro processo."
  },
  "Al je gevonden games op één plek.": {
    "en": "All your games in one place.",
    "fr": "Tous vos jeux au même endroit.",
    "de": "Alle deine Spiele an einem Ort.",
    "es": "Todos tus juegos en un lugar.",
    "it": "Tutti i tuoi giochi in un posto.",
    "pt": "Todos os teus jogos num só lugar."
  },
  "Je favoriete games.": {
    "en": "Your favorite games.",
    "fr": "Vos jeux préférés.",
    "de": "Deine Lieblingsspiele.",
    "es": "Tus juegos favoritos.",
    "it": "I tuoi giochi preferiti.",
    "pt": "Os teus jogos favoritos."
  },
  "Games die je onlangs hebt gestart.": {
    "en": "Games you've played recently.",
    "fr": "Jeux lancés récemment.",
    "de": "Zuletzt gestartete Spiele.",
    "es": "Juegos iniciados recientemente.",
    "it": "Giochi avviati di recente.",
    "pt": "Jogos iniciados recentemente."
  },
  "Je toegewezen VR-games.": {
    "en": "Your VR games.",
    "fr": "Vos jeux VR.",
    "de": "Deine VR-Spiele.",
    "es": "Tus juegos de RV.",
    "it": "I tuoi giochi VR.",
    "pt": "Os teus jogos VR."
  },
  "Je toegewezen singleplayer-games.": {
    "en": "Your single-player games.",
    "fr": "Vos jeux solo.",
    "de": "Deine Einzelspieler-Spiele.",
    "es": "Tus juegos de un jugador.",
    "it": "I tuoi giochi per giocatore singolo.",
    "pt": "Os teus jogos de um jogador."
  },
  "Je toegewezen racegames.": {
    "en": "Your racing games.",
    "fr": "Vos jeux de course.",
    "de": "Deine Rennspiele.",
    "es": "Tus juegos de carreras.",
    "it": "I tuoi giochi di corse.",
    "pt": "Os teus jogos de corridas."
  },
  "Je toegewezen horrorgames.": {
    "en": "Your horror games.",
    "fr": "Vos jeux d'horreur.",
    "de": "Deine Horrorspiele.",
    "es": "Tus juegos de terror.",
    "it": "I tuoi giochi horror.",
    "pt": "Os teus jogos de terror."
  },
  "Taal": {
    "en": "Language",
    "fr": "Langue",
    "de": "Sprache",
    "es": "Idioma",
    "it": "Lingua",
    "pt": "Idioma"
  },
  "Kies de taal van GameHub. Je keuze wordt automatisch opgeslagen.": {
    "en": "Choose the GameHub language. Your choice is saved automatically.",
    "fr": "Choisissez la langue de GameHub. Votre choix est enregistré.",
    "de": "Wähle die Sprache von GameHub. Deine Wahl wird gespeichert.",
    "es": "Elige el idioma de GameHub. Tu elección se guarda.",
    "it": "Scegli la lingua di GameHub. La scelta viene salvata.",
    "pt": "Escolhe o idioma do GameHub. A escolha é guardada."
  },
  "Zin om verder te spelen?": {
    "en": "Ready to play again?",
    "fr": "Envie de rejouer ?",
    "de": "Lust weiterzuspielen?",
    "es": "¿Quieres seguir jugando?",
    "it": "Vuoi continuare a giocare?",
    "pt": "Queres continuar a jogar?"
  },
  "staat klaar voor je.": {
    "en": "is ready for you.",
    "fr": "vous attend.",
    "de": "wartet auf dich.",
    "es": "te espera.",
    "it": "ti aspetta.",
    "pt": "está à tua espera."
  },
  "Nog geen games toegewezen aan": {
    "en": "No games assigned to",
    "fr": "Aucun jeu associé à",
    "de": "Keine Spiele zugewiesen zu",
    "es": "No hay juegos asignados a",
    "it": "Nessun gioco assegnato a",
    "pt": "Nenhum jogo atribuído a"
  },
  "Open een game om de categorieën in de details aan te passen.": {
    "en": "Open a game to edit its categories in the details.",
    "fr": "Ouvrez un jeu pour modifier ses catégories.",
    "de": "Öffne ein Spiel, um seine Kategorien zu ändern.",
    "es": "Abre un juego para cambiar sus categorías.",
    "it": "Apri un gioco per modificarne le categorie.",
    "pt": "Abre um jogo para alterar as categorias."
  },
  "Een nieuwe versie van GameHub is beschikbaar.": {
    "en": "A new version of GameHub is available.",
    "fr": "Une nouvelle version de GameHub est disponible.",
    "de": "Eine neue GameHub-Version ist verfügbar.",
    "es": "Hay una nueva versión de GameHub.",
    "it": "È disponibile una nuova versione di GameHub.",
    "pt": "Está disponível uma nova versão do GameHub."
  },
  "Je gebruikt de nieuwste versie van GameHub.": {
    "en": "You are using the latest version of GameHub.",
    "fr": "Vous utilisez la dernière version de GameHub.",
    "de": "Du verwendest die neueste GameHub-Version.",
    "es": "Estás usando la última versión de GameHub.",
    "it": "Stai usando la versione più recente di GameHub.",
    "pt": "Estás a usar a versão mais recente do GameHub."
  },
  "Update downloaden en installeren...": {
    "en": "Downloading and installing update...",
    "fr": "Téléchargement et installation...",
    "de": "Update wird heruntergeladen und installiert...",
    "es": "Descargando e instalando actualización...",
    "it": "Download e installazione aggiornamento...",
    "pt": "A transferir e instalar atualização..."
  },
  "Update geïnstalleerd. GameHub wordt opnieuw gestart...": {
    "en": "Update installed. Restarting GameHub...",
    "fr": "Mise à jour installée. Redémarrage...",
    "de": "Update installiert. GameHub startet neu...",
    "es": "Actualización instalada. Reiniciando GameHub...",
    "it": "Aggiornamento installato. Riavvio di GameHub...",
    "pt": "Atualização instalada. A reiniciar GameHub..."
  },
  "Updatecontrole werkt in de geïnstalleerde versie, niet in de ontwikkelmodus.": {
    "en": "Update checks work in the installed app, not development mode.",
    "fr": "La recherche de mises à jour fonctionne dans l’application installée.",
    "de": "Die Updateprüfung funktioniert nur in der installierten App.",
    "es": "La búsqueda de actualizaciones funciona en la app instalada.",
    "it": "Il controllo aggiornamenti funziona nella versione installata.",
    "pt": "A pesquisa de atualizações funciona na versão instalada."
  },
  "Map geselecteerd. Klik op Scan folder om games te zoeken.": {
    "en": "Folder selected. Click Scan folder to find games.",
    "fr": "Dossier sélectionné. Cliquez sur Analyser le dossier.",
    "de": "Ordner gewählt. Klicke auf Ordner durchsuchen.",
    "es": "Carpeta seleccionada. Pulsa Escanear carpeta.",
    "it": "Cartella selezionata. Premi Scansiona cartella.",
    "pt": "Pasta selecionada. Clica em Pesquisar pasta."
  },
  "Vul eerst de map in waarin je games staan.": {
    "en": "First select the folder containing your games.",
    "fr": "Sélectionnez d’abord le dossier de vos jeux.",
    "de": "Wähle zuerst deinen Spieleordner.",
    "es": "Primero selecciona la carpeta de tus juegos.",
    "it": "Seleziona prima la cartella dei giochi.",
    "pt": "Seleciona primeiro a pasta dos jogos."
  },
  "Kies een geldig afbeeldingsbestand.": {
    "en": "Choose a valid image file.",
    "fr": "Choisissez un fichier image valide.",
    "de": "Wähle eine gültige Bilddatei.",
    "es": "Elige un archivo de imagen válido.",
    "it": "Scegli un file immagine valido.",
    "pt": "Escolhe um ficheiro de imagem válido."
  },
  "Afbeelding kon niet worden gelezen.": {
    "en": "Could not read the image.",
    "fr": "Impossible de lire l’image.",
    "de": "Bild konnte nicht gelesen werden.",
    "es": "No se pudo leer la imagen.",
    "it": "Impossibile leggere l’immagine.",
    "pt": "Não foi possível ler a imagem."
  },
  "Alle games hebben al een cover en achtergrond.": {
    "en": "All games already have a cover and background.",
    "fr": "Tous les jeux ont déjà une couverture et un fond.",
    "de": "Alle Spiele haben bereits Cover und Hintergrund.",
    "es": "Todos los juegos ya tienen portada y fondo.",
    "it": "Tutti i giochi hanno già copertina e sfondo.",
    "pt": "Todos os jogos já têm capa e fundo."
  },
  "Er zijn geen verwijderde games om te herstellen.": {
    "en": "There are no removed games to restore.",
    "fr": "Aucun jeu retiré à restaurer.",
    "de": "Keine entfernten Spiele zum Wiederherstellen.",
    "es": "No hay juegos eliminados que restaurar.",
    "it": "Non ci sono giochi rimossi da ripristinare.",
    "pt": "Não há jogos removidos para restaurar."
  },
  "Verwijderde games zijn opnieuw toegestaan. Scan de launchers opnieuw om ze terug te zetten.": {
    "en": "Removed games can now be added again. Rescan your launchers.",
    "fr": "Les jeux retirés peuvent être ajoutés à nouveau. Relancez une analyse.",
    "de": "Entfernte Spiele können wieder hinzugefügt werden. Launcher erneut durchsuchen.",
    "es": "Los juegos eliminados pueden volver a añadirse. Escanea los lanzadores.",
    "it": "I giochi rimossi possono essere aggiunti di nuovo. Scansiona i launcher.",
    "pt": "Os jogos removidos podem ser adicionados novamente. Pesquisa os launchers."
  },
  "Ophalen mislukt:": {
    "en": "Loading failed:",
    "fr": "Échec du chargement :",
    "de": "Laden fehlgeschlagen:",
    "es": "Error al cargar:",
    "it": "Caricamento non riuscito:",
    "pt": "Falha ao carregar:"
  },
  "Artworkvoortgang:": {
    "en": "Artwork progress:",
    "fr": "Progression des images :",
    "de": "Bildfortschritt:",
    "es": "Progreso de imágenes:",
    "it": "Avanzamento immagini:",
    "pt": "Progresso das imagens:"
  }
};
export function translate(language: Language, text: string): string {
  return language === "nl" ? text : translations[text]?.[language] ?? text;
}

import { useEffect, useState } from "react";
import { type Language, getInitialLanguage, translate } from "./i18n";
import gameHubIcon from "./assets/gamehub-icon.png";
import gameHubWordmark from "./assets/gamehub-wordmark.png";
import { invoke } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type Category = "virtualReality" | "singlePlayer" | "racing" | "horror";
type ViewMode = "large" | "small" | "list";
type ThemeName = "classic" | "modern" | "dark" | "light" | "liquid";
type Page =
  | "Home" | "Library" | "Favorites" | "Recently Played"
  | "Virtual Reality" | "Single Player" | "Racing" | "Horror" | "Settings";

type Game = {
  title: string;
  path: string;
  favorite: boolean;
  shortcut?: boolean;
  cover?: string;
  background?: string;
  virtualReality?: boolean;
  singlePlayer?: boolean;
  racing?: boolean;
  horror?: boolean;
};

type Artwork = Partial<Omit<Game, "title" | "path" | "shortcut">>;
type ArtworkMap = Record<string, Artwork>;
type GameEntry = { title: string; path: string; shortcut: boolean };
type PlayStats = {
  total_seconds: number;
  launch_count: number;
  last_session_seconds: number;
  tracking_supported: boolean;
};

function formatPlayTime(seconds: number, language: Language): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} ${language === "nl" ? "u" : language === "fr" ? "h" : language === "de" ? "Std." : "h"} ${minutes} min` : `${minutes} min`;
}

type GameInfo = {
  description?: string | null;
  release_date?: string | null;
  developers?: string[];
  publishers?: string[];
  genres?: string[];
  steam_id?: number | null;
  source?: string | null;
};

const STORAGE_KEY = "gamehub-artwork-v1";
const INFO_KEY = "gamehub-info-v1";
const RECENT_KEY = "gamehub-recent-v1";
const HIDDEN_KEY = "gamehub-hidden-v1";
const REMOVED_GAMES_KEY = "gamehub-removed-games-v1";
const VIEW_KEY = "gamehub-view-v1";
const THEME_KEY = "gamehub-theme-v1";
const GAMES_KEY = "gamehub-games-v1";

const categoryInfo: Record<Category, { label: string; short: string; icon: string }> = {
  virtualReality: { label: "Virtual Reality", short: "VR", icon: "🥽" },
  singlePlayer: { label: "Single Player", short: "SP", icon: "🎯" },
  racing: { label: "Racing", short: "RACE", icon: "🏎️" },
  horror: { label: "Horror", short: "HOR", icon: "👻" },
};

const categoryPages: Partial<Record<Page, Category>> = {
  "Virtual Reality": "virtualReality",
  "Single Player": "singlePlayer",
  Racing: "racing",
  Horror: "horror",
};

const themes: Record<ThemeName, {
  label: string;
  background: string;
  sidebar: string;
  panel: string;
  panelHover: string;
  text: string;
  muted: string;
  accent: string;
  accentDark: string;
  border: string;
  glass: boolean;
}> = {
  classic: {
    label: "Classic",
    background: "#202329",
    sidebar: "#292d34",
    panel: "#30353d",
    panelHover: "#3a4049",
    text: "#f4f5f7",
    muted: "#b4bac4",
    accent: "#82aaff",
    accentDark: "#263b5d",
    border: "rgba(255,255,255,.11)",
    glass: false,
  },
  modern: {
    label: "Modern",
    background: "#171923",
    sidebar: "#1c1f2b",
    panel: "#242735",
    panelHover: "#303448",
    text: "#f4f5fb",
    muted: "#a8adbd",
    accent: "#9a91ff",
    accentDark: "#37305f",
    border: "rgba(255,255,255,.10)",
    glass: false,
  },
  dark: {
    label: "Dark",
    background: "#090a0d",
    sidebar: "#101116",
    panel: "#17191e",
    panelHover: "#22252c",
    text: "#f5f5f7",
    muted: "#9b9da7",
    accent: "#9297ff",
    accentDark: "#292b50",
    border: "rgba(255,255,255,.085)",
    glass: false,
  },
  light: {
    label: "Light",
    background: "#edf0f5",
    sidebar: "#e3e7ee",
    panel: "#ffffff",
    panelHover: "#f2f4fa",
    text: "#222631",
    muted: "#666d7c",
    accent: "#596cda",
    accentDark: "#e1e6ff",
    border: "rgba(20,30,50,.13)",
    glass: false,
  },
  liquid: {
    label: "Liquid Glass",
    background: "#111522",
    sidebar: "rgba(30,35,58,.24)",
    panel: "rgba(225,235,255,.035)",
    panelHover: "rgba(225,235,255,.085)",
    text: "#ffffff",
    muted: "#b0bbd4",
    accent: "#ded5ff",
    accentDark: "rgba(167,139,250,.18)",
    border: "rgba(255,255,255,.26)",
    glass: true,
  },
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

const PROFILE_KEY = "gamehub-profile-name-v1";

function App() {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const t = (value: string) => translate(language, value);
  useEffect(() => { localStorage.setItem("gamehub-language-v1", language); document.documentElement.lang = language; }, [language]);

  const [profileName, setProfileName] = useState(
    () => localStorage.getItem(PROFILE_KEY)?.trim() ?? ""
  );
  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);

  function saveProfileName() {
    const cleaned = nameDraft.trim().replace(/\\s+/g, " ").slice(0, 32);
    if (!cleaned) return;
    localStorage.setItem(PROFILE_KEY, cleaned);
    setProfileName(cleaned);
    setEditingName(false);
    setNameDraft("");
  }

  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  async function checkForUpdates(showNoUpdate = false) {
    if (import.meta.env.DEV) {
      if (showNoUpdate) setUpdateStatus(t("Updatecontrole werkt in de geïnstalleerde versie, niet in de ontwikkelmodus."));
      return;
    }
    try {
      const result = await check();
      if (result) {
        setAvailableUpdate(result);
        setUpdateNotes(result.body ?? t("Een nieuwe versie van GameHub is beschikbaar."));
        setUpdateStatus("");
      } else if (showNoUpdate) {
        setUpdateStatus(t("Je gebruikt de nieuwste versie van GameHub."));
      }
    } catch (error) {
      if (showNoUpdate) setUpdateStatus(`Updatecontrole mislukt: ${String(error)}`);
    }
  }

  async function installAvailableUpdate() {
    if (!availableUpdate || updateBusy) return;
    setUpdateBusy(true);
    setUpdateStatus(t("Update downloaden en installeren..."));
    try {
      await availableUpdate.downloadAndInstall();
      setUpdateStatus(t("Update geïnstalleerd. GameHub wordt opnieuw gestart..."));
      await relaunch();
    } catch (error) {
      setUpdateStatus(`Update mislukt: ${String(error)}`);
      setUpdateBusy(false);
    }
  }

  useEffect(() => {
    if (!import.meta.env.DEV) void checkForUpdates();
  }, []);

  const [page, setPage] = useState<Page>("Home");
  const [games, setGames] = useState<Game[]>(() => readStorage<Game[]>(GAMES_KEY, []));
  const [folderPath, setFolderPath] = useState(localStorage.getItem("gamehub-folder") ?? "");
  const [selectedPath, setSelectedPath] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [artworkLoading, setArtworkLoading] = useState(false);
  const [artworkProgress, setArtworkProgress] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem("gamehub-reduced-motion") === "true"
  );

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    return saved === "large" || saved === "small" || saved === "list" ? saved : "small";
  });

  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved && saved in themes ? saved as ThemeName : "liquid";
  });

  const [artwork, setArtwork] = useState<ArtworkMap>(() =>
    readStorage<ArtworkMap>(STORAGE_KEY, {})
  );
  const [recentPaths, setRecentPaths] = useState<string[]>(() =>
    readStorage<string[]>(RECENT_KEY, [])
  );
  const [hiddenPaths, setHiddenPaths] = useState<string[]>(() =>
    readStorage<string[]>(HIDDEN_KEY, [])
  );
  const [removedGames, setRemovedGames] = useState<Record<string, Game>>(() =>
    readStorage<Record<string, Game>>(REMOVED_GAMES_KEY, {})
  );
  const [showRemovedGames, setShowRemovedGames] = useState(false);

  const [gameInfo, setGameInfo] = useState<Record<string, GameInfo | null>>(
    () => readStorage<Record<string, GameInfo | null>>(INFO_KEY, {})
  );
  const [playStats, setPlayStats] = useState<Record<string, PlayStats>>({});
  const [onlineSteamCode, setOnlineSteamCode] = useState("");
  const [onlineSteamBusy, setOnlineSteamBusy] = useState(false);
  async function loginSteamAutomatically() {
    setOnlineSteamBusy(true);
    setMessage("Steam-login geopend. Rond de aanmelding af in je browser...");
    try {
      const account = await invoke<{ steam_id: string }>("login_steam_automatically");
      setOnlineSteamAccount(account);
      setOnlineSteamCode("");
      setMessage("Steam automatisch verbonden. Speeluren synchroniseren...");
      await syncSteamPlaytime(true);
    } catch (error) {
      setMessage(`Automatische Steam-login mislukt: ${String(error)}`);
    } finally { setOnlineSteamBusy(false); }
  }
  const [onlineSteamAccount, setOnlineSteamAccount] = useState<{ steam_id: string } | null>(null);
  async function testOnlineSteamLogin() {
    setOnlineSteamBusy(true);
    try {
      const result = await invoke<{ steam_id: string; session_token: string }>("redeem_steam_login_code", { code: onlineSteamCode.trim() });
      setOnlineSteamCode("");
      setOnlineSteamAccount({ steam_id: result.steam_id });
      setMessage(`Online Steam-login gelukt voor SteamID ${result.steam_id}. Speeluren synchroniseren...`);
      void syncSteamPlaytime(true);
    } catch (error) {
      setMessage(`Online Steam-login mislukt: ${String(error)}`);
    } finally {
      setOnlineSteamBusy(false);
    }
  }
  const [steamSyncBusy, setSteamSyncBusy] = useState(false);
  const [steamLoginBusy, setSteamLoginBusy] = useState(false);
  const [steamAccount, setSteamAccount] = useState<{steam_id: string} | null>(null);
  useEffect(() => { void invoke<{steam_id: string} | null>("get_steam_account").then(setSteamAccount).catch(() => {}); }, []);
  async function connectSteam() {
    setSteamLoginBusy(true);
    setMessage("Steam-aanmelding geopend in je browser. Meld je aan en keer terug naar GameHub.");
    try {
      const account = await invoke<{steam_id: string}>("connect_steam");
      setSteamAccount(account);
      setMessage(`Steam-account ${account.steam_id} veilig gekoppeld.`);
      void syncSteamPlaytime();
    } catch (error) { setMessage(`Steam-aanmelding: ${String(error)}`); }
    finally { setSteamLoginBusy(false); }
  }
  async function disconnectSteam() {
    try { await invoke("disconnect_steam"); setSteamAccount(null); setOnlineSteamAccount(null); setMessage("Steam-account ontkoppeld."); }
    catch (error) { setMessage(`Ontkoppelen mislukt: ${String(error)}`); }
  }
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState("");
  const colors = themes[themeName];
  const glass = colors.glass;
  const selectedGame = games.find((game) => game.path === selectedPath);

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      void invoke<Record<string, PlayStats>>("get_play_stats")
        .then((data) => { if (mounted) setPlayStats(data); })
        .catch(() => {});
    };
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  async function syncSteamPlaytime(showFeedback = false) {
    if (showFeedback) setSteamSyncBusy(true);
    try {
      const count = await invoke<number>("sync_steam_playtime");
      const stats = await invoke<Record<string, PlayStats>>("get_play_stats");
      setPlayStats(stats);
      if (showFeedback) setMessage(`Steam-speeluren gesynchroniseerd voor ${count} games.`);
    } catch (error) {
      if (showFeedback) setMessage(`Steam synchronisatie: ${String(error)}`);
    } finally {
      if (showFeedback) setSteamSyncBusy(false);
    }
  }

  useEffect(() => {
    void invoke<{ steam_id: string } | null>("get_online_steam_account")
      .then((account) => { if (account) setOnlineSteamAccount(account); }).catch(() => {});
    // Start meteen een sync als een opgeslagen sessie is teruggevonden.
    void invoke<{ steam_id: string } | null>("get_online_steam_account")
      .then((account) => { if (account) void syncSteamPlaytime(); }).catch(() => {});
    const interval = window.setInterval(() => { void syncSteamPlaytime(); }, 300000);
    return () => window.clearInterval(interval);
  }, []);

  // Upload enkel titels, platform en speeluren. Nooit lokale bestandspaden.
  // De hash identificeert een game stabiel, zonder het pad prijs te geven.
  useEffect(() => {
    if (!onlineSteamAccount) return;
    let cancelled = false;
    const upload = async () => {
      try {
        const nonSteam = games.filter(g => !g.path.startsWith("steam:"));
        const items = await Promise.all(nonSteam.map(async game => {
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(game.path));
          const game_key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
          const platform = game.path.startsWith("epic:") ? "epic" : game.path.startsWith("ubisoft:") ? "ubisoft" : "local";
          const cover_url = game.cover?.startsWith("https://") && game.cover.length <= 1000 ? game.cover : null;
          return { game_key, title: game.title.slice(0, 240), platform, playtime_seconds: Math.max(0, Math.floor(playStats[game.path]?.total_seconds ?? 0)), cover_url };
        }));
        if (cancelled) return;
        await invoke<number>("sync_gamehub_library", { games: items });
      } catch (error) {
        console.warn("Online bibliotheeksynchronisatie mislukt:", error);
      }
    };
    const timeout = window.setTimeout(() => { void upload(); }, 12000);
    const interval = window.setInterval(() => { void upload(); }, 300000);
    return () => { cancelled = true; window.clearTimeout(timeout); window.clearInterval(interval); };
  }, [games, onlineSteamAccount?.steam_id]);

  // Herstel eerst de duurzame Windows-bibliotheek; laat de automatische scans
  // intussen gewoon lopen en voeg beide resultaten samen.
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void invoke<Game[]>("load_gamehub_library")
      .then((saved) => {
        if (!cancelled && saved.length) {
          setGames((current) => mergeGames(saved, current.map(({ title, path, shortcut }) => ({ title, path, shortcut: !!shortcut }))));
        }
      })
      .catch((error) => console.warn("Windows-bibliotheek laden mislukt:", error))
      .finally(() => { if (!cancelled) setLibraryLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
    if (!libraryLoaded) return;
    const timeout = window.setTimeout(() => {
      void invoke("save_gamehub_library", { games })
        .catch((error) => console.error("Windows-bibliotheek bewaren mislukt:", error));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [games, libraryLoaded]);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(artwork)), [artwork]);
  useEffect(() => localStorage.setItem(INFO_KEY, JSON.stringify(gameInfo)), [gameInfo]);
  useEffect(() => localStorage.setItem(RECENT_KEY, JSON.stringify(recentPaths)), [recentPaths]);
  useEffect(() => localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenPaths)), [hiddenPaths]);
  useEffect(() => localStorage.setItem(REMOVED_GAMES_KEY, JSON.stringify(removedGames)), [removedGames]);
  useEffect(() => localStorage.setItem(VIEW_KEY, viewMode), [viewMode]);
  useEffect(() => localStorage.setItem(THEME_KEY, themeName), [themeName]);
  useEffect(() => localStorage.setItem("gamehub-reduced-motion", String(reduceMotion)), [reduceMotion]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const buttonStyle: React.CSSProperties = {
    background: glass
      ? "linear-gradient(135deg, rgba(255,255,255,.13), rgba(255,255,255,.025) 55%, rgba(190,205,255,.06))"
      : colors.panelHover,
    color: colors.text,
    border: `1px solid ${glass ? "rgba(255,255,255,.24)" : colors.border}`,
    borderRadius: 13,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
    transition: reduceMotion ? "none" : "background .22s ease, border-color .22s ease, transform .22s ease",
    backdropFilter: glass ? "blur(9px) saturate(190%) brightness(1.08)" : undefined,
    WebkitBackdropFilter: glass ? "blur(9px) saturate(190%) brightness(1.08)" : undefined,
    boxShadow: glass
      ? "inset 0 1px 0 rgba(255,255,255,.22), 0 4px 14px rgba(0,0,0,.07)"
      : undefined,
  };

  const inputStyle: React.CSSProperties = {
    background: glass ? "rgba(255,255,255,.045)" : colors.panel,
    color: colors.text,
    border: `1px solid ${glass ? "rgba(255,255,255,.23)" : colors.border}`,
    borderRadius: 14,
    padding: "12px 15px",
    outline: "none",
    minWidth: 0,
    backdropFilter: glass ? "blur(8px) saturate(190%)" : undefined,
    WebkitBackdropFilter: glass ? "blur(8px) saturate(190%)" : undefined,
    boxShadow: glass ? "inset 0 1px 0 rgba(255,255,255,.12)" : undefined,
  };

  const panelStyle: React.CSSProperties = {
    background: glass
      ? "linear-gradient(135deg, rgba(255,255,255,.17) 0%, rgba(255,255,255,.045) 18%, rgba(255,255,255,.012) 55%, rgba(190,205,255,.065) 100%)"
      : colors.panel,
    border: `1px solid ${glass ? "rgba(255,255,255,.27)" : colors.border}`,
    borderRadius: 22,
    boxShadow: glass
      ? "inset 0 1px 1px rgba(255,255,255,.38), inset 0 -1px 1px rgba(255,255,255,.07), 0 12px 35px rgba(0,0,0,.16), 0 0 0 .5px rgba(255,255,255,.07)"
      : "0 10px 35px rgba(0,0,0,.13)",
    backdropFilter: glass ? "blur(16px) saturate(190%) brightness(1.06)" : undefined,
    WebkitBackdropFilter: glass ? "blur(16px) saturate(190%) brightness(1.06)" : undefined,
  };

  function mergeGames(existing: Game[], incoming: GameEntry[]): Game[] {
    const hidden = new Set(readStorage<string[]>(HIDDEN_KEY, hiddenPaths));
    const merged = new Map<string, Game>();

    for (const game of existing) {
      if (!hidden.has(game.path)) merged.set(game.path, game);
    }

    for (const entry of incoming) {
      if (hidden.has(entry.path)) continue;
      const oldGame = merged.get(entry.path);
      const saved = readStorage<ArtworkMap>(STORAGE_KEY, artwork)[entry.path];

      merged.set(entry.path, {
        title: entry.title,
        path: entry.path,
        shortcut: entry.shortcut,
        cover: saved?.cover ?? oldGame?.cover,
        background: saved?.background ?? oldGame?.background,
        favorite: saved?.favorite ?? oldGame?.favorite ?? false,
        virtualReality: saved?.virtualReality ?? oldGame?.virtualReality ?? false,
        singlePlayer: saved?.singlePlayer ?? oldGame?.singlePlayer ?? false,
        racing: saved?.racing ?? oldGame?.racing ?? false,
        horror: saved?.horror ?? oldGame?.horror ?? false,
      });
    }

    return Array.from(merged.values()).sort((a, b) => a.title.localeCompare(b.title));
  }

  function selectAvailableGame(list: Game[]) {
    setSelectedPath((current) => list.some((g) => g.path === current) ? current : list[0]?.path ?? "");
  }

  // Zoek bij het opstarten op de achtergrond naar nieuwe games.
  // Bestaande games blijven zichtbaar terwijl de scans lopen.
  useEffect(() => {
    let cancelled = false;

    async function autoScanGames() {
      const sources: { command: string; args?: Record<string, string> }[] = [
        { command: "scan_steam_games" },
        { command: "scan_epic_games" },
        { command: "scan_ubisoft_games" },
      ];
      const savedFolder = localStorage.getItem("gamehub-folder")?.trim();
      if (savedFolder) {
        sources.push({ command: "scan_games", args: { folderPath: savedFolder } });
      }

      for (const source of sources) {
        if (cancelled) break;
        try {
          const entries = await invoke<GameEntry[]>(source.command, source.args);
          if (!cancelled && entries.length) {
            setGames((current) => mergeGames(current, entries));
          }
        } catch (error) {
          // Een ontbrekende launcher mag de rest van de bibliotheek niet blokkeren.
          console.warn(`Automatische scan overgeslagen: ${source.command}`, error);
        }
      }
    }

    void autoScanGames();
    return () => { cancelled = true; };
  }, []);

  async function scanWith(command: string, label: string) {
    setLoading(true);
    setMessage(`${label} zoeken...`);
    try {
      const result = await invoke<GameEntry[]>(command);
      const found = mergeGames(games, result);
      setGames(found);
      selectAvailableGame(found);
      setMessage(`${result.length} ${label} gevonden. Je bibliotheek bevat nu ${found.length} games.`);
    } catch (error) {
      setMessage(`${label} scannen: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function browseGameFolder() {
    try {
      const selected = await invoke<string | null>("select_game_folder");
      if (selected) {
        setFolderPath(selected);
        localStorage.setItem("gamehub-folder", selected);
        setMessage(t("Map geselecteerd. Klik op Scan folder om games te zoeken."));
      }
    } catch (error) {
      setMessage(`Map selecteren mislukt: ${String(error)}`);
    }
  }

  async function scanFolder() {
    if (!folderPath.trim()) {
      setMessage(t("Vul eerst de map in waarin je games staan."));
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await invoke<GameEntry[]>("scan_games", { folderPath: folderPath.trim() });
      const found = mergeGames(games, result);
      setGames(found);
      selectAvailableGame(found);
      localStorage.setItem("gamehub-folder", folderPath.trim());
      setMessage(`${result.length} gamebestanden gevonden. Je bibliotheek bevat nu ${found.length} games.`);
    } catch (error) {
      setMessage(`Map scannen mislukt: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function launchGame(game: Game) {
    try {
      await invoke("launch_game", { path: game.path, shortcut: game.shortcut ?? false });
      setRecentPaths((previous) => [game.path, ...previous.filter((p) => p !== game.path)].slice(0, 10));
      setMessage(`${game.title} is gestart.`);
    } catch (error) {
      setMessage(`Game starten mislukt: ${String(error)}`);
    }
  }

  function saveArtwork(game: Game, field: "cover" | "background", value: string) {
    setArtwork((previous) => ({ ...previous, [game.path]: { ...previous[game.path], [field]: value } }));
    setGames((previous) => previous.map((g) => g.path === game.path ? { ...g, [field]: value } : g));
    setMessage(field === "cover" ? `Cover bijgewerkt voor ${game.title}.` : `Achtergrond bijgewerkt voor ${game.title}.`);
  }

  function chooseImage(game: Game, field: "cover" | "background", file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage(t("Kies een geldig afbeeldingsbestand."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") saveArtwork(game, field, reader.result);
    };
    reader.onerror = () => setMessage(t("Afbeelding kon niet worden gelezen."));
    reader.readAsDataURL(file);
  }

  async function fetchArtwork(game: Game) {
    setArtworkLoading(true);
    setMessage(`Artwork zoeken voor ${game.title}...`);
    try {
      const result = await invoke<{ cover?: string | null; background?: string | null }>(
        "search_game_artwork", { gameName: game.title }
      );
      if (!result.cover && !result.background) {
        setMessage(`Geen artwork gevonden voor ${game.title}.`);
        return;
      }

      const update: Artwork = {
        ...(result.cover ? { cover: result.cover } : {}),
        ...(result.background ? { background: result.background } : {}),
      };
      setArtwork((previous) => ({ ...previous, [game.path]: { ...previous[game.path], ...update } }));
      setGames((previous) => previous.map((g) => g.path === game.path ? { ...g, ...update } : g));
      setMessage(`Artwork gevonden voor ${game.title}.`);
    } catch (error) {
      setMessage(`Artwork ophalen mislukt: ${String(error)}`);
    } finally {
      setArtworkLoading(false);
    }
  }

  async function fetchAllArtwork() {
    const needing = games.filter((g) => !g.cover || !g.background);
    if (!needing.length) {
      setMessage(t("Alle games hebben al een cover en achtergrond."));
      return;
    }

    setArtworkLoading(true);
    let found = 0;
    let failed = 0;

    try {
      for (let i = 0; i < needing.length; i++) {
        const game = needing[i];
        setArtworkProgress(`${i + 1}/${needing.length} — ${game.title}`);
        try {
          const result = await invoke<{ cover?: string | null; background?: string | null }>(
            "search_game_artwork", { gameName: game.title }
          );
          const update: Artwork = {
            ...(!game.cover && result.cover ? { cover: result.cover } : {}),
            ...(!game.background && result.background ? { background: result.background } : {}),
          };
          if (Object.keys(update).length) {
            found++;
            setArtwork((previous) => ({ ...previous, [game.path]: { ...previous[game.path], ...update } }));
            setGames((previous) => previous.map((g) => g.path === game.path ? { ...g, ...update } : g));
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }
      setMessage(`Artwork klaar. ${found} games bijgewerkt, ${failed} zonder nieuwe artwork.`);
    } finally {
      setArtworkLoading(false);
      setArtworkProgress("");
    }
  }

  function toggleFavorite(game: Game) {
    const favorite = !game.favorite;
    setArtwork((p) => ({ ...p, [game.path]: { ...p[game.path], favorite } }));
    setGames((p) => p.map((g) => g.path === game.path ? { ...g, favorite } : g));
  }

  function toggleCategory(game: Game, category: Category) {
    const value = !game[category];
    setArtwork((p) => ({ ...p, [game.path]: { ...p[game.path], [category]: value } }));
    setGames((p) => p.map((g) => g.path === game.path ? { ...g, [category]: value } : g));
    setMessage(`${game.title}: ${t(categoryInfo[category].label)} ${value ? "toegevoegd" : "verwijderd"}.`);
  }

  function removeGame(game: Game) {
    if (!window.confirm(`Wil je "${game.title}" uit GameHub verwijderen?\n\nDe gamebestanden blijven op je pc staan.`)) return;
    setRemovedGames((p) => ({ ...p, [game.path]: game }));
    setHiddenPaths((p) => p.includes(game.path) ? p : [...p, game.path]);
    setGames((p) => {
      const remaining = p.filter((g) => g.path !== game.path);
      setSelectedPath((current) => current === game.path ? remaining[0]?.path ?? "" : current);
      return remaining;
    });
    setRecentPaths((p) => p.filter((path) => path !== game.path));
    setDetailsOpen(false);
    setMessage(`${game.title} is uit GameHub verwijderd.`);
  }

  function removedGameTitle(path: string): string {
    const stored = removedGames[path];
    if (stored?.title) return stored.title;
    const lastPart = path.split(/[\\/]/).filter(Boolean).pop() ?? path;
    return lastPart.replace(/\.(exe|lnk|bat|url)$/i, "") || path;
  }

  function restoreRemovedGame(path: string) {
    const savedGame = removedGames[path];
    // Remove the block immediately, including from storage used by background scanning.
    const nextHidden = hiddenPaths.filter((p) => p !== path);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(nextHidden));
    setHiddenPaths(nextHidden);
    setRemovedGames((previous) => {
      const next = { ...previous };
      delete next[path];
      return next;
    });
    if (savedGame) {
      setGames((previous) => previous.some((game) => game.path === path)
        ? previous
        : [...previous, savedGame].sort((a, b) => a.title.localeCompare(b.title)));
      setMessage(`${savedGame.title} is teruggezet in je bibliotheek.`);
    } else {
      setMessage(`${removedGameTitle(path)} is opnieuw toegestaan. Scan je games opnieuw om deze terug te vinden.`);
    }
  }

  function restoreRemovedGames() {
    if (!hiddenPaths.length) return;
    const saved = hiddenPaths.map((path) => removedGames[path]).filter((game): game is Game => Boolean(game));
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([]));
    setHiddenPaths([]);
    setRemovedGames({});
    setGames((previous) => {
      const known = new Set(previous.map((game) => game.path));
      return [...previous, ...saved.filter((game) => !known.has(game.path))]
        .sort((a, b) => a.title.localeCompare(b.title));
    });
    setMessage("Alle verborgen games zijn opnieuw toegestaan. Oudere games zonder opgeslagen gegevens verschijnen na een nieuwe scan.");
  }

  const recentGames = recentPaths.map((path) => games.find((g) => g.path === path)).filter((g): g is Game => Boolean(g));
  const favoriteGames = games.filter((g) => g.favorite);
  const lastPlayedGame = recentGames[0];
  const activeCategory = categoryPages[page];

  const visibleGames = games.filter((game) =>
    game.title.toLowerCase().includes(search.toLowerCase()) &&
    (page !== "Favorites" || game.favorite) &&
    (page !== "Recently Played" || recentPaths.includes(game.path)) &&
    (!activeCategory || game[activeCategory] === true) &&
    (!favoritesOnly || game.favorite)
  );

  function providerLabel(game: Game) {
    if (game.path.startsWith("steam:")) return "STEAM";
    if (game.path.startsWith("epic:")) return "EPIC GAMES";
    if (game.path.startsWith("ubisoft:")) return "UBISOFT CONNECT";
    if (game.shortcut) return "SHORTCUT";
    if (game.path.toLowerCase().endsWith(".bat")) return "BATCH FILE";
    return "WINDOWS GAME";
  }

  function navItem(label: Page, icon: string) {
    const active = page === label;
    return (
      <button key={label} onClick={() => { setPage(label); setMessage(""); setFavoritesOnly(false); }}
        style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
          padding: "11px 13px", marginBottom: 4,
          border: `1px solid ${active ? colors.border : "transparent"}`,
          borderRadius: 13, background: active ? colors.accentDark : glass ? "rgba(9,13,27,.55)" : "transparent",
          color: active ? colors.text : glass ? "#d3dbec" : colors.muted, cursor: "pointer",
          fontSize: 13, fontWeight: active ? 700 : 500,
          transition: reduceMotion ? "none" : "all .2s ease",
          backdropFilter: glass && active ? "blur(12px)" : undefined,
          WebkitBackdropFilter: glass && active ? "blur(12px)" : undefined,
        }}>
        <span style={{ width: 22, fontSize: 17 }}>{icon}</span>{t(label)}
      </button>
    );
  }

  async function loadGameInfo(game: Game, refresh = false) {
    if (!refresh && Object.prototype.hasOwnProperty.call(gameInfo, game.path)) return;
    setInfoLoading(true);
    setInfoError("");
    try {
      const result = await invoke<GameInfo | null>("get_game_info", {
        path: game.path, gameName: game.title,
      });
      setGameInfo((previous) => ({ ...previous, [game.path]: result }));
    } catch (error) {
      setInfoError(String(error));
    } finally {
      setInfoLoading(false);
    }
  }

  function openDetails(game: Game) {
    setSelectedPath(game.path);
    setDetailsOpen(true);
    setInfoError("");
    void loadGameInfo(game);
  }

  function gameCard(game: Game) {
    const selected = selectedPath === game.path;
    if (viewMode === "list") {
      return (
        <article key={game.path} onClick={() => openDetails(game)}
          style={{ ...panelStyle, display: "flex", alignItems: "center", gap: 14, padding: 10,
            cursor: "pointer", borderColor: selected ? colors.accent : colors.border,
            animation: reduceMotion ? "none" : "ghFade .3s ease both" }}>
          {game.cover
            ? <img src={game.cover} alt="" style={{ width: 76, height: 54, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
            : <div style={{ width: 76, height: 54, borderRadius: 10, background: glass ? "rgba(255,255,255,.035)" : colors.panelHover, display: "grid", placeItems: "center" }}>🎮</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.title}</div>
            <div style={{ color: colors.muted, fontSize: 10, marginTop: 5 }}>{providerLabel(game)}</div>
          </div>
          <button title={t("Favoriet")} style={{ ...buttonStyle, color: game.favorite ? "#fbbf24" : colors.muted }} onClick={(e) => { e.stopPropagation(); toggleFavorite(game); }}>{game.favorite ? "★" : "☆"}</button>
          <button style={buttonStyle} onClick={(e) => { e.stopPropagation(); void launchGame(game); }}>▶ {t("Start")}</button>
          <button style={{ ...buttonStyle, color: "#ff9898" }} onClick={(e) => { e.stopPropagation(); removeGame(game); }}>✕</button>
        </article>
      );
    }

    const large = viewMode === "large";
    return (
      <article key={game.path} onClick={() => openDetails(game)}
        style={{ overflow: "hidden", borderRadius: large ? 21 : 17,
          background: selected ? colors.accentDark : glass
            ? "linear-gradient(145deg,rgba(255,255,255,.10),rgba(255,255,255,.018) 50%,rgba(190,205,255,.045))"
            : colors.panel,
          border: `1px solid ${selected ? colors.accent : glass ? "rgba(255,255,255,.22)" : colors.border}`,
          cursor: "pointer", minWidth: 0, boxShadow: selected
            ? "0 10px 28px rgba(0,0,0,.2)"
            : glass ? "inset 0 1px 0 rgba(255,255,255,.15), 0 10px 30px rgba(0,0,0,.09)" : "none",
          transition: reduceMotion ? "none" : "transform .25s ease, border-color .25s ease, box-shadow .25s ease",
          animation: reduceMotion ? "none" : "ghFade .32s ease both",
          backdropFilter: glass ? "blur(12px) saturate(175%)" : undefined,
          WebkitBackdropFilter: glass ? "blur(12px) saturate(175%)" : undefined }}>
        <div style={{ height: large ? 250 : 165, background: glass ? "rgba(255,255,255,.025)" : colors.panelHover, position: "relative", overflow: "hidden" }}>
          {game.cover
            ? <img src={game.cover} alt={`${game.title} cover`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ height: "100%", display: "grid", placeItems: "center", fontSize: large ? 48 : 38 }}>🎮</div>}
          <button title={game.favorite ? t("Verwijder favoriet") : t("Voeg favoriet toe")}
            onClick={(e) => { e.stopPropagation(); toggleFavorite(game); }}
            style={{ position: "absolute", top: 9, right: 9, border: "1px solid rgba(255,255,255,.3)",
              borderRadius: 24, width: 36, height: 36, background: "rgba(20,20,30,.42)",
              backdropFilter: "blur(10px) saturate(180%)", WebkitBackdropFilter: "blur(10px) saturate(180%)",
              color: game.favorite ? "#fbbf24" : "#fff", cursor: "pointer", fontSize: 18,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }}>
            {game.favorite ? "★" : "☆"}
          </button>
        </div>
        <div style={{ padding: large ? 15 : 11 }}>
          <div title={game.title} style={{ fontWeight: 650, fontSize: large ? 15 : 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.title}</div>
          <div style={{ color: colors.muted, fontSize: 9, marginTop: 6 }}>{providerLabel(game)}</div>
          <button style={{ ...buttonStyle, width: "100%", marginTop: 9, background: colors.accentDark, fontSize: 12 }}
            onClick={(e) => { e.stopPropagation(); void launchGame(game); }}>▶ {t("Start game")}</button>
          <button style={{ ...buttonStyle, width: "100%", marginTop: 6, padding: "6px 8px", color: "#ff9898", fontSize: 11, background: "transparent", borderColor: "transparent" }}
            onClick={(e) => { e.stopPropagation(); removeGame(game); }}>{t("Verwijderen uit GameHub")}</button>
        </div>
      </article>
    );
  }

  function gameGrid(list: Game[]) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: viewMode === "large" ? "repeat(auto-fill,minmax(220px,1fr))" : viewMode === "small" ? "repeat(auto-fill,minmax(150px,1fr))" : "1fr", gap: viewMode === "large" ? 19 : 12 }}>
        {list.map(gameCard)}
      </div>
    );
  }

  function sectionTitle(title: string, subtitle: string) {
    return (
      <div style={{ marginBottom: 25 }}>
        <h1 style={{ margin: 0, fontSize: 29, fontWeight: 750, letterSpacing: "-.9px" }}>{title}</h1>
        <p style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>{subtitle}</p>
      </div>
    );
  }

  function viewSelector() {
    const modes: { id: ViewMode; label: string; icon: string }[] = [
      { id: "large", label: t("Grote tegels"), icon: "▦" },
      { id: "small", label: t("Kleine tegels"), icon: "▤" },
      { id: "list", label: t("Lijst"), icon: "☰" },
    ];
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, padding: 4, borderRadius: 14, background: glass ? "rgba(255,255,255,.035)" : colors.panel, border: `1px solid ${colors.border}`, backdropFilter: glass ? "blur(10px)" : undefined }}>
        {modes.map((mode) => (
          <button key={mode.id} title={mode.label} aria-label={mode.label} onClick={() => setViewMode(mode.id)}
            style={{ ...buttonStyle, borderColor: viewMode === mode.id ? colors.border : "transparent", borderRadius: 10,
              padding: "8px 11px", color: viewMode === mode.id ? colors.text : glass ? "#d3dbec" : colors.muted,
              background: viewMode === mode.id ? colors.accentDark : glass ? "rgba(9,13,27,.55)" : "transparent", fontSize: 12 }}>
            <span style={{ marginRight: 6 }}>{mode.icon}</span>{mode.label}
          </button>
        ))}
      </div>
    );
  }

  function uploadLabel(game: Game, field: "cover" | "background", label: string) {
    return (
      <label style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
        {label}
        <input type="file" accept="image/*" hidden onChange={(e) => { chooseImage(game, field, e.target.files?.[0]); e.currentTarget.value = ""; }} />
      </label>
    );
  }

  const pageSubtitle: Partial<Record<Page, string>> = {
    Library: t("Al je gevonden games op één plek."),
    Favorites: t("Je favoriete games."),
    "Recently Played": t("Games die je onlangs hebt gestart."),
    "Virtual Reality": t("Je toegewezen VR-games."),
    "Single Player": t("Je toegewezen singleplayer-games."),
    Racing: t("Je toegewezen racegames."),
    Horror: t("Je toegewezen horrorgames."),
  };

  return (
    <div style={{
      minHeight: "100vh", position: "relative", isolation: "isolate", overflow: "hidden",
      background: glass
        ? "radial-gradient(ellipse at 12% 5%, rgba(111,125,255,.42), transparent 38%), radial-gradient(ellipse at 88% 24%, rgba(207,137,255,.34), transparent 35%), radial-gradient(ellipse at 45% 100%, rgba(62,190,235,.27), transparent 42%), #111522"
        : colors.background,
      color: colors.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
      display: "flex", letterSpacing: "-.15px",
      transition: reduceMotion ? "none" : "background .35s ease, color .35s ease",
    }}>
      <style>{`
        @keyframes ghFade { from {opacity:0;transform:translateY(10px)} to {opacity:1;transform:translateY(0)} }
        @keyframes ghModal { from {opacity:0;transform:translateY(14px) scale(.985)} to {opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ghFloat { 0%,100% {transform:translate3d(0,0,0)} 50% {transform:translate3d(-12px,10px,0)} }
        * { scrollbar-width:thin; scrollbar-color:${glass ? "#77758d" : colors.panelHover} transparent; }
        button:hover { filter:brightness(1.12); }
        article:hover { transform:translateY(-3px); }
        button:active { transform:scale(.98); }
        input,button { font:inherit; }
        ${reduceMotion ? "* { animation:none !important; transition:none !important; scroll-behavior:auto !important; }" : ""}
        @media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms !important; transition-duration:.01ms !important; } }
      `}</style>

      {glass && (
        <>
          <div aria-hidden="true" style={{ position: "fixed", zIndex: -1, width: 520, height: 520, top: -170, left: "20%", borderRadius: "50%", background: "rgba(118,112,255,.25)", filter: "blur(90px)", pointerEvents: "none", animation: reduceMotion ? "none" : "ghFloat 14s ease-in-out infinite" }} />
          <div aria-hidden="true" style={{ position: "fixed", zIndex: -1, width: 450, height: 450, top: "25%", right: -160, borderRadius: "50%", background: "rgba(205,130,255,.20)", filter: "blur(95px)", pointerEvents: "none" }} />
          <div aria-hidden="true" style={{ position: "fixed", zIndex: -1, width: 420, height: 420, left: "35%", bottom: -180, borderRadius: "50%", background: "rgba(75,189,231,.20)", filter: "blur(95px)", pointerEvents: "none" }} />
        </>
      )}

      <aside style={{ width: 230, flexShrink: 0, background: glass ? "linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.018) 45%,rgba(170,185,255,.045))" : colors.sidebar,
        backdropFilter: glass ? "blur(22px) saturate(190%)" : "blur(24px)",
        WebkitBackdropFilter: glass ? "blur(22px) saturate(190%)" : "blur(24px)",
        borderRight: `1px solid ${glass ? "rgba(255,255,255,.22)" : colors.border}`, minHeight: "100vh", padding: "25px 14px",
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        boxShadow: glass ? "inset -1px 0 0 rgba(255,255,255,.035)" : undefined }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 8px 32px" }}>
          <img src={gameHubIcon} alt="GameHub GH-logo" style={{ width: 47, height: 47, objectFit: "cover", borderRadius: 13, boxShadow: "0 0 18px rgba(133,65,255,.25)" }} />
          <div>
            <img src={gameHubWordmark} alt="GameHub" style={{ width: 141, height: 35, objectFit: "contain", objectPosition: "left center", display: "block" }} />
            <div style={{ color: colors.muted, fontSize: 10, marginTop: -1 }}>{t("YOUR GAME SPACE")}</div>
          </div>
        </div>

        <div style={{ color: colors.muted, opacity: .7, fontSize: 10, fontWeight: 750, letterSpacing: 1.3, padding: "0 13px 9px" }}>{t("LIBRARY")}</div>
        {navItem("Home", "⌂")}{navItem("Library", "▦")}{navItem("Favorites", "★")}{navItem("Recently Played", "◷")}
        <div style={{ color: colors.muted, opacity: .7, fontSize: 10, fontWeight: 750, letterSpacing: 1.3, padding: "23px 13px 9px" }}>{t("CATEGORIEËN")}</div>
        {navItem("Virtual Reality", "🥽")}{navItem("Single Player", "🎯")}{navItem("Racing", "🏎️")}{navItem("Horror", "👻")}
        <div style={{ flex: 1 }} />
        <div style={{ ...panelStyle, padding: 14, margin: "15px 2px" }}>
          <div style={{ fontSize: 12, fontWeight: 650 }}>Gaming PC</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#86efac", fontSize: 11, marginTop: 9 }}>● App actief</div>
          <div style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}>{games.length} {t("games ingeladen")}</div>
        </div>
        {navItem("Settings", "⚙")}
        <div style={{ color: colors.muted, opacity: .7, fontSize: 10, padding: "18px 12px 0" }}>{t("GAMEHUB • PERSONAL LAUNCHER")}</div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "30px 32px", position: "relative" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 29 }}>
          <div>
            <div style={{ color: colors.muted, fontSize: 11, letterSpacing: .3 }}>{t("YOUR PERSONAL GAME LIBRARY")}</div>
            <div style={{ fontSize: 26, fontWeight: 750, letterSpacing: "-.9px", marginTop: 5 }}>{page === "Home" ? `${t("Welkom terug,")} ${profileName || t("gamer")}` : t(page)}</div>
          </div>
          <input style={{ ...inputStyle, width: 235 }} placeholder="⌕  Zoek een game..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </header>

        {message && <div role="status" style={{ background: glass ? "rgba(255,255,255,.045)" : colors.accentDark, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 15, padding: "12px 15px", marginBottom: 20, fontSize: 13, overflowWrap: "anywhere", backdropFilter: glass ? "blur(12px) saturate(180%)" : undefined }}>
          {message}{artworkLoading && artworkProgress && <div style={{ marginTop: 8, color: colors.accent }}>{t("Artworkvoortgang:")} {artworkProgress}</div>}
        </div>}

        {page === "Settings" ? (
          <div style={{ ...panelStyle, maxWidth: 900, padding: 25 }}>
            {sectionTitle(t("Instellingen"), t("Personaliseer GameHub en beheer je gamebibliotheek."))}

            <div style={{ border: `1px solid ${colors.border}`, background: glass ? "rgba(12,16,32,.55)" : colors.panelHover, borderRadius: 16, padding: 18, marginBottom: 25 }}>
              <h3 style={{ fontSize: 16, marginTop: 0 }}>{t("Taal")}</h3>
              <p style={{ color: colors.muted, fontSize: 13 }}>{t("Kies de taal van GameHub. Je keuze wordt automatisch opgeslagen.")}</p>
              <select aria-label={t("Taal")} value={language} onChange={(event) => setLanguage(event.target.value as Language)}
                style={{ ...inputStyle, width: "100%", maxWidth: 360, cursor: "pointer", background: themeName === "light" ? "#ffffff" : "#20263a", color: themeName === "light" ? "#222631" : "#ffffff", colorScheme: themeName === "light" ? "light" : "dark" }}>
                <option value="nl" style={{ backgroundColor: themeName === "light" ? "#ffffff" : "#20263a", color: themeName === "light" ? "#222631" : "#ffffff" }}>🇳🇱 Nederlands</option>
                <option value="en" style={{ backgroundColor: themeName === "light" ? "#ffffff" : "#20263a", color: themeName === "light" ? "#222631" : "#ffffff" }}>🇬🇧 English</option>
                <option value="fr" style={{ backgroundColor: themeName === "light" ? "#ffffff" : "#20263a", color: themeName === "light" ? "#222631" : "#ffffff" }}>🇫🇷 Français</option>
                <option value="de" style={{ backgroundColor: themeName === "light" ? "#ffffff" : "#20263a", color: themeName === "light" ? "#222631" : "#ffffff" }}>🇩🇪 Deutsch</option>
                <option value="es" style={{ backgroundColor: themeName === "light" ? "#ffffff" : "#20263a", color: themeName === "light" ? "#222631" : "#ffffff" }}>🇪🇸 Español</option>
                <option value="it" style={{ backgroundColor: themeName === "light" ? "#ffffff" : "#20263a", color: themeName === "light" ? "#222631" : "#ffffff" }}>🇮🇹 Italiano</option>
                <option value="pt" style={{ backgroundColor: themeName === "light" ? "#ffffff" : "#20263a", color: themeName === "light" ? "#222631" : "#ffffff" }}>🇵🇹 Português</option>
              </select>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, background: glass ? "rgba(12,16,32,.55)" : colors.panelHover, borderRadius: 16, padding: 18, marginBottom: 25 }}>
              <h3 style={{ fontSize: 16, marginTop: 0 }}>{t("Jouw profiel")}</h3>
              <p style={{ color: colors.muted, fontSize: 13 }}>{t("De naam die GameHub op het welkomstscherm toont.")}</p>
              <form onSubmit={(event) => { event.preventDefault(); saveProfileName(); }} style={{ display: "flex", flexWrap: "wrap", gap: 9, alignItems: "center" }}>
                <input aria-label={t("Jouw naam")} maxLength={32} style={{ ...inputStyle, flex: "1 1 190px" }} value={editingName ? nameDraft : profileName} onFocus={() => { if (!editingName) { setNameDraft(profileName); setEditingName(true); } }} onChange={(event) => { setNameDraft(event.target.value); setEditingName(true); }} placeholder={t("Jouw naam")} />
                <button type="submit" style={buttonStyle} disabled={!editingName || !nameDraft.trim()}>{t("Naam opslaan")}</button>
              </form>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18, marginBottom: 24, background: glass ? "rgba(12,16,32,.55)" : colors.panelHover }}>
              <h3 style={{ marginTop: 0 }}>{t("GameHub-updates")}</h3>
              <p style={{ color: colors.muted, fontSize: 13 }}>{t("Controleer of er een nieuwe versie beschikbaar is via GitHub Releases.")}</p>
              <button style={buttonStyle} onClick={() => void checkForUpdates(true)}>{t("Controleren op updates")}</button>
              {updateStatus && <p style={{ color: colors.muted, fontSize: 12 }}>{updateStatus}</p>}
            </div>
            <h3 style={{ fontSize: 16 }}>{t("Uiterlijk en stijl")}</h3>
            <p style={{ color: colors.muted, fontSize: 13, lineHeight: 1.7 }}>{t("Kies je favoriete interface. Je keuze wordt automatisch bewaard.")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12 }}>
              {(Object.keys(themes) as ThemeName[]).map((key) => {
                const previewTheme = themes[key];
                const active = themeName === key;
                return (
                  <button key={key} onClick={() => setThemeName(key)}
                    style={{ textAlign: "left", padding: 9, borderRadius: 17, border: `2px solid ${active ? previewTheme.accent : colors.border}`,
                      background: previewTheme.glass
                        ? "linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.025)),radial-gradient(ellipse at 80% 10%,rgba(160,140,255,.3),transparent 70%),#111522"
                        : previewTheme.background,
                      color: previewTheme.text, cursor: "pointer", transition: reduceMotion ? "none" : "all .22s ease" }}>
                    <div style={{ height: 72, borderRadius: 10, overflow: "hidden", padding: 7, background: previewTheme.background, display: "flex", gap: 5 }}>
                      <div style={{ width: "25%", borderRadius: 6, background: previewTheme.sidebar, border: `1px solid ${previewTheme.border}` }} />
                      <div style={{ flex: 1, borderRadius: 6, background: previewTheme.panel, border: `1px solid ${previewTheme.border}`, backdropFilter: previewTheme.glass ? "blur(8px)" : undefined }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 12, marginTop: 9 }}>{active ? "✓ " : ""}{previewTheme.label}</div>
                    <div style={{ fontSize: 10, opacity: .75, marginTop: 4 }}>
                      {key === "classic" ? t("Vertrouwd en praktisch") :
                       key === "modern" ? t("Strak en minimalistisch") :
                       key === "dark" ? t("Diep zwart en rustig") :
                       key === "light" ? t("Licht en helder") : t("Transparant glas en reflecties")}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 25, paddingTop: 20 }}>
              <h3 style={{ fontSize: 16 }}>{t("Animaties")}</h3>
              <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
                {t("Animaties uitschakelen")}
              </label>
              <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.6 }}>{t("Schakelt zwevende achtergronden en de meeste overgangseffecten uit.")}</p>
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 25, paddingTop: 20 }}>
              <h3 style={{ fontSize: 16 }}>{t("Game scanner")}</h3>
              <p style={{ color: colors.muted, fontSize: 13, lineHeight: 1.7 }}>{t("Scan een map met EXE-bestanden, snelkoppelingen en BAT-bestanden.")}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <input style={{ ...inputStyle, flex: "1 1 300px" }} value={folderPath} onChange={(e) => setFolderPath(e.target.value)} placeholder="C:\Games" onKeyDown={(e) => { if (e.key === "Enter") void scanFolder(); }} />
                <button style={buttonStyle} disabled={loading} onClick={() => void browseGameFolder()}>📁 {t("Bladeren...")}</button>
                <button style={buttonStyle} disabled={loading} onClick={() => void scanFolder()}>{loading ? t("Scannen...") : t("Scan folder")}</button>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 25, paddingTop: 20 }}>
              <h3 style={{ fontSize: 16 }}>{t("Game-launchers")}</h3>
              <p style={{ color: colors.muted, fontSize: 13, lineHeight: 1.7 }}>{t("Scan de lokale installatiegegevens van je launchers. Games worden aan je bestaande bibliotheek toegevoegd.")}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                <button style={buttonStyle} disabled={loading} onClick={() => void scanWith("scan_steam_games", "Steam-games")}>🎮 Scan Steam</button>
                <button style={buttonStyle} disabled={loading} onClick={() => void scanWith("scan_ubisoft_games", "Ubisoft Connect-games")}>🟦 Scan Ubisoft</button>
                <button style={buttonStyle} disabled={loading} onClick={() => void scanWith("scan_epic_games", "Epic Games")}>🛡️ Scan Epic Games</button>
              </div>
              <p style={{ color: colors.muted, fontSize: 11, lineHeight: 1.6, marginTop: 10 }}>{t("Alle scanners voegen gevonden games samen met je huidige bibliotheek. Een launcher moet geïnstalleerd zijn en lokale installatiegegevens beschikbaar hebben.")}</p>
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 25, paddingTop: 20 }}>
              <h3 style={{ fontSize: 16 }}>Steam-speeluren</h3>
              <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12, marginTop: 12, marginBottom: 14 }}>
                <p style={{ color: colors.muted, fontSize: 13 }}>Online Steam-login en speelurensynchronisatie</p>
                <button style={buttonStyle} disabled={onlineSteamBusy} onClick={() => void loginSteamAutomatically()}>{onlineSteamBusy ? "Wachten op Steam..." : "🔗 Steam verbinden — één klik"}</button>
                <p style={{ color: colors.muted, fontSize: 12 }}>Na aanmelden in Steam keert de bevestiging automatisch terug naar GameHub.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 10 }}>
                  <input type="password" autoComplete="off" value={onlineSteamCode} onChange={(e) => setOnlineSteamCode(e.target.value)} placeholder="Tijdelijke Steam-code" style={{ minWidth: 210, flex: 1, padding: 9, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.panel, color: colors.text }} />
                  <button style={buttonStyle} disabled={onlineSteamBusy || onlineSteamCode.trim().length !== 48} onClick={() => void testOnlineSteamLogin()}>{onlineSteamBusy ? "Verbinden..." : "Online verbinden"}</button>
                </div>
              </div>
              <p style={{ color: colors.accent, fontSize: 13 }}>{onlineSteamAccount ? `✓ Online aangemeld: ${onlineSteamAccount.steam_id}` : "Nog niet online aangemeld"}</p>
              <p style={{ color: colors.muted, fontSize: 13, lineHeight: 1.7 }}>Koppel je eigen Steam-account via de officiële Steam-login. GameHub bewaart alleen je geverifieerde SteamID, nooit je wachtwoord.</p>
              <p style={{ color: colors.accent, fontSize: 13 }}>{steamAccount ? `✓ Gekoppeld: ${steamAccount.steam_id}` : "Nog geen Steam-account gekoppeld"}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {!steamAccount && <button style={buttonStyle} disabled={steamLoginBusy} onClick={() => void connectSteam()}>{steamLoginBusy ? "Wachten op Steam..." : "🔗 Inloggen met Steam"}</button>}
                {steamAccount && <button style={buttonStyle} onClick={() => void disconnectSteam()}>Steam ontkoppelen</button>}
                <button style={buttonStyle} disabled={!onlineSteamAccount || steamSyncBusy} onClick={() => void syncSteamPlaytime(true)}>{steamSyncBusy ? "Steam synchroniseren..." : "↻ Steam-speeluren synchroniseren"}</button>
              </div>
              <p style={{ color: colors.muted, fontSize: 11, lineHeight: 1.6 }}>De online sessie wordt versleuteld opgeslagen met Windows DPAPI en na het opstarten automatisch hersteld. Steam-speeluren synchroniseren bij het opstarten en daarna elke 5 minuten.</p>
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 25, paddingTop: 20 }}>
              <h3 style={{ fontSize: 16 }}>{t("Automatisch artwork")}</h3>
              <p style={{ color: colors.muted, fontSize: 13, lineHeight: 1.7 }}>{t("Haal ontbrekende covers en achtergronden op. Bestaande afbeeldingen blijven behouden.")}</p>
              <button style={buttonStyle} disabled={artworkLoading || games.length === 0} onClick={() => void fetchAllArtwork()}>{artworkLoading ? t("Artwork ophalen...") : "✦ Artwork ophalen voor alle games"}</button>
              {artworkLoading && artworkProgress && <p style={{ color: colors.accent, fontSize: 12 }}>{artworkProgress}</p>}
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 25, paddingTop: 20 }}>
              <h3 style={{ fontSize: 16 }}>{t("Verwijderde games")}</h3>
              <p style={{ color: colors.muted, fontSize: 13 }}>{hiddenPaths.length} {t("games verborgen. De gamebestanden worden niet verwijderd.")}</p>
              <button style={buttonStyle} disabled={hiddenPaths.length === 0} onClick={() => setShowRemovedGames((open) => !open)}>
                {showRemovedGames ? "▴ Verberg verwijderde games" : `▾ Bekijk verwijderde games (${hiddenPaths.length})`}
              </button>
              {showRemovedGames && hiddenPaths.length > 0 && (
                <div style={{ marginTop: 15, display: "grid", gap: 9 }}>
                  {hiddenPaths.map((path) => (
                    <div key={path} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 12, borderRadius: 12, border: `1px solid ${colors.border}`, background: glass ? "rgba(255,255,255,.035)" : colors.panel }}>
                      <div style={{ minWidth: 0, flex: "1 1 180px" }}>
                        <div style={{ fontSize: 13, fontWeight: 650, overflowWrap: "anywhere" }}>{removedGameTitle(path)}</div>
                        <div title={path} style={{ color: colors.muted, fontSize: 10, marginTop: 4, overflowWrap: "anywhere" }}>{path}</div>
                      </div>
                      <button style={buttonStyle} onClick={() => restoreRemovedGame(path)}>↩ Herstellen</button>
                    </div>
                  ))}
                  <button style={{ ...buttonStyle, alignSelf: "start" }} onClick={restoreRemovedGames}>↩ Alle games herstellen</button>
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 25, paddingTop: 20 }}>
              <h3 style={{ fontSize: 16 }}>{t("Weergave bibliotheek")}</h3>{viewSelector()}
            </div>
          </div>
        ) : page === "Home" ? (
          <>
            <section style={{ ...panelStyle, position: "relative", overflow: "hidden", minHeight: 285, marginBottom: 28,
              background: selectedGame?.background
                ? `linear-gradient(90deg,${glass ? "rgba(16,18,29,.66)" : "rgba(16,16,20,.96)"},rgba(16,16,20,.42)),url("${selectedGame.background}") center/cover`
                : glass
                  ? "linear-gradient(135deg,rgba(255,255,255,.13),rgba(255,255,255,.018) 55%,rgba(190,205,255,.055))"
                  : `linear-gradient(135deg,${colors.panel},${colors.background})` }}>
              <div style={{ position: "absolute", width: 250, height: 250, right: "8%", top: -110, borderRadius: "50%", background: `${colors.accent}28`, filter: "blur(48px)", animation: reduceMotion ? "none" : "ghFloat 8s ease-in-out infinite", pointerEvents: "none" }} />
              <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", padding: 30, minHeight: 285, boxSizing: "border-box" }}>
                {selectedGame?.cover
                  ? <img src={selectedGame.cover} alt={`${selectedGame.title} cover`} style={{ width: 145, height: 195, objectFit: "cover", borderRadius: 16, boxShadow: "0 16px 40px #0008" }} />
                  : <div style={{ width: 145, height: 195, borderRadius: 16, background: glass ? "rgba(255,255,255,.045)" : colors.panel, border: `1px solid ${colors.border}`, display: "grid", placeItems: "center", fontSize: 48 }}>🎮</div>}
                <div style={{ flex: "1 1 270px" }}>
                  <div style={{ color: colors.accent, fontSize: 10, letterSpacing: 2, fontWeight: 750 }}>{t("YOUR NEXT ADVENTURE STARTS HERE")}</div>
                  <h1 style={{ fontSize: 34, letterSpacing: "-1.3px", margin: "12px 0 8px", lineHeight: 1.12 }}>{t("Welkom terug,")} {profileName || t("gamer")}</h1>
                  <p style={{ color: colors.muted, fontSize: 13, lineHeight: 1.7, maxWidth: 500 }}>{lastPlayedGame ? `${t("Zin om verder te spelen?")} ${lastPlayedGame.title} ${t("staat klaar voor je.")}` : t("Je persoonlijke gamebibliotheek. Kies een game en duik meteen in je volgende avontuur.")}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 18 }}>
                    {lastPlayedGame && <button style={{ ...buttonStyle, background: colors.accentDark }} onClick={() => void launchGame(lastPlayedGame)}>▶ {t("Verder spelen")}</button>}
                    {selectedGame && <button style={buttonStyle} onClick={() => openDetails(selectedGame)}>{t("Game bekijken")}</button>}
                    <button style={buttonStyle} onClick={() => setPage("Library")}>{t("Bibliotheek openen")} ↗</button>
                  </div>
                  <div style={{ display: "flex", gap: 22, marginTop: 22, flexWrap: "wrap", color: colors.muted, fontSize: 12 }}>
                    <span><strong style={{ color: colors.text }}>{games.length}</strong> {t("games")}</span>
                    <span><strong style={{ color: colors.text }}>{favoriteGames.length}</strong> {t("favorieten")}</span>
                    <span><strong style={{ color: colors.text }}>{recentGames.length}</strong> {t("recent gespeeld")}</span>
                  </div>
                </div>
              </div>
            </section>

            {favoriteGames.length > 0 && (
              <section style={{ marginBottom: 31 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 15 }}>
                  <div><h2 style={{ margin: 0, fontSize: 21 }}>{t("Je favorieten")}</h2><p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12 }}>{t("Je favoriete games, altijd binnen handbereik.")}</p></div>
                  <button style={buttonStyle} onClick={() => setPage("Favorites")}>{t("Alle favorieten")} →</button>
                </div>
                {gameGrid(favoriteGames.filter((g) => g.title.toLowerCase().includes(search.toLowerCase())).slice(0, 5))}
              </section>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 17 }}>
              <div><h2 style={{ margin: 0, fontSize: 21 }}>{t("Recentste games")}</h2><p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12 }}>{t("Je 10 laatst via GameHub gestarte games")}</p></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9, alignItems: "center" }}>{viewSelector()}<button style={buttonStyle} onClick={() => setPage("Library")}>{t("Volledige bibliotheek")} →</button></div>
            </div>
            {recentGames.length === 0
              ? <div style={{ ...panelStyle, padding: 35, textAlign: "center", color: colors.muted }}>{t("Je hebt nog geen games gestart via GameHub. Gestarte games verschijnen hier, tot maximaal 10.")}<div><button style={{ ...buttonStyle, marginTop: 16 }} onClick={() => setPage("Library")}>{t("Naar Library")}</button></div></div>
              : gameGrid(recentGames.filter((g) => g.title.toLowerCase().includes(search.toLowerCase())).slice(0, 10))}
          </>
        ) : (
          <>
            {sectionTitle(t(page), t(pageSubtitle[page] ?? ""))}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
              <div style={{ color: colors.muted, fontSize: 13 }}>{visibleGames.length} {t("games weergegeven")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 9 }}>
                {viewSelector()}
                {page === "Library" && <>
                  <button style={buttonStyle} onClick={() => setPage("Settings")}>⚙ {t("Scannerinstellingen")}</button>
                  <button style={buttonStyle} disabled={artworkLoading || !games.length} onClick={() => void fetchAllArtwork()}>{artworkLoading ? t("Artwork ophalen...") : "✦ Artwork voor alle games"}</button>
                  <button style={{ ...buttonStyle, background: favoritesOnly ? colors.accentDark : undefined }} onClick={() => setFavoritesOnly((v) => !v)}>★ {t("Favorietenfilter")}</button>
                </>}
              </div>
            </div>
            {visibleGames.length === 0
              ? <div style={{ ...panelStyle, padding: 36, textAlign: "center", color: colors.muted }}>
                  {page === "Favorites" ? t("Je hebt nog geen favoriete games.") :
                   page === "Recently Played" ? t("Je hebt nog geen games gestart.") :
                   activeCategory ? `${t("Nog geen games toegewezen aan")} ${t(categoryInfo[activeCategory].label)}. ${t("Open een game om de categorieën in de details aan te passen.")}` :
                   t("Geen games gevonden. Scan je gamemappen of launchers via Settings.")}
                </div>
              : gameGrid(visibleGames)}
          </>
        )}
      </main>

      {availableUpdate && (
        <div role="dialog" aria-modal="true" aria-label={t("GameHub-update beschikbaar")}
          style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(3,5,16,.83)", backdropFilter: "blur(16px)", display: "grid", placeItems: "center", padding: 20 }}>
          <section style={{ width: "min(100%,470px)", padding: 28, boxSizing: "border-box", borderRadius: 22, background: "linear-gradient(145deg,#24294b,#101529)", color: "#fff", border: "1px solid rgba(175,155,255,.35)", boxShadow: "0 20px 70px #0009" }}>
            <h2 style={{ marginTop: 0 }}>🎮 {t("GameHub-update beschikbaar")}</h2>
            <p style={{ color: "#c6c9ed" }}>{t("Nieuwe versie:")} <strong>{availableUpdate.version}</strong></p>
            <p style={{ whiteSpace: "pre-line", lineHeight: 1.7, fontSize: 13, color: "#d8ddf5" }}>{updateNotes}</p>
            {updateStatus && <p style={{ color: "#d8ddf5", fontSize: 12 }}>{updateStatus}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button disabled={updateBusy} onClick={() => { void availableUpdate.close(); setAvailableUpdate(null); setUpdateStatus(""); }} style={{ ...buttonStyle, color: "#fff", background: "#2b3049" }}>{t("Later")}</button>
              <button disabled={updateBusy} onClick={() => void installAvailableUpdate()} style={{ ...buttonStyle, color: "#fff", background: "linear-gradient(110deg,#3e73e8,#8d42df)" }}>{updateBusy ? t("Bezig...") : t("Nu updaten")}</button>
            </div>
          </section>
        </div>
      )}

      {!profileName && (
        <div role="dialog" aria-modal="true" aria-labelledby="gamehub-welcome-title"
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(3,5,16,.84)", backdropFilter: "blur(20px)", display: "grid", placeItems: "center", padding: 20 }}>
          <form onSubmit={(event) => { event.preventDefault(); saveProfileName(); }}
            style={{ width: "min(100%, 450px)", padding: 32, boxSizing: "border-box", borderRadius: 24,
              background: "linear-gradient(145deg,rgba(38,42,78,.98),rgba(13,17,35,.98))",
              border: "1px solid rgba(174,161,255,.38)", boxShadow: "0 28px 95px rgba(0,0,0,.55)", color: "#fff", textAlign: "center" }}>
            <img src={gameHubIcon} alt="GameHub" style={{ width: 88, height: 88, borderRadius: 22, display: "block", margin: "0 auto 12px" }} />
            <img src={gameHubWordmark} alt="GAMEHUB" style={{ width: 235, height: 58, objectFit: "contain", display: "block", margin: "0 auto 10px" }} />
            <h2 id="gamehub-welcome-title" style={{ fontSize: 25, margin: "10px 0" }}>{t("Welkom bij GameHub!")}</h2>
            <p style={{ color: "#c0c8e1", fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
              {t("Hoe mogen we je noemen? We gebruiken je naam op het welkomstscherm. Je kunt hem later wijzigen in Instellingen.")}
            </p>
            <input autoFocus required maxLength={32} aria-label={t("Jouw naam")} placeholder={t("Vul je naam in...")}
              value={nameDraft} onChange={(event) => setNameDraft(event.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(8,12,30,.72)", color: "#fff", border: "1px solid rgba(174,161,255,.48)", borderRadius: 12, padding: "14px 15px", fontSize: 15, outline: "none" }} />
            <button type="submit" disabled={!nameDraft.trim()}
              style={{ marginTop: 15, width: "100%", padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(210,195,255,.5)",
                background: "linear-gradient(100deg,#3c77e7,#8b3fe0)", color: "#fff", fontWeight: 750, fontSize: 14,
                cursor: nameDraft.trim() ? "pointer" : "not-allowed", opacity: nameDraft.trim() ? 1 : .55 }}>
              {t("GameHub starten")} →
            </button>
            <p style={{ color: "#939ebd", fontSize: 11, marginBottom: 0, marginTop: 16 }}>{t("Je naam blijft lokaal op deze pc opgeslagen.")}</p>
          </form>
        </div>
      )}

      {detailsOpen && selectedGame && (
        <div role="presentation" onClick={() => setDetailsOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: glass ? "rgba(5,7,16,.40)" : "rgba(5,5,9,.78)",
            backdropFilter: "blur(16px) saturate(140%)", WebkitBackdropFilter: "blur(16px) saturate(140%)",
            display: "grid", placeItems: "center", padding: 22, overflowY: "auto" }}>
          <section role="dialog" aria-modal="true" aria-label={`${selectedGame.title} details`} onClick={(e) => e.stopPropagation()}
            style={{ ...panelStyle, width: "min(900px,100%)", maxHeight: "calc(100vh - 44px)", overflowY: "auto", position: "relative",
              animation: reduceMotion ? "none" : "ghModal .24s ease both",
              background: glass
                ? "linear-gradient(145deg,rgba(255,255,255,.14),rgba(255,255,255,.035) 45%,rgba(160,175,255,.065))"
                : colors.panel }}>
            <div style={{ height: 250, position: "relative", overflow: "hidden", background: selectedGame.background ? `url("${selectedGame.background}") center/cover` : `linear-gradient(135deg,${colors.accentDark},${colors.background})` }}>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(0deg,${glass ? "rgba(17,19,32,.83)" : colors.panel} 0%,transparent 100%)` }} />
              <button aria-label={t("Sluiten")} onClick={() => setDetailsOpen(false)} style={{ ...buttonStyle, position: "absolute", top: 15, right: 15, zIndex: 2, width: 40, height: 40, borderRadius: 24, padding: 0, fontSize: 20 }}>×</button>
            </div>

            <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap", padding: "0 28px 28px", marginTop: -100, position: "relative" }}>
              {selectedGame.cover
                ? <img src={selectedGame.cover} alt={`${selectedGame.title} cover`} style={{ width: 175, height: 235, objectFit: "cover", borderRadius: 16, border: `1px solid ${colors.border}`, boxShadow: "0 15px 40px #0008", background: colors.panel }} />
                : <div style={{ width: 175, height: 235, borderRadius: 16, border: `1px solid ${colors.border}`, boxShadow: "0 15px 40px #0008", background: colors.panel, display: "grid", placeItems: "center", fontSize: 56 }}>🎮</div>}
              <div style={{ flex: "1 1 300px", minWidth: 0, paddingTop: 108 }}>
                <div style={{ color: colors.accent, fontSize: 10, letterSpacing: 1.8, fontWeight: 750 }}>{providerLabel(selectedGame)}</div>
                <h1 style={{ fontSize: 30, letterSpacing: "-1px", margin: "9px 0 10px", overflowWrap: "anywhere" }}>{selectedGame.title}</h1>
                <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.6 }}>{t("Bekijk game-informatie, beheer categorieën of start de game vanuit GameHub.")}</p>
                <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 17 }}>
                  <button style={{ ...buttonStyle, background: colors.accentDark }} onClick={() => void launchGame(selectedGame)}>▶ {t("Start game")}</button>
                  <button style={buttonStyle} onClick={() => toggleFavorite(selectedGame)}>{selectedGame.favorite ? `★ ${t("Favoriet")}` : `☆ ${t("Voeg favoriet toe")}`}</button>
                  <button style={buttonStyle} disabled={artworkLoading} onClick={() => void fetchArtwork(selectedGame)}>{artworkLoading ? t("Zoeken...") : `✦ ${t("Auto artwork")}`}</button>
                </div>
              </div>
            </div>

            <div style={{ padding: "0 28px 28px" }}>
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 22, paddingBottom: 22 }}>
                <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>{t("Speelstatistieken")}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10 }}>
                  {([
                    ["Totale speelduur", formatPlayTime(playStats[selectedGame.path]?.total_seconds ?? 0, language)],
                    ["Aantal starts", String(playStats[selectedGame.path]?.launch_count ?? 0)],
                    ["Laatste sessie", formatPlayTime(playStats[selectedGame.path]?.last_session_seconds ?? 0, language)],
                  ] as const).map(([label, value]) => (
                    <div key={label} style={{ borderRadius: 13, border: `1px solid ${colors.border}`, padding: 14, background: glass ? "rgba(12,16,32,.60)" : colors.panelHover }}>
                      <div style={{ color: colors.muted, fontSize: 11, marginBottom: 7 }}>{t(label)}</div>
                      <strong style={{ color: colors.text, fontSize: 17 }}>{value}</strong>
                    </div>
                  ))}
                </div>
                {!playStats[selectedGame.path]?.tracking_supported && (
                  <p style={{ color: colors.muted, fontSize: 11, lineHeight: 1.6, marginTop: 12 }}>
                    Automatische speelduurmeting werkt voorlopig bij rechtstreeks gestarte .exe- en .bat-games.
                    Bij Steam, Epic, Ubisoft en snelkoppelingen telt GameHub momenteel alleen het aantal starts.
                  </p>
                )}
                {playStats[selectedGame.path]?.tracking_supported && (
                  <p style={{ color: colors.muted, fontSize: 11, lineHeight: 1.6, marginTop: 12 }}>
                    {t("Speelduur wordt gemeten zolang het gestarte proces actief is. Bij games die een tweede proces openen, kan de meting afwijken.")}
                  </p>
                )}
              </div>
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>{t("Over deze game")}</h3>
                  <button style={{ ...buttonStyle, fontSize: 11 }} disabled={infoLoading}
                    onClick={() => void loadGameInfo(selectedGame, true)}>
                    {infoLoading ? t("Ophalen...") : `↻ ${t("Gegevens vernieuwen")}`}
                  </button>
                </div>
                {infoLoading && <p style={{ color: colors.muted, fontSize: 13 }}>{t("Game-informatie ophalen...")}</p>}
                {infoError && <p style={{ color: "#ffaaaa", fontSize: 12 }}>{t("Ophalen mislukt:")} {infoError}</p>}
                {!infoLoading && !infoError && !gameInfo[selectedGame.path] && (
                  <p style={{ color: colors.muted, fontSize: 13, lineHeight: 1.7 }}>
                    {t("Geen betrouwbare game-informatie gevonden. Je kunt de game gewoon blijven starten en beheren.")}
                  </p>
                )}
                {gameInfo[selectedGame.path] && (() => {
                  const info = gameInfo[selectedGame.path]!;
                  const fields: Array<[string, string | null | undefined]> = [
                    ["Releasedatum", info.release_date],
                    ["Ontwikkelaar", info.developers?.join(", ")],
                    ["Uitgever", info.publishers?.join(", ")],
                    ["Genres", info.genres?.join(", ")],
                  ];
                  return (
                    <div>
                      {info.description && <p style={{ color: colors.text, fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-line" }}>{info.description}</p>}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 17 }}>
                        {fields.filter(([, value]) => Boolean(value)).map(([label, value]) => (
                          <div key={label} style={{ padding: 14, borderRadius: 13, background: glass ? "rgba(255,255,255,.045)" : colors.panelHover, border: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: 10, color: colors.muted, marginBottom: 6 }}>{t(label ?? "")}</div>
                            <div style={{ fontSize: 12, fontWeight: 650, lineHeight: 1.6 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      {info.source && <p style={{ color: colors.muted, fontSize: 11, marginTop: 14 }}>{t("Bron:")} {info.source}</p>}
                    </div>
                  );
                })()}
              </div>
              <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 23, paddingTop: 22 }}>
                <h3 style={{ fontSize: 15, margin: "0 0 12px" }}>{t("Categorieën")}</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(Object.keys(categoryInfo) as Category[]).map((category) => (
                    <button key={category} style={{ ...buttonStyle, background: selectedGame[category] ? colors.accentDark : glass ? "rgba(12,16,32,.72)" : colors.panelHover, color: selectedGame[category] ? colors.text : glass ? "#eef2ff" : colors.text, borderColor: selectedGame[category] ? colors.border : glass ? "rgba(255,255,255,.22)" : colors.border }}
                      onClick={() => toggleCategory(selectedGame, category)}>
                      {categoryInfo[category].icon} {selectedGame[category] ? "✓ " : "+ "}{t(categoryInfo[category].label)}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 23, paddingTop: 22 }}>
                <h3 style={{ fontSize: 15, margin: "0 0 12px" }}>{t("Artwork aanpassen")}</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                  {uploadLabel(selectedGame, "cover", "🖼️ Eigen cover kiezen")}
                  {uploadLabel(selectedGame, "background", "🌄 Achtergrond kiezen")}
                </div>
                <p style={{ color: colors.muted, fontSize: 11, lineHeight: 1.6, marginTop: 12 }}>{t("Je afbeeldingen worden lokaal in GameHub opgeslagen. Automatisch artwork vereist je SteamGridDB-configuratie.")}</p>
              </div>
              <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 23, paddingTop: 20, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <button style={{ ...buttonStyle, color: "#ff9898" }} onClick={() => removeGame(selectedGame)}>{t("Verwijderen uit GameHub")}</button>
                <button style={buttonStyle} onClick={() => setDetailsOpen(false)}>{t("Gereed")}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
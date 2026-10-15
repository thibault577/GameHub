use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, Instant};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;

#[derive(Serialize)]
struct GameEntry {
    title: String,
    path: String,
    shortcut: bool,
}
#[derive(Deserialize)]
struct ApiResponse<T> {
    success: bool,
    data: Vec<T>,
}
#[derive(Deserialize)]
struct SteamGame { id: u64 }
#[derive(Deserialize)]
struct ArtworkItem { url: String }
#[derive(Serialize)]
struct ArtworkResult {
    cover: Option<String>,
    background: Option<String>,
}
#[derive(Serialize)]
struct GameInfo {
    description: Option<String>,
    release_date: Option<String>,
    developers: Vec<String>,
    publishers: Vec<String>,
    genres: Vec<String>,
    steam_id: Option<u64>,
    source: String,
}


#[derive(Clone, Default, Serialize, Deserialize)]
struct PlayStats {
    total_seconds: u64,
    launch_count: u64,
    last_session_seconds: u64,
    tracking_supported: bool,
    #[serde(default)]
    steam_seconds: u64,
}

static PLAY_STATS: OnceLock<Mutex<HashMap<String, PlayStats>>> = OnceLock::new();

// De gamebibliotheek staat buiten de WebView-opslag, zodat de geïnstalleerde
// launcher de games bij iedere start terugvindt.
fn library_file() -> PathBuf {
    stats_file().with_file_name("library.json")
}

#[tauri::command]
fn load_gamehub_library() -> Result<Vec<Value>, String> {
    let file = library_file();
    if !file.exists() { return Ok(Vec::new()); }
    let contents = fs::read_to_string(&file)
        .map_err(|e| format!("Bibliotheek lezen mislukt: {e}"))?;
    serde_json::from_str::<Vec<Value>>(&contents)
        .map_err(|e| format!("Bibliotheekbestand is ongeldig: {e}"))
}

#[tauri::command]
fn save_gamehub_library(games: Vec<Value>) -> Result<(), String> {
    let file = library_file();
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_vec_pretty(&games).map_err(|e| e.to_string())?;
    let temp = file.with_extension("json.tmp");
    fs::write(&temp, data).map_err(|e| e.to_string())?;
    // Windows kan een bestaande bestemming niet altijd atomair overschrijven.
    if fs::rename(&temp, &file).is_err() {
        fs::copy(&temp, &file).map_err(|e| e.to_string())?;
        let _ = fs::remove_file(&temp);
    }
    Ok(())
}

fn stats_file() -> PathBuf {
    let root = env::var_os("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|| env::temp_dir());
    root.join("GameHub").join("playtime.json")
}

fn stats_store() -> &'static Mutex<HashMap<String, PlayStats>> {
    PLAY_STATS.get_or_init(|| {
        let loaded = fs::read_to_string(stats_file()).ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default();
        Mutex::new(loaded)
    })
}

fn with_stats<F>(update: F)
where F: FnOnce(&mut HashMap<String, PlayStats>) {
    if let Ok(mut guard) = stats_store().lock() {
        update(&mut guard);
        let file = stats_file();
        if let Some(dir) = file.parent() { let _ = fs::create_dir_all(dir); }
        if let Ok(data) = serde_json::to_vec_pretty(&*guard) {
            let temp = file.with_extension("json.tmp");
            if fs::write(&temp, data).is_ok() {
                let _ = fs::rename(&temp, &file).or_else(|_| {
                    fs::copy(&temp, &file).map(|_| ()).and_then(|_| fs::remove_file(&temp))
                });
            }
        }
    }
}

fn record_launch(path: &str, tracked: bool) {
    with_stats(|all| {
        let entry = all.entry(path.to_string()).or_default();
        entry.launch_count += 1;
        if tracked { entry.tracking_supported = true; }
    });
}

fn watch_process(path: String, mut child: std::process::Child) {
    thread::spawn(move || {
        let mut previous = Instant::now();
        let mut session_seconds = 0_u64;
        loop {
            let done = match child.try_wait() {
                Ok(Some(_)) => true,
                Ok(None) => false,
                Err(_) => true,
            };
            if !done { thread::sleep(Duration::from_secs(2)); }
            let elapsed = previous.elapsed().as_secs();
            if elapsed > 0 {
                session_seconds += elapsed;
                previous = Instant::now();
                with_stats(|all| {
                    let entry = all.entry(path.clone()).or_default();
                    entry.total_seconds = entry.total_seconds.saturating_add(elapsed);
                    entry.last_session_seconds = session_seconds;
                    entry.tracking_supported = true;
                });
            }
            if done { break; }
        }
    });
}

#[tauri::command]
fn get_play_stats() -> Result<HashMap<String, PlayStats>, String> {
    stats_store().lock().map(|map| {
        let mut result = map.clone();
        for (path, stat) in result.iter_mut() {
            if path.starts_with("steam:") {
                stat.total_seconds = stat.total_seconds.max(stat.steam_seconds);
                if stat.steam_seconds > 0 { stat.tracking_supported = true; }
            }
        }
        result
    })
        .map_err(|e| format!("Speelduur kon niet worden gelezen: {e}"))
}


// Steam OpenID login via een tijdelijke callback op 127.0.0.1.
// Dit bevestigt de SteamID, maar geeft GEEN toegang tot private gamegegevens.
fn steam_identity_file() -> PathBuf {
    stats_file().with_file_name("steam-account.json")
}

#[derive(Clone, Serialize, Deserialize)]
struct SteamIdentity { steam_id: String }

#[tauri::command]
fn get_steam_account() -> Option<SteamIdentity> {
    fs::read_to_string(steam_identity_file()).ok()
        .and_then(|v| serde_json::from_str(&v).ok())
}

// Wisselt een eenmalige Supabase Steam-code om voor een GameHub-sessie.
// De sessie wordt nog niet opgeslagen; dat volgt pas na een geslaagde test.
#[derive(Serialize, Deserialize)]
struct GameHubSession {
    session_token: String,
    steam_id: String,
    expires_in_seconds: u64,
}

// Session tokens are kept in memory and encrypted at rest using Windows DPAPI.
static ONLINE_SESSION: OnceLock<Mutex<Option<(String, String)>>> = OnceLock::new();
fn online_session() -> &'static Mutex<Option<(String, String)>> {
    ONLINE_SESSION.get_or_init(|| Mutex::new(None))
}
fn session_file() -> PathBuf { stats_file().with_file_name("steam-session.dpapi") }

// DPAPI ties the encrypted token to the current Windows user.
// Send the token via stdin rather than a process argument.
fn dpapi_transform(input: &str, encrypt: bool) -> Result<String, String> {
    let script = if encrypt {
        r#"Add-Type -AssemblyName System.Security
$v=[Console]::In.ReadToEnd()
$b=[Text.Encoding]::UTF8.GetBytes($v)
$e=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[Console]::Write([Convert]::ToBase64String($e))"#
    } else {
        r#"Add-Type -AssemblyName System.Security
$v=[Console]::In.ReadToEnd()
$b=[Convert]::FromBase64String($v)
$d=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[Console]::Write([Text.Encoding]::UTF8.GetString($d))"#
    };
    let mut child = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .stdin(std::process::Stdio::piped()).stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn().map_err(|e| format!("Windows-sessiebeveiliging niet beschikbaar: {e}"))?;
    child.stdin.take().ok_or("Geen invoer voor Windows-beveiliging")?
        .write_all(input.as_bytes()).map_err(|e| e.to_string())?;
    let result = child.wait_with_output().map_err(|e| e.to_string())?;
    if !result.status.success() { return Err("Windows kon de sessie niet versleutelen of lezen".into()); }
    String::from_utf8(result.stdout).map_err(|e| e.to_string())
}
fn save_online_session(token: &str, steam_id: &str) -> Result<(), String> {
    let serialized = serde_json::json!({"session_token": token, "steam_id": steam_id}).to_string();
    let protected = dpapi_transform(&serialized, true)?;
    let file = session_file();
    if let Some(dir) = file.parent() { fs::create_dir_all(dir).map_err(|e| e.to_string())?; }
    fs::write(file, protected).map_err(|e| e.to_string())
}
fn restore_online_session() -> Option<(String, String)> {
    let encrypted = fs::read_to_string(session_file()).ok()?;
    let plaintext = dpapi_transform(&encrypted, false).ok()?;
    let data: Value = serde_json::from_str(&plaintext).ok()?;
    let token = data.get("session_token")?.as_str()?.to_string();
    let id = data.get("steam_id")?.as_str()?.to_string();
    if token.len() != 64 || !token.bytes().all(|b| b.is_ascii_hexdigit()) ||
       id.len() != 17 || !id.bytes().all(|b| b.is_ascii_digit()) { return None; }
    Some((token, id))
}
fn set_online_session(session: &GameHubSession) -> Result<(), String> {
    if session.session_token.len() != 64 || !session.session_token.bytes().all(|b| b.is_ascii_hexdigit()) ||
       session.steam_id.len() != 17 || !session.steam_id.bytes().all(|b| b.is_ascii_digit()) {
        return Err("Ongeldige sessie ontvangen".into());
    }
    save_online_session(&session.session_token, &session.steam_id)?;
    let mut guard = online_session().lock().map_err(|_| "Sessiegeheugen niet beschikbaar")?;
    *guard = Some((session.session_token.clone(), session.steam_id.clone()));
    Ok(())
}
fn redeem_code(code: &str) -> Result<GameHubSession, String> {
    if code.len() != 48 || !code.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("Ongeldige Steam-inlogcode".into());
    }
    let response = http_client()?
        .post("https://fdjdyjbjjrodtflnyttz.supabase.co/functions/v1/steam-auth?action=redeem")
        .json(&serde_json::json!({ "code": code }))
        .send().map_err(|e| format!("GameHub-loginserver niet bereikbaar: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("Steam-inlogcode geweigerd (HTTP {}).", response.status()));
    }
    let session = response.json::<GameHubSession>()
        .map_err(|e| format!("Ongeldig antwoord van GameHub-loginserver: {e}"))?;
    set_online_session(&session)?;
    Ok(session)
}

#[tauri::command]
fn get_online_steam_account() -> Option<SteamIdentity> {
    let mut guard = online_session().lock().ok()?;
    if guard.is_none() { *guard = restore_online_session(); }
    guard.as_ref().map(|(_, id)| SteamIdentity { steam_id: id.clone() })
}

#[tauri::command]
async fn redeem_steam_login_code(code: String) -> Result<GameHubSession, String> {
    tauri::async_runtime::spawn_blocking(move || redeem_code(&code))
        .await.map_err(|e| format!("GameHub-login onderbroken: {e}"))?
}

// One-click desktop login: browser -> Steam -> Supabase -> local loopback callback.
#[tauri::command]
async fn login_steam_automatically() -> Result<SteamIdentity, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let listener = TcpListener::bind("127.0.0.1:0")
            .map_err(|e| format!("Lokale loginserver kon niet starten: {e}"))?;
        listener.set_nonblocking(true).map_err(|e| e.to_string())?;
        let port = listener.local_addr().map_err(|e| e.to_string())?.port();
        // Nonce binds the incoming browser redirect to this login attempt.
        let nonce = {
            // OS random bytes from PowerShell's cryptographic RNG, not a timestamp.
            let output = Command::new("powershell.exe")
                .args(["-NoProfile", "-NonInteractive", "-Command",
                       "$b=New-Object byte[] 16; $rng=[Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($b); $rng.Dispose(); ([BitConverter]::ToString($b)).Replace('-','').ToLowerInvariant()"])
                .output().map_err(|e| e.to_string())?;
            let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !output.status.success() || value.len() != 32 || !value.bytes().all(|b| b.is_ascii_hexdigit()) {
                return Err("Veilige willekeurige login-code kon niet worden gemaakt".into());
            }
            value
        };
        let url = format!("https://fdjdyjbjjrodtflnyttz.supabase.co/functions/v1/steam-auth?action=start&desktop_port={port}&desktop_nonce={nonce}");
        Command::new("rundll32.exe").arg("url.dll,FileProtocolHandler").arg(&url)
            .spawn().map_err(|e| format!("Browser openen mislukt: {e}"))?;
        let deadline = Instant::now() + Duration::from_secs(180);
        while Instant::now() < deadline {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    stream.set_read_timeout(Some(Duration::from_secs(5))).ok();
                    let mut buf = [0u8; 8192];
                    let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
                    let request = String::from_utf8_lossy(&buf[..n]);
                    let target = request.lines().next().and_then(|l| l.split_whitespace().nth(1)).unwrap_or("");
                    let received = reqwest::Url::parse(&format!("http://127.0.0.1:{port}{target}"));
                    let params = received.ok().filter(|u| u.path() == "/gamehub/steam")
                        .map(|u| u.query_pairs().into_owned().collect::<HashMap<String, String>>());
                    let code = params.as_ref().and_then(|p| p.get("code"));
                    let correct = params.as_ref().and_then(|p| p.get("nonce")) == Some(&nonce)
                        && code.is_some_and(|c| c.len() == 48 && c.bytes().all(|b| b.is_ascii_hexdigit()));
                    let html = if correct { "<h2>Steam gekoppeld!</h2><p>Je kunt dit tabblad sluiten en GameHub gebruiken.</p>" }
                               else { "<h2>GameHub wacht op Steam-login...</h2><p>Keer terug naar Steam.</p>" };
                    let response = format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}", html.len(), html);
                    let _ = stream.write_all(response.as_bytes());
                    if !correct { continue; }
                    let session = redeem_code(code.unwrap())?;
                    return Ok(SteamIdentity { steam_id: session.steam_id });
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(150)),
                Err(e) => return Err(format!("Steam-loginverbinding mislukt: {e}")),
            }
        }
        Err("Steam-login verlopen (3 minuten). Probeer opnieuw.".into())
    }).await.map_err(|e| format!("Steam-login onderbroken: {e}"))?
}

#[tauri::command]
fn disconnect_steam() -> Result<(), String> {
    if let Ok(mut session) = online_session().lock() { *session = None; }
    let file = session_file();
    if file.exists() { fs::remove_file(file).map_err(|e| e.to_string())?; }
    let path = steam_identity_file();
    if path.exists() { fs::remove_file(path).map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
async fn connect_steam() -> Result<SteamIdentity, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let listener = TcpListener::bind("127.0.0.1:0")
            .map_err(|e| format!("Lokale Steam-login kon niet starten: {e}"))?;
        listener.set_nonblocking(true).map_err(|e| e.to_string())?;
        let port = listener.local_addr().map_err(|e| e.to_string())?.port();
        let callback = format!("http://127.0.0.1:{port}/steam/callback");
        let realm = format!("http://127.0.0.1:{port}/");
        let mut url = reqwest::Url::parse("https://steamcommunity.com/openid/login")
            .map_err(|e| e.to_string())?;
        url.query_pairs_mut()
            .append_pair("openid.ns", "http://specs.openid.net/auth/2.0")
            .append_pair("openid.mode", "checkid_setup")
            .append_pair("openid.return_to", &callback)
            .append_pair("openid.realm", &realm)
            .append_pair("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select")
            .append_pair("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select");
        // Open de volledige URL zonder cmd.exe: '&' in OpenID-queryparameters
        // wordt anders door cmd als scheidingsteken geïnterpreteerd.
        Command::new("rundll32.exe")
            .arg("url.dll,FileProtocolHandler")
            .arg(url.as_str())
            .spawn().map_err(|e| format!("Browser kon niet openen: {e}"))?;
        let deadline = Instant::now() + Duration::from_secs(180);
        while Instant::now() < deadline {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    stream.set_read_timeout(Some(Duration::from_secs(5))).ok();
                    let mut buf = [0u8; 16384];
                    let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
                    let request = String::from_utf8_lossy(&buf[..n]);
                    let target = request.lines().next().and_then(|line| line.split_whitespace().nth(1))
                        .ok_or("Ongeldig browserantwoord")?;
                    let received = reqwest::Url::parse(&format!("http://127.0.0.1:{port}{target}"))
                        .map_err(|e| e.to_string())?;
                    if received.path() != "/steam/callback" { continue; }
                    let params: Vec<(String, String)> = received.query_pairs()
                        .map(|(k, v)| (k.into_owned(), v.into_owned())).collect();
                    let get = |name: &str| params.iter().find(|(k, _)| k == name).map(|(_, v)| v.as_str());
                    let verified = (|| -> Result<SteamIdentity, String> {
                        if get("openid.mode") != Some("id_res") { return Err("Steam-login geannuleerd".into()); }
                        if get("openid.return_to") != Some(callback.as_str()) { return Err("Steam callback komt niet overeen".into()); }
                        if get("openid.op_endpoint") != Some("https://steamcommunity.com/openid/login") {
                            return Err("Onbekende Steam OpenID-provider".into());
                        }
                        let claimed = get("openid.claimed_id").ok_or("SteamID ontbreekt")?;
                        let prefix = "https://steamcommunity.com/openid/id/";
                        let id = claimed.strip_prefix(prefix).ok_or("Ongeldige Steam-identiteit")?;
                        if id.len() != 17 || !id.bytes().all(|c| c.is_ascii_digit()) || get("openid.identity") != Some(claimed) {
                            return Err("Ongeldige SteamID".into());
                        }
                        let mut form = params.clone();
                        form.retain(|(k, _)| k != "openid.mode");
                        form.push(("openid.mode".into(), "check_authentication".into()));
                        let answer = http_client()?.post("https://steamcommunity.com/openid/login")
                            .form(&form).send().map_err(|e| format!("Steam-verificatie mislukt: {e}"))?;
                        let body = answer.text().map_err(|e| e.to_string())?;
                        if !body.lines().any(|line| line.trim() == "is_valid:true") {
                            return Err("Steam kon de aanmelding niet verifiëren".into());
                        }
                        Ok(SteamIdentity { steam_id: id.to_string() })
                    })();
                    let success = verified.is_ok();
                    let html = if success { "<h2>Steam gekoppeld!</h2><p>Je kunt dit tabblad sluiten en teruggaan naar GameHub.</p>" }
                               else { "<h2>Steam-aanmelding niet gelukt</h2><p>Ga terug naar GameHub en probeer opnieuw.</p>" };
                    let response = format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}", html.len(), html);
                    let _ = stream.write_all(response.as_bytes());
                    let identity = verified?;
                    let file = steam_identity_file();
                    if let Some(parent) = file.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
                    fs::write(file, serde_json::to_vec(&identity).map_err(|e| e.to_string())?)
                        .map_err(|e| e.to_string())?;
                    return Ok(identity);
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(150)),
                Err(e) => return Err(format!("Steam-loginverbinding mislukt: {e}")),
            }
        }
        Err("Steam-aanmelding verlopen (3 minuten). Probeer opnieuw.".into())
    }).await.map_err(|e| format!("Steam-aanmelding onderbroken: {e}"))?
}

// De server valideert het sessietoken en gebruikt de Steam API-sleutel uitsluitend server-side.
#[tauri::command]
async fn sync_steam_playtime() -> Result<usize, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let _ = get_online_steam_account();
        let token = online_session().lock().map_err(|_| "Sessiegeheugen niet beschikbaar")?
            .as_ref().map(|(token, _)| token.clone())
            .ok_or("Meld je eerst online aan via Steam-code in Instellingen")?;
        let response = http_client()?
            .post("https://fdjdyjbjjrodtflnyttz.supabase.co/functions/v1/steam-sync")
            .bearer_auth(&token)
            .send().map_err(|e| format!("Online Steam-sync niet bereikbaar: {e}"))?;
        let status = response.status();
        let body: Value = response.json().map_err(|e| format!("Ongeldig sync-antwoord: {e}"))?;
        if !status.is_success() {
            let reason = body.get("error").and_then(Value::as_str).unwrap_or("Onbekende serverfout");
            return Err(format!("Steam-sync HTTP {status}: {reason}"));
        }
        let games = body.get("games").and_then(Value::as_array)
            .ok_or("Steam-sync antwoord bevat geen games")?;
        let mut count = 0;
        with_stats(|stats| {
            for game in games {
                if let (Some(id), Some(minutes)) = (
                    game.get("app_id").and_then(Value::as_u64),
                    game.get("playtime_minutes").and_then(Value::as_u64),
                ) {
                    let entry = stats.entry(format!("steam:{id}")).or_default();
                    entry.steam_seconds = minutes.saturating_mul(60);
                    entry.tracking_supported = true;
                    count += 1;
                }
            }
        });
        Ok(count)
    }).await.map_err(|e| format!("Steam synchronisatie onderbroken: {e}"))?
}

// Synchroniseert niet-Steam games via de bestaande beveiligde GameHub-sessie.
#[tauri::command]
async fn sync_gamehub_library(games: Vec<Value>) -> Result<usize, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _ = get_online_steam_account();
        let token = online_session().lock().map_err(|_| "Sessiegeheugen niet beschikbaar")?
            .as_ref().map(|(token, _)| token.clone())
            .ok_or("Meld je eerst online aan bij Steam")?;
        if games.len() > 1000 { return Err("Te veel games in één synchronisatie".into()); }
        let response = http_client()?
            .post("https://fdjdyjbjjrodtflnyttz.supabase.co/functions/v1/library-sync")
            .bearer_auth(&token)
            .json(&serde_json::json!({ "games": games }))
            .send().map_err(|e| format!("GameHub-bibliotheekserver niet bereikbaar: {e}"))?;
        let status = response.status();
        let body: Value = response.json().map_err(|e| format!("Ongeldig bibliotheekantwoord: {e}"))?;
        if !status.is_success() {
            return Err(format!("Bibliotheek-sync HTTP {status}: {}", body.get("error").and_then(Value::as_str).unwrap_or("Onbekende fout")));
        }
        Ok(body.get("synced").and_then(Value::as_u64).unwrap_or(0) as usize)
    }).await.map_err(|e| format!("Bibliotheek-sync onderbroken: {e}"))?
}

fn make_entry(title: String, path: String, shortcut: bool) -> GameEntry {
    GameEntry { title, path, shortcut }
}

fn http_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(20))
        .user_agent("GameHub/1.0")
        .build()
        .map_err(|e| format!("HTTP-client kon niet worden gemaakt: {e}"))
}

#[tauri::command]
async fn select_game_folder() -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Selecteer de map met je games'
$dialog.ShowNewFolderButton = $false
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::WriteLine($dialog.SelectedPath)
}
"#;
        let output = Command::new("powershell.exe")
            .args(["-NoProfile", "-STA", "-Command", script])
            .output()
            .map_err(|e| format!("Windows-mapkiezer kon niet worden geopend: {e}"))?;
        if !output.status.success() {
            return Err(format!("Windows-mapkiezer is mislukt: {}", String::from_utf8_lossy(&output.stderr).trim()));
        }
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() { Ok(None) } else { Ok(Some(path)) }
    })
    .await
    .map_err(|e| format!("Mapkiezer werd onderbroken: {e}"))?
}

#[tauri::command]
fn scan_games(folder_path: String) -> Result<Vec<GameEntry>, String> {
    let folder = Path::new(&folder_path);
    if !folder.is_dir() {
        return Err("The folder does not exist. Check the path.".into());
    }
    let entries = fs::read_dir(folder).map_err(|e| format!("Could not read folder: {e}"))?;
    let mut games = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() { continue; }
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        if !["exe", "lnk", "bat"].iter().any(|e| ext.eq_ignore_ascii_case(e)) { continue; }
        let title = path.file_stem().and_then(|n| n.to_str()).unwrap_or("Unknown game").to_string();
        games.push(make_entry(title, path.to_string_lossy().into_owned(), ext.eq_ignore_ascii_case("lnk")));
    }
    games.sort_by_key(|g| g.title.to_lowercase());
    Ok(games)
}

fn steam_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Some(v) = env::var_os("PROGRAMFILES(X86)") { roots.push(PathBuf::from(v).join("Steam")); }
    if let Some(v) = env::var_os("PROGRAMFILES") { roots.push(PathBuf::from(v).join("Steam")); }
    if let Some(v) = env::var_os("LOCALAPPDATA") { roots.push(PathBuf::from(v).join("Steam")); }
    roots.push(PathBuf::from(r"C:\Program Files (x86)\Steam"));
    roots.push(PathBuf::from(r"C:\Program Files\Steam"));
    let mut seen = HashSet::new();
    roots.retain(|p| seen.insert(p.to_string_lossy().to_lowercase()));
    roots
}

fn parse_vdf_string(line: &str, key: &str) -> Option<String> {
    let trimmed = line.trim();
    let prefix = format!("\"{}\"", key);
    if !trimmed.starts_with(&prefix) { return None; }
    let remainder = trimmed[prefix.len()..].trim();
    let first_quote = remainder.find('"')?;
    let after_first = &remainder[first_quote + 1..];
    let end_quote = after_first.find('"')?;
    Some(after_first[..end_quote].replace("\\\\", "\\"))
}

fn steam_library_paths() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    for root in steam_roots() {
        let default = root.join("steamapps");
        if default.is_dir() { dirs.push(default.clone()); }
        if let Ok(contents) = fs::read_to_string(default.join("libraryfolders.vdf")) {
            for line in contents.lines() {
                if let Some(value) = parse_vdf_string(line, "path") {
                    let steamapps = PathBuf::from(value).join("steamapps");
                    if steamapps.is_dir() { dirs.push(steamapps); }
                }
            }
        }
    }
    let mut seen = HashSet::new();
    dirs.retain(|p| seen.insert(p.to_string_lossy().to_lowercase()));
    dirs
}

#[tauri::command]
fn scan_steam_games() -> Result<Vec<GameEntry>, String> {
    let dirs = steam_library_paths();
    if dirs.is_empty() {
        return Err("Steam libraries were not found. Check that Steam is installed.".into());
    }
    let mut games = Vec::new();
    let mut seen = HashSet::new();
    for dir in dirs {
        let entries = match fs::read_dir(dir) { Ok(v) => v, Err(_) => continue };
        for entry in entries.flatten() {
            let filename = entry.file_name().to_string_lossy().to_string();
            if !filename.starts_with("appmanifest_") || !filename.ends_with(".acf") { continue; }
            let contents = match fs::read_to_string(entry.path()) { Ok(v) => v, Err(_) => continue };
            let mut app_id = None;
            let mut title = None;
            for line in contents.lines() {
                if app_id.is_none() { app_id = parse_vdf_string(line, "appid"); }
                if title.is_none() { title = parse_vdf_string(line, "name"); }
                if app_id.is_some() && title.is_some() { break; }
            }
            let (Some(id), Some(name)) = (app_id, title) else { continue };
            if !id.chars().all(|c| c.is_ascii_digit()) || name.trim().is_empty() || !seen.insert(id.clone()) {
                continue;
            }
            games.push(make_entry(name, format!("steam:{id}"), false));
        }
    }
    games.sort_by_key(|g| g.title.to_lowercase());
    Ok(games)
}

fn run_registry_query(key: &str) -> Option<String> {
    let output = Command::new("reg.exe").args(["query", key, "/s"]).output().ok()?;
    if !output.status.success() { return None; }
    Some(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn registry_value(line: &str, name: &str) -> Option<String> {
    let trimmed = line.trim();
    let mut parts = trimmed.split_whitespace();
    let key = parts.next()?;
    if !key.eq_ignore_ascii_case(name) { return None; }
    let value = parts.collect::<Vec<_>>().join(" ");
    if value.is_empty() { None } else { Some(value) }
}

#[tauri::command]
fn scan_ubisoft_games() -> Result<Vec<GameEntry>, String> {
    let registry_keys = [
        r"HKLM\SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs",
        r"HKLM\SOFTWARE\Ubisoft\Launcher\Installs",
    ];
    let mut games = Vec::new();
    let mut seen = HashSet::new();
    for key in registry_keys {
        let Some(contents) = run_registry_query(key) else { continue };
        let mut current_id: Option<String> = None;
        for line in contents.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("HKEY_") {
                current_id = trimmed.rsplit('\\').next().map(str::to_string);
                continue;
            }
            let Some(install_dir) = registry_value(line, "InstallDir") else { continue };
            let Some(id) = current_id.clone() else { continue };
            if install_dir.trim().is_empty() || !seen.insert(id.clone()) { continue; }
            let title = Path::new(&install_dir)
                .file_name().and_then(|n| n.to_str()).unwrap_or(&id).replace('_', " ");
            games.push(make_entry(title, format!("ubisoft:{id}"), false));
        }
    }
    if games.is_empty() {
        return Err("No Ubisoft Connect games were found in the Windows registry.".into());
    }
    games.sort_by_key(|g| g.title.to_lowercase());
    Ok(games)
}

fn epic_manifest_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Some(program_data) = env::var_os("PROGRAMDATA") {
        dirs.push(PathBuf::from(program_data).join("Epic").join("EpicGamesLauncher").join("Data").join("Manifests"));
    }
    dirs.push(PathBuf::from(r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests"));
    let mut seen = HashSet::new();
    dirs.retain(|p| seen.insert(p.to_string_lossy().to_lowercase()));
    dirs
}

fn json_string(value: &Value, key: &str) -> Option<String> {
    value.get(key)?.as_str().map(str::to_string)
}

#[tauri::command]
fn scan_epic_games() -> Result<Vec<GameEntry>, String> {
    let mut games = Vec::new();
    let mut seen = HashSet::new();
    for dir in epic_manifest_dirs() {
        let entries = match fs::read_dir(dir) { Ok(v) => v, Err(_) => continue };
        for entry in entries.flatten() {
            if !entry.path().extension().and_then(|e| e.to_str())
                .is_some_and(|e| e.eq_ignore_ascii_case("item")) { continue; }
            let contents = match fs::read_to_string(entry.path()) { Ok(v) => v, Err(_) => continue };
            let data: Value = match serde_json::from_str(&contents) { Ok(v) => v, Err(_) => continue };
            let Some(app_name) = json_string(&data, "AppName") else { continue };
            let title = json_string(&data, "DisplayName")
                .filter(|v| !v.trim().is_empty()).unwrap_or_else(|| app_name.clone());
            if !seen.insert(app_name.to_lowercase()) { continue; }
            games.push(make_entry(title, format!("epic:{app_name}"), false));
        }
    }
    if games.is_empty() {
        return Err("No Epic games were found. Make sure Epic Games Launcher is installed and the games are installed locally.".into());
    }
    games.sort_by_key(|g| g.title.to_lowercase());
    Ok(games)
}

#[tauri::command]
fn launch_game(path: String, shortcut: bool) -> Result<(), String> {
    if let Some(id) = path.strip_prefix("steam:") {
        if id.is_empty() || !id.chars().all(|c| c.is_ascii_digit()) {
            return Err("Invalid Steam game ID.".into());
        }
        let url = format!("steam://run/{id}");
        Command::new("cmd.exe").args(["/C", "start", "", &url]).spawn()
            .map_err(|e| format!("Could not launch Steam game: {e}"))?;
        record_launch(&path, false);
        return Ok(());
    }
    if let Some(id) = path.strip_prefix("ubisoft:") {
        if id.is_empty() || !id.chars().all(|c| c.is_ascii_digit()) {
            return Err("Invalid Ubisoft game ID.".into());
        }
        let url = format!("uplay://launch/{id}/0");
        Command::new("cmd.exe").args(["/C", "start", "", &url]).spawn()
            .map_err(|e| format!("Could not launch Ubisoft game: {e}"))?;
        record_launch(&path, false);
        return Ok(());
    }
    if let Some(app_name) = path.strip_prefix("epic:") {
        if app_name.trim().is_empty() || app_name.contains(['/', '\\', '?']) {
            return Err("Invalid Epic game ID.".into());
        }
        let url = format!(
            "com.epicgames.launcher://apps/{}?action=launch&silent=true",
            urlencoding::encode(app_name)
        );
        Command::new("cmd.exe").args(["/C", "start", "", &url]).spawn()
            .map_err(|e| format!("Could not launch Epic game: {e}"))?;
        record_launch(&path, false);
        return Ok(());
    }
    let file = Path::new(&path);
    if !file.is_file() { return Err("The game file or shortcut could not be found.".into()); }
    let ext = file.extension().and_then(|e| e.to_str()).unwrap_or("");
    let is_exe = ext.eq_ignore_ascii_case("exe");
    let is_shortcut = ext.eq_ignore_ascii_case("lnk");
    let is_batch = ext.eq_ignore_ascii_case("bat");
    if shortcut {
        if !is_shortcut { return Err("Invalid shortcut file.".into()); }
        Command::new("explorer.exe").arg(file).spawn()
            .map_err(|e| format!("Could not open shortcut: {e}"))?;
        record_launch(&path, false);
        return Ok(());
    }
    if is_batch {
        let working_dir = file.parent().ok_or("Could not determine the batch file's folder.")?;
        let child = Command::new("cmd.exe").arg("/C").arg(file).current_dir(working_dir).spawn()
            .map_err(|e| format!("Could not launch batch file: {e}"))?;
        record_launch(&path, true);
        watch_process(path, child);
        return Ok(());
    }
    if !is_exe { return Err("Unsupported game file type.".into()); }
    let child = Command::new(file)
        .current_dir(file.parent().ok_or("Could not determine the game's folder.")?)
        .spawn().map_err(|e| format!("Could not launch game: {e}"))?;
    record_launch(&path, true);
    watch_process(path, child);
    Ok(())
}

#[tauri::command]
fn search_game_artwork(game_name: String) -> Result<ArtworkResult, String> {
    let api_key = env::var("STEAMGRIDDB_API_KEY").map_err(|_| {
        "STEAMGRIDDB_API_KEY environment variable is missing. Restart your terminal and GameHub.".to_string()
    })?;
    if game_name.trim().is_empty() { return Err("Enter a game name.".into()); }
    let client = http_client()?;
    let authorization = format!("Bearer {api_key}");
    let search_url = format!(
        "https://www.steamgriddb.com/api/v2/search/autocomplete/{}",
        urlencoding::encode(game_name.trim())
    );
    let response = client.get(&search_url).header("Authorization", &authorization).send()
        .map_err(|e| format!("SteamGridDB search failed: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("SteamGridDB search returned HTTP {}.", response.status()));
    }
    let search: ApiResponse<SteamGame> = response.json()
        .map_err(|e| format!("Could not read search results: {e}"))?;
    if !search.success { return Err("SteamGridDB could not complete the search.".into()); }
    let game_id = search.data.first()
        .ok_or_else(|| format!("No SteamGridDB match found for '{game_name}'."))?.id;
    let grids_url = format!("https://www.steamgriddb.com/api/v2/grids/game/{game_id}?limit=1");
    let grids_response = client.get(&grids_url).header("Authorization", &authorization).send()
        .map_err(|e| format!("Could not retrieve game covers: {e}"))?;
    let cover = if grids_response.status().is_success() {
        let result: ApiResponse<ArtworkItem> = grids_response.json()
            .map_err(|e| format!("Could not read cover results: {e}"))?;
        if result.success { result.data.first().map(|item| item.url.clone()) } else { None }
    } else { None };
    let heroes_url = format!("https://www.steamgriddb.com/api/v2/heroes/game/{game_id}?limit=1");
    let heroes_response = client.get(&heroes_url).header("Authorization", &authorization).send()
        .map_err(|e| format!("Could not retrieve backgrounds: {e}"))?;
    let background = if heroes_response.status().is_success() {
        let result: ApiResponse<ArtworkItem> = heroes_response.json()
            .map_err(|e| format!("Could not read background results: {e}"))?;
        if result.success { result.data.first().map(|item| item.url.clone()) } else { None }
    } else { None };
    if cover.is_none() && background.is_none() {
        return Err(format!("No covers or backgrounds were found for '{game_name}'."));
    }
    Ok(ArtworkResult { cover, background })
}

fn normalize_title(name: &str) -> String {
    name.chars().filter(|c| c.is_alphanumeric())
        .flat_map(|c| c.to_lowercase()).collect()
}

fn steam_app_info(client: &reqwest::blocking::Client, id: u64) -> Result<Option<GameInfo>, String> {
    let url = format!("https://store.steampowered.com/api/appdetails?appids={id}&l=english&cc=be");
    let response = client.get(&url).send()
        .map_err(|e| format!("Steam Store kon niet worden bereikt: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("Steam Store gaf HTTP {} terug.", response.status()));
    }
    let root: Value = response.json()
        .map_err(|e| format!("Ongeldig Steam-antwoord: {e}"))?;
    let id_key = id.to_string();
    let Some(item) = root.get(id_key.as_str()) else { return Ok(None); };
    if item.get("success").and_then(Value::as_bool) != Some(true) { return Ok(None); }
    let Some(data) = item.get("data") else { return Ok(None); };
    let list = |key: &str| -> Vec<String> {
        data.get(key).and_then(Value::as_array)
            .map(|arr| arr.iter().filter_map(Value::as_str).map(str::to_string).collect())
            .unwrap_or_default()
    };
    let genres = data.get("genres").and_then(Value::as_array)
        .map(|arr| arr.iter().filter_map(|g| g.get("description").and_then(Value::as_str))
            .map(str::to_string).collect()).unwrap_or_default();
    let description = data.get("short_description").and_then(Value::as_str)
        .filter(|s| !s.trim().is_empty()).map(str::to_string);
    let release_date = data.get("release_date").and_then(|r| r.get("date"))
        .and_then(Value::as_str).map(str::to_string);
    Ok(Some(GameInfo {
        description,
        release_date,
        developers: list("developers"),
        publishers: list("publishers"),
        genres,
        steam_id: Some(id),
        source: "Steam Store".into(),
    }))
}

#[tauri::command]
fn get_game_info(path: String, game_name: String) -> Result<Option<GameInfo>, String> {
    if game_name.trim().is_empty() { return Ok(None); }
    let client = http_client()?;
    if let Some(id) = path.strip_prefix("steam:").and_then(|s| s.parse::<u64>().ok()) {
        return steam_app_info(&client, id);
    }
    // Alleen exacte titelmatches gebruiken om verkeerde metadata te vermijden.
    let url = format!(
        "https://store.steampowered.com/api/storesearch/?term={}&l=english&cc=be",
        urlencoding::encode(game_name.trim())
    );
    let response = client.get(&url).send()
        .map_err(|e| format!("Steam-zoekopdracht mislukt: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("Steam-zoekopdracht gaf HTTP {} terug.", response.status()));
    }
    let search: Value = response.json()
        .map_err(|e| format!("Steam-zoekresultaten konden niet worden gelezen: {e}"))?;
    let expected = normalize_title(&game_name);
    let id = search.get("items").and_then(Value::as_array)
        .and_then(|items| items.iter().find(|item| {
            item.get("name").and_then(Value::as_str)
                .is_some_and(|name| normalize_title(name) == expected)
        }))
        .and_then(|item| item.get("id").and_then(Value::as_u64));
    match id {
        Some(id) => steam_app_info(&client, id),
        None => Ok(None),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            scan_games,
            select_game_folder,
            scan_steam_games,
            scan_ubisoft_games,
            scan_epic_games,
            launch_game,
            search_game_artwork,
            get_game_info,
            get_play_stats,
            load_gamehub_library,
            save_gamehub_library,
            sync_steam_playtime,
            sync_gamehub_library,
            redeem_steam_login_code,
            get_online_steam_account,
            login_steam_automatically,
            connect_steam,
            disconnect_steam,
            get_steam_account
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

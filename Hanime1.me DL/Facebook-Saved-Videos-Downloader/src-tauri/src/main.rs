#[cfg(not(all(
    target_os = "windows",
    target_arch = "x86_64",
    target_env = "msvc",
    target_vendor = "pc"
)))]
compile_error!("fb-saved-dl-gui requires target x86_64-pc-windows-msvc");

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{Emitter, State};
use tauri::Manager;

const JOBS_MIN: u8 = 1;
const JOBS_MAX: u8 = 8;
const RESOLUTIONS: [u16; 4] = [360, 480, 720, 1080];
const YTDLP_VERSION: &str = "2026.07.04";
const YTDLP_SHA256: &str = "52fe3c26dcf71fbdc85b528589020bb0b8e383155cfa81b64dd447bbe35e24b8";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    cookies_path: String,
    output_dir: String,
    jobs: u8,
    resolution: u16,
}

impl Default for Settings {
    fn default() -> Self {
        Self { cookies_path: "Facebook-cookies.txt".into(), output_dir: "./downloads".into(), jobs: 3, resolution: 720 }
    }
}

fn settings_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_local_data_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    Ok(dir.join("settings.json"))
}

fn validate(settings: &Settings) -> Result<(), String> {
    if !PathBuf::from(&settings.cookies_path).is_file() { return Err("Choose an existing Netscape cookie file.".into()); }
    if !PathBuf::from(&settings.output_dir).is_dir() { return Err("Choose an existing output directory.".into()); }
    if !(JOBS_MIN..=JOBS_MAX).contains(&settings.jobs) { return Err("Jobs must be an integer from 1 to 8.".into()); }
    if !RESOLUTIONS.contains(&settings.resolution) { return Err("Resolution must be 360, 480, 720, or 1080p.".into()); }
    Ok(())
}

#[tauri::command]
fn load_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    let path = settings_file(&app)?;
    match fs::read_to_string(path) {
        Ok(raw) => Ok(serde_json::from_str(&raw).unwrap_or_default()),
        Err(_) => Ok(Settings::default()),
    }
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: Settings) -> Result<(), String> {
    validate(&settings)?;
    let path = settings_file(&app)?;
    fs::write(path, serde_json::to_vec_pretty(&settings).map_err(|err| err.to_string())?).map_err(|err| err.to_string())
}

#[tauri::command]
fn reset_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    let path = settings_file(&app)?;
    let _ = fs::remove_file(path);
    Ok(Settings::default())
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EngineRequest {
    command: String,
    collection_id: Option<String>,
    settings: Settings,
    dry_run: bool,
}

struct ActiveEngine(Arc<Mutex<EngineProcess>>);

#[derive(Default)]
struct EngineProcess { pid: Option<u32>, cancelled: bool }

fn engine_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let path = app.path().resource_dir().map_err(|err| err.to_string())?.join("fb-saved-dl.exe");
    if path.is_file() { Ok(path) } else { Err("Downloader engine is missing from this installation.".into()) }
}

fn managed_yt_dlp_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_local_data_dir().map_err(|err| err.to_string())?.join("yt-dlp.exe"))
}

fn path_candidate(path: PathBuf) -> Option<PathBuf> { path.is_file().then_some(path) }

fn resolve_yt_dlp(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(path) = path_candidate(managed_yt_dlp_path(app)?) { return Ok(path); }
    if let Ok(val) = std::env::var("FB_SAVED_DLP_YT_DLP_PATH") {
        if let Some(path) = path_candidate(PathBuf::from(&val)) { return Ok(path); }
    }
    let path = Command::new("where.exe").arg("yt-dlp.exe").output().ok()
        .filter(|output| output.status.success())
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .and_then(|stdout| stdout.lines().map(PathBuf::from).find(|path| path.is_file()));
    if let Some(path) = path { return Ok(path); }
    let bundled = app.path().resource_dir().map_err(|err| err.to_string())?.join("spike").join("yt-dlp.exe");
    path_candidate(bundled).ok_or_else(|| "yt-dlp is missing. Open Settings and choose Install yt-dlp.".into())
}

fn download_file(url: &str, destination: &Path) -> Result<(), String> {
    let command = format!("Invoke-WebRequest -UseBasicParsing -Uri '{}' -OutFile '{}'", url, destination.to_string_lossy().replace('\'', "''"));
    let status = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &command])
        .status().map_err(|_| "Unable to download yt-dlp from the official release.".to_string())?;
    status.success().then_some(()).ok_or_else(|| "Unable to download yt-dlp from the official release.".into())
}

fn sha256(path: &Path) -> Result<String, String> {
    let output = Command::new("certutil").args(["-hashfile", &path.to_string_lossy(), "SHA256"]).output()
        .map_err(|_| "Unable to verify yt-dlp download.".to_string())?;
    if !output.status.success() { return Err("Unable to verify yt-dlp download.".into()); }
    String::from_utf8_lossy(&output.stdout).lines().find(|line| line.chars().filter(|c| c.is_ascii_hexdigit()).count() == 64)
        .map(|line| line.chars().filter(|c| c.is_ascii_hexdigit()).collect::<String>().to_lowercase())
        .ok_or_else(|| "Unable to verify yt-dlp download.".into())
}

fn install_yt_dlp(app: &tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_local_data_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&dir).map_err(|_| "Unable to prepare yt-dlp install directory.".to_string())?;
    let target = dir.join("yt-dlp.exe");
    let temp = dir.join(format!("yt-dlp.exe.download-{}", std::process::id()));
    let sums = dir.join(format!("SHA2-256SUMS-{}", std::process::id()));
    let result = (|| {
        let base = format!("https://github.com/yt-dlp/yt-dlp/releases/download/{YTDLP_VERSION}");
        download_file(&format!("{base}/yt-dlp.exe"), &temp)?;
        download_file(&format!("{base}/SHA2-256SUMS"), &sums)?;
        let sums_text = fs::read_to_string(&sums).map_err(|_| "Unable to verify yt-dlp download.".to_string())?;
        if !sums_text.lines().any(|line| line.to_ascii_lowercase().contains(YTDLP_SHA256) && line.contains("yt-dlp.exe")) || sha256(&temp)? != YTDLP_SHA256 {
            return Err("yt-dlp download failed SHA-256 verification.".into());
        }
        let backup = target.with_extension("exe.previous");
        if target.is_file() { let _ = fs::remove_file(&backup); fs::rename(&target, &backup).map_err(|_| "Unable to replace yt-dlp installation.".to_string())?; }
        if let Err(err) = fs::rename(&temp, &target) { let _ = fs::rename(&backup, &target); return Err(format!("Unable to install yt-dlp: {err}")); }
        let _ = fs::remove_file(backup);
        Ok(target.to_string_lossy().into_owned())
    })();
    let _ = fs::remove_file(&temp);
    let _ = fs::remove_file(&sums);
    result
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct YtDlpStatus { available: bool, source: Option<String>, version: &'static str }

#[tauri::command]
fn yt_dlp_status(app: tauri::AppHandle) -> Result<YtDlpStatus, String> {
    match resolve_yt_dlp(&app) { Ok(path) => Ok(YtDlpStatus { available: true, source: Some(path.to_string_lossy().into_owned()), version: YTDLP_VERSION }), Err(_) => Ok(YtDlpStatus { available: false, source: None, version: YTDLP_VERSION }) }
}

#[tauri::command]
fn install_yt_dlp_command(app: tauri::AppHandle) -> Result<YtDlpStatus, String> {
    install_yt_dlp(&app)?;
    yt_dlp_status(app)
}

fn engine_args(settings: &Settings, command: &str, collection_id: Option<&str>, dry_run: bool) -> Result<Vec<String>, String> {
    if command == "download-collection" && collection_id.is_none() { return Err("Collection ID is required.".into()); }
    let mut args = vec!["--engine-jsonl".into(), command.into()];
    if let Some(id) = collection_id { args.push(id.into()); }
    args.extend([
        "--cookies".into(), settings.cookies_path.clone(),
        "--output-dir".into(), settings.output_dir.clone(),
        "--jobs".into(), settings.jobs.to_string(),
        "--resolution".into(), settings.resolution.to_string(),
    ]);
    if dry_run { args.push("--dry-run".into()); }
    Ok(args)
}

fn protocol_error(message: &str) -> String { format!("Engine protocol error: {message}") }

fn non_negative_int(value: Option<&Value>) -> bool {
    value.and_then(Value::as_i64).map(|value| value >= 0).unwrap_or(false)
}

fn required_string(value: Option<&Value>) -> bool {
    value.and_then(Value::as_str).map(|value| !value.is_empty()).unwrap_or(false)
}

fn validate_event(value: &Value, terminal_seen: bool, collections_seen: bool, progress_seen: bool) -> Result<(), String> {
    let object = value.as_object().ok_or_else(|| protocol_error("event must be an object"))?;
    let event_type = object.get("type").and_then(Value::as_str).ok_or_else(|| protocol_error("missing type"))?;
    if !required_string(object.get("operationId")) { return Err(protocol_error("missing operationId")); }
    if terminal_seen { return Err(protocol_error("event after terminal")); }
    match event_type {
        "collections" => {
            if collections_seen || progress_seen { return Err(protocol_error("duplicate or misplaced collections event")); }
            let collections = object.get("collections").and_then(Value::as_array).ok_or_else(|| protocol_error("collections must be an array"))?;
            if collections.iter().any(|item| {
                let item = item.as_object();
                !required_string(item.and_then(|v| v.get("id"))) || item.and_then(|v| v.get("name")).and_then(Value::as_str).is_none() || !non_negative_int(item.and_then(|v| v.get("count")))
            }) { return Err(protocol_error("invalid collection")); }
        }
        "progress" => {
            if !required_string(object.get("collectionId")) || !required_string(object.get("videoId")) || !non_negative_int(object.get("completed")) || !non_negative_int(object.get("total")) { return Err(protocol_error("invalid progress")); }
        }
        "completed" | "partial" => {
            if !non_negative_int(object.get("successCount")) || !non_negative_int(object.get("failureCount")) || !matches!(object.get("exitCode").and_then(Value::as_i64), Some(0 | 1)) { return Err(protocol_error("invalid result terminal")); }
        }
        "failed" | "cancelled" | "timeout" | "error" => {
            if !required_string(object.get("message")) || !matches!(object.get("exitCode").and_then(Value::as_i64), Some(3 | 124 | 130)) { return Err(protocol_error("invalid error terminal")); }
        }
        _ => return Err(protocol_error("unknown event type")),
    }
    Ok(())
}

fn terminate_tree(pid: u32) {
    let _ = Command::new("taskkill").args(["/PID", &pid.to_string(), "/T", "/F"]).output();
}

fn error_event(operation_id: &str, message: &str, exit_code: i64) -> Value {
    serde_json::json!({ "type": "error", "operationId": operation_id, "message": message.chars().take(500).collect::<String>(), "exitCode": exit_code })
}

fn execute_engine(app: &tauri::AppHandle, active: &ActiveEngine, args: Vec<String>) -> Result<(), String> {
    let operation_id = format!("tauri-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
    let yt_dlp = resolve_yt_dlp(app)?;
    let mut child = Command::new(engine_path(app)?)
        .args(args)
        .env("FB_SAVED_DLP_YT_DLP_PATH", yt_dlp)
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|err| format!("Unable to start downloader engine: {err}"))?;
    let pid = child.id();
    *active.0.lock().map_err(|_| "Engine state unavailable.".to_string())? = EngineProcess { pid: Some(pid), cancelled: false };
    let stdout = child.stdout.take().ok_or_else(|| "Unable to read downloader engine output.".to_string())?;
    let (sender, receiver) = mpsc::channel::<Result<Option<String>, String>>();
    thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        loop {
            let mut line = String::new();
            match reader.read_line(&mut line) {
                Ok(0) => { let _ = sender.send(Ok(None)); break; }
                Ok(_) => { if sender.send(Ok(Some(line))).is_err() { break; } }
                Err(err) => { let _ = sender.send(Err(err.to_string())); break; }
            }
        }
    });
    let started = Instant::now();
    let mut terminal: Option<Value> = None;
    let mut collections_seen = false;
    let mut progress_seen = false;
    let mut protocol: Option<String> = None;
    loop {
        let cancelled = active.0.lock().ok().map(|state| state.cancelled).unwrap_or(false);
        if started.elapsed() >= Duration::from_secs(120) {
            terminate_tree(pid);
            protocol = Some("Engine operation timed out.".into());
            break;
        }
        if cancelled { terminate_tree(pid); protocol = Some("Operation cancelled.".into()); break; }
        match receiver.recv_timeout(Duration::from_millis(100)) {
            Ok(Ok(Some(line))) => {
                let line = line.trim_end_matches(['\r', '\n']);
                if line.is_empty() { protocol = Some(protocol_error("blank line")); break; }
                match serde_json::from_str::<Value>(line) {
                    Ok(value) => match validate_event(&value, terminal.is_some(), collections_seen, progress_seen) {
                        Ok(()) => {
                        let event_type = value.get("type").and_then(Value::as_str).unwrap_or_default();
                        if event_type == "collections" { collections_seen = true; }
                        if event_type == "progress" { progress_seen = true; }
                        if matches!(event_type, "completed" | "partial" | "failed" | "cancelled" | "timeout" | "error") { terminal = Some(value); } else { let _ = app.emit("engine-event", value); }
                        }
                        Err(message) => { protocol = Some(message); break; }
                    },
                    Err(_) => { protocol = Some(protocol_error("malformed event data")); break; }
                }
            }
            Ok(Ok(None)) => break,
            Ok(Err(err)) => { protocol = Some(format!("Unable to read downloader engine output: {err}")); break; }
            Err(mpsc::RecvTimeoutError::Timeout) => continue,
            Err(_) => break,
        }
    }
    let cancelled = active.0.lock().map_err(|_| "Engine state unavailable.".to_string())?.cancelled;
    if protocol.is_some() || cancelled { terminate_tree(pid); }
    let status = child.wait().map_err(|err| format!("Unable to finish downloader engine: {err}"))?;
    *active.0.lock().map_err(|_| "Engine state unavailable.".to_string())? = EngineProcess::default();
    let result = if cancelled { Err("Operation cancelled.".to_string()) }
        else if let Some(message) = protocol { Err(message) }
        else if terminal.is_none() { Err("Engine returned no terminal event.".into()) }
        else if !status.success() { Err(format!("Engine exited with code {}.", status.code().unwrap_or(3))) }
        else { let event = terminal.unwrap(); app.emit("engine-event", event).map_err(|err| err.to_string())?; Ok(()) };
    if let Err(message) = result {
        let (event, code) = if cancelled {
            (serde_json::json!({ "type": "cancelled", "operationId": operation_id, "message": message, "exitCode": 130 }), 130)
        } else if message == "Engine operation timed out." {
            (serde_json::json!({ "type": "timeout", "operationId": operation_id, "message": message, "exitCode": 124 }), 124)
        } else { (error_event(&operation_id, &message, 3), 3) };
        let _ = app.emit("engine-event", event);
        return Err(format!("engine operation failed ({code}): {message}"));
    }
    Ok(())
}

#[tauri::command]
fn list_collections(app: tauri::AppHandle, active: State<'_, ActiveEngine>, settings: Settings) -> Result<(), String> {
    validate(&settings)?;
    execute_engine(&app, &active, engine_args(&settings, "list-collections", None, false)?)
}

#[tauri::command]
fn run_engine(app: tauri::AppHandle, active: State<'_, ActiveEngine>, request: EngineRequest) -> Result<(), String> {
    validate(&request.settings)?;
    execute_engine(&app, &active, engine_args(&request.settings, &request.command, request.collection_id.as_deref(), request.dry_run)?)
}

#[tauri::command]
fn cancel_engine(active: State<'_, ActiveEngine>) -> Result<(), String> {
    let mut state = active.0.lock().map_err(|_| "Engine state unavailable.".to_string())?;
    state.cancelled = true;
    if let Some(pid) = state.pid { terminate_tree(pid); }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ActiveEngine(Arc::new(Mutex::new(EngineProcess::default()))))
        .invoke_handler(tauri::generate_handler![load_settings, save_settings, reset_settings, yt_dlp_status, install_yt_dlp_command, list_collections, run_engine, cancel_engine])
        .build(tauri::generate_context!())
        .expect("error while building fb-saved-dl-gui")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit) {
                if let Ok(mut state) = app.state::<ActiveEngine>().0.lock() {
                    if let Some(pid) = state.pid { terminate_tree(pid); }
                    state.cancelled = true;
                }
            }
        });
}

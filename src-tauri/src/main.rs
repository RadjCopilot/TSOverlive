// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, Manager, Menu, MenuItem, Submenu};

#[tauri::command]
fn update_click_through_menu(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let title = if enabled { "✓ Сквозной режим" } else { "Сквозной режим" };
    
    #[cfg(target_os = "macos")]
    {
        if let Some(window) = app.get_window("main") {
            let _ = window.menu_handle().get_item("click_through_menu").set_title(title);
        }
    }
    
    let _ = app.tray_handle().get_item("click_through").set_title(title);
    
    Ok(())
}

use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::net::TcpStream;
use std::sync::atomic::{AtomicBool, Ordering};

struct Ts3Connection {
    write_stream: Option<tokio::io::WriteHalf<TcpStream>>,
}

struct Ts6Connection {
    write_stream: Option<futures_util::stream::SplitSink<tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<TcpStream>>, tokio_tungstenite::tungstenite::protocol::Message>>,
}

lazy_static::lazy_static! {
    static ref TS3_CONN: Arc<Mutex<Ts3Connection>> = Arc::new(Mutex::new(Ts3Connection { write_stream: None }));
    static ref TS6_CONN: Arc<Mutex<Ts6Connection>> = Arc::new(Mutex::new(Ts6Connection { write_stream: None }));
}

#[tauri::command]
async fn connect_ts3(window: tauri::Window) -> Result<(), String> {
    use tokio::io::{AsyncReadExt, split};
    use tokio::time::{sleep, Duration, timeout};
    
    tokio::spawn(async move {
        loop {
            let connect_result = timeout(
                Duration::from_secs(2),
                TcpStream::connect("127.0.0.1:25639")
            ).await;
            
            match connect_result {
                Ok(Ok(stream)) => {
                    let (mut read_half, write_half) = split(stream);
                    
                    {
                        let mut conn = TS3_CONN.lock().await;
                        conn.write_stream = Some(write_half);
                    }
                    
                    let _ = window.emit("ts3-connected", "");
                    
                    let mut accumulated = String::new();
                    let mut buffer = vec![0u8; 16384];
                    
                    loop {
                        let read_result = timeout(
                            Duration::from_secs(60),
                            read_half.read(&mut buffer)
                        ).await;
                        
                        match read_result {
                            Ok(Ok(0)) => break,
                            Ok(Ok(n)) => {
                                if let Ok(text) = String::from_utf8(buffer[..n].to_vec()) {
                                    accumulated.push_str(&text);
                                    
                                    while let Some(pos) = accumulated.find('\n') {
                                        let line = accumulated[..pos].to_string();
                                        accumulated = accumulated[pos + 1..].to_string();
                                        
                                        if !line.trim().is_empty() {
                                            let _ = window.emit("ts3-message", line + "\n");
                                        }
                                    }
                                }
                            }
                            Ok(Err(_)) => break,
                            Err(_) => {
                                continue;
                            }
                        }
                    }
                    
                    {
                        let mut conn = TS3_CONN.lock().await;
                        conn.write_stream = None;
                    }
                    
                    let _ = window.emit("ts3-disconnected", "");
                    sleep(Duration::from_secs(3)).await;
                }
                Ok(Err(_)) => {
                    let _ = window.emit("ts3-disconnected", "");
                    sleep(Duration::from_secs(3)).await;
                }
                Err(_) => {
                    let _ = window.emit("ts3-disconnected", "");
                    sleep(Duration::from_secs(3)).await;
                }
            }
        }
    });
    
    Ok(())
}

#[tauri::command]
async fn send_ts3_command(command: String) -> Result<(), String> {
    use tokio::io::AsyncWriteExt;
    
    let mut conn = TS3_CONN.lock().await;
    if let Some(ref mut stream) = conn.write_stream {
        let cmd = format!("{}\r\n", command);
        let _ = stream.write_all(cmd.as_bytes()).await;
        let _ = stream.flush().await;
    }
    
    Ok(())
}

#[tauri::command]
async fn send_ts6_command(command: String) -> Result<(), String> {
    use tokio_tungstenite::tungstenite::protocol::Message;
    use futures_util::SinkExt;
    
    let mut conn = TS6_CONN.lock().await;
    if let Some(ref mut stream) = conn.write_stream {
        let _ = stream.send(Message::Text(command)).await;
    }
    
    Ok(())
}

#[tauri::command]
async fn connect_ts6(api_key: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
async fn start_ts6_connection(window: tauri::Window, api_key: String) -> Result<(), String> {
    use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
    use futures_util::{StreamExt, SinkExt};
    use serde_json::json;
    use tokio::time::{sleep, Duration};
    
    let url = "ws://127.0.0.1:5899";
    
    let window_clone = window.clone();
    tokio::spawn(async move {
        let mut retry_delay = 3;
        
        loop {
            match connect_async(url).await {
                Ok((ws_stream, _)) => {
                    retry_delay = 3;
                    let (mut write, mut read) = ws_stream.split();
                    
                    let auth_msg = json!({
                        "type": "auth",
                        "payload": {
                            "identifier": "com.radj.teamspeak-overlive",
                            "version": "1.0.1",
                            "name": "TeamSpeak OverLive",
                            "description": "Overlay widget for TeamSpeak 6 and 3",
                            "content": { "apiKey": api_key.clone() },
                            "autoApprove": true
                        }
                    });
                    
                    if let Err(_) = write.send(Message::Text(auth_msg.to_string())).await {
                        let _ = window_clone.emit("ts6-disconnected", "");
                        sleep(Duration::from_secs(retry_delay)).await;
                        continue;
                    }
                    
                    {
                        let mut conn = TS6_CONN.lock().await;
                        conn.write_stream = Some(write);
                    }
                    
                    while let Some(msg) = read.next().await {
                        match msg {
                            Ok(Message::Text(text)) => {
                                if let Err(_) = window_clone.emit("ts6-message", &text) {
                                    break;
                                }
                            }
                            Ok(Message::Close(_)) => break,
                            Err(_) => break,
                            _ => {}
                        }
                    }
                    
                    {
                        let mut conn = TS6_CONN.lock().await;
                        conn.write_stream = None;
                    }
                    
                    let _ = window_clone.emit("ts6-disconnected", "");
                }
                Err(_) => {
                    let _ = window_clone.emit("ts6-disconnected", "");
                }
            }
            
            sleep(Duration::from_secs(retry_delay)).await;
            if retry_delay < 30 {
                retry_delay *= 2;
            }
        }
    });
    
    Ok(())
}

fn main() {
    let show = CustomMenuItem::new("show".to_string(), "Показать");
    let click_through = CustomMenuItem::new("click_through".to_string(), "Сквозной режим");
    let devtools = CustomMenuItem::new("devtools".to_string(), "DevTools");
    let quit = CustomMenuItem::new("quit".to_string(), "Выход");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(click_through)
        .add_item(devtools)
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(quit);
    
    let system_tray = SystemTray::new().with_menu(tray_menu);

    #[cfg(target_os = "macos")]
    let menu = Menu::new()
        .add_submenu(Submenu::new(
            "Приложение",
            Menu::new()
                .add_item(CustomMenuItem::new("click_through_menu", "Сквозной режим"))
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Quit),
        ));

    let mut builder = tauri::Builder::default();
    
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .menu(menu)
            .on_menu_event(|event| {
                match event.menu_item_id() {
                    "click_through_menu" => {
                        let window = event.window();
                        let _ = window.emit("toggle-click-through", "");
                    }
                    _ => {}
                }
            });
    }
    
    builder
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "show" => {
                        let window = app.get_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    "click_through" => {
                        let window = app.get_window("main").unwrap();
                        let _ = window.emit("toggle-click-through", "");
                    }
                    "devtools" => {
                        #[cfg(debug_assertions)]
                        {
                            let window = app.get_window("main").unwrap();
                            window.open_devtools();
                        }
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![connect_ts6, start_ts6_connection, connect_ts3, send_ts3_command, send_ts6_command, update_click_through_menu])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

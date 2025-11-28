// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, Manager};

#[tauri::command]
async fn connect_ts6(window: tauri::Window, api_key: String) -> Result<(), String> {
    use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
    use futures_util::{StreamExt, SinkExt};
    use serde_json::json;
    use tokio::time::{sleep, Duration};
    
    let url = "ws://127.0.0.1:5899";
    
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
                            "identifier": "com.radj.ts6overlive",
                            "version": "1.0.0",
                            "name": "TS6 OverLive",
                            "description": "Overlay widget for TeamSpeak 6",
                            "content": { "apiKey": api_key.clone() },
                            "autoApprove": true
                        }
                    });
                    
                    let _ = write.send(Message::Text(auth_msg.to_string())).await;
                    
                    while let Some(msg) = read.next().await {
                        if let Ok(Message::Text(text)) = msg {
                            let _ = window.emit("ts6-message", text);
                        }
                    }
                    
                    let _ = window.emit("ts6-disconnected", "");
                }
                Err(_) => {
                    let _ = window.emit("ts6-disconnected", "");
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
    let quit = CustomMenuItem::new("quit".to_string(), "Выход");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(quit);
    
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "show" => {
                        let window = app.get_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![connect_ts6])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

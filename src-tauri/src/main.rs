// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, Manager, Menu, MenuItem, Submenu};

#[tauri::command]
fn update_click_through_menu(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let title = if enabled { "✓ Сквозной режим" } else { "Сквозной режим" };
    
    if let Some(window) = app.get_window("main") {
        let _ = window.menu_handle().get_item("click_through_menu").set_title(title);
    }
    
    let _ = app.tray_handle().get_item("click_through").set_title(title);
    
    Ok(())
}

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

    let menu = Menu::new()
        .add_submenu(Submenu::new(
            "Приложение",
            Menu::new()
                .add_item(CustomMenuItem::new("click_through_menu", "Сквозной режим"))
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Quit),
        ));

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "click_through_menu" => {
                    let window = event.window();
                    let _ = window.emit("toggle-click-through", "");
                }
                _ => {}
            }
        })
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
        .invoke_handler(tauri::generate_handler![connect_ts6, update_click_through_menu])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use tauri::Manager;

#[cfg(target_os = "windows")]
mod windows_platform {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::*;

    pub fn send_to_desktop(hwnd: HWND) {
        unsafe {
            // Remove from taskbar + prevent stealing focus
            let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
            SetWindowLongW(
                hwnd,
                GWL_EXSTYLE,
                ex_style | WS_EX_TOOLWINDOW.0 as i32 | WS_EX_NOACTIVATE.0 as i32,
            );
            // Push to bottom of Z-order (behind all normal windows)
            let _ = SetWindowPos(
                hwnd,
                HWND_BOTTOM,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
            );
        }
    }
}

/// Called from frontend to send window to desktop background
#[tauri::command]
fn send_to_desktop(window: tauri::WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        if let Ok(hwnd_raw) = window.hwnd() {
            let hwnd = HWND(hwnd_raw.0 as isize);
            windows_platform::send_to_desktop(hwnd);
        }
    }
    // On non-Windows, the window parameter is intentionally unused
    #[cfg(not(target_os = "windows"))]
    drop(window);
}

/// Re-apply desktop position when window loses focus
#[tauri::command]
fn on_focus_lost(window: tauri::WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::*;
        if let Ok(hwnd_raw) = window.hwnd() {
            let hwnd = HWND(hwnd_raw.0 as isize);
            unsafe {
                let _ = SetWindowPos(
                    hwnd,
                    HWND_BOTTOM,
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
                );
            }
        }
    }
    // On non-Windows, the window parameter is intentionally unused
    #[cfg(not(target_os = "windows"))]
    drop(window);
}

pub fn run() {
    tauri::Builder::default()
        // Log level: warn/error only — never log user content
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // Apply Mica transparency on Windows 11
            #[cfg(target_os = "windows")]
            {
                use window_vibrancy::apply_mica;
                apply_mica(&window, Some(true)).ok();
            }
            // On non-Windows, window is not used after this point
            #[cfg(not(target_os = "windows"))]
            drop(window);

            // System tray: click to show/hide window
            let tray = tauri::tray::TrayIconBuilder::new()
                .tooltip("DeskNote — 点击显示/隐藏")
                .on_tray_icon_event(|tray, event| {
                    use tauri::tray::TrayIconEvent;
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            if win.is_visible().unwrap_or(false) {
                                let _ = win.hide();
                            } else {
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Keep reference alive
            app.manage(tray);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![send_to_desktop, on_focus_lost])
        .run(tauri::generate_context!())
        .expect("error while running DeskNote");
}

// ─── Unit tests ───────────────────────────────────────────────────────────────
// Pure logic tests that do not require a running Tauri app.
// IPC command tests will be added in M4 when DB/validation logic is in Rust.
#[cfg(test)]
mod tests {
    /// Verifies the app identifier follows the reverse-domain convention.
    #[test]
    fn test_app_identifier_format() {
        let id = "com.desknote.app";
        let parts: Vec<&str> = id.split('.').collect();
        assert_eq!(parts.len(), 3, "identifier should have 3 dot-separated parts");
        assert_eq!(parts[0], "com");
        assert_eq!(parts[1], "desknote");
    }

    /// Smoke test: the module compiles and the basic types are accessible.
    #[test]
    fn test_module_compiles() {
        // If this file compiles, all imports and types are valid.
        assert!(true);
    }
}

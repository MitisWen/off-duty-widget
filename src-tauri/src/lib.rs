use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};
#[cfg(target_os = "windows")]
use window_vibrancy::apply_acrylic;
#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE};

/// Gap between the widget and the bottom-right corner of the work area.
const MARGIN: i32 = 24;

/// Gap between the card and the encouragement bubble.
const BUBBLE_GAP: i32 = 8;

const BUBBLE_WIDTH: f64 = 236.0;
const BUBBLE_HEIGHT: f64 = 68.0;

/// Whether the native blur was applied; the frontend falls back to a solid tint when not.
struct Vibrancy(bool);

/// Windows: acrylic blur for the glass look plus the Windows 11 rounded corners.
/// Older Windows versions ignore the corner attribute and stay rectangular.
#[cfg(target_os = "windows")]
fn apply_windows_glass(window: &tauri::WebviewWindow) -> bool {
    let acrylic = apply_acrylic(window, None).is_ok();

    if let Ok(hwnd) = window.hwnd() {
        let preference: i32 = 2; // DWMWCP_ROUND
        unsafe {
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_WINDOW_CORNER_PREFERENCE,
                &preference as *const _ as *const core::ffi::c_void,
                std::mem::size_of::<i32>() as u32,
            );
        }
    }

    acrylic
}

fn place_bottom_right(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    let size = window.outer_size().map_err(|error| error.to_string())?;
    let monitor = app
        .primary_monitor()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "no monitor available".to_string())?;
    let area = monitor.work_area();
    let x = area.position.x + area.size.width as i32 - size.width as i32 - MARGIN;
    let y = area.position.y + area.size.height as i32 - size.height as i32 - MARGIN;
    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

/// Keep the bubble next to the card: prefer below it, flip above when the card
/// sits near the bottom of the work area, and never leave the screen.
fn place_bubble(app: &AppHandle) -> Result<(), String> {
    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    let bubble = app
        .get_webview_window("bubble")
        .ok_or_else(|| "bubble window not found".to_string())?;

    let main_position = main.outer_position().map_err(|error| error.to_string())?;
    let main_size = main.outer_size().map_err(|error| error.to_string())?;
    let bubble_size = bubble.outer_size().map_err(|error| error.to_string())?;

    let monitor = main
        .current_monitor()
        .map_err(|error| error.to_string())?
        .or_else(|| app.primary_monitor().ok().flatten());

    let mut x = main_position.x + main_size.width as i32 - bubble_size.width as i32;
    let mut y = main_position.y + main_size.height as i32 + BUBBLE_GAP;

    if let Some(monitor) = monitor {
        let area = monitor.work_area();
        let area_right = area.position.x + area.size.width as i32;
        let area_bottom = area.position.y + area.size.height as i32;

        if y + bubble_size.height as i32 > area_bottom {
            y = main_position.y - bubble_size.height as i32 - BUBBLE_GAP;
        }

        x = x.clamp(area.position.x, area_right - bubble_size.width as i32);
        y = y.clamp(area.position.y, area_bottom - bubble_size.height as i32);
    }

    bubble
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

fn hide_bubble(app: &AppHandle) {
    if let Some(bubble) = app.get_webview_window("bubble") {
        let _ = bubble.hide();
    }
}

#[tauri::command]
fn reset_position(app: AppHandle) -> Result<(), String> {
    place_bottom_right(&app)
}

#[tauri::command]
fn vibrancy_enabled(state: tauri::State<'_, Vibrancy>) -> bool {
    state.0
}

#[tauri::command]
fn set_bubble_visible(app: AppHandle, visible: bool) -> Result<(), String> {
    let bubble = app
        .get_webview_window("bubble")
        .ok_or_else(|| "bubble window not found".to_string())?;
    if visible {
        place_bubble(&app)?;
        bubble.show().map_err(|error| error.to_string())
    } else {
        bubble.hide().map_err(|error| error.to_string())
    }
}

/// The bubble was clicked: hide it and let the card take over the message.
#[tauri::command]
fn bubble_clicked(app: AppHandle) -> Result<(), String> {
    hide_bubble(&app);
    let _ = app.emit("bubble-clicked", ());
    Ok(())
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle = MenuItem::with_id(app, "toggle", "显示 / 隐藏小组件", true, None::<&str>)?;
    let reset = MenuItem::with_id(app, "reset", "重置位置", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &reset, &separator, &quit])?;

    #[cfg(target_os = "macos")]
    let icon = Image::from_bytes(include_bytes!("../icons/tray.png"))?;
    #[cfg(not(target_os = "macos"))]
    let icon = Image::from_bytes(include_bytes!("../icons/tray-win.png"))?;

    let mut tray = TrayIconBuilder::with_id("tray")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => {
                if let Some(window) = app.get_webview_window("main") {
                    let visible = window.is_visible().unwrap_or(false);
                    if visible {
                        let _ = window.hide();
                        hide_bubble(app);
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                        // Let the page re-evaluate whether the bubble should be shown.
                        let _ = app.emit("widget-shown", ());
                    }
                }
            }
            "reset" => {
                let _ = place_bottom_right(app);
                let _ = place_bubble(app);
            }
            "quit" => app.exit(0),
            _ => {}
        });

    // Template icons are a macOS concept; on Windows the coloured glyph is used as-is.
    #[cfg(target_os = "macos")]
    {
        tray = tray.icon_as_template(true);
    }

    tray.build(app)?;

    Ok(())
}

fn setup_bubble(app: &mut tauri::App) -> tauri::Result<()> {
    let bubble = WebviewWindowBuilder::new(app, "bubble", WebviewUrl::App("index.html".into()))
        .title("鼓励")
        .inner_size(BUBBLE_WIDTH, BUBBLE_HEIGHT)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(true)
        .visible(false)
        .focused(false)
        .visible_on_all_workspaces(true)
        .accept_first_mouse(true)
        .build()?;

    #[cfg(target_os = "macos")]
    let _ = apply_vibrancy(
        &bubble,
        NSVisualEffectMaterial::Popover,
        Some(NSVisualEffectState::Active),
        Some(16.0),
    );

    #[cfg(target_os = "windows")]
    let _ = apply_windows_glass(&bubble);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            reset_position,
            vibrancy_enabled,
            set_bubble_visible,
            bubble_clicked
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let _ = app
                    .handle()
                    .set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            let window = app
                .get_webview_window("main")
                .expect("main window is declared in tauri.conf.json");

            #[cfg(target_os = "macos")]
            let vibrancy = apply_vibrancy(
                &window,
                NSVisualEffectMaterial::Popover,
                Some(NSVisualEffectState::Active),
                Some(18.0),
            )
            .is_ok();

            #[cfg(target_os = "windows")]
            let vibrancy = apply_windows_glass(&window);

            #[cfg(not(any(target_os = "macos", target_os = "windows")))]
            let vibrancy = false;

            app.manage(Vibrancy(vibrancy));

            setup_bubble(app)?;

            let close_window = window.clone();
            let close_handle = app.handle().clone();
            let move_handle = app.handle().clone();
            window.on_window_event(move |event| match event {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = close_window.hide();
                    hide_bubble(&close_handle);
                }
                WindowEvent::Moved(_) | WindowEvent::Resized(_) => {
                    if let Some(bubble) = move_handle.get_webview_window("bubble") {
                        if bubble.is_visible().unwrap_or(false) {
                            let _ = place_bubble(&move_handle);
                        }
                    }
                }
                _ => {}
            });

            setup_tray(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

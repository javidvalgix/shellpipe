// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod sftp; // Include the refactored sftp module
use sftp::*; // Import all re-exported functions from the sftp module

mod terminal;
use terminal::*;

mod types;
use std::sync::Mutex;
use types::ConnectionManager;
use terminal::TerminalManager;
use tauri::Manager;

#[tauri::command]
fn show_main_window(app_handle: tauri::AppHandle) {
    // Window operations on macOS (AppKit) must run on the main thread.
    // Using run_on_main_thread ensures this works correctly on Apple Silicon.
    let _ = app_handle.run_on_main_thread(move || {
        if let Some(main_window) = app_handle.get_webview_window("main") {
            let _ = main_window.show();
            let _ = main_window.set_focus();
        }
        if let Some(updater_window) = app_handle.get_webview_window("updater") {
            let _ = updater_window.close();
        }
    });
}

#[tauri::command]
fn restart_app(app_handle: tauri::AppHandle) {
    app_handle.restart();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(ConnectionManager::new()))
        .manage(Mutex::new(TerminalManager::new()))
        .invoke_handler(tauri::generate_handler![
            show_main_window,
            restart_app,
            connect_sftp,
            disconnect_sftp,
            upload_file,
            download_file,
            delete_item,
            rename_item,
            list_directory,
            create_directory,
            delete_directory,
            delete_directory_recursive,
            fetch_directory_size,
            cancel_directory_size,
            fetch_storage_info,
            cancel_transfer,
            get_active_transfers,
            copy_item,
            move_item,
            read_file_content,
            write_file_content,
            terminal_open,
            terminal_write,
            terminal_resize,
            terminal_close,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

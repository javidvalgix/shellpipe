use crate::types::ConnectionConfig;
use ssh2::Session;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;
use std::sync::{mpsc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

pub enum TerminalCommand {
    Data(Vec<u8>),
    Resize(u32, u32),
    Close,
}

pub struct TerminalHandle {
    pub sender: mpsc::Sender<TerminalCommand>,
}

pub type TerminalManager = HashMap<String, TerminalHandle>;

// Wrappers to allow moving ssh2 types across threads.
// SAFETY: Access is serialised — the I/O thread is the sole owner of the
// session and channel after they are moved in; the mutex in TerminalManager
// ensures no concurrent Rust-level access.
#[allow(dead_code)]
struct SendSession(Session);
unsafe impl Send for SendSession {}

struct SendChannel(ssh2::Channel);
unsafe impl Send for SendChannel {}

#[tauri::command]
pub async fn terminal_open(
    config: ConnectionConfig,
    terminal_id: String,
    app: AppHandle,
    terminals: State<'_, Mutex<TerminalManager>>,
) -> Result<(), String> {
    // Open a dedicated SSH connection for this terminal.
    let tcp = TcpStream::connect(format!("{}:{}", config.host, config.port))
        .map_err(|e| format!("Connection failed: {}", e))?;

    let mut session =
        Session::new().map_err(|e| format!("Failed to create session: {}", e))?;
    session.set_tcp_stream(tcp);
    session
        .handshake()
        .map_err(|e| format!("SSH handshake failed: {}", e))?;

    if let Some(key_path) = &config.private_key_path {
        session
            .userauth_pubkey_file(
                &config.username,
                None,
                Path::new(key_path),
                config.passphrase.as_deref(),
            )
            .map_err(|e| format!("Key authentication failed: {}", e))?;
    } else if let Some(password) = &config.password {
        session
            .userauth_password(&config.username, password)
            .map_err(|e| format!("Password authentication failed: {}", e))?;
    } else {
        return Err("No authentication method provided".to_string());
    }

    if !session.authenticated() {
        return Err("Authentication failed".to_string());
    }

    // Open a PTY channel.
    let mut channel = session
        .channel_session()
        .map_err(|e| format!("Failed to open channel: {}", e))?;

    channel
        .request_pty("xterm-256color", None, Some((220, 50, 0, 0)))
        .map_err(|e| format!("PTY request failed: {}", e))?;

    channel
        .shell()
        .map_err(|e| format!("Shell request failed: {}", e))?;

    // Switch to non-blocking so the I/O loop can multiplex reads and commands.
    session.set_blocking(false);

    let (tx, rx) = mpsc::channel::<TerminalCommand>();

    terminals
        .lock()
        .unwrap()
        .insert(terminal_id.clone(), TerminalHandle { sender: tx });

    let tid = terminal_id.clone();

    let send_session = SendSession(session);
    let send_channel = SendChannel(channel);

    thread::spawn(move || {
        // Keep the session alive for the entire duration of the thread.
        let _sess = send_session;
        let mut ch = send_channel.0;

        let mut buf = vec![0u8; 4096];

        loop {
            // --- Read outgoing data from the remote shell ---
            match ch.read(&mut buf) {
                Ok(0) => {
                    // EOF
                    break;
                }
                Ok(n) => {
                    let payload: Vec<u8> = buf[..n].to_vec();
                    let _ = app.emit(&format!("terminal_data:{}", tid), payload);
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // No data yet — fall through to process commands.
                }
                Err(_) => break,
            }

            // --- Process incoming commands (write / resize / close) ---
            loop {
                match rx.try_recv() {
                    Ok(TerminalCommand::Data(data)) => {
                        let mut written = 0;
                        while written < data.len() {
                            match ch.write(&data[written..]) {
                                Ok(n) => written += n,
                                Err(ref e)
                                    if e.kind() == std::io::ErrorKind::WouldBlock =>
                                {
                                    thread::sleep(Duration::from_millis(1));
                                }
                                Err(_) => break,
                            }
                        }
                    }
                    Ok(TerminalCommand::Resize(cols, rows)) => {
                        let _ = ch.request_pty_size(cols, rows, None, None);
                    }
                    Ok(TerminalCommand::Close) => {
                        let _ = app.emit(&format!("terminal_closed:{}", tid), ());
                        return;
                    }
                    Err(mpsc::TryRecvError::Empty) => break,
                    Err(mpsc::TryRecvError::Disconnected) => return,
                }
            }

            if ch.eof() {
                break;
            }

            thread::sleep(Duration::from_millis(10));
        }

        let _ = app.emit(&format!("terminal_closed:{}", tid), ());
    });

    Ok(())
}

#[tauri::command]
pub async fn terminal_write(
    terminal_id: String,
    data: Vec<u8>,
    terminals: State<'_, Mutex<TerminalManager>>,
) -> Result<(), String> {
    let manager = terminals.lock().unwrap();
    if let Some(handle) = manager.get(&terminal_id) {
        handle
            .sender
            .send(TerminalCommand::Data(data))
            .map_err(|_| "Terminal session closed".to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn terminal_resize(
    terminal_id: String,
    cols: u32,
    rows: u32,
    terminals: State<'_, Mutex<TerminalManager>>,
) -> Result<(), String> {
    let manager = terminals.lock().unwrap();
    if let Some(handle) = manager.get(&terminal_id) {
        handle
            .sender
            .send(TerminalCommand::Resize(cols, rows))
            .map_err(|_| "Terminal session closed".to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn terminal_close(
    terminal_id: String,
    terminals: State<'_, Mutex<TerminalManager>>,
) -> Result<(), String> {
    let mut manager = terminals.lock().unwrap();
    if let Some(handle) = manager.remove(&terminal_id) {
        let _ = handle.sender.send(TerminalCommand::Close);
    }
    Ok(())
}

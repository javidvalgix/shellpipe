use crate::types::*;
use std::io::Read;
use std::sync::Mutex;
use tauri::State;

type ConnectionManagerState = Mutex<ConnectionManager>;

#[tauri::command]
pub async fn fetch_storage_info(
    connection_id: String,
    connections: State<'_, ConnectionManagerState>,
) -> Result<StorageInfo, String> {
    let conn_manager = connections.lock().unwrap();
    let session = conn_manager
        .get(&connection_id)
        .ok_or("Connection not found")?
        .clone();

    // Run `df -k /` on the remote host and parse the output.
    // Output format (POSIX):
    //   Filesystem     1K-blocks      Used Available Use% Mounted on
    //   /dev/sda1       51473388   8201244  40659300  17% /
    let mut channel = session
        .channel_session()
        .map_err(|e| format!("Failed to open channel: {}", e))?;

    channel
        .exec("df -Pk /")
        .map_err(|e| format!("Failed to exec df: {}", e))?;

    let mut output = String::new();
    channel
        .read_to_string(&mut output)
        .map_err(|e| format!("Failed to read df output: {}", e))?;

    channel.wait_close().ok();

    // Parse the second data line (skip the header)
    let data_line = output
        .lines()
        .nth(1)
        .ok_or("Unexpected df output: no data line")?;

    let cols: Vec<&str> = data_line.split_whitespace().collect();
    // POSIX columns: Filesystem, 1K-blocks, Used, Available, Use%, Mounted
    if cols.len() < 4 {
        return Err(format!("Unexpected df output format: {}", data_line));
    }

    let total_kb: u64 = cols[1]
        .parse()
        .map_err(|_| format!("Cannot parse total blocks: {}", cols[1]))?;
    let used_kb: u64 = cols[2]
        .parse()
        .map_err(|_| format!("Cannot parse used blocks: {}", cols[2]))?;

    Ok(StorageInfo {
        total_space: total_kb * 1024,
        used_space: used_kb * 1024,
    })
}

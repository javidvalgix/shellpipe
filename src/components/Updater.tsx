import { useState, useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { invoke } from "@tauri-apps/api/core";
import "./updater.css";

export default function Updater() {
  const [status, setStatus] = useState("Checking for updates...");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await check();
        if (update) {
          setStatus(`Updating to ${update.version}...`);
          setIsUpdating(true);

          let downloaded = 0;
          let contentLength = 0;

          await update.downloadAndInstall((event) => {
            switch (event.event) {
              case "Started":
                contentLength = event.data.contentLength || 0;
                break;
              case "Progress":
                downloaded += event.data.chunkLength;
                if (contentLength > 0) {
                  const pct = Math.round((downloaded / contentLength) * 100);
                  setStatus(`Updating to ${update.version}... ${pct}%`);
                }
                break;
              case "Finished":
                setStatus("Update installed. Restarting...");
                break;
            }
          });

          await invoke("restart_app");
        } else {
          setStatus("Up to date!");
          setTimeout(async () => {
            await invoke("show_main_window");
          }, 800);
        }
      } catch (error) {
        console.error("Update check failed:", error);
        setStatus("Starting...");
        setTimeout(async () => {
          await invoke("show_main_window");
        }, 1200);
      }
    }

    checkForUpdates();
  }, []);

  return (
    <div className="updater-container">
      <div
        className="updater-spinner"
        style={{ borderLeftColor: isUpdating ? "#4dff9d" : "#f74a4a" }}
      />
      <h2 className="updater-title">Shellpipe</h2>
      <p className="updater-status">{status}</p>
    </div>
  );
}

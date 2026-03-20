import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Maximize2 } from "lucide-react";
import ProcessPanel from "@/components/process-panel";
import { SettingsDialog } from "@/dialogs/settings.dialog";
import ShellpipeIcon from "@/assets/shellpipe-icon.png";

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 left-0 w-full h-8 flex items-center justify-between z-50 select-none bg-background border-border"
    >
      <span
        data-tauri-drag-region
        className="flex items-center gap-2 pl-3 text-sm font-semibold text-foreground pointer-events-none"
      >
      <img src={ShellpipeIcon} alt="Shellpipe Icon" className="h-6 w-6" />
      Shellpipe
    </span>

      <div className="flex h-full items-center">
        <div className="flex items-center px-1 gap-0.5 mt-0.5">
          <ProcessPanel />
          <SettingsDialog dialogOpen={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={() => appWindow.minimize()}
          className="flex items-center justify-center w-11 h-full hover:bg-accent transition-colors text-foreground"
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="flex items-center justify-center w-11 h-full hover:bg-accent transition-colors text-foreground"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
        </button>
        <button
          onClick={() => appWindow.close()}
          className="flex items-center justify-center w-11 h-full hover:bg-destructive hover:text-destructive-foreground transition-colors text-foreground"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

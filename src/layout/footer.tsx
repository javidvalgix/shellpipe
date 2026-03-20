import { Button } from "@/components/ui/button";
import SessionSelectionMenu from "@/dialogs/session-selection.menu";
import useConfigStore from "@/stores/config.store";
import useSessionStore from "@/stores/session.store";
import useTabStore from "@/stores/tab.store";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface StorageInfo {
    total_space: number;
    used_space: number;
}

function formatBytes(bytes: number): string {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    return `${(bytes / 1e3).toFixed(1)} KB`;
}

export default function Footer() {
    // State
    const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

    // Store hooks
    const activeTabId = useTabStore((state) => state.activeTabId);
    const activeTab = useTabStore((state) => state.getTabById(activeTabId));
    const activeTabSession = useSessionStore((state) => state.getSessionById(activeTab?.session?.id));
    const getConnectionId = useSessionStore((state) => state.getConnectionId);
    const listViewSize = useConfigStore((state) => state.listViewSize);
    const setListViewSize = useConfigStore((state) => state.setListViewSize);

    // Fetch storage info when session connects
    useEffect(() => {
        if (!activeTabSession?.id || activeTabSession.status !== "connected") {
            setStorageInfo(null);
            return;
        }
        const connectionId = getConnectionId(activeTabSession.id);
        if (!connectionId) return;

        invoke<StorageInfo>("fetch_storage_info", { connectionId })
            .then(setStorageInfo)
            .catch(() => setStorageInfo(null));
    }, [activeTabSession?.id, activeTabSession?.status, getConnectionId]);

    // Render
    return (
        <footer className="h-12 border-t bg-background flex items-center px-2 text-xs text-muted-foreground rounded-b-xl">
            {/* Session */}
            {activeTab && (
                <SessionSelectionMenu
                    showPanel={sessionMenuOpen}
                    setShowPanel={setSessionMenuOpen}
                    trigger={
                        <button
                            className="text-muted-foreground text-xs bg-background h-6 pl-2 pr-1.5 rounded flex items-center justify-center border hover:bg-muted/20 mr-4"
                        >
                            {activeTabSession?.name ?? "No Session"} <span className={
                                "w-1 h-1 rounded-full bg-grey-500 ml-2 mt-[2px]"
                                + (activeTabSession?.status === 'connected' ? " bg-green-500" : activeTabSession?.status === 'disconnected' ? " bg-red-500" : " bg-yellow-500")
                            } />
                        </button>
                    }
                />
            )}

            {/* Selection */}
            {activeTab && (activeTab.selectedFiles?.length || 0) > 0 && (
                <span className="mr-4">
                    Selected: {activeTab.selectedFiles.length}
                </span>
            )}


            {/* File Details */}
            {activeTab && activeTab.files && (
                <span>
                    Total Files: {activeTab.files?.length || 0}
                </span>
            )}

            {/* Storage Usage */}
            {storageInfo && activeTab?.type !== "terminal" && (
                <span className="ml-4">
                    Usage: {formatBytes(storageInfo.used_space)} of {formatBytes(storageInfo.total_space)}
                </span>
            )}

            {activeTab?.type !== "terminal" && (
                <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => setListViewSize(listViewSize === 'compact' ? 'comfortable' : 'compact')}
                >
                    {listViewSize === 'compact' ? 'Compact' : 'Comfortable'}
                </Button>
            )}
        </footer>
    );
}
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu";
import useSessionStore from "@/stores/session.store";
import useTabStore from "@/stores/tab.store";
import { FileItem } from "@/types/FileItem";
import { Download, FormInput, Info, Pencil, Rows3, Scissors, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import ListViewCompact from "./list-view/list-view-compact";
import useConfigStore from "@/stores/config.store";
import ListViewComfortable from "./list-view/list-view-comfortable";
import { fileNameWithoutExtension, getIconForFileType } from "@/utils/file.util";
import EditFileDialog, { isSupportedTextFile } from "@/dialogs/edit-file.dialog";
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type Props = {
    tabId: string;
    onDelete: () => void;
    onFileInfo: (file: FileItem) => void;
    onRenameFile: (file: FileItem) => void;
    onCopy: () => void;
    onCut: () => void;
}

export default function ListView({ tabId, onDelete, onFileInfo, onRenameFile, onCut }: Props) {
    // Store hooks
    const downloadsPath = useConfigStore((state) => state.downloadsPath);
    const tab = useTabStore((state) => state.getTabById(tabId));
    const tabSession = useSessionStore((state) => state.getSessionById(tab?.session?.id));
    const navigateToPath = useTabStore((state) => state.navigateToPath);
    const selectFile = useTabStore((state) => state.selectFile);
    const addFileToSelection = useTabStore((state) => state.addFileToSelection);
    const removeFileFromSelection = useTabStore((state) => state.removeFileFromSelection);
    const addFilesToSelection = useTabStore((state) => state.addFilesToSelection);
    const clearSelection = useTabStore((state) => state.clearSelection);
    const downloadFile = useSessionStore((state) => state.downloadFile);
    const listViewSize = useConfigStore((state) => state.listViewSize);
    const getConnectionId = useSessionStore((state) => state.getConnectionId);

    // Drag & drop state
    const [draggingPaths, setDraggingPaths] = useState<string[]>([]);
    const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
    const [isExternalDragOver, setIsExternalDragOver] = useState(false);

    // Edit dialog state
    const [editFile, setEditFile] = useState<FileItem | null>(null);
    // Keep a ref so the Tauri event handler always sees the latest drop target
    const dropTargetRef = useRef<string | null>(null);
    useEffect(() => { dropTargetRef.current = dropTargetPath; }, [dropTargetPath]);

    useEffect(() => {
        // Tauri intercepts OS-level file drops; listen for the Tauri event instead
        const unlistenDrop = listen<{ paths: string[] }>(
            "tauri://drag-drop",
            async (event) => {
                const paths = event.payload.paths;
                if (!paths?.length) return;

                const currentTab = useTabStore.getState().getTabById(tabId);
                const sessionId = currentTab?.session?.id;
                if (!sessionId) return;

                const connectionId = useSessionStore.getState().getConnectionId(sessionId);
                if (!connectionId) return;

                const targetPath = dropTargetRef.current ?? currentTab?.filePath ?? "/";
                setIsExternalDragOver(false);
                setDropTargetPath(null);

                const failures: string[] = [];
                for (const localPath of paths) {
                    const name = localPath.replace(/\\/g, "/").split("/").pop() ?? "";
                    if (!name) continue;
                    const remote = (targetPath.endsWith("/") ? targetPath : targetPath + "/") + name;
                    try {
                        await invoke("upload_file", { connectionId, localPath, remotePath: remote });
                    } catch (err) {
                        failures.push(name);
                        console.error("upload_file failed:", err);
                    }
                }

                if (failures.length > 0) {
                    toast.error(`Failed to upload: ${failures.join(", ")}`);
                } else {
                    toast.success(`Uploaded ${paths.length} file${paths.length > 1 ? "s" : ""}`);
                }

                const refreshPath = useTabStore.getState().getTabById(tabId)?.filePath ?? "/";
                navigateToPath(tabId, sessionId, refreshPath);
            }
        );

        const unlistenOver = listen("tauri://drag-over", () => setIsExternalDragOver(true));
        const unlistenLeave = listen("tauri://drag-leave", () => {
            setIsExternalDragOver(false);
            setDropTargetPath(null);
        });

        return () => {
            unlistenDrop.then(fn => fn());
            unlistenOver.then(fn => fn());
            unlistenLeave.then(fn => fn());
        };
    }, [tabId]);

    const handleDragStart = (e: React.DragEvent, file: FileItem) => {
        // If the dragged file is already part of the selection, drag all selected files
        const paths = tab?.selectedFiles.includes(file.path)
            ? tab.selectedFiles
            : [file.path];
        setDraggingPaths(paths);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", paths.join("\n"));
    };

    const handleDragEnd = () => {
        setDraggingPaths([]);
        setDropTargetPath(null);
    };

    const handleDragOver = (e: React.DragEvent, file: FileItem) => {
        // For OS drops: just update visual highlight (actual drop comes via Tauri event)
        if (e.dataTransfer.types.includes("Files")) {
            if (file.is_directory && file.name !== "..") {
                setDropTargetPath(file.path);
            }
            return;
        }
        // Internal drag: only allow on directories
        if (!file.is_directory || file.name === "..") return;
        if (draggingPaths.includes(file.path)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropTargetPath(file.path);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropTargetPath(null);
        }
    };

    const handleDrop = async (e: React.DragEvent, targetDir: FileItem) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent container from double-handling
        setDropTargetPath(null);
        setDraggingPaths([]);
        setIsExternalDragOver(false);

        if (!targetDir.is_directory || targetDir.name === "..") return;
        if (!tab?.session?.id) return;

        const connectionId = getConnectionId(tab.session.id);
        if (!connectionId) return;

        // Internal SFTP move
        const pathsToMove = draggingPaths.length > 0
            ? draggingPaths
            : e.dataTransfer.getData("text/plain").split("\n").filter(Boolean);

        const failures: string[] = [];
        for (const src of pathsToMove) {
            const name = src.split("/").pop() ?? "";
            const dest = targetDir.path.endsWith("/")
                ? `${targetDir.path}${name}`
                : `${targetDir.path}/${name}`;
            if (src === dest) continue;
            try {
                await invoke("move_item", { connectionId, sourcePath: src, destPath: dest });
            } catch (err) {
                failures.push(name);
                console.error("move_item failed:", err);
            }
        }

        if (failures.length > 0) {
            toast.error(`Failed to move: ${failures.join(", ")}`);
        } else {
            toast.success(`Moved ${pathsToMove.length} item${pathsToMove.length > 1 ? "s" : ""} to ${targetDir.name}`);
        }
        navigateToPath(tabId, tab.session.id, tab.filePath ?? "/");
    };

    // Handlers
    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>, file: FileItem) => {
        e.stopPropagation();
        e.preventDefault();

        // If multiple files are selected, prevent navigation
        if ((tab?.selectedFiles?.length ?? 0) > 1) {
            return;
        }

        if (file.is_directory) {
            navigateToPath(tabId, tabSession?.id, file.path);
            return;
        }

        // Open editor for supported text files
        if (isSupportedTextFile(file.name)) {
            setEditFile(file);
            return;
        }

        toast.error("Cannot open binary files.");
    }

    const handleClick = (e: React.MouseEvent<HTMLDivElement>, filePath: string) => {
        e.stopPropagation();
        e.preventDefault();

        if (!tab) return;

        // If holding Ctrl or Cmd, toggle selection
        if (e.ctrlKey || e.metaKey) {
            // If the file is already selected, remove it from selection
            if (tab.selectedFiles.includes(filePath)) {
                removeFileFromSelection(tab.id, filePath);
                return;
            }

            addFileToSelection(tab.id, filePath);
            return;
        }

        // If holder Shift, select range of files
        if (e.shiftKey && tab.files) {
            const lastSelectedFile = tab.selectedFiles[tab.selectedFiles.length - 1];
            const lastSelectedIndex = tab.files.findIndex(file => file.path === lastSelectedFile);
            const currentFileIndex = tab.files.findIndex(file => file.path === filePath);

            if (lastSelectedIndex !== -1 && currentFileIndex !== -1) {
                const startIndex = Math.min(lastSelectedIndex, currentFileIndex);
                const endIndex = Math.max(lastSelectedIndex, currentFileIndex);
                const filesToSelect = tab.files.slice(startIndex, endIndex + 1).map(file => file.path);
                addFilesToSelection(tab.id, filesToSelect);
            }
            return;
        }

        // If it's the only file selected, clear selection
        if (tab.selectedFiles.length === 1 && tab.selectedFiles[0] === filePath) {
            clearSelection(tab.id);
            return;
        }

        clearSelection(tab.id);
        selectFile(tab.id, filePath);
    }

    const handleDownload = async () => {
        if (!tab?.session || tabSession?.status !== 'connected') {
            toast.error("Session is not connected");
            return;
        }

        if (!tab || tab.selectedFiles.length === 0) {
            toast.error("No files selected for download");
            return;
        }

        if (tab.selectedFiles.length > 1) {
            toast.error("Please select only one file to download");
            return;
        }

        const filePath = tab.selectedFiles[0];
        const file = tab.files?.find(f => f.path === filePath);

        if (!file) {
            toast.error("Selected file not found");
            return;
        }

        if (file.is_directory) {
            toast.error("Cannot download directories. Please select a file.");
            return;
        }

        // Fetch `Downloads` directory path from process store
        if (!downloadsPath || downloadsPath === "") {
            // setDownloadsSetDialog(true);
            // TODO:: Show a dialog to set the Downloads directory
            toast.error("Please set the Downloads directory in settings");
            return;
        }

        try {
            // Start downloading
            downloadFile(tab.session.id, file.path, downloadsPath + "/" + file.name);
            toast.success("File download queued");
        } catch (error) {
            console.error("Error downloading file:", error);
            toast.error("Failed to download file");
        }
    }

    // Render
    return (
        <div
            className={"flex flex-col relative h-full" + (isExternalDragOver && !dropTargetPath ? " ring-2 ring-inset ring-blue-400 rounded" : "")}
            onClick={() => {
                console.log("ListView clicked, clearing selection");
                clearSelection(tabId);
            }}
        >
            {/* Header Row */}
            <div className="flex items-center px-2 py-3 bg-muted/50 text-muted-foreground text-xs">
                <span className="flex-1">File Name</span>
                <span className="w-24 text-right">Size</span>
                <span className="w-32 text-right mr-4">Last Modified</span>
            </div>

            <div className="flex-1 overflow-auto">
                {/* Files Row */}
                {tab?.files?.map(file => (
                    <ContextMenu key={file.path} modal={false}>
                        <ContextMenuTrigger onContextMenu={() => {
                            // If multiple files are selected, show context menu for all
                            if (tab?.selectedFiles?.length > 1) {
                                return;
                            }

                            selectFile(tab.id, file.path);
                        }}>
                            <div
                                className={
                                    "border-b "
                                    + (listViewSize === "compact" ? "p-0" : "p-1")
                                    + (dropTargetPath === file.path ? " ring-2 ring-blue-400 bg-blue-500/10 rounded" : "")
                                    + (draggingPaths.includes(file.path) ? " opacity-40" : "")
                                }
                                onClick={(e) => handleClick(e, file.path)}
                                onDoubleClick={(e) => handleDoubleClick(e, file)}
                                draggable
                                onDragStart={(e) => handleDragStart(e, file)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, file)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, file)}
                            >
                                {listViewSize === "compact" ? (
                                    <ListViewCompact
                                        file={file}
                                        onToggleSelection={(file, checked) => {
                                            if (checked) {
                                                addFileToSelection(tab.id, file.path);
                                            } else {
                                                removeFileFromSelection(tab.id, file.path);
                                            }
                                        }}
                                    />
                                ) : (
                                    <ListViewComfortable file={file} />
                                )}
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-52">
                            <ContextMenuGroup>
                                {tab?.selectedFiles?.length <= 1 ? (
                                    <div className="flex flex-row justify-start items-center gap-1 p-1">
                                        <span className="size-[26px] flex items-center justify-center">
                                            {file.is_directory ? (
                                                file.name === '..' ? (
                                                    <img src={getIconForFileType(file.name, true)} alt="Folder Icon" className="inline w-6 h-6" />
                                                ) : (
                                                    <img src={getIconForFileType(file.name, true)} alt="Folder Icon" className="inline w-6 h-6" />
                                                )
                                            ) : (
                                                <img src={getIconForFileType(file.name)} alt="File Icon" className="inline w-6 h-6" />
                                            )}
                                        </span>
                                        <span className="text-sm">{fileNameWithoutExtension(file.name)}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-row justify-start items-center gap-1 p-2 text-sm">
                                        {tab.selectedFiles.length} files selected
                                    </div>
                                )}
                            </ContextMenuGroup>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                inset
                                variant="default"
                                onClick={() => {
                                    onFileInfo(file);
                                }}
                                disabled={tab.selectedFiles.length > 1}
                            >
                                <Info size={16} aria-hidden="true" />
                                <span>Info</span>
                                <ContextMenuShortcut>⌘I</ContextMenuShortcut>
                            </ContextMenuItem>
                            <ContextMenuItem
                                inset
                                variant="default"
                                onClick={handleDownload}
                                disabled={file.is_directory || tab.selectedFiles.length > 1}
                            >
                                <Download size={16} aria-hidden="true" />
                                <span>Download</span>
                                <ContextMenuShortcut>⌘D</ContextMenuShortcut>
                            </ContextMenuItem>
                            <ContextMenuItem
                                inset
                                variant="default"
                                onClick={() => setEditFile(file)}
                                disabled={file.is_directory || !isSupportedTextFile(file.name) || tab.selectedFiles.length > 1}
                            >
                                <Pencil size={16} aria-hidden="true" />
                                <span>Edit</span>
                                <ContextMenuShortcut>⌘E</ContextMenuShortcut>
                            </ContextMenuItem>
                            <ContextMenuItem
                                inset
                                variant="default"
                                onClick={() => {
                                    onRenameFile(file);
                                }}
                                disabled={tab.selectedFiles.length > 1}
                            >
                                <FormInput size={16} aria-hidden="true" />
                                <span>Rename</span>
                                <ContextMenuShortcut>⌘R</ContextMenuShortcut>
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            {/* <ContextMenuItem
                                inset
                                variant="default"
                                onClick={() => {
                                    onCopy();
                                }}
                            >
                                <Copy size={16} aria-hidden="true" />
                                <span>Copy</span>
                                <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                            </ContextMenuItem> */}
                            <ContextMenuItem
                                inset
                                variant="default"
                                onClick={() => {
                                    onCut();
                                }}
                            >
                                <Scissors size={16} aria-hidden="true" />
                                <span>Cut</span>
                                <ContextMenuShortcut>⌘X</ContextMenuShortcut>
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                inset
                                variant="default"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onDelete();
                                }}
                            >
                                <TrashIcon size={16} aria-hidden="true" />
                                <span>Delete</span>
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                ))}

                {/* No Files */}
                {tab?.files?.length === 0 && (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                        <Rows3 size={24} className="text-muted-foreground/50 size-12" />
                        <span className="text-muted-foreground mt-2 text-lg">
                            No files found
                        </span>
                    </div>
                )}
            </div>


            {/* Session Connecting Overlay */}
            {(tabSession?.status !== 'connected' || !tab?.session || tab?.isLoading) && (
                <div className="absolute w-full h-full bg-background/90 flex items-center justify-center z-20" />
            )}

            {/* File Editor Dialog */}
            <EditFileDialog
                open={!!editFile}
                onOpenChange={(open) => { if (!open) setEditFile(null); }}
                file={editFile}
                tabId={tabId}
            />
        </div>
    );

}
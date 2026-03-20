import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import useSessionStore from "@/stores/session.store";
import useTabStore from "@/stores/tab.store";
import { FileItem } from "@/types/FileItem";
import { invoke } from "@tauri-apps/api/core";
import Editor from "@monaco-editor/react";
import { Loader2, Save, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Map file extensions to Monaco language IDs
function getLanguageForFile(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
        js: "javascript", mjs: "javascript", cjs: "javascript",
        jsx: "javascript",
        ts: "typescript", tsx: "typescript",
        py: "python",
        rb: "ruby",
        php: "php",
        java: "java",
        c: "c", h: "c",
        cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp",
        cs: "csharp",
        go: "go",
        rs: "rust",
        sh: "shell", bash: "shell", zsh: "shell", fish: "shell",
        html: "html", htm: "html",
        xml: "xml", svg: "xml", plist: "xml",
        css: "css",
        scss: "scss",
        less: "less",
        json: "json", jsonc: "json",
        yaml: "yaml", yml: "yaml",
        toml: "ini",
        ini: "ini", cfg: "ini", conf: "ini",
        sql: "sql",
        md: "markdown", mdx: "markdown",
        dockerfile: "dockerfile",
        env: "shell",
        graphql: "graphql", gql: "graphql",
        lua: "lua",
        r: "r",
        swift: "swift",
        kt: "kotlin", kts: "kotlin",
        dart: "dart",
        vue: "html",
        tf: "hcl",
        csv: "plaintext",
        txt: "plaintext", log: "plaintext",
    };
    // Handle extensionless files like "Dockerfile", ".gitignore", ".env"
    const nameLower = filename.toLowerCase();
    if (nameLower === "dockerfile") return "dockerfile";
    if (nameLower.startsWith(".env")) return "shell";
    if (nameLower === ".gitignore" || nameLower === ".gitattributes") return "shell";
    return map[ext] ?? "plaintext";
}

// Files that are clearly binary — block opening
const BINARY_EXTENSIONS = new Set([
    "png","jpg","jpeg","gif","bmp","webp","ico","tiff","svg",
    "mp3","mp4","wav","ogg","flac","aac","mkv","avi","mov",
    "zip","tar","gz","bz2","xz","7z","rar",
    "pdf","doc","docx","xls","xlsx","ppt","pptx",
    "exe","bin","dll","so","dylib","o","class","wasm",
    "db","sqlite","sqlite3",
]);

export function isSupportedTextFile(filename: string): boolean {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    return !BINARY_EXTENSIONS.has(ext);
}

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: FileItem | null;
    tabId: string;
    isNew?: boolean;
    onSaved?: () => void;
}

export default function EditFileDialog({ open, onOpenChange, file, tabId, isNew = false, onSaved }: Props) {
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editableName, setEditableName] = useState("");
    const editorRef = useRef<unknown>(null);

    const activeTab = useTabStore((state) => state.getTabById(tabId));
    const getConnectionId = useSessionStore((state) => state.getConnectionId);

    const connectionId = activeTab?.session?.id
        ? getConnectionId(activeTab.session.id)
        : null;

    useEffect(() => {
        if (!open || !file) return;
        if (isNew) {
            setContent("");
            setEditableName(file.name);
            return;
        }
        if (!connectionId) return;
        setLoading(true);
        setContent("");

        invoke<string>("read_file_content", { connectionId, path: file.path })
            .then((text) => setContent(text))
            .catch((err) => {
                toast.error(`Cannot open file: ${err}`);
                onOpenChange(false);
            })
            .finally(() => setLoading(false));
    }, [open, file?.path, connectionId, isNew]);

    const handleSave = useCallback(async () => {
        if (!file || !connectionId) return;
        setSaving(true);
        try {
            const savePath = isNew
                ? file.path.substring(0, file.path.lastIndexOf("/") + 1) + editableName
                : file.path;
            await invoke("write_file_content", { connectionId, path: savePath, content });
            toast.success(isNew ? `${editableName} created` : `${file.name} saved`);
            onSaved?.();
            onOpenChange(false);
        } catch (err) {
            toast.error(`Failed to save: ${err}`);
        } finally {
            setSaving(false);
        }
    }, [file, connectionId, content, isNew, editableName, onSaved]);
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, handleSave]);

    const language = isNew
        ? getLanguageForFile(editableName || "newfile.txt")
        : file ? getLanguageForFile(file.name) : "plaintext";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="min-w-[95vw] max-w-[95vw] w-[95vw] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden [&>button:last-child]:hidden"
                style={{ maxHeight: "92vh" }}
            >
                <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
                    <DialogTitle className="text-sm font-mono flex items-center gap-2 min-w-0 flex-1">
                        {isNew ? (
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-muted-foreground shrink-0">
                                    {file ? file.path.substring(0, file.path.lastIndexOf("/") + 1) : ""}
                                </span>
                                <Input
                                    className="h-6 text-sm font-mono w-48 px-1 py-0"
                                    value={editableName}
                                    onChange={(e) => setEditableName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                                    autoFocus
                                    placeholder="filename.txt"
                                />
                            </div>
                        ) : (
                            <>
                                {file?.path}
                                <span className="text-xs text-muted-foreground font-sans normal-case">
                                    {language !== "plaintext" ? language : ""}
                                </span>
                            </>
                        )}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving || loading}
                        >
                            {saving ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            Save
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            <X size={14} />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                            <Loader2 className="animate-spin text-muted-foreground" size={28} />
                        </div>
                    )}
                    <Editor
                        height="100%"
                        language={language}
                        value={content}
                        theme="vs-dark"
                        onMount={(editor) => { editorRef.current = editor; }}
                        onChange={(val) => setContent(val ?? "")}
                        options={{
                            fontSize: 13,
                            minimap: { enabled: true },
                            scrollBeyondLastLine: false,
                            wordWrap: "off",
                            tabSize: 4,
                            renderLineHighlight: "line",
                            smoothScrolling: true,
                            cursorSmoothCaretAnimation: "on",
                            padding: { top: 8, bottom: 8 },
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

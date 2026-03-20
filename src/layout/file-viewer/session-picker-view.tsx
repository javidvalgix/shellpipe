import React from "react";
import ISession from "@/models/session.model";
import useSessionStore from "@/stores/session.store";
import useTabStore from "@/stores/tab.store";
import useWorkspaceStore from "@/stores/workspace.store";
import { Loader2, Server } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

type Props = {
    tabId: string;
    /** sftp: connect session + navigate. terminal: just assign session, xterm handles SSH. */
    mode?: "sftp" | "terminal";
};

export default function SessionPickerView({ tabId, mode = "sftp" }: Props) {
    const sessions = useSessionStore((state) => state.sessions);
    const workspaces = useWorkspaceStore((state) => state.workspaces);
    const connectToSession = useSessionStore((state) => state.connectToSession);
    const updateTab = useTabStore((state) => state.updateTab);
    const navigateToPath = useTabStore((state) => state.navigateToPath);

    const [connecting, setConnecting] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState("");

    const filtered = sessions.filter(
        (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.host.toLowerCase().includes(search.toLowerCase())
    );

    // Group sessions: workspaced ones under their workspace, standalone at top
    const standalones = filtered.filter((s) => !s.workspaceId);
    const grouped = workspaces
        .map((ws) => ({
            workspace: ws,
            sessions: filtered.filter((s) => s.workspaceId === ws.id),
        }))
        .filter((g) => g.sessions.length > 0);

    const handleSelect = async (session: ISession) => {
        if (connecting) return;
        setConnecting(session.id);

        if (mode === "terminal") {
            // For terminal tabs: just assign the session; TerminalView handles SSH itself
            updateTab(tabId, { session, title: `Terminal: ${session.name}` });
            setConnecting(null);
            return;
        }

        // SFTP mode: connect session then navigate
        updateTab(tabId, { session, title: session.name });

        if (session.status !== "connected") {
            const ok = await connectToSession(session.id);
            if (!ok) {
                toast.error(`Failed to connect to ${session.name}`);
                // Revert
                updateTab(tabId, { session: undefined, title: "New Tab" });
                setConnecting(null);
                return;
            }
        }

        navigateToPath(tabId, session.id, "/");
        setConnecting(null);
    };

    const statusDot = (s: ISession) => {
        if (s.status === "connected")
            return <span className="size-2 rounded-full bg-green-500 shrink-0" />;
        if (s.status === "connecting")
            return <Loader2 size={8} className="animate-spin text-yellow-500 shrink-0" />;
        return <span className="size-2 rounded-full bg-muted-foreground/30 shrink-0" />;
    };

    const SessionRow = ({ session }: { session: ISession }) => (
        <button
            key={session.id}
            onClick={() => handleSelect(session)}
            disabled={!!connecting}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/60 text-left transition-colors disabled:opacity-50 cursor-pointer"
        >
            {connecting === session.id ? (
                <Loader2 size={13} className="animate-spin text-muted-foreground shrink-0" />
            ) : (
                <Server size={13} className="text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{session.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                    {session.username}@{session.host}:{session.port}
                </p>
            </div>
            {statusDot(session)}
        </button>
    );

    return (
        <div className="relative flex h-full w-full overflow-hidden">
            {/* Background hint */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <p className="text-muted-foreground/30 text-sm font-medium">
                    {mode === "terminal" ? "Select a session to open a terminal" : "Select a session to browse"}
                </p>
            </div>

            {/* Session picker panel – bottom left */}
            <div className="absolute bottom-4 left-4 w-72 max-h-80 bg-background border rounded-xl shadow-lg flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-3 pt-3 pb-2 border-b shrink-0">
                    <p className="text-xs font-semibold mb-2">Choose a session</p>
                    <Input
                        placeholder="Search sessions…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                    />
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                    {sessions.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center py-4">
                            No sessions yet
                        </p>
                    )}

                    {filtered.length === 0 && sessions.length > 0 && (
                        <p className="text-[11px] text-muted-foreground text-center py-4">
                            No matches
                        </p>
                    )}

                    {/* Standalone sessions */}
                    {standalones.map((s) => (
                        <SessionRow key={s.id} session={s} />
                    ))}

                    {/* Workspace groups */}
                    {grouped.map(({ workspace, sessions: wsSessions }) => (
                        <div key={workspace.id}>
                            <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                                {workspace.name}
                            </p>
                            {wsSessions.map((s) => (
                                <SessionRow key={s.id} session={s} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

import ISession from "@/models/session.model";
import useSessionStore from "@/stores/session.store";
import useTabStore from "@/stores/tab.store";
import useWorkspaceStore from "@/stores/workspace.store";
import { Loader2, Server, SquareTerminal, Trash, Pencil, FolderOpen, FolderInput, FolderMinus } from "lucide-react"
import { toast } from "sonner";
import DeleteSessionDialog from "@/dialogs/delete-session.dialog";
import React from "react";
import SessionEditDialog from "@/dialogs/session-edit.dialog";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

type Props = {
    session: ISession;
    dragHandle?: React.ReactNode;
    compact?: boolean;
}

export default function SessionItem({ session, dragHandle, compact }: Props) {

    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [editDialogOpen, setEditDialogOpen] = React.useState(false);
    const triggerRef = React.useRef<HTMLDivElement>(null);

    const connectToSession = useSessionStore(state => state.connectToSession);
    const moveSessionToWorkspace = useSessionStore(state => state.moveSessionToWorkspace);
    const createTab = useTabStore(state => state.createTab);
    const createTerminalTab = useTabStore(state => state.createTerminalTab);
    const setActiveTab = useTabStore(state => state.setActiveTab);
    const workspaces = useWorkspaceStore(state => state.workspaces);

    const handleOpenFilesBrowser = async () => {
        const newTabId = createTab(session.id);
        setActiveTab(newTabId);

        if (session.status !== 'connected') {
            const connected = await connectToSession(session.id);
            if (!connected) {
                toast.error(`Failed to connect to ${session.name}`);
                return;
            }
        }

        useTabStore.getState().navigateToPath(newTabId, session.id, "/");
    };

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: e.clientX,
            clientY: e.clientY,
        });
        triggerRef.current?.dispatchEvent(event);
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    {compact ? (
                        <div
                            ref={triggerRef}
                            onClick={handleClick}
                            className="flex items-center gap-1.5 pl-2 pr-2 py-1 rounded cursor-pointer select-none hover:bg-muted/50 transition-colors"
                        >
                            <span className={`size-1.5 rounded-full shrink-0 ${session.status === 'connected' ? 'bg-green-500' : session.status === 'connecting' ? 'bg-yellow-500' : 'bg-muted-foreground/50'}`} />
                            {dragHandle}
                            {session.status === 'connecting' && (
                                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
                            )}
                            <span className="text-xs font-medium truncate flex-1 min-w-0">{session.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate shrink-0 max-w-[90px]">
                                {session.username}@{session.host}
                            </span>
                        </div>
                    ) : (
                        <div
                            ref={triggerRef}
                            onClick={handleClick}
                            className="bg-background relative border px-3 py-2 rounded-md cursor-pointer select-none flex items-center gap-2"
                        >
                            <span className={`size-1.5 rounded-full ${session.status === 'connected' ? 'bg-green-500' : 'bg-red-500'} absolute top-1.5 left-1.5`} />
                            {dragHandle}
                            <div className="flex items-center justify-center bg-muted rounded-full size-8 shrink-0">
                                {session.status === 'connecting' ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-sidebar-secondary-foreground" />
                                ) : (
                                    <Server className="w-3 h-3 text-sidebar-secondary-foreground" />
                                )}
                            </div>
                            <div className="flex flex-1 flex-col leading-none items-start min-w-0">
                                <span className="text-sm truncate w-full">{session.name}</span>
                                <span className="text-xs text-muted-foreground truncate w-full">
                                    {session.username}@{session.host}
                                </span>
                            </div>
                        </div>
                    )}
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                    <ContextMenuItem onClick={handleOpenFilesBrowser}>
                        <FolderOpen size={14} className="mr-2" />
                        Open Files Browser
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={() => {
                            const tabId = createTerminalTab(session.id);
                            setActiveTab(tabId);
                        }}
                    >
                        <SquareTerminal size={14} className="mr-2" />
                        Open Terminal
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => setEditDialogOpen(true)}>
                        <Pencil size={14} className="mr-2" />
                        Edit
                    </ContextMenuItem>
                    {workspaces.length > 0 && (
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <FolderInput size={14} className="mr-2" />
                                Move to Workspace
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-48">
                                {session.workspaceId && (
                                    <ContextMenuItem onClick={() => moveSessionToWorkspace(session.id, undefined)}>
                                        <FolderMinus size={14} className="mr-2" />
                                        Remove from workspace
                                    </ContextMenuItem>
                                )}
                                {workspaces
                                    .filter((w) => w.id !== session.workspaceId)
                                    .map((w) => (
                                        <ContextMenuItem
                                            key={w.id}
                                            onClick={() => moveSessionToWorkspace(session.id, w.id)}
                                        >
                                            {w.name}
                                        </ContextMenuItem>
                                    ))}
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                    >
                        <Trash size={14} className="mr-2" />
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <DeleteSessionDialog
                sessionId={session.id}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            />

            <SessionEditDialog
                dialogOpen={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                session={session}
            />
        </>
    )
}

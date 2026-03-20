import * as React from "react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarRail,
} from "@/components/ui/sidebar"
import useSessionStore from "@/stores/session.store"
import SortableWorkspaceItem from "./sidebar/sortable-workspace-item"
import SortableSessionItem from "./sidebar/sortable-session-item"
import SessionWizardDialog from "@/dialogs/session-wizard.dialog"
import CreateWorkspaceDialog from "@/dialogs/create-workspace.dialog"
import { Accordion } from "./ui/accordion"
import useClipboardStore from "@/stores/clipboard.store"
import useTabStore from "@/stores/tab.store"
import { Button } from "./ui/button"
import { Folder, FolderPlus, GripVertical, Plus, Server } from "lucide-react"
import { getIconForFileType } from "@/utils/file.util"
import useConfigStore from "@/stores/config.store"
import useWorkspaceStore from "@/stores/workspace.store"
import useSidebarStore from "@/stores/sidebar.store"
import ISession from "@/models/session.model"
import IWorkspace from "@/models/workspace.model"
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    // Dialogs
    const [sessionWizardOpen, setSessionWizardOpen] = React.useState(false);
    const [createWorkspaceOpen, setCreateWorkspaceOpen] = React.useState(false);

    // Sessions
    const clipboardItems = useClipboardStore((state) => state.items);
    const activeTab = useTabStore((state) => state.getTabById(state.activeTabId));
    const sessions = useSessionStore((state) => state.sessions);
    const clearSessionClipboard = useClipboardStore((state) => state.clearSession);
    const showClipboard = useConfigStore((state) => state.showClipboard);

    // Workspaces
    const workspaces = useWorkspaceStore((state) => state.workspaces);

    // Unified sidebar order
    const topLevelOrder = useSidebarStore((state) => state.topLevelOrder);
    const setTopLevelOrder = useSidebarStore((state) => state.setTopLevelOrder);

    // Standalone sessions (not in any workspace)
    const standaloneSessions = sessions.filter((s) => !s.workspaceId);

    // Build the unified top-level list from persisted order, appending any
    // items that exist but aren't tracked yet (e.g. data created before this feature)
    const topLevelItems = React.useMemo(() => {
        type Item = { type: "workspace" | "session"; id: string };
        const inOrder: Item[] = topLevelOrder
            .map((id): Item | null => {
                if (workspaces.find((w) => w.id === id)) return { type: "workspace", id };
                if (standaloneSessions.find((s) => s.id === id)) return { type: "session", id };
                return null; // stale ID — deleted item
            })
            .filter((x): x is Item => x !== null);

        const inOrderIds = new Set(inOrder.map((i) => i.id));

        const untracked: Item[] = [
            ...workspaces.filter((w) => !inOrderIds.has(w.id)).map((w) => ({ type: "workspace" as const, id: w.id })),
            ...standaloneSessions.filter((s) => !inOrderIds.has(s.id)).map((s) => ({ type: "session" as const, id: s.id })),
        ];

        return [...inOrder, ...untracked];
    }, [topLevelOrder, workspaces, standaloneSessions]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const [activeId, setActiveId] = React.useState<string | null>(null);
    const activeItem = activeId ? topLevelItems.find((i) => i.id === activeId) ?? null : null;

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const ids = topLevelItems.map((i) => i.id);
        const oldIndex = ids.indexOf(active.id as string);
        const newIndex = ids.indexOf(over.id as string);
        setTopLevelOrder(arrayMove(ids, oldIndex, newIndex));
    };

    // Current session clipboard
    const currentSessionClipboard = clipboardItems.filter(item => item.sessionId === activeTab?.session?.id);

    // Render
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader className="absolute top-0 left-0 z-10 flex flex-row h-[56px] flex items-center justify-between bg-gradient-to-b   from-background via-background to-transparent w-full">
                <div data-tauri-drag-region className="absolute inset-0 z-0" />
                <div className="flex items-center gap-1 relative z-10">
                    <SessionWizardDialog
                        dialogOpen={sessionWizardOpen}
                        onOpenChange={(open) => setSessionWizardOpen(open)}
                        trigger={
                            <Button
                                variant="outline"
                                size="sm"
                            >
                                New Session
                                <Plus />
                            </Button>
                        }
                    />
                    <CreateWorkspaceDialog
                        dialogOpen={createWorkspaceOpen}
                        onOpenChange={setCreateWorkspaceOpen}
                        trigger={
                            <Button
                                variant="outline"
                                size="sm"
                                title="New Workspace"
                            >
                                <FolderPlus />
                                Workspace
                            </Button>
                        }
                    />
                </div>
            </SidebarHeader>
            <SidebarContent className="h-[calc(100vh-56px)] gap-0 w-full">
                <SidebarGroup className={
                    "overflow-y-auto w-full"
                    + (currentSessionClipboard.length > 0 && showClipboard ? " h-[70%] border-b" : " h-[100%]")
                }>
                    <SidebarMenu className="w-full">
                        <div className="h-[56px] w-full block" />

                        {/* Unified top-level list: workspaces and standalone sessions in one DnD context */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={topLevelItems.map((i) => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <Accordion
                                    type="single"
                                    collapsible
                                    className="w-full flex flex-col gap-1 overflow-y-auto"
                                >
                                    {topLevelItems.map((item) =>
                                        item.type === "workspace" ? (
                                            <SortableWorkspaceItem
                                                key={item.id}
                                                workspace={workspaces.find((w) => w.id === item.id)!}
                                                sessions={sessions.filter((s) => s.workspaceId === item.id)}
                                                isBeingDragged={activeId === item.id}
                                            />
                                        ) : (
                                            <SortableSessionItem
                                                key={item.id}
                                                session={sessions.find((s) => s.id === item.id)!}
                                                isBeingDragged={activeId === item.id}
                                            />
                                        )
                                    )}
                                </Accordion>
                            </SortableContext>
                            <DragOverlay dropAnimation={null}>
                                {activeItem?.type === "session" && (
                                    <DragGhostSession session={sessions.find((s) => s.id === activeItem.id)!} />
                                )}
                                {activeItem?.type === "workspace" && (
                                    <DragGhostWorkspace workspace={workspaces.find((w) => w.id === activeItem.id)!} />
                                )}
                            </DragOverlay>
                        </DndContext>

                        {/* No sessions or workspaces */}
                        {sessions.length === 0 && workspaces.length === 0 && (
                            <div className="flex items-center justify-center p-6 text-sm text-muted-foreground text-center border rounded-md">
                                No sessions found, start by creating one.
                            </div>
                        )}
                    </SidebarMenu>
                </SidebarGroup>
                {showClipboard && (
                    <SidebarGroup className={
                        "mt-auto"
                        + (currentSessionClipboard.length > 0 ? " h-[30%] flex" : " h-[0%] hidden")
                    }>
                        <div className="px-2 py-1 rounded-md mb-2 text-xs text-muted-foreground flex flex-row justify-between items-center">
                            <span>Clipboard</span>
                            <Button
                                variant="outline"
                                size="xsm"
                                onClick={() => {
                                    if (activeTab?.session?.id) {
                                        clearSessionClipboard(activeTab?.session?.id)
                                    }
                                }}
                            >
                                Clear
                            </Button>
                        </div>
                        <div className="border rounded-md h-full overflow-y-auto">
                            {currentSessionClipboard.map((item) => (
                                <div key={item.id} className="px-2 py-1 border-b flex flex-row gap-2 items-center justify-start">
                                    <span>
                                        {item.file.is_directory ? (
                                            item.file.name === '..' ? (
                                                <img src={getIconForFileType(item.file.name, true)} alt="Folder Icon" className="inline w-4 h-4" />
                                            ) : (
                                                <img src={getIconForFileType(item.file.name, true)} alt="Folder Icon" className="inline w-4 h-4" />
                                            )
                                        ) : (
                                            <img src={getIconForFileType(item.file.name)} alt="File Icon" className="inline w-4 h-4" />
                                        )}
                                    </span>
                                    <span className="text-xs flex-1">{item.file.name}</span>
                                    <span className="text-xs bg-muted rounded-lg px-2 py-0.5 text-muted-foreground">
                                        {item.status === "pending" ? item.action : item.status}
                                    </span>
                                </div>
                            ))}

                            {/* No Clipboard Items */}
                            {currentSessionClipboard.length === 0 && (
                                <div className="flex items-center justify-center h-full w-full text-sm text-muted-foreground p-6 text-center">
                                    No items in clipboard from this session.
                                </div>
                            )}
                        </div>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}

function DragGhostSession({ session }: { session: ISession }) {
    return (
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 shadow-lg opacity-95 w-full cursor-grabbing">
            <GripVertical size={12} className="text-muted-foreground/40 shrink-0" />
            <div className="flex items-center justify-center bg-muted rounded-full size-8 shrink-0">
                <Server className="w-3 h-3 text-sidebar-secondary-foreground" />
            </div>
            <div className="flex flex-col leading-none items-start ml-1 min-w-0">
                <span className="text-sm truncate">{session?.name}</span>
                <span className="text-xs text-muted-foreground truncate">{session?.username}@{session?.host}</span>
            </div>
        </div>
    );
}

function DragGhostWorkspace({ workspace }: { workspace: IWorkspace }) {
    return (
        <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-2 shadow-lg opacity-95 w-full cursor-grabbing">
            <GripVertical size={12} className="text-muted-foreground/40 shrink-0" />
            <Folder size={14} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{workspace?.name}</span>
        </div>
    );
}

import IWorkspace from "@/models/workspace.model";
import ISession from "@/models/session.model";
import { Folder, FolderOpen, Plus, Trash, Pencil } from "lucide-react";
import { useState } from "react";
import SortableSessionItem from "./sortable-session-item";
import { Button } from "@/components/ui/button";
import DeleteWorkspaceDialog from "@/dialogs/delete-workspace.dialog";
import SessionWizardDialog from "@/dialogs/session-wizard.dialog";
import useWorkspaceStore from "@/stores/workspace.store";
import useSessionStore from "@/stores/session.store";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ChevronRight } from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";

type Props = {
    workspace: IWorkspace;
    sessions: ISession[];
    dragHandle?: React.ReactNode;
};

export default function WorkspaceItem({ workspace, sessions, dragHandle }: Props) {
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [addSessionOpen, setAddSessionOpen] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(workspace.name);

    const updateWorkspace = useWorkspaceStore((state) => state.updateWorkspace);
    const reorderSessions = useSessionStore((state) => state.reorderSessions);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const handleSessionDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleSessionDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = sessions.findIndex((s) => s.id === active.id);
        const newIndex = sessions.findIndex((s) => s.id === over.id);
        const newOrder = arrayMove(sessions, oldIndex, newIndex);
        reorderSessions(newOrder.map((s) => s.id));
    };

    const activeDragSession = activeDragId ? sessions.find((s) => s.id === activeDragId) : undefined;

    const handleRenameCommit = () => {
        const trimmed = renameValue.trim();
        if (trimmed && trimmed !== workspace.name) {
            updateWorkspace(workspace.id, { name: trimmed });
        } else {
            setRenameValue(workspace.name);
        }
        setRenaming(false);
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
                        <div className="flex items-center gap-1 rounded-md border px-2 py-1 bg-background group">
                    {dragHandle}
                    <CollapsibleTrigger asChild>
                        <button className="flex flex-1 items-center gap-2 py-1 text-sm outline-none focus-visible:ring-0 min-w-0">
                            <ChevronRight
                                size={14}
                                className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                            />
                            {open ? (
                                <FolderOpen size={14} className="shrink-0 text-muted-foreground" />
                            ) : (
                                <Folder size={14} className="shrink-0 text-muted-foreground" />
                            )}
                            {renaming ? (
                                <Input
                                    autoFocus
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={handleRenameCommit}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleRenameCommit();
                                        if (e.key === "Escape") {
                                            setRenameValue(workspace.name);
                                            setRenaming(false);
                                        }
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-5 py-0 px-1 text-sm"
                                />
                            ) : (
                                <span className="truncate font-medium">{workspace.name}</span>
                            )}
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                {sessions.length}
                            </span>
                        </button>
                    </CollapsibleTrigger>

                    {/* Action buttons shown on hover */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <SessionWizardDialog
                            dialogOpen={addSessionOpen}
                            onOpenChange={setAddSessionOpen}
                            workspaceId={workspace.id}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Add session to workspace"
                                    onClick={(e) => { e.stopPropagation(); setAddSessionOpen(true); }}
                                >
                                    <Plus size={12} />
                                </Button>
                            }
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Rename workspace"
                            onClick={(e) => {
                                e.stopPropagation();
                                setRenameValue(workspace.name);
                                setRenaming(true);
                                setOpen(true);
                            }}
                        >
                            <Pencil size={12} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:text-destructive"
                            title="Delete workspace"
                            onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                        >
                            <Trash size={12} />
                        </Button>
                    </div>
                </div>

                <CollapsibleContent className="mt-0.5">
                    <div className="relative ml-3 border-l flex flex-col">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                            onDragStart={handleSessionDragStart}
                            onDragEnd={handleSessionDragEnd}
                        >
                            <SortableContext
                                items={sessions.map((s) => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {sessions.map((session) => (
                                    <SortableSessionItem
                                        key={session.id}
                                        session={session}
                                        isBeingDragged={activeDragId === session.id}
                                        compact
                                    />
                                ))}
                            </SortableContext>
                            <DragOverlay dropAnimation={null}>
                                {activeDragSession && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border shadow-md opacity-95 cursor-grabbing text-xs">
                                        <span className={`size-1.5 rounded-full shrink-0 ${activeDragSession.status === 'connected' ? 'bg-green-500' : 'bg-muted-foreground/50'}`} />
                                        <span className="font-medium truncate">{activeDragSession.name}</span>
                                        <span className="text-muted-foreground truncate">{activeDragSession.username}@{activeDragSession.host}</span>
                                    </div>
                                )}
                            </DragOverlay>
                        </DndContext>
                        <button
                            onClick={() => setAddSessionOpen(true)}
                            className="flex items-center gap-2 pl-2 pr-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors w-full text-left"
                        >
                            <Plus size={11} />
                            Add new session
                        </button>
                    </div>
                </CollapsibleContent>
                    </Collapsible>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                    <ContextMenuItem onClick={() => {
                        setRenameValue(workspace.name);
                        setRenaming(true);
                        setOpen(true);
                    }}>
                        <Pencil size={14} className="mr-2" />
                        Rename
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setAddSessionOpen(true)}>
                        <Plus size={14} className="mr-2" />
                        Add New Session
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteOpen(true)}
                    >
                        <Trash size={14} className="mr-2" />
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <DeleteWorkspaceDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                workspaceId={workspace.id}
            />
        </>
    );
}

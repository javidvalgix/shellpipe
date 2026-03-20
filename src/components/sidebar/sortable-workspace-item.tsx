import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import IWorkspace from "@/models/workspace.model";
import ISession from "@/models/session.model";
import WorkspaceItem from "./workspace-item";

type Props = {
    workspace: IWorkspace;
    sessions: ISession[];
    isBeingDragged?: boolean;
};

export default function SortableWorkspaceItem({ workspace, sessions, isBeingDragged }: Props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: workspace.id,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging || isBeingDragged ? 0 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <WorkspaceItem
                workspace={workspace}
                sessions={sessions}
                dragHandle={
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab touch-none px-0.5 py-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors focus:outline-none active:cursor-grabbing shrink-0"
                        tabIndex={-1}
                        aria-label="Drag to reorder"
                    >
                        <GripVertical size={12} />
                    </button>
                }
            />
        </div>
    );
}

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import ISession from "@/models/session.model";
import SessionItem from "./session-item";

type Props = {
    session: ISession;
    isBeingDragged?: boolean;
    compact?: boolean;
};

export default function SortableSessionItem({ session, isBeingDragged, compact }: Props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: session.id,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging || isBeingDragged ? 0 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <SessionItem
                session={session}
                compact={compact}
                dragHandle={
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab touch-none px-0.5 py-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors focus:outline-none active:cursor-grabbing"
                        tabIndex={-1}
                        aria-label="Drag to reorder"
                    >
                        <GripVertical size={compact ? 10 : 12} />
                    </button>
                }
            />
        </div>
    );
}

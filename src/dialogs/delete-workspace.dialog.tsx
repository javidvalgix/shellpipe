import { CircleAlertIcon } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import useWorkspaceStore from "@/stores/workspace.store";
import useSessionStore from "@/stores/session.store";
import { toast } from "sonner";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
};

export default function DeleteWorkspaceDialog({ open, onOpenChange, workspaceId }: Props) {
    const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace);
    const getWorkspaceById = useWorkspaceStore((state) => state.getWorkspaceById);
    const moveSessionToWorkspace = useSessionStore((state) => state.moveSessionToWorkspace);
    const sessions = useSessionStore((state) => state.sessions);

    const workspace = getWorkspaceById(workspaceId);

    const handleDelete = () => {
        // Move all sessions in this workspace to no workspace
        sessions
            .filter((s) => s.workspaceId === workspaceId)
            .forEach((s) => moveSessionToWorkspace(s.id, undefined));

        deleteWorkspace(workspaceId);
        toast.success(`Workspace "${workspace?.name}" deleted. Sessions moved to root.`);
        onOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full border mb-2">
                        <CircleAlertIcon className="opacity-80" size={16} />
                    </div>
                    <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete <strong>{workspace?.name}</strong>? Sessions inside will not
                        be deleted — they will be moved to the root level.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete Workspace
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

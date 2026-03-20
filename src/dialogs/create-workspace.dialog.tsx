import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useWorkspaceStore from "@/stores/workspace.store";
import { FolderPlus } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

type Props = {
    dialogOpen: boolean;
    onOpenChange: (open: boolean) => void;
    trigger: React.ReactNode;
};

export default function CreateWorkspaceDialog({ dialogOpen, onOpenChange, trigger }: Props) {
    const addWorkspace = useWorkspaceStore((state) => state.addWorkspace);
    const [name, setName] = useState("My Workspace");

    const handleCreate = () => {
        if (!name.trim()) {
            toast.error("Please enter a workspace name.");
            return;
        }
        addWorkspace(name.trim());
        toast.success(`Workspace "${name.trim()}" created.`);
        setName("My Workspace");
        onOpenChange(false);
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <div className="flex flex-col gap-2">
                    <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-full border"
                        aria-hidden="true"
                    >
                        <FolderPlus className="opacity-80" size={16} />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-left">New Workspace</DialogTitle>
                        <DialogDescription className="text-left">
                            Create a workspace to group related sessions together.
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex flex-col gap-3 py-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="workspace-name">Workspace Name</Label>
                        <Input
                            id="workspace-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            placeholder="e.g. Production Servers"
                            autoFocus
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={!name.trim()}>
                        Create Workspace
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

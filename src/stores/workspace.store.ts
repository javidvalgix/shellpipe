import IWorkspace from "@/models/workspace.model";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import useSidebarStore from "./sidebar.store";

interface WorkspaceStore {
  workspaces: IWorkspace[];
  addWorkspace: (name: string, color?: string, icon?: string) => string;
  updateWorkspace: (id: string, updates: Partial<Pick<IWorkspace, "name" | "color" | "icon">>) => void;
  deleteWorkspace: (id: string) => void;
  getWorkspaceById: (id: string) => IWorkspace | undefined;
  reorderWorkspaces: (orderedIds: string[]) => void;
}

const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        workspaces: [],

        addWorkspace: (name: string, color?: string, icon?: string) => {
          const id = crypto.randomUUID();
          set((state) => {
            state.workspaces.push({
              id,
              name,
              color,
              icon,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          });
          useSidebarStore.getState().addItem(id);
          return id;
        },

        updateWorkspace: (id: string, updates) => {
          set((state) => {
            const index = state.workspaces.findIndex((w) => w.id === id);
            if (index !== -1) {
              state.workspaces[index] = {
                ...state.workspaces[index],
                ...updates,
                updatedAt: new Date(),
              };
            }
          });
        },

        deleteWorkspace: (id: string) => {
          set((state) => {
            state.workspaces = state.workspaces.filter((w) => w.id !== id);
          });
          useSidebarStore.getState().removeItem(id);
        },

        getWorkspaceById: (id: string) => {
          return get().workspaces.find((w) => w.id === id);
        },

        reorderWorkspaces: (orderedIds: string[]) => {
          set((state) => {
            const newOrder = orderedIds
              .map((id) => state.workspaces.find((w) => w.id === id))
              .filter(Boolean) as IWorkspace[];
            const remaining = state.workspaces.filter((w) => !orderedIds.includes(w.id));
            state.workspaces = [...newOrder, ...remaining];
          });
        },
      })),
      {
        name: "workspace-store",
        partialize: (state) => ({
          workspaces: state.workspaces,
        }),
      }
    )
  )
);

export default useWorkspaceStore;

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/**
 * Stores the interleaved order of top-level sidebar items
 * (workspace IDs and standalone session IDs mixed together).
 */
interface SidebarStore {
  topLevelOrder: string[];
  setTopLevelOrder: (ids: string[]) => void;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
}

const useSidebarStore = create<SidebarStore>()(
  devtools(
    persist(
      immer((set) => ({
        topLevelOrder: [],

        setTopLevelOrder: (ids: string[]) => {
          set((state) => {
            state.topLevelOrder = ids;
          });
        },

        addItem: (id: string) => {
          set((state) => {
            if (!state.topLevelOrder.includes(id)) {
              state.topLevelOrder.push(id);
            }
          });
        },

        removeItem: (id: string) => {
          set((state) => {
            state.topLevelOrder = state.topLevelOrder.filter((i) => i !== id);
          });
        },
      })),
      {
        name: "sidebar-store",
      }
    )
  )
);

export default useSidebarStore;

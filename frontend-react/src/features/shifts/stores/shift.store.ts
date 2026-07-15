import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Shift } from "../types";

interface ShiftState {
  activeShift: Shift | null;
  setActiveShift: (shift: Shift | null) => void;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      activeShift: null,
      setActiveShift: (shift) => set({ activeShift: shift }),
    }),
    {
      name: "shift-storage",
      partialize: (state) => ({ activeShift: state.activeShift }),
    },
  ),
);

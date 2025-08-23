import { create } from "zustand";

/** expenseId -> "equal" | "rough" */
type TiltMode = "equal" | "rough";
type State = {
  map: Record<string, TiltMode>;
  set: (id: string, mode: TiltMode) => void;
  get: (id: string) => TiltMode;
  resetAll: () => void;
};

export const useExpenseTiltStore = create<State>((set, get) => ({
  map: {},
  set: (id: string, mode: TiltMode) => set((s: State) => ({ map: { ...s.map, [id]: mode } })),
  get: (id: string) => get().map[id] ?? "equal", // 既定は均等
  resetAll: () => set({ map: {} }),
})); 
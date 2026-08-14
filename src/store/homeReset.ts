import { create } from 'zustand';

interface HomeResetStore {
  // Incremented whenever the member asks to return to the default Home
  // view (tapping the Home tab icon, or the header logo/wordmark) — see
  // HomeScreen.tsx's subscribing effect. A counter rather than a boolean
  // so every tap fires a fresh change even if the value would otherwise
  // stay the same, and HomeScreen can tell "real reset" apart from the
  // initial mount by checking against 0.
  resetSignal: number;
  triggerReset: () => void;
}

export const useHomeResetStore = create<HomeResetStore>((set) => ({
  resetSignal: 0,
  triggerReset: () => set((s) => ({ resetSignal: s.resetSignal + 1 })),
}));

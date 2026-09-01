import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'privi_haptics_enabled';

// Mirrors theme.ts's own hydrate/persist shape exactly — same reasoning,
// same AsyncStorage pattern. Defaults to ON (haptics are opt-out, not
// opt-in) since the founder wants this to read as a considered, quiet
// premium touch by default — a toggle exists specifically for anyone
// who'd rather not have it, not because it's assumed unwanted.
interface HapticsStore {
  enabled: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (value: boolean) => void;
}

export const useHapticsStore = create<HapticsStore>((set) => ({
  enabled: true,
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'false') {
        set({ enabled: false });
      }
    } catch {
      // ignore — falls back to the default (on)
    } finally {
      set({ hydrated: true });
    }
  },

  setEnabled: (value) => {
    set({ enabled: value });
    AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false').catch(() => {});
  },
}));

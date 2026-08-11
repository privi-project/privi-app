import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'privi_theme_override';

interface ThemeStore {
  // null = follow the device's OS setting. 'light'/'dark' = member override
  // from Support & Settings' "App Theme" toggle.
  override: 'light' | 'dark' | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setOverride: (value: 'light' | 'dark' | null) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  override: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        set({ override: stored });
      }
    } catch {
      // ignore — falls back to OS setting
    } finally {
      set({ hydrated: true });
    }
  },

  setOverride: (value) => {
    set({ override: value });
    if (value) {
      AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  },
}));

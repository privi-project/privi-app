import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/store/theme';

// Drop-in replacement for RN's own useColorScheme() that also respects the
// member's "App Theme" override from Support & Settings — falls back to
// the OS setting when no override is set (override === null).
export function useAppColorScheme(): 'light' | 'dark' {
  const override = useThemeStore((s) => s.override);
  const system = useColorScheme();
  return override ?? (system === 'dark' ? 'dark' : 'light');
}

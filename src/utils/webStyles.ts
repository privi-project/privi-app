import { Platform } from 'react-native';

// react-native-web renders TextInput as a real <input> — Chrome draws its
// own focus/autofill outline (the "orange box") on top of our own gold
// border unless it's explicitly suppressed. Spread this into every
// TextInput's style array. No native equivalent to worry about — RN
// ignores unknown style keys on iOS/Android, so this is a no-op there.
export const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

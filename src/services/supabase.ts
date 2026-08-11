import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local');
}

// Explicit storage adapter is required — without it, supabase-js only
// finds a session store on web (via window.localStorage). On native
// there's no such global, so sessions would silently fail to persist at
// all: every app restart would start fully signed out, and the
// signed-in-splash-to-Home path would never trigger. AsyncStorage's web
// build also uses localStorage under the hood, so this is the one
// adapter that works correctly on both native and the browser.
//
// BUT: Expo's web output does server-side pre-rendering — the app's JS
// runs once in Node.js (no `window`) before the browser ever sees it.
// AsyncStorage's web shim touches `window` unconditionally, which
// crashes the whole dev/build server the instant Supabase tries to read
// a session during that pass. This wrapper no-ops during that specific
// window (web platform, no `window` global) and defers to real
// AsyncStorage everywhere else — real browser (window exists) and native
// (no window, but also not web, so this check short-circuits first).
const isWebSSR = Platform.OS === 'web' && typeof window === 'undefined';

const storage = {
  getItem: (key: string) => (isWebSSR ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) =>
    isWebSSR ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => (isWebSSR ? Promise.resolve() : AsyncStorage.removeItem(key)),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper to check auth state
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// Helper to sign up (redirects to website)
export function getSignUpUrl() {
  // Website handles signup; app links to it in mobile browser
  return 'https://privi.info/signup';
}

// Helper to exchange return_to_app token for login
export async function loginWithReturnToken(token: string) {
  try {
    // First, verify the token hasn't expired and mark as used
    const { data: tokenData, error: tokenError } = await supabase
      .from('return_to_app_tokens')
      .select('user_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Invalid or expired token');
    }

    if (tokenData.used_at) {
      throw new Error('Token already used');
    }

    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      throw new Error('Token expired');
    }

    // Mark token as used
    await supabase
      .from('return_to_app_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    // Return the user_id for the app to use
    return tokenData.user_id;
  } catch (error) {
    console.error('Token exchange failed:', error);
    throw error;
  }
}

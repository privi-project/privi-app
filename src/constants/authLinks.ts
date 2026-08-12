// Password-reset redirectTo target for both ForgotPasswordModal (Sign In)
// and ChangePasswordModal (Personal Information) — a real website page
// (website/src/app/auth/confirm/page.tsx), not the privi:// custom
// scheme. Switched 2026-08-12 after confirming live that privi:// hangs
// on a blank loading spinner when the reset email is opened from an
// in-app browser (Gmail's embedded browser, and likely others) — those
// contexts often can't hand off a non-https custom scheme to the OS. A
// real https:// link works in any browser context, no special handoff
// needed. The website page already handles this exact case (its
// fallback branch was written anticipating type=recovery, Supabase's
// standard value for password resets) — sets a password there, member
// goes back to the app and signs in. A proper Universal Link / Android
// App Link would be the more native-feeling long-term fix, but is a much
// bigger lift (domain verification files, app.json config) — this is
// the pragmatic fix that ships without new infrastructure.
export const PASSWORD_RESET_REDIRECT_URL = 'https://privi.info/auth/confirm';

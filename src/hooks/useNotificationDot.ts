import { useState, useEffect, useCallback } from 'react';
import { fetchMyNotifications } from '@/services/notifications';
import { useAuthStore } from '@/store/auth';

/**
 * Shared bell-dot state, used identically across Home/Map/Account/
 * Favourites. Was previously duplicated inline in each screen as its own
 * `useEffect(() => {...}, [user])` — which only ever fetched ONCE per
 * mount, so the dot went stale after a member viewed/dismissed a
 * notification from the panel: the panel's own list correctly updated
 * (local "seen" filtering, see notificationReads.ts), but nothing told
 * the PARENT screen's separate hasNotifications state to re-check.
 * Confirmed live 2026-08-12: dot only cleared after something unrelated
 * (a theme change) happened to force a remount/re-render — not a
 * "refresh" mechanism, just incidental.
 *
 * Fix: expose `refresh()` so callers can re-check on demand — in
 * particular, NotificationPanel's onClose (which fires right after a
 * notification is tapped/marked seen, before navigating away) should
 * call this, not just close the modal.
 */
export function useNotificationDot() {
  const user = useAuthStore((s) => s.user);
  const [hasNotifications, setHasNotifications] = useState(false);

  const refresh = useCallback(() => {
    if (!user) {
      setHasNotifications(false);
      return;
    }
    fetchMyNotifications()
      .then((n) => setHasNotifications(n.length > 0))
      .catch(() => setHasNotifications(false));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { hasNotifications, refresh };
}

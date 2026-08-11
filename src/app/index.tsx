import WelcomeScreen from '@/screens/WelcomeScreen';
import { SplashHold } from '@/components/SplashHold';
import { useAuthStore } from '@/store/auth';

// While auth status is still resolving, or once we know the member is
// signed in, show the static Stage-1 frame instead of Welcome — the root
// layout's overlay takes over for signed-in members (see app/_layout.tsx)
// and we don't want Welcome's own splash+buttons to flash first.
export default function Index() {
  const loading = useAuthStore((s) => s.loading);
  const session = useAuthStore((s) => s.session);

  if (loading || session?.user) {
    return <SplashHold />;
  }

  return <WelcomeScreen />;
}

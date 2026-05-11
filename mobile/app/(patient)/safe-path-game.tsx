/**
 * @deprecated Safe Path Memory game has been replaced by Memory Match.
 * This route redirects to the new Memory Match game.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SafePathRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(patient)/memory-match-game' as any);
  }, []);
  return null;
}

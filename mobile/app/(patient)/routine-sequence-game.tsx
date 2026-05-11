/**
 * @deprecated Routine Sequence game has been replaced by Orientation Practice.
 * This route redirects to the new Orientation Practice game.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function RoutineSequenceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(patient)/orientation-practice' as any);
  }, []);
  return null;
}

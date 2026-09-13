import { AvailabilityScreen } from '@/features/availability';
import { useSession } from '@/features/auth';

export default function AvailabilityRoute() {
  const { staff } = useSession();
  return <AvailabilityScreen actorId={staff?.id ?? null} />;
}

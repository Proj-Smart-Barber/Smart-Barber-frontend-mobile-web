import { AvailabilityScreen } from '@/features/availability';
import { useSession } from '@/features/auth';

export default function AvailabilityRoute() {
  const { barbershop } = useSession();
  return <AvailabilityScreen barbershopId={barbershop?.id ?? null} />;
}

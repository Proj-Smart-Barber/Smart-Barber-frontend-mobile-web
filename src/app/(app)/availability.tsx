import { useLocalSearchParams } from 'expo-router';
import { AvailabilityScreen } from '@/features/availability';
import { useSession } from '@/features/auth';

export default function AvailabilityRoute() {
  const { barbershop } = useSession();
  const params = useLocalSearchParams<{
    barbermanId?: string;
    professionalName?: string;
    name?: string;
  }>();

  return (
    <AvailabilityScreen
      barbershopId={barbershop?.id ?? null}
      barbermanId={params.barbermanId ?? null}
      professionalName={params.professionalName ?? params.name ?? null}
    />
  );
}

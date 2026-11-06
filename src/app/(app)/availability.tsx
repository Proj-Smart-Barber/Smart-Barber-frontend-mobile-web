import { useLocalSearchParams } from 'expo-router';
import { UnifiedAvailabilityContainer } from '@/features/availability';
import { useSession } from '@/features/auth';

export default function AvailabilityRoute() {
  const { barbershop } = useSession();
  const params = useLocalSearchParams<{
    barbermanId?: string;
    professionalName?: string;
    name?: string;
    scope?: 'unit' | 'personal' | 'team';
  }>();

  return (
    <UnifiedAvailabilityContainer
      initialScope={params.scope}
      barbershopId={barbershop?.id ?? null}
      barbermanId={params.barbermanId ?? null}
      professionalName={params.professionalName ?? params.name ?? null}
    />
  );
}

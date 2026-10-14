import { BarberScheduleScreen } from '@/features/availability';
import { useSession } from '@/features/auth';
import { getBarberScheduleContext } from '@/features/availability/model/barber-schedule-access';
import { ENV } from '@/shared/config/env';
import { ErrorState } from '@/shared/ui';

export default function MyScheduleRoute() {
  const session = useSession();
  const context = getBarberScheduleContext(session);
  if (!context || !session.identity) {
    return <ErrorState title="Jornada indisponível" description="Entre com sua conta e selecione uma unidade com vínculo operacional ativo para configurar sua jornada." />;
  }
  // Preserve the previous delivery boundary until the personal API is approved.
  if (ENV.AVAILABILITY_SOURCE !== 'mock') {
    return <ErrorState title="Integração em preparação" description="A jornada individual estará disponível após a integração com o servidor." />;
  }
  return <BarberScheduleScreen key={context.userId} barbershopId={context.shopId}
    barbermanId={context.userId} barberName={session.identity.name} />;
}

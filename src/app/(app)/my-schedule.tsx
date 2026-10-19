import { BarberScheduleScreen } from '@/features/availability';
import { useSession } from '@/features/auth';
import { getBarberScheduleContext } from '@/features/availability/model/barber-schedule-access';
import { ErrorState } from '@/shared/ui';

export default function MyScheduleRoute() {
  const session = useSession();
  const context = getBarberScheduleContext(session);
  if (!context || !session.identity) {
    return <ErrorState title="Jornada indisponível" description="Entre com sua conta e selecione uma unidade com vínculo operacional ativo para configurar sua jornada." />;
  }
  // Ator e unidade vêm exclusivamente da sessão validada; a chave remonta o editor ao trocar de conta.
  return <BarberScheduleScreen key={context.userId} barbershopId={context.shopId}
    barbermanId={context.userId} barberName={session.identity.name} />;
}

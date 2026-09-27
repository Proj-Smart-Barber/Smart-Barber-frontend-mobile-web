/**
 * Adapter HTTP da Agenda — stub.
 *
 * Preencher quando o backend publicar o contrato de disponibilidade
 * consolidada (jornada + buffers + holds + reservas). O fluxo esperado:
 * httpClient.get(...) -> mapAgendaDayDto(dto) -> AgendaDay.
 *
 * NÃO recalcular jornada, buffers, holds ou reservas no cliente.
 */
import { ENV } from '@/shared/config/env';
import type { AgendaBooking, AgendaDay, AgendaScope, IAgendaRepository } from './agenda.contract';

export class AgendaHttpAdapter implements IAgendaRepository {
  async getAgendaDay(params: { scope: AgendaScope; date: string }): Promise<AgendaDay> {
    throw new Error(
      `AgendaHttpAdapter ainda não implementado: aguarda o contrato de agenda do backend (data=${params.date}, papel=${params.scope.role}).`,
    );
  }
}

export class BookingScheduleHttpAdapter {
  async cancelBooking(bookingId: string): Promise<AgendaBooking> {
    const res = await fetch(`${ENV.API_URL}/api/booking/${encodeURIComponent(bookingId)}/cancel`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Erro ao cancelar agendamento.');
    }
    const data = (await res.json().catch(() => ({}))) as { booking?: AgendaBooking };
    if (!data || !data.booking || typeof data.booking.id !== 'string') {
      throw new Error('Resposta inválida do servidor ao cancelar o agendamento.');
    }
    return data.booking;
  }
}


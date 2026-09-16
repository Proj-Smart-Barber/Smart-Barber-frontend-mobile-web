/**
 * Adapter HTTP da Agenda — stub.
 *
 * Preencher quando o backend publicar o contrato de disponibilidade
 * consolidada (jornada + buffers + holds + reservas). O fluxo esperado:
 * httpClient.get(...) -> mapAgendaDayDto(dto) -> AgendaDay.
 *
 * NÃO recalcular jornada, buffers, holds ou reservas no cliente.
 */
import type { AgendaDay, AgendaScope, IAgendaRepository } from './agenda.contract';

export class AgendaHttpAdapter implements IAgendaRepository {
  async getAgendaDay(params: { scope: AgendaScope; date: string }): Promise<AgendaDay> {
    throw new Error(
      `AgendaHttpAdapter ainda não implementado: aguarda o contrato de agenda do backend (data=${params.date}, papel=${params.scope.role}).`,
    );
  }
}

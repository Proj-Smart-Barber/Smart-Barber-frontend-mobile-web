import type { AgendaDaySummary, AgendaEntry, AgendaNextAppointment } from '../api/agenda.contract';

export type { AgendaDay, AgendaDaySummary, AgendaEntry, AgendaScope, AgendaNextAppointment } from '../api/agenda.contract';

/** Resumo do dia pronto para apresentação. */
export interface AgendaSummaryView {
  occupancyPercent: number | null;
  occupancyLabel: string | null;
  occupancyDetail: string | null;
  next: AgendaNextAppointment | null;
}

export function buildAgendaSummaryView(summary: AgendaDaySummary | null): AgendaSummaryView | null {
  if (!summary) return null;

  const occupancyPercent =
    typeof summary.occupancyRatePercent === 'number' ? summary.occupancyRatePercent : null;
  const hasOccupancy = occupancyPercent !== null;
  const occupancyDetail =
    hasOccupancy && summary.bookedSlots !== null && summary.totalSlots !== null
      ? `${summary.bookedSlots} de ${summary.totalSlots} vagas ocupadas`
      : null;
  const next = summary.nextAppointment ?? null;

  // Sem dados de ocupação nem próximo atendimento: o contrato ainda
  // não fornece resumo para este dia — não renderiza a área.
  if (!hasOccupancy && !next) return null;

  return {
    occupancyPercent,
    occupancyLabel: hasOccupancy ? `${occupancyPercent}%` : null,
    occupancyDetail,
    next,
  };
}

export type AgendaEntryOf<TType extends AgendaEntry['type']> = Extract<AgendaEntry, { type: TType }>;

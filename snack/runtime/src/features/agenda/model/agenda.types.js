export function buildAgendaSummaryView(summary) {
    var _a;
    if (!summary)
        return null;
    const occupancyPercent = typeof summary.occupancyRatePercent === 'number' ? summary.occupancyRatePercent : null;
    const hasOccupancy = occupancyPercent !== null;
    const occupancyDetail = hasOccupancy && summary.bookedSlots !== null && summary.totalSlots !== null
        ? `${summary.bookedSlots} de ${summary.totalSlots} vagas ocupadas`
        : null;
    const next = (_a = summary.nextAppointment) !== null && _a !== void 0 ? _a : null;
    // Sem dados de ocupação nem próximo atendimento: o contrato ainda
    // não fornece resumo para este dia — não renderiza a área.
    if (!hasOccupancy && !next)
        return null;
    return {
        occupancyPercent,
        occupancyLabel: hasOccupancy ? `${occupancyPercent}%` : null,
        occupancyDetail,
        next,
    };
}

export const WEEKDAY_LABELS = {
    MONDAY: 'Segunda',
    TUESDAY: 'Terça',
    WEDNESDAY: 'Quarta',
    THURSDAY: 'Quinta',
    FRIDAY: 'Sexta',
    SATURDAY: 'Sábado',
    SUNDAY: 'Domingo',
};
export const WEEKDAY_ORDER = [
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];
/** Agrupamento de entradas da jornada por dia da semana (para renderizar a lista). */
export function buildScheduleDayViews(entries) {
    var _a;
    const byDay = {};
    for (const entry of entries) {
        byDay[entry.weekday] = [...((_a = byDay[entry.weekday]) !== null && _a !== void 0 ? _a : []), entry];
    }
    return WEEKDAY_ORDER.map((weekday) => {
        var _a, _b, _c;
        return ({
            weekday,
            label: WEEKDAY_LABELS[weekday],
            isOpen: ((_b = (_a = byDay[weekday]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0,
            entries: (_c = byDay[weekday]) !== null && _c !== void 0 ? _c : [],
        });
    });
}
export function formatExceptionLabel(exception) {
    if (exception.openTime && exception.closeTime) {
        if (exception.barbermanId) {
            return `Bloqueio: ${exception.openTime} – ${exception.closeTime}`;
        }
        return `Horário especial: ${exception.openTime} – ${exception.closeTime}`;
    }
    return exception.barbermanId ? 'Folga de dia inteiro' : 'Unidade fechada';
}

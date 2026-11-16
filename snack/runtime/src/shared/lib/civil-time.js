/**
 * Utilitários puros de tempo civil e manipulação de datas no padrão pt-BR.
 * Não depende de barrels de features/agenda ou features/bookings para evitar ciclos.
 */
/** Converte um Date em string "yyyy-MM-dd" local. */
export function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
/** Converte "yyyy-MM-dd" em Date local puro, sem shifts de fuso horário. */
export function parseISODate(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
}
/** Adiciona ou subtrai dias de uma string ISO civil ("yyyy-MM-dd"). */
export function addDays(iso, amount) {
    const date = parseISODate(iso);
    date.setDate(date.getDate() + amount);
    return toISODate(date);
}
/** Diferença em dias civis entre duas datas ISO (toIso - fromIso). */
export function diffInDays(fromIso, toIso) {
    const ms = parseISODate(toIso).getTime() - parseISODate(fromIso).getTime();
    return Math.round(ms / 86400000);
}
/** Verifica se a data ISO está dentro do limite de navegação a partir da data de referência. */
export function isWithinNavigationLimit(iso, referenceIso, limitDays) {
    return Math.abs(diffInDays(referenceIso, iso)) <= limitDays;
}
/** Navega meses civis preservando o dia limite quando possível. */
export function addMonths(iso, amount) {
    const date = parseISODate(iso);
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + amount);
    const daysInTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, daysInTargetMonth));
    return toISODate(date);
}
/** "Setembro de 2026" */
export function formatMonthLabel(iso) {
    const label = new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
    }).format(parseISODate(iso));
    return label.charAt(0).toUpperCase() + label.slice(1);
}
/** Rótulos curtos de dias da semana no padrão domingo a sábado: ["dom", "seg", ..., "sáb"]. */
export function getCalendarWeekdaysShort() {
    const labels = [];
    for (let i = 0; i < 7; i++) {
        const sunday = new Date(2023, 9, 1 + i); // 1 de outubro de 2023 é domingo
        const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(sunday);
        labels.push(label.replace(/\./g, ''));
    }
    return labels;
}
/** Matriz do calendário do mês (semanas de domingo a sábado). Células fora do mês são null. */
export function getCalendarWeeks(monthIso) {
    const first = parseISODate(monthIso);
    first.setDate(1);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const leadingBlanks = first.getDay();
    const cells = Array.from({ length: leadingBlanks }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
        cells.push(toISODate(new Date(first.getFullYear(), first.getMonth(), day)));
    }
    while (cells.length % 7 !== 0)
        cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
}
/** "Segunda-feira, 7 de setembro" */
export function formatDateLabel(iso) {
    const formatted = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(parseISODate(iso));
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
/** "Seg, 7 de set" */
export function formatDateLabelShort(iso) {
    var _a, _b, _c, _d, _e, _f;
    const parts = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    }).formatToParts(parseISODate(iso));
    const weekday = (_b = (_a = parts.find((p) => p.type === 'weekday')) === null || _a === void 0 ? void 0 : _a.value.replace(/\./g, '')) !== null && _b !== void 0 ? _b : '';
    const day = (_d = (_c = parts.find((p) => p.type === 'day')) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : '';
    const month = (_f = (_e = parts.find((p) => p.type === 'month')) === null || _e === void 0 ? void 0 : _e.value.replace(/\./g, '')) !== null && _f !== void 0 ? _f : '';
    const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${weekdayCap}, ${day} de ${month}`;
}
/** "Atualizado às 14:32" */
export function formatLastUpdated(timestampMs) {
    const date = new Date(timestampMs);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Atualizado às ${hours}:${minutes}`;
}
/** Diferença em minutos entre dois horários "HH:mm". */
export function minutesBetween(start, end) {
    const [sh = 0, sm = 0] = start.split(':').map(Number);
    const [eh = 0, em = 0] = end.split(':').map(Number);
    return eh * 60 + em - (sh * 60 + sm);
}
/**
 * Obtém a data civil ("yyyy-MM-dd") correspondente a um timestamp UTC num fuso específico.
 * Usa Intl com localidade 'en-CA' para obter o formato YYYY-MM-DD garantido.
 */
export function getCivilDateInTimezone(timestampMs, timezone = 'America/Sao_Paulo') {
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(new Date(timestampMs));
    }
    catch {
        // Fallback gracioso se o timezone for desconhecido
        const d = new Date(timestampMs);
        return toISODate(d);
    }
}
/**
 * Obtém o horário civil ("HH:mm") correspondente a um timestamp UTC num fuso específico.
 */
export function getCivilTimeInTimezone(timestampMs, timezone = 'America/Sao_Paulo') {
    try {
        const formatter = new Intl.DateTimeFormat('pt-BR', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        return formatter.format(new Date(timestampMs));
    }
    catch {
        const d = new Date(timestampMs);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }
}

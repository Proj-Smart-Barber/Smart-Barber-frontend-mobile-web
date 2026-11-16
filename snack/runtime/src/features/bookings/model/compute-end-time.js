const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export function isValidTimeFormat(time) {
    return TIME_PATTERN.test(time);
}
export function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
export function minutesToTime(minutes) {
    const safe = Math.max(0, Math.min(minutes, 1439));
    const hours = String(Math.floor(safe / 60)).padStart(2, '0');
    const rest = String(safe % 60).padStart(2, '0');
    return `${hours}:${rest}`;
}
export function totalServicesDurationInMinutes(services) {
    return services.reduce((sum, service) => { var _a; return sum + ((_a = service.durationInMinutes) !== null && _a !== void 0 ? _a : 0); }, 0);
}
/**
 * Calcula o horário de término a partir do início + duração total dos
 * serviços. Sem duração de serviços, usa a duração atual do booking como
 * fallback. Retorna null quando cruzaria a meia-noite ou não houver
 * duração conhecida.
 */
export function computeEndTime({ startTime, services, fallbackDurationInMinutes, }) {
    if (!isValidTimeFormat(startTime))
        return null;
    const servicesDuration = totalServicesDurationInMinutes(services);
    const duration = servicesDuration > 0 ? servicesDuration : fallbackDurationInMinutes;
    if (duration <= 0)
        return null;
    const endMinutes = timeToMinutes(startTime) + duration;
    if (endMinutes > 1439)
        return null;
    return minutesToTime(endMinutes);
}

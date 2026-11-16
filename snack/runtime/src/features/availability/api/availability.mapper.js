import { WEEKDAYS_RAW, } from './availability.dto';
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
function isValidTime(value) {
    return typeof value === 'string' && TIME_PATTERN.test(value);
}
function isWeekday(value) {
    return typeof value === 'string' && WEEKDAYS_RAW.includes(value);
}
export function mapBarbershopDto(dto) {
    if (typeof dto.id !== 'string' ||
        dto.id.trim().length === 0 ||
        typeof dto.name !== 'string' ||
        dto.name.trim().length === 0 ||
        typeof dto.timezone !== 'string' ||
        dto.timezone.trim().length === 0) {
        return null;
    }
    return {
        id: dto.id,
        name: dto.name,
        timezone: dto.timezone,
    };
}
export function mapWeeklyScheduleEntryDto(dto) {
    if (typeof dto.id !== 'string' || !isWeekday(dto.day_of_week))
        return null;
    if (!isValidTime(dto.open_time) || !isValidTime(dto.close_time))
        return null;
    return {
        id: dto.id,
        weekday: dto.day_of_week,
        barbermanId: typeof dto.barberman_id === 'string' ? dto.barberman_id : null,
        range: { start: dto.open_time, end: dto.close_time },
    };
}
export function mapAvailabilityExceptionDto(dto) {
    if (typeof dto.id !== 'string' || typeof dto.date !== 'string')
        return null;
    return {
        id: dto.id,
        date: dto.date,
        barbermanId: typeof dto.barberman_id === 'string' ? dto.barberman_id : null,
        openTime: isValidTime(dto.open_time) ? dto.open_time : null,
        closeTime: isValidTime(dto.close_time) ? dto.close_time : null,
        reason: typeof dto.reason === 'string' && dto.reason.length > 0 ? dto.reason : null,
    };
}
export function mapAvailabilitySlotDto(dto) {
    if (typeof dto.start !== 'string' || typeof dto.end !== 'string')
        return null;
    return { start: dto.start, end: dto.end };
}
export function mapWeeklyScheduleList(dtos) {
    const entries = [];
    for (const dto of Array.isArray(dtos) ? dtos : []) {
        const mapped = mapWeeklyScheduleEntryDto(dto);
        if (mapped)
            entries.push(mapped);
    }
    return entries;
}
export function mapExceptionList(dtos) {
    const entries = [];
    for (const dto of Array.isArray(dtos) ? dtos : []) {
        const mapped = mapAvailabilityExceptionDto(dto);
        if (mapped)
            entries.push(mapped);
    }
    return entries;
}
export function mapSlotList(dtos) {
    const entries = [];
    for (const dto of Array.isArray(dtos) ? dtos : []) {
        const mapped = mapAvailabilitySlotDto(dto);
        if (mapped)
            entries.push(mapped);
    }
    return entries;
}

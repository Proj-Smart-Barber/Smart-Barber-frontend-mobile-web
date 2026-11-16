import { httpClient } from '../../../shared/api';
import { rescheduleBooking, cancelBooking as cancelBookingApi } from './bookings.api';
const SCHEDULE_DETAILS_PATH = '/api/bookings/barberman/schedule/details';
function normalizeTime(val) {
    if (!val)
        return '';
    if (val.includes('T')) {
        const timePart = val.split('T')[1];
        return timePart ? timePart.slice(0, 5) : '';
    }
    return val.slice(0, 5);
}
function normalizeDate(val) {
    if (!val)
        return '';
    return val.slice(0, 10);
}
function mapServicesDto(services) {
    if (!Array.isArray(services))
        return [];
    return services.map((service) => {
        var _a, _b;
        return ({
            id: service.id,
            title: service.title,
            priceInCents: (_a = service.priceInCents) !== null && _a !== void 0 ? _a : null,
            durationInMinutes: (_b = service.durationInMinutes) !== null && _b !== void 0 ? _b : null,
        });
    });
}
function mapBookingDto(raw) {
    var _a, _b, _c, _d, _e, _f;
    if (!raw || typeof raw.id !== 'string') {
        throw new Error('Resposta inválida do servidor.');
    }
    const startTime = normalizeTime(raw.startTime);
    const endTime = normalizeTime(raw.endTime);
    if (!startTime || !endTime) {
        throw new Error('Resposta inválida do servidor.');
    }
    return {
        id: raw.id,
        date: normalizeDate(raw.date),
        startTime,
        endTime,
        barbershopId: raw.barbershopId,
        barbermanId: raw.barbermanId,
        createdAt: (_a = raw.createdAt) !== null && _a !== void 0 ? _a : null,
        status: (_b = raw.status) !== null && _b !== void 0 ? _b : null,
        version: (_c = raw.version) !== null && _c !== void 0 ? _c : null,
        startsAt: (_d = raw.startsAt) !== null && _d !== void 0 ? _d : null,
        endsAt: (_e = raw.endsAt) !== null && _e !== void 0 ? _e : null,
        timezone: (_f = raw.timezone) !== null && _f !== void 0 ? _f : null,
        capabilities: raw.capabilities,
    };
}
function mapBookingDetailsDto(raw) {
    var _a, _b, _c, _d, _e, _f;
    const booking = mapBookingDto(raw);
    return {
        ...booking,
        customer: {
            id: (_a = raw.customer) === null || _a === void 0 ? void 0 : _a.id,
            name: ((_c = (_b = raw.customer) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.trim()) || 'Cliente',
            phoneNumber: (_f = (_e = (_d = raw.customer) === null || _d === void 0 ? void 0 : _d.phoneNumber) === null || _e === void 0 ? void 0 : _e.trim()) !== null && _f !== void 0 ? _f : '',
        },
        services: mapServicesDto(raw.services),
    };
}
export class BookingsHttpAdapter {
    async getDayBookings({ date }) {
        const response = await httpClient.get(SCHEDULE_DETAILS_PATH, { params: { date } });
        const list = Array.isArray(response === null || response === void 0 ? void 0 : response.bookings) ? response.bookings : [];
        const bookings = list.map(mapBookingDetailsDto);
        return bookings.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    async updateBooking({ bookingId, date, startTime, endTime, }) {
        var _a, _b, _c, _d, _e;
        const { booking } = await rescheduleBooking(bookingId, {
            date,
            startTime,
            scope: 'UNIT',
        });
        if (!booking) {
            throw new Error('Resposta inválida do servidor ao remarcar o agendamento.');
        }
        return {
            id: booking.id,
            date: typeof booking.date === 'string' ? booking.date.slice(0, 10) : date,
            startTime: booking.startTime || startTime,
            endTime: booking.endTime || endTime,
            barbershopId: booking.barbershopId,
            barbermanId: booking.barbermanId,
            createdAt: booking.createdAt ? String(booking.createdAt) : null,
            status: (_a = booking.status) !== null && _a !== void 0 ? _a : null,
            version: (_b = booking.version) !== null && _b !== void 0 ? _b : null,
            startsAt: (_c = booking.startsAt) !== null && _c !== void 0 ? _c : null,
            endsAt: (_d = booking.endsAt) !== null && _d !== void 0 ? _d : null,
            timezone: (_e = booking.timezone) !== null && _e !== void 0 ? _e : null,
            capabilities: booking.capabilities,
        };
    }
    async cancelBooking(bookingId) {
        var _a, _b, _c, _d, _e;
        const { booking } = await cancelBookingApi(bookingId, { scope: 'UNIT' });
        if (!booking) {
            throw new Error('Resposta inválida do servidor ao cancelar o agendamento.');
        }
        return {
            id: booking.id,
            date: typeof booking.date === 'string' ? booking.date.slice(0, 10) : '',
            startTime: booking.startTime || '',
            endTime: booking.endTime || '',
            barbershopId: booking.barbershopId,
            barbermanId: booking.barbermanId,
            createdAt: booking.createdAt ? String(booking.createdAt) : null,
            status: (_a = booking.status) !== null && _a !== void 0 ? _a : null,
            version: (_b = booking.version) !== null && _b !== void 0 ? _b : null,
            startsAt: (_c = booking.startsAt) !== null && _c !== void 0 ? _c : null,
            endsAt: (_d = booking.endsAt) !== null && _d !== void 0 ? _d : null,
            timezone: (_e = booking.timezone) !== null && _e !== void 0 ? _e : null,
            capabilities: booking.capabilities,
        };
    }
}
export const bookingsHttpAdapter = new BookingsHttpAdapter();

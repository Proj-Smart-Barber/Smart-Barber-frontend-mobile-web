import { httpClient } from '../../../shared/api';
const VALID_APPOINTMENT_STATUSES = new Set([
    'WAITING',
    'CONFIRMED',
    'IN_SERVICE',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
]);
function resolveAppointmentStatus(status) {
    if (!status)
        return 'UNKNOWN';
    const upper = status.toUpperCase();
    if (VALID_APPOINTMENT_STATUSES.has(upper)) {
        return upper;
    }
    return 'UNKNOWN';
}
function normalizeTime(val) {
    if (!val)
        return '00:00';
    if (val.includes('T')) {
        const timePart = val.split('T')[1];
        return timePart ? timePart.slice(0, 5) : '00:00';
    }
    return val.slice(0, 5);
}
export class AgendaHttpAdapter {
    async getAgendaDay(params) {
        var _a, _b;
        let rawBookings = [];
        let serverTimeStr;
        let unitSummary;
        if (params.scope.shopId) {
            // Endpoint da Unidade: BARBER filtra próprio ID, OWNER consulta equipe
            const queryParams = new URLSearchParams();
            queryParams.set('date', params.date);
            queryParams.set('limit', '100');
            if (params.scope.role === 'BARBER') {
                queryParams.set('barbermanId', params.scope.staffId);
            }
            const response = await httpClient.get(`/api/barbershops/${params.scope.shopId}/bookings?${queryParams.toString()}`);
            rawBookings = Array.isArray(response === null || response === void 0 ? void 0 : response.items) ? response.items : [];
            serverTimeStr = response === null || response === void 0 ? void 0 : response.serverTime;
            unitSummary = response === null || response === void 0 ? void 0 : response.summary;
        }
        else {
            // Endpoint pessoal do barbeiro
            const response = await httpClient.get('/api/bookings/barberman/schedule/details', {
                params: { date: params.date },
            });
            rawBookings = Array.isArray(response === null || response === void 0 ? void 0 : response.bookings) ? response.bookings : [];
            serverTimeStr = response === null || response === void 0 ? void 0 : response.serverTime;
        }
        const entries = rawBookings.map((item) => {
            var _a, _b;
            const services = Array.isArray(item.services) ? item.services : [];
            const serviceTitle = services.map((s) => s.title).filter(Boolean).join(', ') || 'Atendimento';
            const hasServicePrices = services.some((s) => s.priceInCents != null);
            const calculatedPrice = services.reduce((sum, s) => { var _a; return sum + ((_a = s.priceInCents) !== null && _a !== void 0 ? _a : 0); }, 0);
            const totalPrice = item.totalPriceInCents != null
                ? item.totalPriceInCents
                : hasServicePrices && calculatedPrice > 0
                    ? calculatedPrice
                    : null;
            const customerName = ((_b = (_a = item.customer) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.trim()) || 'Cliente';
            const resolvedStatus = resolveAppointmentStatus(item.status);
            return {
                type: 'APPOINTMENT',
                id: item.id,
                startTime: normalizeTime(item.startTime),
                endTime: normalizeTime(item.endTime),
                customerName,
                serviceTitle,
                servicePriceInCents: totalPrice,
                professionalId: item.barbermanId || params.scope.staffId,
                professionalName: item.professionalName || item.barbermanName || '',
                status: resolvedStatus,
                paymentStatus: null,
                checkedInAt: null,
                hasConflict: false,
            };
        });
        entries.sort((a, b) => a.startTime.localeCompare(b.startTime));
        // Próximo agendamento ativo (não cancelado/concluído)
        let nextAppointment = null;
        const activeEntries = entries.filter((e) => e.status !== 'CANCELLED' && e.status !== 'COMPLETED' && e.status !== 'NO_SHOW');
        if (activeEntries.length > 0) {
            const refDate = serverTimeStr ? new Date(serverTimeStr) : new Date();
            const currentHours = String(refDate.getHours()).padStart(2, '0');
            const currentMinutes = String(refDate.getMinutes()).padStart(2, '0');
            const currentTimeStr = `${currentHours}:${currentMinutes}`;
            const upcoming = (_a = activeEntries.find((e) => e.startTime >= currentTimeStr)) !== null && _a !== void 0 ? _a : activeEntries[0];
            if (upcoming) {
                nextAppointment = {
                    startTime: upcoming.startTime,
                    customerName: upcoming.customerName,
                    serviceTitle: upcoming.serviceTitle,
                    professionalName: upcoming.professionalName,
                };
            }
        }
        return {
            date: params.date,
            summary: {
                totalSlots: (_b = unitSummary === null || unitSummary === void 0 ? void 0 : unitSummary.totalBookings) !== null && _b !== void 0 ? _b : null,
                bookedSlots: entries.length,
                occupancyRatePercent: null,
                nextAppointment,
                isClosed: false,
            },
            entries,
        };
    }
}
export class BookingScheduleHttpAdapter {
    async cancelBooking(bookingId, token) {
        const response = await httpClient.delete(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, { token });
        if (!response || !response.booking || typeof response.booking.id !== 'string') {
            throw new Error('Não foi possível cancelar o agendamento.');
        }
        return response.booking;
    }
}
export const bookingScheduleHttpAdapter = new BookingScheduleHttpAdapter();

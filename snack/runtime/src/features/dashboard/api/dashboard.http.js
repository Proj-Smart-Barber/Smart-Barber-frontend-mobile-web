import { fetchUnitBookings } from '../../bookings/api/bookings.api';
import { serverClock } from '../../bookings/lib/server-clock';
import { getCivilDateInTimezone } from '../../../shared/lib/civil-time';
function getTodayCivilDate(timezone = 'America/Sao_Paulo') {
    const authoritativeMs = serverClock.now();
    if (authoritativeMs !== null) {
        return getCivilDateInTimezone(authoritativeMs, timezone);
    }
    throw new Error('Relógio do servidor não sincronizado.');
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
const VALID_STATUSES = new Set([
    'WAITING',
    'CONFIRMED',
    'IN_SERVICE',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
]);
export class DashboardHttpAdapter {
    async getTodayAppointments(params) {
        if (!params.shopId || !params.staffId)
            throw new Error('Selecione uma unidade com vínculo ativo.');
        const timezone = params.timezone || 'America/Sao_Paulo';
        if (!serverClock.hasValidReference()) {
            const bootstrap = await fetchUnitBookings(params.shopId, { limit: 1, barbermanId: params.role === 'BARBER' ? params.staffId : undefined });
            if (!bootstrap.serverTime || !serverClock.hasValidReference())
                throw new Error('Relógio do servidor não sincronizado.');
        }
        const today = getTodayCivilDate(timezone);
        const bookings = [];
        let page = 1;
        while (true) {
            const response = await fetchUnitBookings(params.shopId, { date: today, barbermanId: params.role === 'BARBER' ? params.staffId : undefined, page, limit: 100 });
            bookings.push(...response.items);
            if (!response.hasNext)
                break;
            if (!response.items.length || page > Math.ceil(response.total / response.limit) + 1)
                throw new Error('Paginação inconsistente.');
            page++;
        }
        return projectDashboardAppointments(bookings, today);
    }
    async getMetrics(params) {
        const appointments = await this.getTodayAppointments(params);
        const totalRevenueInCents = appointments.reduce((sum, item) => { var _a; return sum + ((_a = item.servicePriceInCents) !== null && _a !== void 0 ? _a : 0); }, 0);
        const hasIncompleteData = appointments.some((a) => a.hasIncompleteData);
        return {
            totalRevenueInCents: hasIncompleteData ? null : totalRevenueInCents,
            targetRevenueInCents: null,
            estimatedCommissionInCents: null,
            totalAppointments: appointments.length,
            completedAppointments: appointments.filter((a) => a.status === 'COMPLETED').length,
            occupancyRatePercent: null,
            hasIncompleteData,
        };
    }
    async updateAppointmentStatus(id, status) {
        throw new Error('Ações de status e cancelamento devem ser realizadas pela Agenda operacional com controle de versão e idempotência.');
    }
}
export function projectDashboardAppointments(bookings, today) {
    const appointments = bookings.map((item) => {
        var _a, _b, _c, _d;
        const services = Array.isArray(item.services) ? item.services : [];
        const serviceTitle = services.map((s) => s.title).filter(Boolean).join(', ') || 'Atendimento';
        let hasIncompleteData = false;
        let totalPrice = 0;
        let totalDuration = 0;
        if (item.totalPriceInCents != null) {
            totalPrice = item.totalPriceInCents;
        }
        else if (services.length > 0) {
            for (const s of services) {
                if (s.priceInCents == null) {
                    hasIncompleteData = true;
                }
                else {
                    totalPrice += s.priceInCents;
                }
            }
        }
        else {
            hasIncompleteData = true;
        }
        if (item.totalDurationInMinutes != null) {
            totalDuration = item.totalDurationInMinutes;
        }
        else if (services.length > 0) {
            for (const s of services) {
                if (s.durationInMinutes == null) {
                    hasIncompleteData = true;
                }
                else {
                    totalDuration += s.durationInMinutes;
                }
            }
        }
        else {
            hasIncompleteData = true;
        }
        const rawStatus = (item.status || '').toUpperCase();
        const status = VALID_STATUSES.has(rawStatus)
            ? rawStatus
            : 'UNKNOWN';
        if (hasIncompleteData) {
            totalPrice = null;
            totalDuration = null;
        }
        const dateStr = item.date
            ? (typeof item.date === 'string' ? item.date.split('T')[0] : item.date.toISOString().split('T')[0])
            : today;
        return {
            id: item.id,
            date: dateStr,
            customerName: ((_b = (_a = item.customer) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.trim()) || 'Cliente',
            customerPhone: ((_d = (_c = item.customer) === null || _c === void 0 ? void 0 : _c.phoneNumber) === null || _d === void 0 ? void 0 : _d.trim()) || '',
            customerAvatarUrl: null,
            serviceTitle,
            servicePriceInCents: totalPrice,
            durationMinutes: totalDuration,
            barbermanId: item.barbermanId || '',
            barbermanName: item.barbermanName || '',
            scheduledTime: normalizeTime(item.startTime),
            status,
            hasIncompleteData,
        };
    });
    appointments.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    return appointments;
}

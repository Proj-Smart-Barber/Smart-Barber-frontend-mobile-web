import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSession, getOperationalContext } from '../../auth';
import { useUnitBookings } from '../../bookings/model/use-unit-bookings';
import { useOwnerReviewSummary } from '../../reviews';
import { projectDashboardAppointments } from '../api/dashboard.http';
import { formatCurrency, getGreetingByHour, mapStatusBadgeTone, mapStatusLabel, } from './dashboard.helpers';
export function useDashboardViewModel() {
    var _a, _b, _c, _d, _e, _f;
    const router = useRouter();
    const session = useSession();
    const { staff, signOut, restoreSession } = session;
    const [filter, setFilter] = useState('ALL');
    const context = getOperationalContext(session);
    const isOwner = (context === null || context === void 0 ? void 0 : context.role) === 'OWNER';
    const role = isOwner ? 'OWNER' : 'BARBER';
    const unit = useUnitBookings(context);
    const shopId = (_a = session.barbershop) === null || _a === void 0 ? void 0 : _a.id;
    const { data: reviewSummary } = useOwnerReviewSummary(shopId, { source: 'ALL' }, { enabled: Boolean(isOwner && shopId) });
    const rawAppointments = useMemo(() => projectDashboardAppointments(unit.items, unit.selectedDate), [unit.items, unit.selectedDate]);
    const metrics = unit.summary ? {
        totalRevenueInCents: unit.summary.hasIncompleteData || unit.summary.totalRevenueInCents === null ? null : unit.summary.totalRevenueInCents,
        totalAppointments: (_b = unit.summary.totalBookings) !== null && _b !== void 0 ? _b : null,
    } : undefined;
    // Filtra lista de agendamentos para a timeline
    const appointments = rawAppointments.filter((a) => {
        if (filter === 'ALL')
            return true;
        if (filter === 'PENDING') {
            return a.status === 'WAITING' || a.status === 'CONFIRMED' || a.status === 'IN_SERVICE';
        }
        if (filter === 'DONE') {
            return a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'NO_SHOW';
        }
        return true;
    });
    const nextAppointment = unit.nextAppointment ? (_c = rawAppointments.find(a => a.id === unit.nextAppointment.id)) !== null && _c !== void 0 ? _c : null : null;
    // Prévia enxuta do dia: até 3 agendamentos, excluindo o destaque atual
    const previewAppointments = useMemo(() => {
        const remaining = nextAppointment
            ? rawAppointments.filter((a) => a.id !== nextAppointment.id)
            : rawAppointments;
        return remaining.slice(0, 3);
    }, [rawAppointments, nextAppointment]);
    const greeting = `${getGreetingByHour(new Date().getHours())}, ${(_e = (_d = staff === null || staff === void 0 ? void 0 : staff.name) === null || _d === void 0 ? void 0 : _d.split(' ')[0]) !== null && _e !== void 0 ? _e : 'Profissional'}`;
    // Resumo compacto do dia: no máximo dois indicadores essenciais, sem duplicar o próximo horário
    const metricCards = [];
    if (metrics) {
        if (isOwner) {
            metricCards.push({
                id: 'revenue',
                title: 'Valores das Reservas',
                value: formatCurrency(metrics.totalRevenueInCents),
                subtitle: `Soma das reservas no filtro (${metrics.totalAppointments} agendamento(s))`,
                tone: 'brand',
                iconName: 'cash-outline',
            }, {
                id: 'total',
                title: 'Total de Agendamentos',
                value: metrics.totalAppointments === null ? 'A confirmar' : `${metrics.totalAppointments}`,
                subtitle: metrics.totalAppointments === null ? 'Resumo indisponível' : metrics.totalAppointments > 0 ? 'Horários reservados' : 'Nenhum agendamento hoje',
                tone: 'neutral',
                iconName: 'calendar-outline',
            });
            if (reviewSummary === null || reviewSummary === void 0 ? void 0 : reviewSummary.metrics) {
                const avg = reviewSummary.metrics.averageRating;
                metricCards.push({
                    id: 'reviews',
                    title: 'Avaliações',
                    value: avg !== null ? `${avg.toFixed(1)} ★` : 'Sem notas',
                    subtitle: `${reviewSummary.metrics.reviewCount} avaliaç${reviewSummary.metrics.reviewCount === 1 ? 'ão' : 'ões'} • Ver painel`,
                    tone: 'brand',
                    iconName: 'star-outline',
                    onPress: () => router.push('/(app)/reviews'),
                });
            }
        }
        else {
            metricCards.push({
                id: 'appointments',
                title: 'Meus Agendamentos Hoje',
                value: metrics.totalAppointments === null ? 'A confirmar' : `${metrics.totalAppointments}`,
                subtitle: metrics.totalAppointments === null ? 'Resumo indisponível' : metrics.totalAppointments > 0 ? 'Horários reservados' : 'Agenda livre hoje',
                tone: 'brand',
                iconName: 'cut-outline',
            }, {
                id: 'revenue',
                title: 'Valores das Reservas',
                value: formatCurrency(metrics.totalRevenueInCents),
                subtitle: 'Soma das reservas no filtro',
                tone: 'success',
                iconName: 'wallet-outline',
            });
        }
    }
    const isLoading = unit.isLoading || unit.clockStatus === 'syncing';
    const isError = !context || unit.isError || unit.clockStatus === 'error';
    const handleUpdateStatus = (_id, _status) => { };
    const handleRefetch = () => { void unit.refetch(); void restoreSession(); };
    return {
        staff,
        isOwner: role === 'OWNER',
        greeting,
        metricCards,
        appointments,
        previewAppointments,
        totalCount: (_f = unit.total) !== null && _f !== void 0 ? _f : rawAppointments.length,
        isIndeterminate: unit.isPartial || unit.clockStatus !== 'valid',
        nextAppointment,
        filter,
        setFilter,
        isLoading,
        isError,
        isUpdatingStatus: false,
        handleUpdateStatus,
        handleRefetch,
        signOut,
        mapStatusLabel,
        mapStatusBadgeTone,
        formatCurrency,
    };
}

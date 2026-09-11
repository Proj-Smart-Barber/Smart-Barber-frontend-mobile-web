import type {
  AppointmentStatus,
  DashboardAppointment,
  DashboardMetrics,
  IDashboardRepository,
} from './dashboard.contract';

export const SEED_BARBER_ID = 'e18f23b3-0a0e-4c1d-bf77-571f0559c29e';

const INITIAL_MOCK_APPOINTMENTS: DashboardAppointment[] = [
  {
    id: 'apt-001',
    customerName: 'Ana Pereira',
    customerPhone: '(11) 99999-1234',
    serviceTitle: 'Corte de cabelo',
    servicePriceInCents: 4000,
    durationMinutes: 45,
    barbermanId: SEED_BARBER_ID, // João Souza (Seed)
    barbermanName: 'João Souza',
    scheduledTime: '09:00',
    status: 'COMPLETED',
  },
  {
    id: 'apt-002',
    customerName: 'Lucas Mendes',
    customerPhone: '(11) 98765-4321',
    serviceTitle: 'Barba Terapia com Toalha Quente',
    servicePriceInCents: 4500,
    durationMinutes: 30,
    barbermanId: SEED_BARBER_ID,
    barbermanName: 'João Souza',
    scheduledTime: '10:00',
    status: 'COMPLETED',
  },
  {
    id: 'apt-003',
    customerName: 'Rafael Guimarães',
    customerPhone: '(11) 97777-8888',
    serviceTitle: 'Combo Cabelo + Barba Alinhada',
    servicePriceInCents: 8000,
    durationMinutes: 60,
    barbermanId: SEED_BARBER_ID,
    barbermanName: 'João Souza',
    scheduledTime: '11:15',
    status: 'IN_SERVICE',
  },
  {
    id: 'apt-004',
    customerName: 'Guilherme Castro',
    customerPhone: '(11) 96666-5555',
    serviceTitle: 'Degradê Navalhado + Pigmentação',
    servicePriceInCents: 6500,
    durationMinutes: 45,
    barbermanId: 'barber-outro',
    barbermanName: 'Marcos Barbeiro',
    scheduledTime: '13:00',
    status: 'CONFIRMED',
  },
  {
    id: 'apt-005',
    customerName: 'Thiago Oliveira',
    customerPhone: '(11) 95555-4444',
    serviceTitle: 'Corte Social na Tesoura',
    servicePriceInCents: 5000,
    durationMinutes: 40,
    barbermanId: SEED_BARBER_ID,
    barbermanName: 'João Souza',
    scheduledTime: '14:30',
    status: 'CONFIRMED',
  },
  {
    id: 'apt-006',
    customerName: 'Bruno Vasconcelos',
    customerPhone: '(11) 94444-3333',
    serviceTitle: 'Acabamento & Sobrancelha',
    servicePriceInCents: 3000,
    durationMinutes: 25,
    barbermanId: SEED_BARBER_ID,
    barbermanName: 'João Souza',
    scheduledTime: '16:00',
    status: 'WAITING',
  },
];

export class DashboardMockAdapter implements IDashboardRepository {
  private appointments: DashboardAppointment[] = [...INITIAL_MOCK_APPOINTMENTS];

  async getMetrics(params: { role: 'OWNER' | 'BARBER'; staffId: string }): Promise<DashboardMetrics> {
    const isOwner = params.role === 'OWNER';
    const list = isOwner
      ? this.appointments
      : this.appointments.filter(
          (a) => a.barbermanId === params.staffId || a.barbermanId === SEED_BARBER_ID,
        );

    const totalRevenue = list.reduce((acc, curr) => acc + curr.servicePriceInCents, 0);
    const completed = list.filter((a) => a.status === 'COMPLETED').length;
    const total = list.length;
    const occupancyRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    // Comissão estimada padrão de 50% para barbeiros
    const commission = Math.round(totalRevenue * 0.5);

    return {
      totalRevenueInCents: totalRevenue,
      targetRevenueInCents: isOwner ? 45000 : 25000, // R$ 450,00 ou R$ 250,00
      estimatedCommissionInCents: commission,
      totalAppointments: total,
      completedAppointments: completed,
      occupancyRatePercent: occupancyRate,
    };
  }

  async getTodayAppointments(params: {
    role: 'OWNER' | 'BARBER';
    staffId: string;
  }): Promise<DashboardAppointment[]> {
    if (params.role === 'OWNER') {
      return [...this.appointments];
    }
    return this.appointments.filter(
      (a) => a.barbermanId === params.staffId || a.barbermanId === SEED_BARBER_ID,
    );
  }

  async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
  ): Promise<DashboardAppointment> {
    const index = this.appointments.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Agendamento com id ${id} não encontrado.`);
    }

    const updated = {
      ...this.appointments[index],
      status,
    };

    this.appointments[index] = updated;
    return updated;
  }
}

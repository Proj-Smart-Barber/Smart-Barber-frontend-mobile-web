import type { BookingDto, FetchUnitBookingsResponse } from '../api/bookings.dto';
import type { OperationalContext } from '@/features/auth';

export interface UnitBookingsFilter {
  date?: string; // Data civil "yyyy-MM-dd"
  barbermanId?: string; // ID do profissional (somente OWNER pode filtrar; BARBERMAN é forçado ao próprio ID)
  status?: string; // Filtro de status opcional
}

export interface UnitBookingsSummary {
  totalBookings: number | null;
  totalRevenueInCents: number | null;
  hasIncompleteData?: boolean;
}

export interface UnitNextAppointment {
  id: string;
  startTime: string;
  customerName: string;
  serviceTitle: string;
  professionalName?: string;
}

export interface UnitBookingsState {
  // Contexto e autorização
  context: OperationalContext | null;
  isAuthorized: boolean;
  isUnitActive: boolean;

  // Itens e paginação
  items: BookingDto[];
  page: number;
  limit: number;
  total: number | null;
  hasNext: boolean;
  hasNextPage: boolean;
  isPartial: boolean; // Verdadeiro quando hasNext é true ou conjunto incompleto
  summary: UnitBookingsSummary | null;

  // Tempo autoritativo
  clockStatus: 'syncing' | 'valid' | 'expired' | 'error';
  unitTodayDate: string | null;
  selectedDate: string;
  today: string;
  nextAppointment: UnitNextAppointment | null;
  isNextAppointmentIndeterminate: boolean;
  nextAppointmentState: 'found' | 'none' | 'indeterminate';

  // Profissional / Filtro
  effectiveBarbermanId?: string;
  selectedBarbermanId?: string;
  selectedProfessionalId?: string;

  // Estados de consulta e geração
  generation: number;
  isLoading: boolean;
  isFetching: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  loadMoreError: string | null;
  isError: boolean;
  error: Error | null;
  lastAcceptedSyncAtMs: number | null;
  isDataStale: boolean;
  isSlowSync: boolean;

  // Ações
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  followToday: () => void;
  setSelectedDate: (date: string) => void;
  setBarbermanId: (barbermanId: string | undefined) => void;
  filterByProfessional: (barbermanId: string | undefined) => void;
}

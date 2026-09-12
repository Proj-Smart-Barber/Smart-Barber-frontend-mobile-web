/**
 * Normalização DTO -> domínio da Agenda.
 * Entradas inválidas (id ausente, horário fora de "HH:mm", payload
 * malformado) são descartadas de forma defensiva — a UI nunca recebe
 * payload bruto. A saída já sai em ordem cronológica.
 */
import type {
  AgendaBooking,
  AgendaBookingCustomer,
  AgendaBookingDetails,
  AgendaBookingService,
} from './agenda.contract';
import type {
  AgendaBookingCustomerHttpDto,
  AgendaBookingDetailsHttpDto,
  AgendaBookingHttpDto,
  AgendaBookingServiceHttpDto,
  AgendaDailyScheduleDetailsResponseDto,
  AgendaDailyScheduleResponseDto,
} from './agenda.dto';
import { sortBookingsChronologically } from '../model/agenda.helpers';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function mapBookingBase(dto: AgendaBookingHttpDto): AgendaBooking | null {
  if (!isNonEmptyString(dto?.id)) return null;
  if (!isValidTime(dto?.startTime) || !isValidTime(dto?.endTime)) return null;

  return {
    id: dto.id,
    barbershopId: typeof dto.barbershopId === 'string' ? dto.barbershopId : '',
    barbermanId: typeof dto.barbermanId === 'string' ? dto.barbermanId : '',
    shoppingCartId: typeof dto.shoppingCartId === 'string' ? dto.shoppingCartId : '',
    date: typeof dto.date === 'string' ? dto.date : '',
    startTime: dto.startTime,
    endTime: dto.endTime,
    createdAt: typeof dto.createdAt === 'string' ? dto.createdAt : null,
  };
}

function mapService(dto: AgendaBookingServiceHttpDto): AgendaBookingService | null {
  if (!isNonEmptyString(dto?.id) || !isNonEmptyString(dto?.title)) return null;
  return {
    id: dto.id,
    title: dto.title,
    priceInCents: isFiniteNumber(dto.priceInCents) ? dto.priceInCents : 0,
    durationInMinutes: isFiniteNumber(dto.durationInMinutes) ? dto.durationInMinutes : 0,
  };
}

function mapCustomer(dto: AgendaBookingCustomerHttpDto): AgendaBookingCustomer | null {
  if (!isNonEmptyString(dto?.id) || !isNonEmptyString(dto?.name)) return null;
  return {
    id: dto.id,
    name: dto.name,
    phoneNumber: typeof dto.phoneNumber === 'string' ? dto.phoneNumber : '',
  };
}

export function mapBookingDto(dto: AgendaBookingHttpDto): AgendaBooking | null {
  return mapBookingBase(dto);
}

export function mapBookingDetailsDto(
  dto: AgendaBookingDetailsHttpDto,
): AgendaBookingDetails | null {
  const base = mapBookingBase(dto);
  if (!base) return null;

  const customer = mapCustomer(dto?.customer);
  if (!customer) return null;

  const services: AgendaBookingService[] = [];
  for (const raw of Array.isArray(dto?.services) ? dto.services : []) {
    const service = mapService(raw);
    if (service) services.push(service);
  }

  return { ...base, customer, services };
}

export function mapDailyScheduleDto(
  dto: AgendaDailyScheduleResponseDto,
): AgendaBooking[] {
  const bookings: AgendaBooking[] = [];
  for (const raw of Array.isArray(dto?.bookings) ? dto.bookings : []) {
    const booking = mapBookingDto(raw);
    if (booking) bookings.push(booking);
  }
  return sortBookingsChronologically(bookings);
}

export function mapDailyScheduleDetailsDto(
  dto: AgendaDailyScheduleDetailsResponseDto,
): AgendaBookingDetails[] {
  const bookings: AgendaBookingDetails[] = [];
  for (const raw of Array.isArray(dto?.bookings) ? dto.bookings : []) {
    const booking = mapBookingDetailsDto(raw);
    if (booking) bookings.push(booking);
  }
  return sortBookingsChronologically(bookings);
}

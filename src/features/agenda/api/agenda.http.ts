/**
 * Adapter HTTP da Agenda do barbeiro (API de Booking).
 *
 * O `barbermanId` NÃO vai no path: a API o resolve pelo JWT (`sub`).
 * O cabeçalho `Authorization: Bearer <token>` é anexado automaticamente
 * pelo `httpClient` a partir do token storage.
 *
 * O parâmetro `date` é sempre enviado como "yyyy-MM-dd" em UTC.
 */
import { httpClient } from '@/shared/api';
import type {
  AgendaBooking,
  AgendaBookingDetails,
  IBookingScheduleRepository,
} from './agenda.contract';
import type {
  AgendaCancelBookingResponseDto,
  AgendaDailyScheduleDetailsResponseDto,
  AgendaDailyScheduleResponseDto,
} from './agenda.dto';
import { mapBookingDto, mapDailyScheduleDetailsDto, mapDailyScheduleDto } from './agenda.mapper';
import { formatUtcDateQuery } from '../model/agenda.helpers';

const SCHEDULE_PATH = '/api/booking/barberman/schedule';
const SCHEDULE_DETAILS_PATH = '/api/booking/barberman/schedule/details';
const CANCEL_PATH = '/api/booking';

export class BookingScheduleHttpAdapter implements IBookingScheduleRepository {
  async getDailySchedule({ date }: { date: string }): Promise<AgendaBooking[]> {
    const response = await httpClient.get<AgendaDailyScheduleResponseDto>(SCHEDULE_PATH, {
      params: { date: formatUtcDateQuery(date) },
    });
    return mapDailyScheduleDto(response);
  }

  async getDailyScheduleWithDetails({
    date,
  }: {
    date: string;
  }): Promise<AgendaBookingDetails[]> {
    const response = await httpClient.get<AgendaDailyScheduleDetailsResponseDto>(
      SCHEDULE_DETAILS_PATH,
      { params: { date: formatUtcDateQuery(date) } },
    );
    return mapDailyScheduleDetailsDto(response);
  }

  async cancelBooking(bookingId: string): Promise<AgendaBooking> {
    const response = await httpClient.delete<AgendaCancelBookingResponseDto>(
      `${CANCEL_PATH}/${encodeURIComponent(bookingId)}/cancel`,
    );

    const booking = mapBookingDto(response?.booking);
    if (!booking) {
      throw new Error('Resposta inválida do servidor ao cancelar o agendamento.');
    }

    return booking;
  }
}

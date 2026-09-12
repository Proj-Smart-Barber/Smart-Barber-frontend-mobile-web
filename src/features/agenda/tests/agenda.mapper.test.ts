import { describe, expect, it } from 'vitest';
import {
  mapBookingDetailsDto,
  mapBookingDto,
  mapDailyScheduleDetailsDto,
  mapDailyScheduleDto,
} from '../api/agenda.mapper';
import type {
  AgendaBookingDetailsHttpDto,
  AgendaBookingHttpDto,
  AgendaDailyScheduleDetailsResponseDto,
  AgendaDailyScheduleResponseDto,
} from '../api/agenda.dto';

function buildBookingDto(
  overrides: Partial<AgendaBookingHttpDto> = {},
): AgendaBookingHttpDto {
  return {
    id: 'booking-1',
    barbershopId: 'shop-1',
    barbermanId: 'barber-1',
    shoppingCartId: 'cart-1',
    date: '2026-09-12T00:00:00.000Z',
    startTime: '09:00',
    endTime: '09:45',
    createdAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

function buildDetailsDto(
  overrides: Partial<AgendaBookingDetailsHttpDto> = {},
): AgendaBookingDetailsHttpDto {
  return {
    ...buildBookingDto(),
    customer: { id: 'customer-1', name: 'Ana Pereira', phoneNumber: '(11) 99999-1234' },
    services: [
      { id: 'service-1', title: 'Corte de cabelo', priceInCents: 4000, durationInMinutes: 45 },
    ],
    ...overrides,
  };
}

describe('Agenda Mapper — agenda simples', () => {
  it('deve mapear o envelope de bookings e ordenar por horário', () => {
    const dto: AgendaDailyScheduleResponseDto = {
      bookings: [
        buildBookingDto({ id: 'b-2', startTime: '11:00', endTime: '11:30' }),
        buildBookingDto({ id: 'b-1', startTime: '09:00', endTime: '09:45' }),
      ],
    };

    const bookings = mapDailyScheduleDto(dto);
    expect(bookings.map((booking) => booking.id)).toEqual(['b-1', 'b-2']);
    expect(bookings[0]).toMatchObject({
      startTime: '09:00',
      endTime: '09:45',
      barbermanId: 'barber-1',
    });
  });

  it('deve descartar bookings com id ausente ou horário inválido', () => {
    const dto = {
      bookings: [
        buildBookingDto(),
        buildBookingDto({ id: '' }),
        buildBookingDto({ startTime: '25:00' }),
        buildBookingDto({ endTime: 'ok' }),
      ],
    } as AgendaDailyScheduleResponseDto;

    expect(mapDailyScheduleDto(dto)).toHaveLength(1);
  });

  it('deve tratar payload sem lista de bookings como vazio', () => {
    expect(
      mapDailyScheduleDto(undefined as unknown as AgendaDailyScheduleResponseDto),
    ).toEqual([]);
    expect(mapDailyScheduleDto({} as AgendaDailyScheduleResponseDto)).toEqual([]);
  });

  it('deve normalizar date e createdAt ausentes', () => {
    const booking = mapBookingDto(
      buildBookingDto({
        date: undefined as unknown as string,
        createdAt: undefined as unknown as string,
      }),
    );

    expect(booking?.date).toBe('');
    expect(booking?.createdAt).toBeNull();
  });
});

describe('Agenda Mapper — agenda detalhada', () => {
  it('deve mapear cliente e serviços', () => {
    const booking = mapBookingDetailsDto(buildDetailsDto());

    expect(booking).not.toBeNull();
    expect(booking?.customer).toEqual({
      id: 'customer-1',
      name: 'Ana Pereira',
      phoneNumber: '(11) 99999-1234',
    });
    expect(booking?.services).toEqual([
      { id: 'service-1', title: 'Corte de cabelo', priceInCents: 4000, durationInMinutes: 45 },
    ]);
  });

  it('deve descartar detalhes sem cliente válido', () => {
    expect(
      mapBookingDetailsDto(
        buildDetailsDto({ customer: { id: '', name: 'X', phoneNumber: '' } }),
      ),
    ).toBeNull();

    expect(
      mapBookingDetailsDto(
        buildDetailsDto({
          customer: undefined as unknown as AgendaBookingDetailsHttpDto['customer'],
        }),
      ),
    ).toBeNull();
  });

  it('deve filtrar serviços inválidos mantendo o booking', () => {
    const booking = mapBookingDetailsDto(
      buildDetailsDto({
        services: [
          { id: 's-1', title: 'Corte', priceInCents: 4000, durationInMinutes: 45 },
          { id: '', title: 'Inválido', priceInCents: 1000, durationInMinutes: 10 },
        ],
      }),
    );

    expect(booking?.services).toHaveLength(1);
  });

  it('deve mapear o envelope detalhado ordenando por horário', () => {
    const dto: AgendaDailyScheduleDetailsResponseDto = {
      bookings: [
        buildDetailsDto({ id: 'b-2', startTime: '10:00', endTime: '10:30' }),
        buildDetailsDto({ id: 'b-1', startTime: '08:00', endTime: '08:30' }),
      ],
    };

    expect(mapDailyScheduleDetailsDto(dto).map((booking) => booking.id)).toEqual(['b-1', 'b-2']);
  });

  it('deve tratar payload detalhado malformado como vazio', () => {
    expect(
      mapDailyScheduleDetailsDto(undefined as unknown as AgendaDailyScheduleDetailsResponseDto),
    ).toEqual([]);
  });
});

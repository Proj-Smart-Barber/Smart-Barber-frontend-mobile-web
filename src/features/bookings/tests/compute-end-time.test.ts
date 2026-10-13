import { describe, expect, it } from 'vitest';
import type { BookingService } from '../api/bookings.contract';
import {
  computeEndTime,
  isValidTimeFormat,
  minutesToTime,
  timeToMinutes,
  totalServicesDurationInMinutes,
} from '../model/compute-end-time';

const service = (durationInMinutes: number | null): BookingService => ({
  id: 'svc-1',
  title: 'Corte de cabelo',
  priceInCents: 6000,
  durationInMinutes,
});

describe('compute-end-time', () => {
  describe('isValidTimeFormat', () => {
    it('aceita horários válidos', () => {
      expect(isValidTimeFormat('00:00')).toBe(true);
      expect(isValidTimeFormat('09:30')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
    });

    it('rejeita formatos inválidos', () => {
      expect(isValidTimeFormat('24:00')).toBe(false);
      expect(isValidTimeFormat('9:30')).toBe(false);
      expect(isValidTimeFormat('09:60')).toBe(false);
      expect(isValidTimeFormat('0930')).toBe(false);
      expect(isValidTimeFormat('')).toBe(false);
    });
  });

  describe('timeToMinutes / minutesToTime', () => {
    it('converte entre "HH:mm" e minutos', () => {
      expect(timeToMinutes('09:30')).toBe(570);
      expect(minutesToTime(570)).toBe('09:30');
      expect(minutesToTime(0)).toBe('00:00');
    });

    it('mantém minutos dentro do intervalo de um dia', () => {
      expect(minutesToTime(1500)).toBe('23:59');
      expect(minutesToTime(-5)).toBe('00:00');
    });
  });

  describe('totalServicesDurationInMinutes', () => {
    it('soma as durações conhecidas e ignora nulas', () => {
      expect(totalServicesDurationInMinutes([service(30), service(null), service(15)])).toBe(45);
    });

    it('retorna zero sem serviços', () => {
      expect(totalServicesDurationInMinutes([])).toBe(0);
    });
  });

  describe('computeEndTime', () => {
    it('calcula o término a partir da duração dos serviços', () => {
      expect(
        computeEndTime({
          startTime: '09:00',
          services: [service(30)],
          fallbackDurationInMinutes: 10,
        }),
      ).toBe('09:30');
    });

    it('usa a duração atual como fallback quando serviços não têm duração', () => {
      expect(
        computeEndTime({
          startTime: '09:00',
          services: [service(null)],
          fallbackDurationInMinutes: 45,
        }),
      ).toBe('09:45');
    });

    it('retorna null quando a soma cruza a meia-noite', () => {
      expect(
        computeEndTime({
          startTime: '23:40',
          services: [service(30)],
          fallbackDurationInMinutes: 10,
        }),
      ).toBeNull();
    });

    it('retorna null sem duração conhecida', () => {
      expect(
        computeEndTime({
          startTime: '09:00',
          services: [],
          fallbackDurationInMinutes: 0,
        }),
      ).toBeNull();
    });

    it('retorna null para horário de início inválido', () => {
      expect(
        computeEndTime({
          startTime: '25:00',
          services: [service(30)],
          fallbackDurationInMinutes: 10,
        }),
      ).toBeNull();
    });
  });
});

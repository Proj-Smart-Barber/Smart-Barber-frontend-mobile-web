/**
 * Adapter HTTP da Disponibilidade — stub.
 *
 * Preencher quando o backend publicar os endpoints do contrato v1:
 *   GET  /barbershops/:id
 *   GET  /barbershops/:id/schedules
 *   PUT  /barbershops/:id/schedules
 *   GET  /barbershops/:id/schedule-exceptions
 *   POST /barbershops/:id/schedule-exceptions
 *   PATCH /barbershops/:id/schedule-exceptions/:exceptionId
 *   DELETE /barbershops/:id/schedule-exceptions/:exceptionId
 *   GET  /barbershops/:id/availability?serviceId&date&barbermanId
 *
 * O fluxo esperado: httpClient.get(...) -> mapper -> domínio.
 * NÃO recalcular jornada, exceções ou disponibilidade no cliente.
 */
import type {
  AvailabilityException,
  AvailabilitySlot,
  IAvailabilityRepository,
  WeeklyScheduleEntry,
} from './availability.contract';
import type { Barbershop } from '@/entities/barbershop';

export class AvailabilityHttpAdapter implements IAvailabilityRepository {
  async getBarbershop(_barbershopId: string): Promise<Barbershop> {
    throw new Error('AvailabilityHttpAdapter: getBarbershop ainda não implementado — aguarda endpoint /barbershops/:id.');
  }

  async getWeeklySchedule(_barbershopId: string, _barbermanId?: string): Promise<WeeklyScheduleEntry[]> {
    throw new Error('AvailabilityHttpAdapter: getWeeklySchedule ainda não implementado — aguarda endpoint GET /barbershops/:id/schedules.');
  }

  async saveWeeklySchedule(_barbershopId: string, _entries: Omit<WeeklyScheduleEntry, 'id'>[]): Promise<WeeklyScheduleEntry[]> {
    throw new Error('AvailabilityHttpAdapter: saveWeeklySchedule ainda não implementado — aguarda endpoint PUT /barbershops/:id/schedules.');
  }

  async listExceptions(_barbershopId: string, _barbermanId?: string): Promise<AvailabilityException[]> {
    throw new Error('AvailabilityHttpAdapter: listExceptions ainda não implementado — aguarda endpoint GET /barbershops/:id/schedule-exceptions.');
  }

  async createException(_barbershopId: string, _exception: Omit<AvailabilityException, 'id'>): Promise<AvailabilityException> {
    throw new Error('AvailabilityHttpAdapter: createException ainda não implementado — aguarda endpoint POST /barbershops/:id/schedule-exceptions.');
  }

  async updateException(_barbershopId: string, _exceptionId: string, _exception: Partial<Omit<AvailabilityException, 'id'>>): Promise<AvailabilityException> {
    throw new Error('AvailabilityHttpAdapter: updateException ainda não implementado — aguarda endpoint PATCH /barbershops/:id/schedule-exceptions/:exceptionId.');
  }

  async removeException(_barbershopId: string, _exceptionId: string): Promise<void> {
    throw new Error('AvailabilityHttpAdapter: removeException ainda não implementado — aguarda endpoint DELETE /barbershops/:id/schedule-exceptions/:exceptionId.');
  }

  async getCalculatedAvailability(_barbershopId: string, _params: { serviceId: string; date: string; barbermanId?: string }): Promise<AvailabilitySlot[]> {
    throw new Error('AvailabilityHttpAdapter: getCalculatedAvailability ainda não implementado — aguarda endpoint GET /barbershops/:id/availability.');
  }
}

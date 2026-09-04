import { describe, it, expect } from 'vitest';
import { mapStaffDtoToEntity } from '../api/auth.mapper';

describe('mapStaffDtoToEntity', () => {
  it('deve mapear DTO com role OWNER corretamente', () => {
    const dto = {
      id: 'uuid-123',
      name: 'Carlos Silva',
      email: 'owner@smartbarber.com',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'OWNER',
    };

    const entity = mapStaffDtoToEntity(dto);
    expect(entity).toEqual({
      id: 'uuid-123',
      name: 'Carlos Silva',
      email: 'owner@smartbarber.com',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'OWNER',
    });
  });

  it('deve normalizar role BARBERMAN para BARBER e tratar avatarUrl ausente como null', () => {
    const dto = {
      id: 'uuid-456',
      name: 'João Barbeiro',
      email: 'barber@smartbarber.com',
      role: 'BARBERMAN',
    };

    const entity = mapStaffDtoToEntity(dto);
    expect(entity.role).toBe('BARBER');
    expect(entity.avatarUrl).toBeNull();
  });
});

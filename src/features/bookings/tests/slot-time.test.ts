import {it,expect} from 'vitest';
import {formatSlotTime} from '../lib/slot-time';
it('renders the selected instant in the unit timezone regardless of the device timezone',()=>{
 expect(formatSlotTime('2026-11-01T13:00:00.000Z','America/Sao_Paulo')).toBe('10:00');
 expect(formatSlotTime('2026-11-01T10:00:00-03:00','America/Sao_Paulo')).toBe('10:00');
 expect(()=>formatSlotTime('2026-11-01T13:00:00.000Z','')).toThrow();
});

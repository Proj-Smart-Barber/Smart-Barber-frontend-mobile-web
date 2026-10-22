// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BookingSlotPicker } from '../ui/BookingSlotPicker';

vi.mock('@/shared/theme', () => ({ useTheme: () => ({spacing:Array(20).fill(8),radius:{md:12},
  colors:{text:{primary:'#fff',secondary:'#ccc',muted:'#888'},brand:{primary:'#f00'},border:{default:'#777'}}}) }));
vi.mock('@/shared/navigation/LiquidGlassView', () => ({LiquidGlassView:({children}:{children:React.ReactNode}) => <div>{children}</div>}));
vi.mock('@/shared/ui', () => ({Text:({children}:{children:React.ReactNode}) => <span>{children}</span>,
  Skeleton:() => null, EmptyState:({title}:{title:string}) => <span>{title}</span>}));
afterEach(() => {cleanup();vi.useRealTimers();});

it('uses the server civil day in the shop timezone and advances after local midnight', () => {
  vi.useFakeTimers(); vi.setSystemTime('2040-01-01T00:00:00Z');
  const props = {timezone:'America/Sao_Paulo',selectedDate:null,selectedSlot:null,availabilitySlots:[],onSelectDate:vi.fn(),onSelectSlot:vi.fn()};
  const {rerender} = render(<BookingSlotPicker {...props} serverNow={Date.parse('2026-10-22T02:59:59Z')} />);
  expect(screen.getByRole('button',{name:'Data 2026-10-21'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Data 2040-01-01'})).toBeNull();
  rerender(<BookingSlotPicker {...props} serverNow={Date.parse('2026-10-22T03:00:00Z')} />);
  expect(screen.queryByRole('button',{name:'Data 2026-10-21'})).toBeNull();
  expect(screen.getByRole('button',{name:'Data 2026-10-22'})).toBeTruthy();
});

it('does not offer dates based on the device clock without a server reference', () => {
  render(<BookingSlotPicker timezone="America/Sao_Paulo" serverNow={null} selectedDate={null} selectedSlot={null}
    availabilitySlots={[]} onSelectDate={vi.fn()} onSelectSlot={vi.fn()} />);
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(screen.getByText('Sincronizando a data da barbearia…')).toBeTruthy();
});

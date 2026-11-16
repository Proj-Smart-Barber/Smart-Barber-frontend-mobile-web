import React, { useState } from 'react';
import { View } from 'react-native';
import { AgendaDatePicker } from '@/features/agenda';
import { addDays, getCivilDateInTimezone } from '@/shared/lib/civil-time';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui';
import type { DashboardPeriod } from '../model/dashboard-period';

interface Props {
  selectedDate: string;
  todayIso: string;
  label: string;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  onSelectDate: (date: string) => void;
  onToday: () => void;
}

export function DashboardDateFilter({ selectedDate, todayIso, label, period, onPeriodChange, onSelectDate, onToday }: Props) {
  const { spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const today = todayIso || getCivilDateInTimezone(Date.now());
  const min = addDays(today, -90);
  const max = addDays(today, 90);
  const step = period === 'WEEK' ? 7 : 1;
  const previous = selectedDate ? addDays(selectedDate, -step) : '';
  const next = selectedDate ? addDays(selectedDate, step) : '';
  return <View style={{ gap: spacing[2] }}>
    <View style={{ flexDirection: 'row', gap: spacing[2] }}>
      {(['DAY', 'WEEK'] as const).map(value => <Button key={value}
        title={value === 'DAY' ? 'Dia' : 'Semana'} variant={period === value ? 'primary' : 'outline'}
        accessibilityState={{ selected: period === value }} onPress={() => onPeriodChange(value)} style={{ flex: 1 }} />)}
      <Button title="Hoje" variant="ghost" onPress={onToday} disabled={!todayIso} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
      <Button title="‹" accessibilityLabel={period === 'WEEK' ? 'Semana anterior' : 'Dia anterior'}
        variant="outline" disabled={!previous || previous < min} onPress={() => onSelectDate(previous)} style={{ minWidth: 44 }} />
      <Button title={label} accessibilityLabel={`Selecionar data: ${label}`} variant="outline"
        disabled={!selectedDate} onPress={() => setOpen(true)} style={{ flex: 1 }} />
      <Button title="›" accessibilityLabel={period === 'WEEK' ? 'Próxima semana' : 'Próximo dia'}
        variant="outline" disabled={!next || next > max} onPress={() => onSelectDate(next)} style={{ minWidth: 44 }} />
    </View>
    <AgendaDatePicker visible={open} selectedDate={selectedDate || today} todayIso={today}
      minDateIso={min} maxDateIso={max} onSelectDate={date => { onSelectDate(date); setOpen(false); }} onClose={() => setOpen(false)} />
  </View>;
}

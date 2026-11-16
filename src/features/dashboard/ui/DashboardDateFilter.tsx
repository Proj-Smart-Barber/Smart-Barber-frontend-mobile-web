import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { AgendaDatePicker } from '@/features/agenda';
import { addDays, getCivilDateInTimezone } from '@/shared/lib/civil-time';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui';
import { dashboardDates, dashboardPeriodLabel, type DashboardPeriod } from '../model/dashboard-period';

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
  const { spacing, colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate);
  const [draftPeriod, setDraftPeriod] = useState(period);
  const draftLabel = dashboardPeriodLabel(dashboardDates(draftDate, draftPeriod));
  const today = todayIso || getCivilDateInTimezone(Date.now());
  const min = addDays(today, -90);
  const max = addDays(today, 90);
  const step = draftPeriod === 'WEEK' ? 7 : 1;
  const previous = draftDate ? addDays(draftDate, -step) : '';
  const next = draftDate ? addDays(draftDate, step) : '';
  return <View style={{ gap: spacing[2] }}>
    <Button title="Filtros" accessibilityLabel={`Filtros: ${label}`} variant="outline" onPress={() => { setDraftDate(selectedDate); setDraftPeriod(period); setFiltersOpen(true); }} style={{ alignSelf: 'flex-end', minHeight: 44 }} />
    <Modal visible={filtersOpen} transparent animationType="fade" onRequestClose={() => setFiltersOpen(false)}>
      <Pressable accessibilityLabel="Fechar filtros" onPress={() => setFiltersOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <Pressable onPress={event => event.stopPropagation()} style={{ backgroundColor: colors.background.primary, borderRadius: 20, padding: 16, gap: 12 }}>

    <View style={{ flexDirection: 'row', gap: spacing[2] }}>
      {(['DAY', 'WEEK'] as const).map(value => <Button key={value}
        title={value === 'DAY' ? 'Dia' : 'Semana'} variant={draftPeriod === value ? 'primary' : 'outline'}
        accessibilityState={{ selected: draftPeriod === value }} onPress={() => setDraftPeriod(value)} style={{ flex: 1 }} />)}
      <Button title="Hoje" variant="ghost" onPress={() => { onToday(); setFiltersOpen(false); }} disabled={!todayIso} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
      <Button title="‹" accessibilityLabel={draftPeriod === 'WEEK' ? 'Semana anterior' : 'Dia anterior'}
        variant="outline" disabled={!previous || previous < min} onPress={() => setDraftDate(previous)} style={{ minWidth: 44 }} />
      <Button title={draftLabel} accessibilityLabel={`Selecionar data: ${draftLabel}`} variant="outline"
        disabled={!selectedDate} onPress={() => { setFiltersOpen(false); setOpen(true); }} style={{ flex: 1 }} />
      <Button title="›" accessibilityLabel={draftPeriod === 'WEEK' ? 'Próxima semana' : 'Próximo dia'}
        variant="outline" disabled={!next || next > max} onPress={() => setDraftDate(next)} style={{ minWidth: 44 }} />
    </View>
    <Button title="Aplicar filtros" onPress={() => { onPeriodChange(draftPeriod); onSelectDate(draftDate); setFiltersOpen(false); }} />
        </Pressable>
      </Pressable>
    </Modal>
    <AgendaDatePicker visible={open} selectedDate={draftDate || today} todayIso={today}
      minDateIso={min} maxDateIso={max} onSelectDate={date => { setDraftDate(date); setOpen(false); setFiltersOpen(true); }} onClose={() => setOpen(false)} />
  </View>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, FormField, Text, TextInput } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { AgendaDatePicker, formatDateLabel } from '@/features/agenda';
import type { BookingDetails } from '../api/bookings.contract';
import {
  computeEndTime,
  isValidTimeFormat,
  timeToMinutes,
} from '../model/compute-end-time';
import type { BookingActionResult } from '../model/use-bookings-view-model';

interface EditBookingSheetProps {
  visible: boolean;
  booking: BookingDetails | null;
  todayIso: string;
  minDateIso: string;
  maxDateIso: string;
  isSaving: boolean;
  onSave: (input: {
    bookingId: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => Promise<BookingActionResult>;
  onClose: () => void;
}

function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function nowTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function EditBookingSheet({
  visible,
  booking,
  todayIso,
  minDateIso,
  maxDateIso,
  isSaving,
  onSave,
  onClose,
}: EditBookingSheetProps) {
  const { colors, spacing, radius } = useTheme();
  const [draftDate, setDraftDate] = useState(todayIso);
  const [draftStartTime, setDraftStartTime] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [datePickerFocused, setDatePickerFocused] = useState(false);

  useEffect(() => {
    if (visible && booking) {
      setDraftDate(booking.date);
      setDraftStartTime(booking.startTime);
      setTimeError(null);
      setDateError(null);
      setServerError(null);
      setIsDatePickerOpen(false);
    }
  }, [visible, booking]);

  const fallbackDurationInMinutes = useMemo(() => {
    if (!booking) return 0;
    return Math.max(0, timeToMinutes(booking.endTime) - timeToMinutes(booking.startTime));
  }, [booking]);

  const computedEndTime = useMemo(() => {
    if (!booking || !isValidTimeFormat(draftStartTime)) return null;
    return computeEndTime({
      startTime: draftStartTime,
      services: booking.services,
      fallbackDurationInMinutes,
    });
  }, [booking, draftStartTime, fallbackDurationInMinutes]);

  if (!booking) return null;

  const handleSave = async () => {
    setTimeError(null);
    setDateError(null);
    setServerError(null);

    if (!isValidTimeFormat(draftStartTime)) {
      setTimeError('Use um horário válido entre 00:00 e 23:59.');
      return;
    }

    if (!computedEndTime) {
      setTimeError('Esse horário termina depois da meia-noite. Escolha outro horário.');
      return;
    }

    if (draftDate === todayIso && timeToMinutes(draftStartTime) <= nowTimeMinutes()) {
      setTimeError('Escolha um horário futuro para hoje.');
      return;
    }

    const result = await onSave({
      bookingId: booking.id,
      date: draftDate,
      startTime: draftStartTime,
      endTime: computedEndTime,
    });

    if (result.ok) {
      onClose();
    } else {
      setServerError(result.message);
    }
  };

  const handleSelectDate = (iso: string) => {
    setDraftDate(iso);
    setDateError(null);
    setIsDatePickerOpen(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        accessibilityLabel="Remarcar atendimento"
        onRequestClose={onClose}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing[4],
          }}
        >
          <LiquidGlassView
            variant="form"
            elevated
            style={{ width: '100%', maxWidth: 480 }}
            contentStyle={{ padding: spacing[5], gap: spacing[4] }}
          >
            <View style={{ gap: spacing[1] }}>
              <Text variant="h2" color={colors.text.primary} accessibilityRole="header">
                Remarcar atendimento
              </Text>
              <Text variant="caption" color={colors.text.muted}>
                {booking.customer.name} · {booking.startTime}–{booking.endTime}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing[4] }}
              style={{ width: '100%' }}
            >
              <FormField label="Dia do atendimento" required>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Escolher novo dia"
                  accessibilityHint="Abre o calendário para escolher o dia do atendimento"
                  onPress={() => setIsDatePickerOpen(true)}
                  onFocus={() => setDatePickerFocused(true)}
                  onBlur={() => setDatePickerFocused(false)}
                  style={({ pressed }) => ({
                    minHeight: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: spacing[2],
                    paddingHorizontal: spacing[3],
                    borderRadius: radius.md,
                    borderWidth: datePickerFocused ? 2 : 1,
                    borderColor: datePickerFocused
                      ? colors.border.focus
                      : dateError
                        ? colors.border.error
                        : colors.border.default,
                    backgroundColor: pressed
                      ? colors.surface.selected
                      : colors.surface.input,
                  })}
                >
                  <Text variant="body" color={colors.text.primary} numberOfLines={1}>
                    {formatDateLabel(draftDate)}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.text.secondary}
                  />
                </Pressable>
              </FormField>

              <FormField
                label="Hora de início"
                required
                error={timeError ?? undefined}
                helperText={
                  computedEndTime
                    ? `Termina às ${computedEndTime}`
                    : undefined
                }
              >
                <TextInput
                  value={draftStartTime}
                  onChangeText={(text) => {
                    setDraftStartTime(formatTimeInput(text));
                    setTimeError(null);
                  }}
                  placeholder="HH:mm"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  error={timeError !== null}
                  accessibilityLabel="Hora de início do atendimento"
                  inputMode="numeric"
                />
              </FormField>

              {serverError ? (
                <Text variant="caption" color={colors.feedback.error} accessibilityRole="alert">
                  {serverError}
                </Text>
              ) : null}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <Button
                variant="ghost"
                title="Voltar"
                disabled={isSaving}
                onPress={onClose}
                style={{ flex: 1, minHeight: 44 }}
              />
              <Button
                variant="primary"
                title="Salvar novo horário"
                loadingTitle="Salvando…"
                loading={isSaving}
                disabled={isSaving}
                onPress={() => {
                  void handleSave();
                }}
                style={{ flex: 2, minHeight: 44 }}
              />
            </View>
          </LiquidGlassView>
        </View>
      </Modal>

      <AgendaDatePicker
        visible={isDatePickerOpen}
        selectedDate={draftDate}
        todayIso={todayIso}
        minDateIso={minDateIso}
        maxDateIso={maxDateIso}
        onSelectDate={handleSelectDate}
        onClose={() => setIsDatePickerOpen(false)}
      />
    </>
  );
}

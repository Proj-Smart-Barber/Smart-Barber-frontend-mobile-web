import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert as NativeAlert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../shared/theme';
import { Text, Card, Badge, Button, Spinner, Alert, type BadgeTone } from '../../../shared/ui';
import { useBookingDetail } from '../model/use-booking-detail';
import { BookingActionConfirm } from './BookingActionConfirm';
import { BookingHistory } from './BookingHistory';
import type { BookingActionType } from './BookingActionConfirm';

interface BookingDetailViewProps {
  bookingId: string;
  scope?: 'PERSONAL' | 'UNIT';
  onBack?: () => void;
}

function formatCentsToCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getStatusBadgeConfig(status?: string | null): { label: string; tone: BadgeTone } {
  if (!status) {
    return { label: 'Status não informado', tone: 'neutral' };
  }
  switch (status.toUpperCase()) {
    case 'CONFIRMED':
      return { label: 'Confirmado', tone: 'brand' };
    case 'IN_SERVICE':
      return { label: 'Em atendimento', tone: 'info' };
    case 'COMPLETED':
      return { label: 'Concluído', tone: 'success' };
    case 'CANCELLED':
      return { label: 'Cancelado', tone: 'error' };
    case 'NO_SHOW':
      return { label: 'Não compareceu', tone: 'warning' };
    case 'WAITING':
      return { label: 'Aguardando', tone: 'pending' };
    default:
      return { label: status, tone: 'neutral' };
  }
}

export function BookingDetailView({
  bookingId,
  scope = 'PERSONAL',
  onBack,
}: BookingDetailViewProps) {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<BookingActionType | null>(null);

  const {
    booking,
    isLoading,
    error,
    refetch,
    isMutating,
    mutationError,
    cancel,
    complete,
    noShow,
  } = useBookingDetail({
    bookingId,
    scope,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Spinner size="large" />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Text variant="body" style={{ color: colors.feedback.error, textAlign: 'center' }}>
          Não foi possível carregar os detalhes do agendamento (503 ou reserva inexistente).
        </Text>
        <Button
          title="Tentar novamente"
          variant="outline"
          style={{ marginTop: spacing.md }}
          onPress={() => refetch()}
        />
        {onBack ? (
          <Button
            title="Voltar"
            variant="ghost"
            style={{ marginTop: spacing.sm }}
            onPress={onBack}
          />
        ) : null}
      </View>
    );
  }

  const statusConfig = getStatusBadgeConfig(booking.status);

  const totalPriceInCents =
    booking.totalPriceInCents ??
    (booking.services.length > 0 && booking.services.some((s) => s.priceInCents != null)
      ? booking.services.reduce((acc, s) => acc + (s.priceInCents || 0), 0)
      : null);

  const priceLabel =
    totalPriceInCents != null ? formatCentsToCurrency(totalPriceInCents) : 'A confirmar';

  const dateLabel =
    booking.date instanceof Date
      ? booking.date.toISOString().split('T')[0]
      : String(booking.date ?? (booking.startsAt ? booking.startsAt.split('T')[0] : 'Data sob consulta'));

  const timeLabel =
    booking.startTime && booking.endTime
      ? `${booking.startTime} - ${booking.endTime}`
      : booking.startTime ?? 'Horário sob consulta';

  const canCancel =
    booking.canCancel ?? booking.capabilities?.cancel?.allowed ?? false;
  const canComplete =
    booking.canComplete ?? booking.capabilities?.complete?.allowed ?? false;
  const canMarkNoShow =
    booking.canMarkNoShow ?? booking.capabilities?.noShow?.allowed ?? false;

  const handleConfirmAction = async (data: { reason?: string }) => {
    if (!activeAction) return;
    try {
      if (activeAction === 'CANCEL') {
        await cancel({ reason: data.reason });
      } else if (activeAction === 'COMPLETE') {
        await complete({ reason: data.reason });
      } else if (activeAction === 'NO_SHOW') {
        await noShow({ reason: data.reason });
      }
      setActiveAction(null);
      await refetch();
    } catch {
      // O erro já é capturado no hook e exibido no alerta
    }
  };

  const customerPhoneDigits = booking.customer?.phoneNumber?.replace(/\D/g, '');
  const hasValidPhone = customerPhoneDigits && customerPhoneDigits.length >= 10;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '700' }}>
          Detalhes do Agendamento
        </Text>
        {onBack ? (
          <Button title="Voltar" variant="ghost" onPress={onBack} />
        ) : (
          <Button title="Voltar" variant="ghost" onPress={() => router.back()} />
        )}
      </View>

      {mutationError ? (
        <Alert
          variant="error"
          title="Erro na operação"
          message={mutationError}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      {/* Main Status & Time Card */}
      <Card style={[styles.card, { marginTop: spacing.md }]}>
        <View style={styles.statusRow}>
          <View>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              Status Atual
            </Text>
            <View style={{ marginTop: 4 }}>
              <Badge label={statusConfig.label} tone={statusConfig.tone} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              Versão do Registro
            </Text>
            <Text variant="body" style={{ color: colors.text.primary, fontWeight: '600' }}>
              v{booking.version ?? 1}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border.subtle, marginVertical: spacing.md }]} />

        <View style={styles.gridRow}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              Data
            </Text>
            <Text variant="h3" style={{ color: colors.text.primary, fontWeight: '700' }}>
              {dateLabel}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              Horário
            </Text>
            <Text variant="h3" style={{ color: colors.text.primary, fontWeight: '700' }}>
              {timeLabel}
            </Text>
          </View>
        </View>

        {booking.customer ? (
          <View style={{ marginTop: spacing.md }}>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              Cliente
            </Text>
            <Text variant="body" style={{ color: colors.text.primary, fontWeight: '600' }}>
              {booking.customer.name}
            </Text>
            {hasValidPhone ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: spacing.sm }}>
                <Text variant="caption" style={{ color: colors.text.muted }}>
                  {booking.customer.phoneNumber}
                </Text>
                <Button
                  title="WhatsApp"
                  variant="outline"
                  onPress={() => {
                    const full = customerPhoneDigits.startsWith('55')
                      ? customerPhoneDigits
                      : `55${customerPhoneDigits}`;
                    void Linking.openURL(`https://wa.me/${full}`);
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>

      {/* Services Breakdown */}
      <Card style={[styles.card, { marginTop: spacing.md }]}>
        <Text variant="h3" style={{ color: colors.text.primary, fontWeight: '700', marginBottom: spacing.sm }}>
          Serviços Inclusos
        </Text>

        <View style={{ gap: spacing.sm }}>
          {booking.services.map((svc) => (
            <View key={svc.id ?? svc.serviceId ?? svc.title} style={styles.serviceRow}>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ color: colors.text.primary, fontWeight: '600' }}>
                  {svc.title}
                </Text>
                {svc.durationInMinutes != null ? (
                  <Text variant="caption" style={{ color: colors.text.secondary }}>
                    {svc.durationInMinutes} minutos
                  </Text>
                ) : null}
              </View>
              <Text variant="body" style={{ color: colors.brand.primary, fontWeight: '700' }}>
                {svc.priceInCents != null ? formatCentsToCurrency(svc.priceInCents) : 'A definir'}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border.subtle, marginVertical: spacing.md }]} />

        <View style={styles.totalRow}>
          <Text variant="body" style={{ color: colors.text.primary, fontWeight: '700' }}>
            Valor Total
          </Text>
          <Text variant="h2" style={{ color: colors.brand.primary, fontWeight: '700' }}>
            {priceLabel}
          </Text>
        </View>
      </Card>

      {/* Audit History */}
      <View style={{ marginTop: spacing.md }}>
        <BookingHistory booking={booking} />
      </View>

      {/* Action Buttons */}
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {canComplete ? (
          <Button
            title="Concluir Atendimento"
            variant="primary"
            onPress={() => setActiveAction('COMPLETE')}
            disabled={isMutating}
          />
        ) : null}

        {canMarkNoShow ? (
          <Button
            title="Registrar Não Comparecimento"
            variant="outline"
            onPress={() => setActiveAction('NO_SHOW')}
            disabled={isMutating}
          />
        ) : null}

        {canCancel ? (
          <Button
            title="Cancelar Agendamento"
            variant="ghost"
            onPress={() => setActiveAction('CANCEL')}
            disabled={isMutating}
          />
        ) : null}
      </View>

      {/* Confirmation Modal */}
      {activeAction ? (
        <BookingActionConfirm
          isOpen={Boolean(activeAction)}
          actionType={activeAction}
          booking={booking}
          scope={scope}
          onClose={() => setActiveAction(null)}
          onSuccess={async () => {
            setActiveAction(null);
            await refetch();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  card: {
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

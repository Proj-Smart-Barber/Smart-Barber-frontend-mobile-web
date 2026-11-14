import React, { useState } from 'react';
import {
  Platform,
  View,
  StyleSheet,
  ScrollView,
  Linking,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateBookingQueries } from '../model/booking-query-keys';
import { useSession } from '@/features/auth';
import { useRouter } from 'expo-router';
import { useTheme, useAdaptiveLayout } from '../../../shared/theme';
import { useAppSafeArea } from '../../../shared/theme/use-app-safe-area';
import {
  Text,
  Badge,
  Button,
  Alert,
  Skeleton,
  LoadingRegion,
} from '../../../shared/ui';
import type { BadgeTone } from '../../../shared/ui';
import { LiquidGlassView } from '../../../shared/navigation/LiquidGlassView';
import { formatPhoneNumber } from '../../../shared/lib/phone-format';
import { BookingReviewAction } from '../../reviews';
import { useBookingDetail } from '../model/use-booking-detail';
import {
  formatBookingCalendarDate,
  formatBookingTimeRange,
  formatCentsToCurrency,
} from '../lib/booking-time';
import { BookingActionConfirm } from './BookingActionConfirm';
import type { BookingActionType } from './BookingActionConfirm';

interface BookingDetailViewProps {
  bookingId: string;
  scope?: 'PERSONAL' | 'UNIT';
  onBack?: () => void;
}

function extractValidPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

function getStatusBadgeConfig(status?: string | null): {
  label: string;
  tone: BadgeTone;
  iconName: keyof typeof Ionicons.glyphMap;
  description: string;
} {
  if (!status) {
    return {
      label: 'Status não informado',
      tone: 'neutral',
      iconName: 'help-circle-outline',
      description: 'Situação da reserva aguardando atualização.',
    };
  }
  switch (status.toUpperCase()) {
    case 'CONFIRMED':
      return {
        label: 'Confirmado',
        tone: 'brand',
        iconName: 'checkmark-circle',
        description: 'Seu horário está reservado e garantido na agenda.',
      };
    case 'IN_SERVICE':
      return {
        label: 'Em atendimento',
        tone: 'info',
        iconName: 'cut',
        description: 'O atendimento está em andamento na unidade.',
      };
    case 'COMPLETED':
      return {
        label: 'Concluído',
        tone: 'success',
        iconName: 'checkmark-done-circle',
        description: 'Atendimento finalizado com sucesso.',
      };
    case 'CANCELLED':
    case 'CANCELED':
      return {
        label: 'Cancelado',
        tone: 'error',
        iconName: 'close-circle',
        description: 'Esta reserva foi cancelada e o horário liberado.',
      };
    case 'NO_SHOW':
      return {
        label: 'Não compareceu',
        tone: 'warning',
        iconName: 'alert-circle',
        description: 'Ausência registrada após o tempo de tolerância.',
      };
    case 'WAITING':
      return {
        label: 'Aguardando',
        tone: 'pending',
        iconName: 'time',
        description: 'Reserva aguardando confirmação.',
      };
    default:
      return {
        label: status,
        tone: 'neutral',
        iconName: 'information-circle-outline',
        description: 'Situação atual do registro.',
      };
  }
}

export function BookingDetailView({
  bookingId,
  scope = 'PERSONAL',
  onBack,
}: BookingDetailViewProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const insets = useAppSafeArea();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { identity } = useSession();
  const [activeAction, setActiveAction] = useState<BookingActionType | null>(null);

  const webBackgroundStyle: any =
    Platform.OS === 'web'
      ? {
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 20% 18%, rgba(124, 135, 159, 0.17), transparent 50%), radial-gradient(ellipse at 82% 57%, rgba(155, 41, 49, 0.105), transparent 55%), #0b0b0b'
            : 'radial-gradient(ellipse at 20% 18%, rgba(159, 170, 191, 0.23), transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(189, 32, 38, 0.06), transparent 55%), #f7f5f3',
        }
      : {};

  const {
    booking,
    isLoading,
    isFetching,
    error,
    refetch,
    isMutating,
    mutationError,
  } = useBookingDetail({
    bookingId,
    scope,
  });

  const handleBackPress = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
          webBackgroundStyle,
        ]}
      >
        <LoadingRegion
          phase="initial"
          busy={true}
          accessibilityLabel="Carregando detalhes do agendamento"
          placeholder={
            <View
              style={[
                styles.contentConstraint,
                {
                  gap: spacing[4],
                  paddingTop: insets.top > 0 ? insets.top + 8 : spacing[4],
                  paddingHorizontal: isCompact ? 16 : 32,
                },
              ]}
            >
              <Skeleton height={44} width={240} borderRadius={radius.md} />
              <Skeleton height={220} borderRadius={radius.xl} />
              <Skeleton height={160} borderRadius={radius.xl} />
              <Skeleton height={160} borderRadius={radius.xl} />
            </View>
          }
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background.primary },
          webBackgroundStyle,
        ]}
      >
        <LiquidGlassView
          variant="card"
          elevated
          borderRadius={radius.xl}
          style={{ width: '100%', maxWidth: 460 }}
          contentStyle={{
            padding: spacing[6],
            alignItems: 'center',
            gap: spacing[3],
          }}
        >
          <View
            style={[
              styles.errorIconCircle,
              {
                backgroundColor: colors.feedback.errorBackground,
                borderColor: colors.feedback.errorBorder,
                borderRadius: radius.full,
              },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={colors.feedback.errorForeground}
            />
          </View>

          <Text
            variant="body"
            weight="semibold"
            style={{ color: colors.feedback.error, textAlign: 'center' }}
          >
            Não foi possível carregar os detalhes do agendamento (503 ou reserva inexistente).
          </Text>

          <View style={{ width: '100%', gap: spacing[2], marginTop: spacing[1] }}>
            <Button
              title="Tentar novamente"
              variant="outline"
              leftIcon={<Ionicons name="refresh-outline" size={18} color={colors.brand.primary} />}
              onPress={() => refetch()}
            />
            <Button
              title="Voltar"
              variant="ghost"
              leftIcon={<Ionicons name="arrow-back" size={18} color={colors.text.primary} />}
              onPress={handleBackPress}
            />
          </View>
        </LiquidGlassView>
      </View>
    );
  }

  const statusConfig = getStatusBadgeConfig(booking.status);

  const totalMinutes =
    booking.totalDurationInMinutes ??
    (booking.services.length > 0
      ? booking.services.reduce((acc, s) => acc + (s.durationInMinutes || 0), 0)
      : null);

  const durationLabel =
    totalMinutes != null && totalMinutes > 0
      ? `${totalMinutes} min`
      : null;

  const totalPriceInCents =
    booking.totalPriceInCents ??
    (booking.services.length > 0 && booking.services.some((s) => s.priceInCents != null)
      ? booking.services.reduce((acc, s) => acc + (s.priceInCents || 0), 0)
      : null);

  const priceLabel =
    totalPriceInCents != null ? formatCentsToCurrency(totalPriceInCents) : 'A confirmar';

  const dateLabel = formatBookingCalendarDate(
    booking.date ?? booking.startsAt,
    { format: 'long' },
  );

  const timeLabel = formatBookingTimeRange(
    booking.startTime,
    booking.endTime,
    booking.startsAt,
    booking.endsAt,
  );

  const canCancel =
    booking.canCancel ?? booking.capabilities?.cancel?.allowed ?? false;
  const canReschedule =
    booking.capabilities?.reschedule?.allowed === true;
  const canComplete =
    booking.canComplete ?? booking.capabilities?.complete?.allowed ?? false;
  const canMarkNoShow =
    booking.canMarkNoShow ?? booking.capabilities?.noShow?.allowed ?? false;

  const hasAvailableActions =
    canReschedule || canComplete || canMarkNoShow || canCancel;

  const validCustomerPhone = extractValidPhone(booking.customer?.phoneNumber);
  const validBarbershopPhone = extractValidPhone(booking.barbershopPhone);
  const shortBookingCode = booking.id ? `#${booking.id.slice(0, 8).toUpperCase()}` : '';
  const isCompletedPersonal =
    scope === 'PERSONAL' && booking.status?.toUpperCase() === 'COMPLETED';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background.primary },
        webBackgroundStyle,
      ]}
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top > 0 ? insets.top + 8 : 16,
          paddingHorizontal: isCompact ? 16 : 32,
          paddingBottom: Math.max(insets.bottom, 16) + 40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={colors.brand.primary}
          />
        }
      >
        <View style={[styles.contentConstraint, { gap: spacing[4] }]}>
          {/* Top Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text
                variant="caption"
                weight="bold"
                style={[styles.eyebrowText, { color: colors.brand.primary }]}
              >
                {scope === 'UNIT' ? 'GESTÃO OPERACIONAL' : 'MINHA RESERVA'}
              </Text>
              <Text
                variant="h2"
                weight="extraBold"
                style={{ color: colors.text.primary }}
                accessibilityRole="header"
              >
                Detalhes do Agendamento
              </Text>
              {shortBookingCode ? (
                <Text variant="caption" style={{ color: colors.text.secondary }}>
                  Código de referência {shortBookingCode}
                </Text>
              ) : null}
            </View>

            <Button
              title="Voltar"
              variant="outline"
              leftIcon={<Ionicons name="arrow-back" size={16} color={colors.brand.primary} />}
              onPress={handleBackPress}
              style={styles.backButton}
            />
          </View>

          {mutationError ? (
            <Alert
              variant="error"
              title="Erro na operação"
              message={mutationError}
            />
          ) : null}

          {/* Main Status, Schedule & Participants Card */}
          <LiquidGlassView
            variant="card"
            elevated
            borderRadius={radius.xl}
            contentStyle={{ padding: spacing[5], gap: spacing[4] }}
          >
            {/* Status Header Row */}
            <View style={styles.statusRow}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="caption" style={{ color: colors.text.secondary }}>
                  Status Atual
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Badge
                    label={statusConfig.label}
                    tone={statusConfig.tone}
                    icon={
                      <Ionicons
                        name={statusConfig.iconName}
                        size={13}
                        color={
                          statusConfig.tone === 'brand'
                            ? colors.text.crimson
                            : statusConfig.tone === 'success'
                              ? colors.feedback.successForeground
                              : statusConfig.tone === 'error'
                                ? colors.feedback.errorForeground
                                : statusConfig.tone === 'warning'
                                  ? colors.feedback.warningForeground
                                  : statusConfig.tone === 'info'
                                    ? colors.feedback.infoForeground
                                    : colors.text.secondary
                        }
                      />
                    }
                  />
                  {durationLabel ? (
                    <Badge
                      label={durationLabel}
                      tone="neutral"
                      size="sm"
                      icon={<Ionicons name="time-outline" size={11} color={colors.text.secondary} />}
                    />
                  ) : null}
                </View>
                <Text variant="caption" style={{ color: colors.text.muted }}>
                  {statusConfig.description}
                </Text>
              </View>
            </View>

            {/* Date & Time Highlight Boxes */}
            <View style={styles.scheduleGrid}>
              <View
                style={[
                  styles.scheduleBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(0, 0, 0, 0.03)',
                    borderColor: colors.border.subtle,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                <View
                  style={[
                    styles.scheduleIconWrap,
                    {
                      backgroundColor: colors.surface.selected,
                      borderColor: colors.border.ghost,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.brand.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="caption" style={{ color: colors.text.secondary }}>
                    Data
                  </Text>
                  <Text
                    variant="subhead"
                    weight="bold"
                    style={{ color: colors.text.primary, marginTop: 2 }}
                  >
                    {dateLabel}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.scheduleBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(0, 0, 0, 0.03)',
                    borderColor: colors.border.subtle,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                <View
                  style={[
                    styles.scheduleIconWrap,
                    {
                      backgroundColor: colors.surface.selected,
                      borderColor: colors.border.ghost,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Ionicons name="time-outline" size={18} color={colors.brand.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="caption" style={{ color: colors.text.secondary }}>
                    Horário
                  </Text>
                  <Text
                    variant="subhead"
                    weight="bold"
                    style={{ color: colors.text.primary, marginTop: 2 }}
                  >
                    {timeLabel}
                  </Text>
                </View>
              </View>
            </View>

            {/* Location & Professional / Customer Details */}
            <View
              style={[
                styles.participantsBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.03)'
                    : 'rgba(0, 0, 0, 0.02)',
                  borderColor: colors.border.subtle,
                  borderRadius: radius.lg,
                },
              ]}
            >
              {scope === 'UNIT' ? (
                booking.customer ? (
                  <View style={{ gap: spacing[3] }}>
                    <View style={styles.entityRow}>
                      <View
                        style={[
                          styles.entityIconBadge,
                          {
                            backgroundColor: colors.surface.elevated,
                            borderColor: colors.border.default,
                            borderRadius: radius.md,
                          },
                        ]}
                      >
                        <Ionicons name="person-outline" size={18} color={colors.brand.primary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text variant="caption" style={{ color: colors.text.secondary }}>
                          Cliente
                        </Text>
                        <Text
                          variant="body"
                          weight="bold"
                          style={{ color: colors.text.primary, marginTop: 1 }}
                        >
                          {booking.customer.name}
                        </Text>
                        {booking.customer.phoneNumber ? (
                          <Text variant="caption" style={{ color: colors.text.muted, marginTop: 2 }}>
                            {formatPhoneNumber(booking.customer.phoneNumber)}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {validCustomerPhone ? (
                      <Button
                        title="WhatsApp do cliente"
                        variant="outline"
                        leftIcon={
                          <Ionicons
                            name="logo-whatsapp"
                            size={18}
                            color={colors.feedback.success}
                          />
                        }
                        onPress={() => {
                          const full = validCustomerPhone.startsWith('55')
                            ? validCustomerPhone
                            : `55${validCustomerPhone}`;
                          void Linking.openURL(`https://wa.me/${full}`);
                        }}
                        style={{ minHeight: 44 }}
                      />
                    ) : null}
                  </View>
                ) : null
              ) : (
                <View style={{ gap: spacing[3] }}>
                  {booking.barbershopName ? (
                    <View style={styles.entityRow}>
                      <View
                        style={[
                          styles.entityIconBadge,
                          {
                            backgroundColor: colors.surface.elevated,
                            borderColor: colors.border.default,
                            borderRadius: radius.md,
                          },
                        ]}
                      >
                        <Ionicons
                          name="storefront-outline"
                          size={18}
                          color={colors.brand.primary}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text variant="caption" style={{ color: colors.text.secondary }}>
                          Barbearia
                        </Text>
                        <Text
                          variant="body"
                          weight="bold"
                          style={{ color: colors.text.primary, marginTop: 1 }}
                        >
                          {booking.barbershopName}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {booking.barbershopName && booking.barbermanName ? (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border.subtle },
                      ]}
                    />
                  ) : null}

                  {booking.barbermanName ? (
                    <View style={styles.entityRow}>
                      <View
                        style={[
                          styles.entityIconBadge,
                          {
                            backgroundColor: colors.surface.elevated,
                            borderColor: colors.border.default,
                            borderRadius: radius.md,
                          },
                        ]}
                      >
                        <Ionicons name="cut-outline" size={18} color={colors.brand.primary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text variant="caption" style={{ color: colors.text.secondary }}>
                          Profissional
                        </Text>
                        <Text
                          variant="body"
                          weight="semibold"
                          style={{ color: colors.text.primary, marginTop: 1 }}
                        >
                          {booking.barbermanName}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {validBarbershopPhone ? (
                    <View style={{ paddingTop: 4 }}>
                      <Button
                        title="WhatsApp da barbearia"
                        variant="outline"
                        leftIcon={
                          <Ionicons
                            name="logo-whatsapp"
                            size={18}
                            color={colors.feedback.success}
                          />
                        }
                        onPress={() => {
                          const full = validBarbershopPhone.startsWith('55')
                            ? validBarbershopPhone
                            : `55${validBarbershopPhone}`;
                          void Linking.openURL(`https://wa.me/${full}`);
                        }}
                        style={{ minHeight: 44 }}
                      />
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </LiquidGlassView>

          {/* Services Breakdown Card */}
          <LiquidGlassView
            variant="card"
            elevated
            borderRadius={radius.xl}
            contentStyle={{ padding: spacing[5], gap: spacing[4] }}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <View
                  style={[
                    styles.sectionIconBox,
                    {
                      backgroundColor: colors.surface.selected,
                      borderColor: colors.border.ghost,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Ionicons name="list-outline" size={18} color={colors.brand.primary} />
                </View>
                <View>
                  <Text variant="h3" weight="bold" style={{ color: colors.text.primary }}>
                    Serviços Inclusos
                  </Text>
                  <Text variant="caption" style={{ color: colors.text.secondary }}>
                    Detalhamento de itens, tempo e investimento
                  </Text>
                </View>
              </View>

              <Badge
                label={`${booking.services.length} ${
                  booking.services.length === 1 ? 'item' : 'itens'
                }`}
                tone="neutral"
                size="sm"
              />
            </View>

            <View
              style={[
                styles.servicesListContainer,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.03)'
                    : 'rgba(0, 0, 0, 0.02)',
                  borderColor: colors.border.subtle,
                  borderRadius: radius.lg,
                },
              ]}
            >
              {booking.services.map((svc, idx) => (
                <React.Fragment key={svc.id ?? svc.serviceId ?? `${svc.title}-${idx}`}>
                  {idx > 0 ? (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border.subtle },
                      ]}
                    />
                  ) : null}
                  <View style={styles.serviceRow}>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text
                        variant="body"
                        weight="semibold"
                        style={{ color: colors.text.primary }}
                      >
                        {svc.title}
                      </Text>
                      {svc.durationInMinutes != null ? (
                        <View style={styles.durationMetaRow}>
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color={colors.text.secondary}
                          />
                          <Text variant="caption" style={{ color: colors.text.secondary }}>
                            {svc.durationInMinutes} minutos
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text
                      variant="price"
                      weight="bold"
                      style={{ color: colors.text.primary }}
                    >
                      {svc.priceInCents != null
                        ? formatCentsToCurrency(svc.priceInCents)
                        : 'A definir'}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* Total Summary Footer */}
            <View
              style={[
                styles.totalBox,
                {
                  backgroundColor: colors.surface.selected,
                  borderColor: colors.border.ghost,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <View style={{ gap: 2 }}>
                <Text variant="body" weight="bold" style={{ color: colors.text.primary }}>
                  Valor Total
                </Text>
                {durationLabel ? (
                  <Text variant="caption" style={{ color: colors.text.secondary }}>
                    Tempo total estimado: {durationLabel}
                  </Text>
                ) : null}
              </View>

              <Text
                variant="h2"
                weight="extraBold"
                style={{ color: colors.brand.primary }}
              >
                {priceLabel}
              </Text>
            </View>
          </LiquidGlassView>

          {/* Review Section for Completed Personal Bookings */}
          {isCompletedPersonal ? (
            <LiquidGlassView
              variant="card"
              elevated
              borderRadius={radius.xl}
              contentStyle={{ padding: spacing[5], gap: spacing[2] }}
            >
              <Text variant="h3" weight="bold" style={{ color: colors.text.primary }}>
                Avaliação do Atendimento
              </Text>
              <BookingReviewAction
                bookingId={booking.id}
                status={booking.status}
                barbershopId={booking.barbershopId}
                barbershopName={booking.barbershopName ?? undefined}
                barbermanId={booking.barbermanId}
                barbermanName={booking.barbermanName}
                services={booking.services.map((svc) => ({
                  bookingServiceItemId: svc.bookingServiceItemId ?? svc.id ?? null,
                  serviceId: svc.serviceId ?? null,
                  title: svc.title,
                }))}
                onReviewChanged={() => {
                  void refetch();
                }}
              />
            </LiquidGlassView>
          ) : null}

          {/* Action Buttons */}
          {hasAvailableActions ? (
            <LiquidGlassView
              variant="card"
              elevated
              borderRadius={radius.xl}
              contentStyle={{ padding: spacing[5], gap: spacing[3] }}
            >
              <View style={{ gap: 2 }}>
                <Text variant="h3" weight="bold" style={{ color: colors.text.primary }}>
                  Gerenciar Agendamento
                </Text>
                <Text variant="caption" style={{ color: colors.text.secondary }}>
                  {scope === 'UNIT'
                    ? 'Ações operacionais autorizadas para este atendimento'
                    : 'Remarcação e cancelamento sujeitos ao prazo de antecedência da unidade'}
                </Text>
              </View>

              <View style={{ gap: spacing[2] }}>
                {canReschedule ? (
                  <Button
                    title="Remarcar Agendamento"
                    variant="outline"
                    leftIcon={
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={colors.brand.primary}
                      />
                    }
                    onPress={() => {
                      router.push({
                        pathname: `/(account)/bookings/${booking.id}/reschedule` as any,
                        params: { scope },
                      });
                    }}
                    disabled={isMutating}
                  />
                ) : null}

                {canComplete ? (
                  <Button
                    title="Concluir Atendimento"
                    variant="primary"
                    leftIcon={
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                    }
                    onPress={() => setActiveAction('COMPLETE')}
                    disabled={isMutating}
                  />
                ) : null}

                {canMarkNoShow ? (
                  <Button
                    title="Registrar Não Comparecimento"
                    variant="outline"
                    leftIcon={
                      <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color={colors.brand.primary}
                      />
                    }
                    onPress={() => setActiveAction('NO_SHOW')}
                    disabled={isMutating}
                  />
                ) : null}

                {canCancel ? (
                  <Button
                    title="Cancelar Agendamento"
                    variant="ghost"
                    leftIcon={
                      <Ionicons
                        name="close-circle-outline"
                        size={18}
                        color={colors.feedback.errorForeground}
                      />
                    }
                    textStyle={{ color: colors.feedback.errorForeground, fontWeight: '700' }}
                    style={{
                      backgroundColor: colors.feedback.errorBackground,
                      borderColor: colors.feedback.errorBorder,
                      borderWidth: 1,
                    }}
                    onPress={() => setActiveAction('CANCEL')}
                    disabled={isMutating}
                  />
                ) : null}
              </View>
            </LiquidGlassView>
          ) : null}

          {/* Confirmation Modal */}
          {activeAction ? (
            <BookingActionConfirm
              isOpen={Boolean(activeAction)}
              actionType={activeAction}
              booking={booking}
              scope={scope}
              onClose={() => setActiveAction(null)}
              onSuccess={async () => {
                await invalidateBookingQueries(queryClient, {
                  actorId: identity?.id,
                  shopId: booking.barbershopId,
                  bookingId: booking.id,
                });
                setActiveAction(null);
                await refetch();
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentConstraint: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  eyebrowText: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  backButton: {
    minHeight: 44,
    paddingHorizontal: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  versionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  scheduleBox: {
    flex: 1,
    minWidth: 210,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  scheduleIconWrap: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantsBox: {
    padding: 16,
    borderWidth: 1,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entityIconBadge: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionIconBox: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicesListContainer: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  durationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

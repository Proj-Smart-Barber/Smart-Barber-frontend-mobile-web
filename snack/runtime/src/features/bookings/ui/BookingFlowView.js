import React, { useCallback } from 'react';
import { View, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, useAdaptiveLayout } from '../../../shared/theme';
import { LiquidGlassView } from '../../../shared/navigation/LiquidGlassView';
import { Text, Button, Badge } from '../../../shared/ui';
import { useBookingFlow } from '../model/use-booking-flow';
import { ProfessionalPicker } from './ProfessionalPicker';
import { BookingSlotPicker } from './BookingSlotPicker';
import { BookingReview } from './BookingReview';
import { BookingResult } from './BookingResult';
import { BookingRecovery } from './BookingRecovery';
import { ServiceCard } from '../../services/ui/ServiceCard';
import { useSession } from '../../auth';
const STEPS_ORDER = ['SERVICES', 'PROFESSIONAL', 'SLOT', 'REVIEW'];
export function BookingFlowView({ options, onExit }) {
    var _a, _b, _c, _d, _e;
    const { colors, spacing, radius, isDark } = useTheme();
    const { isCompact } = useAdaptiveLayout();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { status: sessionStatus } = useSession();
    const flow = useBookingFlow(options);
    const handleBack = useCallback(() => {
        if (flow.step === 'REVIEW') {
            flow.goToStep('SLOT');
        }
        else if (flow.step === 'SLOT') {
            flow.goToStep('PROFESSIONAL');
        }
        else if (flow.step === 'PROFESSIONAL') {
            flow.goToStep('SERVICES');
        }
        else {
            if (onExit) {
                onExit();
            }
            else {
                router.back();
            }
        }
    }, [flow, onExit, router]);
    const isPersonal = options.mode === 'PERSONAL';
    const stepTitle = {
        SERVICES: isPersonal ? 'Selecione os Serviços' : '1. Selecione os Serviços',
        CUSTOMER: 'Identificar Cliente',
        PROFESSIONAL: isPersonal ? 'Escolha o Profissional' : '2. Escolha o Profissional',
        SLOT: isPersonal ? 'Data e Horário' : '3. Data e Horário',
        REVIEW: isPersonal ? 'Revisar agendamento' : '4. Revisão e Confirmação',
        RESULT: 'Confirmação',
        UNCERTAIN: 'Verificação de Operação',
    }[flow.step];
    const currentStepIndex = STEPS_ORDER.indexOf(flow.step);
    const webBackgroundStyle = Platform.OS === 'web'
        ? {
            backgroundImage: isPersonal
                ? isDark
                    ? 'radial-gradient(ellipse at 50% 0%, rgba(189, 32, 38, 0.08) 0%, rgba(11, 11, 11, 0.98) 70%)'
                    : 'radial-gradient(ellipse at 50% 0%, rgba(189, 32, 38, 0.05) 0%, #F7F5F3 70%)'
                : isDark
                    ? 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.08) 0%, rgba(20, 20, 20, 0.98) 70%)'
                    : 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.12) 0%, #F7F5F3 70%)',
        }
        : null;
    return (<View style={[
            {
                flex: 1,
                backgroundColor: colors.background.primary,
                paddingTop: insets.top,
            },
            webBackgroundStyle,
        ]}>
      {/* Top Header */}
      {isPersonal ? (<View testID="booking-header-personal" style={{
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                backgroundColor: 'transparent',
            }}>
          <View style={{
                maxWidth: 640,
                width: '100%',
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing[2],
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1, minWidth: 0 }}>
              {flow.step !== 'RESULT' && (<Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Voltar passo anterior" hitSlop={8} style={{
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.full,
                }}>
                  <Ionicons name="arrow-back" size={24} color={colors.text.primary}/>
                </Pressable>)}

              <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <Text variant="bodySm" weight="bold" color={colors.text.primary} numberOfLines={1}>
                  {stepTitle}
                </Text>
                <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
                  {((_a = flow.barbershop) === null || _a === void 0 ? void 0 : _a.name) || 'Smart Barber'}
                </Text>
              </View>
            </View>

            {currentStepIndex >= 0 && (<Badge label={`Passo ${currentStepIndex + 1} de 4`} tone="neutral"/>)}
          </View>
        </View>) : (<View testID="booking-header-unit">
          <LiquidGlassView variant="card" elevated={false} borderRadius={0} borderColor={colors.border.default} borderWidth={1} contentStyle={{
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
            }}>
            <View style={{
                maxWidth: 640,
                width: '100%',
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                {flow.step !== 'RESULT' && (<Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Voltar passo anterior" hitSlop={8} style={{
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.full,
                }}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary}/>
                  </Pressable>)}

                <View style={{ gap: 2 }}>
                  <Text variant="bodySm" weight="bold" color={colors.text.primary}>
                    {stepTitle}
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    {((_b = flow.barbershop) === null || _b === void 0 ? void 0 : _b.name) || 'Smart Barber'}
                  </Text>
                </View>
              </View>

              {currentStepIndex >= 0 && (<Badge label={`Passo ${currentStepIndex + 1} de 4`} tone="neutral"/>)}
            </View>
          </LiquidGlassView>
        </View>)}

      {/* Conteúdo do Passo */}
      <View style={{
            flex: 1,
            maxWidth: 640,
            width: '100%',
            alignSelf: 'center',
            padding: spacing[4],
        }}>
        {flow.step === 'SERVICES' && (<ScrollView contentContainerStyle={{ gap: spacing[3], paddingBottom: 100 }}>
            <Text variant="caption" color={colors.text.muted}>
              Escolha um ou mais serviços para o mesmo atendimento:
            </Text>
            {flow.servicesError && (<View style={{
                    backgroundColor: colors.surface.default,
                    borderRadius: radius.md,
                    padding: spacing[3],
                    borderLeftWidth: 3,
                    borderLeftColor: colors.feedback.error,
                    gap: spacing[2],
                }}>
                <Text variant="caption" color={colors.feedback.error}>
                  {flow.servicesError}
                </Text>
                <Button title="Tentar Novamente" variant="ghost" onPress={() => flow.refetchServices()} style={{ minHeight: 36, alignSelf: 'flex-start' }}/>
              </View>)}
            {flow.services.map((service) => (<ServiceCard key={service.id} service={service} isSelected={flow.selectedServiceIds.includes(service.id)} onSelect={() => flow.toggleService(service.id)}/>))}
          </ScrollView>)}

        {flow.step === 'PROFESSIONAL' && (<View style={{ flex: 1, gap: spacing[3] }}>
            <Text variant="caption" color={colors.text.muted}>
              Selecione o profissional de sua preferência:
            </Text>
            {flow.professionalsError && (<View style={{
                    backgroundColor: colors.surface.default,
                    borderRadius: radius.md,
                    padding: spacing[3],
                    borderLeftWidth: 3,
                    borderLeftColor: colors.feedback.error,
                    gap: spacing[2],
                }}>
                <Text variant="caption" color={colors.feedback.error}>
                  {flow.professionalsError}
                </Text>
                <Button title="Tentar Novamente" variant="ghost" onPress={() => flow.refetchProfessionals()} style={{ minHeight: 36, alignSelf: 'flex-start' }}/>
              </View>)}
            <ProfessionalPicker professionals={flow.professionals} selectedProfessionalId={flow.selectedProfessionalId} onSelectProfessional={flow.selectProfessional} barbershopId={options.shopId} isLoading={flow.isLoading}/>
          </View>)}

        {flow.step === 'SLOT' && (<ScrollView contentContainerStyle={{ gap: spacing[3], paddingBottom: 100 }}>
            {(flow.availabilityError || flow.errorMessage) && (<View style={{
                    backgroundColor: colors.surface.default,
                    borderRadius: radius.md,
                    padding: spacing[3],
                    borderLeftWidth: 3,
                    borderLeftColor: colors.feedback.error,
                    gap: spacing[2],
                }}>
                <Text variant="caption" color={colors.feedback.error}>
                  {flow.availabilityError || flow.errorMessage}
                </Text>
                <Button title="Tentar Novamente" variant="ghost" onPress={() => flow.refetchAvailability()} style={{ minHeight: 36, alignSelf: 'flex-start' }}/>
              </View>)}
            <BookingSlotPicker timezone={(_c = flow.barbershop) === null || _c === void 0 ? void 0 : _c.timezone} serverNow={flow.serverNow} selectedDate={flow.selectedDate} selectedSlot={flow.selectedSlot} availabilitySlots={flow.availabilitySlots} isLoading={flow.isAvailabilityLoading} onSelectDate={flow.selectDate} onSelectSlot={flow.selectSlot}/>
          </ScrollView>)}

        {flow.step === 'REVIEW' && (<BookingReview mode={flow.mode} shopId={flow.shopId} barbershopName={(_d = flow.barbershop) === null || _d === void 0 ? void 0 : _d.name} selectedServices={flow.selectedServices} selectedProfessional={flow.selectedProfessional} selectedDate={flow.selectedDate} selectedSlot={flow.selectedSlot} customer={flow.customer} totalPriceInCents={flow.totalPriceInCents} totalDurationInMinutes={flow.totalDurationInMinutes} isAuthenticated={sessionStatus === 'authenticated'} isSubmitting={flow.status === 'submitting'} quoteMismatch={flow.quoteMismatch} authoritativeQuote={flow.authoritativeQuote} errorMessage={flow.errorMessage} onConfirm={flow.submitBooking} onEditServices={() => flow.goToStep('SERVICES')} onEditSlot={() => flow.goToStep('SLOT')}/>)}

        {flow.step === 'RESULT' && flow.confirmedBooking && (<BookingResult booking={flow.confirmedBooking} barbershopName={(_e = flow.barbershop) === null || _e === void 0 ? void 0 : _e.name} mode={flow.mode} onReset={() => {
                if (onExit) {
                    onExit();
                }
                else {
                    flow.resetFlow();
                }
            }}/>)}

        {flow.step === 'UNCERTAIN' && flow.uncertainKey && (<BookingRecovery requestId={flow.uncertainKey} onResolvedNotApplied={flow.resolveUncertainAttempt} onResolvedApplied={(res) => {
                var _a, _b;
                if ((res === null || res === void 0 ? void 0 : res.originScope) === 'UNIT') {
                    const bookingData = (_b = (_a = res === null || res === void 0 ? void 0 : res.resource) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.booking;
                    const dateParam = (bookingData === null || bookingData === void 0 ? void 0 : bookingData.date)
                        ? (typeof bookingData.date === 'string'
                            ? bookingData.date.split('T')[0]
                            : bookingData.date.toISOString().split('T')[0])
                        : undefined;
                    router.replace({
                        pathname: '/(app)/agenda',
                        params: {
                            ...((bookingData === null || bookingData === void 0 ? void 0 : bookingData.barbershopId) ? { shopId: bookingData.barbershopId } : {}),
                            ...(dateParam ? { date: dateParam } : {}),
                            ...((bookingData === null || bookingData === void 0 ? void 0 : bookingData.barbermanId) ? { barbermanId: bookingData.barbermanId } : {}),
                            ...((bookingData === null || bookingData === void 0 ? void 0 : bookingData.id) ? { bookingId: bookingData.id } : {}),
                        },
                    });
                }
                else {
                    router.replace('/(client)/bookings');
                }
            }}/>)}
      </View>

      {/* Barra Inferior de Navegação de Passos (Exceto Review, Result e Uncertain que possuem ações próprias) */}
      {(flow.step === 'SERVICES' || flow.step === 'PROFESSIONAL' || flow.step === 'SLOT') && (<LiquidGlassView variant="form" elevated borderRadius={0} borderWidth={1} borderColor={colors.border.default} contentStyle={{
                paddingHorizontal: spacing[4],
                paddingTop: spacing[3],
                paddingBottom: Math.max(insets.bottom, spacing[3]),
            }}>
          <View style={{
                maxWidth: 640,
                width: '100%',
                alignSelf: 'center',
                flexDirection: isCompact ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isCompact ? 'stretch' : 'center',
                gap: spacing[2],
            }}>
            {flow.step === 'SERVICES' && (<Button title="Avançar para Profissional" variant="primary" disabled={flow.selectedServiceIds.length === 0} rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF"/>} onPress={() => flow.goToStep('PROFESSIONAL')} style={{ minHeight: 46, width: '100%' }}/>)}

            {flow.step === 'PROFESSIONAL' && (<Button title="Avançar para Horários" variant="primary" disabled={!flow.selectedProfessionalId} rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF"/>} onPress={() => flow.goToStep('SLOT')} style={{ minHeight: 46, width: '100%' }}/>)}

            {flow.step === 'SLOT' && (<Button title="Revisar Agendamento" variant="primary" disabled={!flow.selectedSlot || !flow.selectedDate} rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF"/>} onPress={() => flow.goToStep('REVIEW')} style={{ minHeight: 46, width: '100%' }}/>)}
          </View>
        </LiquidGlassView>)}
    </View>);
}

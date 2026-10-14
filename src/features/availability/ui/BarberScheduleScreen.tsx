import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FormProvider } from 'react-hook-form';
import { Button, ErrorState, Spinner, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { AvailabilityDay } from './AvailabilityDay';
import { buildScheduleDayViews } from '../model/availability.types';
import { useBarberScheduleViewModel } from '../model/use-barber-schedule-view-model';
import { confirmScheduleDiscard, useUnsavedScheduleGuard } from '../model/use-unsaved-schedule-guard';

export function BarberScheduleScreen({ barbershopId, barbermanId, barberName }: {
  barbershopId: string; barbermanId: string; barberName: string;
}) {
  // Keep the previous scope until a changed session unit is explicitly acknowledged.
  const [editingShop, setEditingShop] = useState(barbershopId);
  const changedShop = editingShop !== barbershopId;
  return <ScheduleEditor key={editingShop} shopId={editingShop} barbermanId={barbermanId}
    barberName={barberName} changedShop={changedShop} onChangeShop={() => setEditingShop(barbershopId)} />;
}

function ScheduleEditor({ shopId, barbermanId, barberName, changedShop, onChangeShop }: {
  shopId: string; barbermanId: string; barberName: string; changedShop: boolean; onChangeShop: () => void;
}) {
  const vm = useBarberScheduleViewModel(shopId, barbermanId);
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const { isExpanded, contentMaxWidth } = useAdaptiveLayout();
  const [screenWidth, setScreenWidth] = useState(0);
  const showSideColumn = screenWidth >= 960;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useUnsavedScheduleGuard(vm.isDirty || Boolean(vm.pending), vm.busy);
  const disabled = vm.busy || changedShop || Boolean(vm.pending);
  const days = buildScheduleDayViews([]);
  const operatingDays = days.filter(day => vm.opening.some(entry => entry.weekday === day.weekday)).length;

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)');
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} onLayout={event => setScreenWidth(event.nativeEvent.layout.width)}
      style={[styles.screen, { backgroundColor: colors.background.primary }]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: spacing[isExpanded ? 8 : 5], paddingTop: spacing[4], paddingBottom: Math.max(insets.bottom, 16) + (isExpanded ? 40 : 180) }}
        >
          <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing[6] }}>
            {/* O cabeçalho utiliza o mesmo padrão da disponibilidade geral. */}
            <View style={styles.topBar}>
              <LiquidGlassView variant="navigation" borderRadius={radius.md} elevated={false} style={styles.iconButton} contentStyle={styles.iconButtonContent}>
                <Pressable accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} disabled={vm.busy} accessibilityState={{ disabled: vm.busy }} onPress={leave}
                  style={({ pressed }) => [styles.iconPressable, { backgroundColor: pressed ? colors.surface.selected : 'transparent', borderRadius: radius.md }]}>
                  <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
                </Pressable>
              </LiquidGlassView>
              <View style={styles.topBarCopy}>
                <Text variant="bodySm" weight="semibold" color={colors.text.primary} numberOfLines={1}>Minha jornada</Text>
                <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>Disponibilidade do profissional</Text>
              </View>
              <LiquidGlassView variant="navigation" borderRadius={radius.full} elevated={false} style={styles.iconButton} contentStyle={styles.iconButtonContent}>
                <Pressable accessibilityRole="button" accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'} hitSlop={8}
                  onPress={toggleTheme}
                  style={({ pressed }) => [styles.iconPressable, { backgroundColor: pressed ? colors.surface.selected : 'transparent', borderRadius: radius.full }]}>
                  <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={colors.text.primary} />
                </Pressable>
              </LiquidGlassView>
            </View>

            <View style={styles.hero}>
              <View style={[styles.heroAccent, { backgroundColor: colors.brand.primary, borderRadius: radius.full }]} />
              <Text variant="badge" color={colors.brand.primary}>SEU TEMPO, SUA JORNADA</Text>
              <Text variant="display" color={colors.text.primary}>
                Configure seus horários{isExpanded ? ' de atendimento.' : '\nde atendimento.'}
              </Text>
              <Text variant="body" color={colors.text.secondary} style={styles.heroDescription}>
                Organize seus dias, intervalos e folgas respeitando o funcionamento da unidade.
              </Text>
            </View>

            {changedShop && (
              <LiquidGlassView variant="card" contentStyle={{ padding: spacing[4], gap: spacing[3] }}>
                <Text accessibilityLiveRegion="polite" color={colors.text.primary}>
                  A unidade da sessão mudou. Sua edição anterior foi mantida; abra a nova unidade para continuar.
                </Text>
                <Button title="Abrir unidade selecionada" disabled={vm.busy}
                  onPress={() => vm.isDirty || vm.pending ? confirmScheduleDiscard(onChangeShop) : onChangeShop()} />
              </LiquidGlassView>
            )}

            {vm.loading ? (
              <View style={styles.loadingState}><Spinner /><Text color={colors.text.secondary}>Carregando sua jornada…</Text></View>
            ) : (
              <>
                {vm.error && <ErrorState title="Não foi possível atualizar a jornada" description={vm.error} onRetry={() => void vm.retry()} />}
                {vm.shop && (
                  <View style={[styles.mainGrid, showSideColumn && styles.mainGridExpanded]}>
                    <View style={[styles.journeyColumn, { gap: spacing[3] }]}>
                      <View style={[styles.sectionIntro, { backgroundColor: colors.background.secondary, borderRadius: radius.lg }]}>
                        <View style={styles.sectionHeading}>
                          <View style={[styles.sectionIcon, { backgroundColor: colors.surface.selected, borderRadius: radius.md }]}>
                            <Ionicons name="calendar-outline" size={20} color={colors.brand.primary} />
                          </View>
                          <View style={{ flex: 1, gap: spacing[1] }}>
                            <Text variant="badge" color={colors.brand.primary}>JORNADA SEMANAL</Text>
                            <Text variant="h2" color={colors.text.primary}>Horários recorrentes</Text>
                          </View>
                        </View>
                        <Text variant="bodySm" color={colors.text.secondary}>
                          Ative os dias em que você atende e defina um ou mais períodos em cada dia.
                        </Text>
                      </View>

                      {!vm.opening.length && (
                        <View style={[styles.notice, { backgroundColor: colors.feedback.errorBackground, borderRadius: radius.md }]}>
                          <Ionicons name="information-circle-outline" size={20} color={colors.feedback.error} />
                          <Text accessibilityRole="alert" color={colors.text.primary} style={styles.flexText}>
                            A unidade não possui expediente geral. Mantenha os dias sem atendimento até que o funcionamento seja configurado.
                          </Text>
                        </View>
                      )}
                      {vm.feedback && (
                        <View style={[styles.notice, { backgroundColor: colors.surface.selected, borderRadius: radius.md }]}>
                          <Ionicons name="information-circle-outline" size={20} color={colors.brand.primary} />
                          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.flexText}>{vm.feedback}</Text>
                        </View>
                      )}
                      {vm.pending && <Button title="Consultar dados salvos" variant="outline" onPress={() => void vm.reconcile()} disabled={vm.busy || changedShop} />}
                      <FormProvider {...vm.methods}>
                        <View style={{ gap: spacing[3] }}>
                          {days.map((day, index) => (
                            <View key={day.weekday} style={{ gap: spacing[2] }}>
                              <AvailabilityDay day={day} dayIndex={index} fieldArrayName="days" barbermanId={barbermanId}
                                disabled={disabled || Boolean(vm.error)} />
                              <View style={[styles.openingInfo, { paddingHorizontal: spacing[3] }]}>
                                <Ionicons name="business-outline" size={14} color={colors.text.muted} />
                                <Text variant="caption" color={colors.text.secondary} style={styles.flexText}>
                                  Unidade: {vm.opening.filter(entry => entry.weekday === day.weekday)
                                    .map(entry => `${entry.range.start}–${entry.range.end}`).join(' / ') || 'Fechada'}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </FormProvider>
                    </View>

                    <View style={[styles.sideColumn, showSideColumn && styles.sideColumnExpanded, { gap: spacing[3] }]}>
                      <LiquidGlassView variant="card" contentStyle={{ padding: spacing[5], gap: spacing[3] }}>
                        <View style={styles.sectionHeading}>
                          <View style={[styles.sectionIcon, { backgroundColor: colors.surface.selected, borderRadius: radius.md }]}>
                            <Ionicons name="person-outline" size={20} color={colors.brand.primary} />
                          </View>
                          <View style={{ flex: 1, gap: spacing[1] }}>
                            <Text variant="badge" color={colors.brand.primary}>SEU PERFIL</Text>
                            <Text variant="subhead" color={colors.text.primary}>{barberName}</Text>
                          </View>
                        </View>
                        <View style={[styles.separator, { backgroundColor: colors.border.subtle }]} />
                        <View style={{ gap: spacing[2] }}>
                          <Text variant="caption" color={colors.text.muted}>UNIDADE VINCULADA</Text>
                          <Text variant="bodySm" weight="semibold" color={colors.text.primary}>{vm.shop.name}</Text>
                          <View style={styles.infoLine}>
                            <Ionicons name="globe-outline" size={16} color={colors.text.secondary} />
                            <Text variant="caption" color={colors.text.secondary} style={styles.flexText}>Fuso horário: {vm.shop.timezone}</Text>
                          </View>
                          <View style={styles.infoLine}>
                            <Ionicons name="calendar-clear-outline" size={16} color={colors.text.secondary} />
                            <Text variant="caption" color={colors.text.secondary} style={styles.flexText}>{operatingDays} dias de funcionamento da unidade</Text>
                          </View>
                        </View>
                      </LiquidGlassView>

                      <LiquidGlassView variant="card" contentStyle={{ padding: spacing[5], gap: spacing[3] }}>
                        <View style={styles.sectionHeading}>
                          <Ionicons name="information-circle-outline" size={22} color={colors.brand.primary} />
                          <Text variant="subhead" color={colors.text.primary}>Como funciona</Text>
                        </View>
                        <Text variant="bodySm" color={colors.text.secondary}>
                          Seus horários devem estar dentro do expediente geral da unidade. Você pode criar pausas usando períodos separados.
                        </Text>
                        <Text variant="bodySm" color={colors.text.secondary}>
                          Os dias sem períodos são considerados folgas.
                        </Text>
                      </LiquidGlassView>

                      <LiquidGlassView variant="card" contentStyle={{ padding: spacing[5], gap: spacing[3] }}>
                        <View style={styles.sectionHeading}>
                          <Ionicons name="save-outline" size={21} color={colors.brand.primary} />
                          <Text variant="subhead" color={colors.text.primary}>Salvar alterações</Text>
                        </View>
                        <Text variant="bodySm" color={colors.text.secondary}>
                          {vm.isDirty ? 'Você possui alterações não salvas.' : 'Sua jornada está atualizada.'}
                        </Text>
                        <Button title="Salvar minha jornada" loading={vm.busy}
                          disabled={disabled || !vm.isDirty || Boolean(vm.error)} onPress={vm.methods.handleSubmit(vm.save)} />
                        <Button title="Descartar alterações" variant="outline"
                          disabled={disabled || !vm.isDirty} onPress={() => confirmScheduleDiscard(vm.discard)} />
                      </LiquidGlassView>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 44, height: 44 },
  iconButtonContent: { padding: 0, width: '100%', height: '100%' },
  iconPressable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBarCopy: { flex: 1, minWidth: 0, gap: 2 },
  hero: { gap: 12, paddingTop: 16, paddingBottom: 12 },
  heroAccent: { width: 44, height: 4, marginBottom: 4 },
  heroDescription: { maxWidth: 620 },
  mainGrid: { gap: 20 },
  mainGridExpanded: { flexDirection: 'row', alignItems: 'flex-start' },
  journeyColumn: { flex: 1, minWidth: 0 },
  sideColumn: { width: '100%' },
  sideColumnExpanded: { width: 310 },
  sectionIntro: { padding: 20, gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  flexText: { flex: 1 },
  openingInfo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  separator: { height: 1 },
  loadingState: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 72 },
});

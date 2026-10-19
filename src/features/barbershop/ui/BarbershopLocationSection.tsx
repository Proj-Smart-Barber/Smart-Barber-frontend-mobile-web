import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { useTheme } from '@/shared/theme';
import { Alert, Badge, Button, Text, TextInput, Spinner } from '@/shared/ui';
import { GoogleMapCanvas } from '@/features/discovery/ui/GoogleMapCanvas';
import { useBarbershopLocation } from '../model/use-barbershop-location';

export interface BarbershopLocationSectionProps {
  shopId?: string | null;
  onConfirmed?: () => void;
}

export function BarbershopLocationSection({
  shopId,
  onConfirmed,
}: BarbershopLocationSectionProps) {
  const { colors, spacing, radius } = useTheme();
  const vm = useBarbershopLocation(shopId);

  const statusTone =
    vm.locationState?.status === 'CONFIRMED'
      ? 'success'
      : vm.locationState?.status === 'NEEDS_REVIEW'
      ? 'warning'
      : 'neutral';

  const statusLabel =
    vm.locationState?.status === 'CONFIRMED'
      ? 'Localização confirmada'
      : vm.locationState?.status === 'NEEDS_REVIEW'
      ? 'Requer revisão'
      : 'Não confirmada';

  const activePin = vm.adjustedPoint ?? vm.locationState?.point ?? null;

  return (
    <LiquidGlassView
      variant="card"
      style={{ width: '100%' }}
      contentStyle={{ padding: spacing[5], gap: spacing[4] }}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1, gap: spacing[1] }}>
          <Text variant="h3" color={colors.text.primary}>
            Localização Comercial (Google Maps)
          </Text>
          <Text variant="bodySm" color={colors.text.secondary}>
            Confirme o endereço e o pino geográfico para exibir sua barbearia nas buscas por proximidade.
          </Text>
        </View>
        <Badge label={statusLabel} tone={statusTone as any} />
      </View>

      {vm.isLoading ? (
        <View style={styles.loadingRow}>
          <Spinner size="small" />
          <Text variant="caption" color={colors.text.secondary}>
            Carregando localização comercial...
          </Text>
        </View>
      ) : null}

      {vm.isRestoring ? (
        <View style={styles.loadingRow}>
          <Spinner size="small" />
          <Text variant="caption" color={colors.text.secondary}>
            Verificando tentativas de confirmação anteriores...
          </Text>
        </View>
      ) : null}

      {vm.restorationStatus === 'error' ? (
        <View style={{ gap: spacing[2] }}>
          <Alert
            variant="error"
            message="Não foi possível verificar o histórico de tentativas locais da barbearia."
          />
          <Button
            title="Tentar verificar novamente"
            variant="outline"
            onPress={() => void vm.retryRestoration()}
          />
        </View>
      ) : null}

      {vm.isLocationError ? (
        <View style={{ gap: spacing[2] }}>
          <Alert
            variant="error"
            message="Não foi possível carregar o estado atual da localização comercial da barbearia."
          />
          <Button
            title="Tentar carregar novamente"
            variant="outline"
            onPress={() => void vm.reloadAuthoritativeState()}
          />
        </View>
      ) : null}

      {!vm.isAuthorized ? (
        <Alert
          variant="warning"
          message="Apenas proprietários (OWNER) ativos desta unidade possuem permissão para configurar a localização comercial."
        />
      ) : null}

      {vm.locationState ? (
        <View
          style={[
            styles.stateSummaryBox,
            {
              backgroundColor: colors.surface.input,
              borderColor: colors.border.subtle,
              borderRadius: radius.md,
            },
          ]}
        >
          <View style={styles.summaryTopRow}>
            <Ionicons
              name={
                vm.locationState.status === 'CONFIRMED'
                  ? 'checkmark-circle'
                  : 'location-outline'
              }
              size={18}
              color={
                vm.locationState.status === 'CONFIRMED'
                  ? colors.feedback.success
                  : colors.brand.primary
              }
            />
            <Text
              variant="bodySm"
              weight="semibold"
              color={colors.text.primary}
              style={{ flex: 1 }}
            >
              {vm.locationState.address || 'Endereço ainda não confirmado'}
            </Text>
            <Text variant="caption" color={colors.text.muted}>
              v{vm.locationState.version}
            </Text>
          </View>
          {vm.locationState.point ? (
            <Text variant="caption" color={colors.text.secondary}>
              Coordenadas ativas: {vm.locationState.point.latitude.toFixed(6)},{' '}
              {vm.locationState.point.longitude.toFixed(6)} ({vm.locationState.source})
            </Text>
          ) : (
            <Text variant="caption" color={colors.text.secondary}>
              Sem coordenadas confirmadas. A unidade aparece na listagem geral, mas ainda não nas buscas por raio/GPS.
            </Text>
          )}
        </View>
      ) : null}

      {vm.errorMessage ? (
        <Alert variant="error" message={vm.errorMessage} />
      ) : null}

      {vm.conflictDetected ? (
        <View style={styles.actionNoticeRow}>
          <Button
            title="Recarregar localização atual"
            variant="outline"
            onPress={() => void vm.reloadAuthoritativeState()}
          />
        </View>
      ) : null}

      {vm.uncertainMutationId ? (
        <View style={styles.actionNoticeRow}>
          <Button
            title="Verificar e reconciliar confirmação"
            variant="outline"
            loading={vm.isSaving}
            onPress={() => void vm.reconcileAfterUncertainty()}
          />
        </View>
      ) : null}

      {/* Busca de endereço geocodificado */}
      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" weight="semibold" color={colors.text.secondary}>
          Buscar endereço comercial
        </Text>
        <View style={styles.searchInputRow}>
          <View style={{ flex: 1 }}>
            <TextInput
              placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
              value={vm.addressQuery}
              onChangeText={vm.setAddressQuery}
              editable={!vm.isSearching && !vm.isSaving}
            />
          </View>
          <Button
            title="Buscar no Google"
            variant="outline"
            loading={vm.isSearching}
            disabled={vm.isSearching || vm.isSaving}
            onPress={() => void vm.searchCandidates()}
          />
        </View>
      </View>

      {/* Lista de candidatos retornados pelo Google Maps */}
      {vm.candidates.length > 0 ? (
        <View style={{ gap: spacing[2] }}>
          <View style={styles.candidatesHeader}>
            <Text variant="caption" weight="semibold" color={colors.text.secondary}>
              Selecione o endereço correspondente ({vm.candidates.length})
            </Text>
            <Text variant="caption" color={colors.text.muted}>
              Google Maps
            </Text>
          </View>

          {vm.candidates.map((candidate) => {
            const isSelected =
              vm.selectedCandidate?.candidateId === candidate.candidateId;
            return (
              <Pressable
                key={candidate.candidateId}
                accessibilityRole="radio"
                accessibilityLabel={`Candidato ${candidate.displayAddress}`}
                accessibilityState={{ checked: isSelected }}
                onPress={() => vm.selectCandidate(candidate)}
                style={[
                  styles.candidateCard,
                  {
                    borderRadius: radius.md,
                    borderColor: isSelected
                      ? colors.brand.primary
                      : colors.border.subtle,
                    backgroundColor: isSelected
                      ? colors.surface.selected
                      : colors.surface.default,
                  },
                ]}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={isSelected ? colors.brand.primary : colors.text.secondary}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    variant="bodySm"
                    weight="semibold"
                    color={colors.text.primary}
                  >
                    {candidate.displayAddress}
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    {candidate.point.latitude.toFixed(6)},{' '}
                    {candidate.point.longitude.toFixed(6)} • {candidate.attribution}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Mapa e ajuste fino do pino */}
      {activePin ? (
        <View style={{ gap: spacing[2] }}>
          <View style={styles.pinHeaderRow}>
            <Text variant="caption" weight="semibold" color={colors.text.secondary}>
              Pré-visualização e ajuste fino do pino (máx. 250m)
            </Text>
            {vm.selectedCandidate ? (
              <Text
                variant="caption"
                color={
                  vm.isPinOutOfBounds
                    ? colors.feedback.error
                    : colors.text.secondary
                }
              >
                Deslocamento: {vm.pinOffsetMeters}m / 250m
              </Text>
            ) : null}
          </View>

          <GoogleMapCanvas
            markers={
              activePin
                ? [
                    {
                      id: shopId ?? 'current-shop',
                      title: vm.addressQuery || 'Unidade comercial',
                      coordinates: activePin,
                    },
                  ]
                : []
            }
            draggablePin={vm.selectedCandidate ? activePin : null}
            onPinDragEnd={vm.selectedCandidate ? vm.adjustPin : undefined}
            height={220}
            testID="owner-location-google-map"
          />
        </View>
      ) : null}

      {/* Botão de confirmação com candidato selecionado */}
      {vm.selectedCandidate ? (
        <Button
          title="Confirmar localização comercial"
          variant="primary"
          loading={vm.isSaving}
          disabled={
            vm.isSaving ||
            vm.isPinOutOfBounds ||
            vm.isRestoring ||
            vm.restorationStatus === 'error' ||
            Boolean(vm.uncertainMutationId)
          }
          onPress={async () => {
            const saved = await vm.confirmLocation();
            if (saved && onConfirmed) {
              onConfirmed();
            }
          }}
        />
      ) : null}
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stateSummaryBox: {
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  candidatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  candidateCard: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 10,
  },
  pinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
});

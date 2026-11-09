import React, { forwardRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput as RNTextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { TextInput } from '@/shared/ui/TextInput';

export interface NearbyDiscoveryHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenFilters: () => void;
  onOpenMap: () => void;
  activeFilterCount: number;
  summary: string;
  mapDisabled: boolean;
  mapDisabledReason?: string;
  notice?: React.ReactNode;
  inputRef?: React.Ref<React.ComponentRef<typeof RNTextInput>>;
}

export const NearbyDiscoveryHeader = forwardRef<
  React.ComponentRef<typeof RNTextInput>,
  NearbyDiscoveryHeaderProps
>(function NearbyDiscoveryHeader(
  {
    searchQuery,
    onSearchChange,
    onClearSearch,
    onOpenFilters,
    onOpenMap,
    activeFilterCount,
    summary,
    mapDisabled,
    mapDisabledReason,
    notice,
    inputRef: propInputRef,
  },
  ref,
) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact } = useAdaptiveLayout();

  // Permite ref forwarded ou passada via prop inputRef
  const resolvedRef = (ref || propInputRef) as React.Ref<any>;

  const filterButtonLabel =
    activeFilterCount > 0 ? `Filtros · ${activeFilterCount}` : 'Filtros';
  const filterA11yLabel =
    activeFilterCount > 0
      ? `Filtros, ${activeFilterCount} aplicado`
      : 'Abrir filtros de distância';

  return (
    <View style={styles.container} testID="nearby-discovery-header">
      {/* Linha de busca e ações principais */}
      <View
        style={[
          styles.controlsContainer,
          isCompact ? styles.controlsStacked : styles.controlsRow,
        ]}
      >
        {/* Campo de Busca Realmente Editável */}
        <View style={styles.searchWrapper}>
          <TextInput
            ref={resolvedRef}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Buscar barbearia, endereço ou cidade..."
            accessibilityLabel="Buscar barbearia, endereço ou cidade"
            returnKeyType="search"
            leftIcon={
              <Ionicons
                name="search"
                size={18}
                color={colors.text.secondary}
              />
            }
            rightIcon={
              searchQuery.length > 0 ? (
                <Pressable
                  onPress={onClearSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca"
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.text.muted}
                  />
                </Pressable>
              ) : undefined
            }
          />
        </View>

        {/* Grupo de Ações: Filtros e Mapa */}
        <View style={styles.actionsRow}>
          {/* Botão Filtros: com texto e ícone */}
          <Pressable
            onPress={onOpenFilters}
            accessibilityRole="button"
            accessibilityLabel={filterA11yLabel}
            accessibilityState={{ selected: activeFilterCount > 0 }}
            style={({ pressed }) => [
              styles.filterButton,
              {
                borderRadius: radius.md,
                borderColor:
                  activeFilterCount > 0
                    ? colors.brand.primary
                    : colors.border.subtle,
                backgroundColor:
                  activeFilterCount > 0
                    ? isDark
                      ? 'rgba(235, 94, 40, 0.14)'
                      : 'rgba(235, 94, 40, 0.08)'
                    : colors.surface.input,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={
                activeFilterCount > 0
                  ? colors.brand.primary
                  : colors.text.primary
              }
            />
            <Text
              variant="bodySm"
              weight={activeFilterCount > 0 ? 'bold' : 'medium'}
              color={
                activeFilterCount > 0
                  ? colors.brand.primary
                  : colors.text.primary
              }
              style={{ marginLeft: 6 }}
            >
              {filterButtonLabel}
            </Text>
          </Pressable>

          {/* Botão Mapa: somente ícone, sem texto visível, min 44x44, tooltip desktop */}
          <Pressable
            ref={(node: any) => {
              if (Platform.OS === 'web' && node) {
                if (typeof node.setAttribute === 'function') {
                  node.setAttribute('title', 'Mapa');
                } else if ('title' in node) {
                  node.title = 'Mapa';
                }
              }
            }}
            onPress={onOpenMap}
            disabled={mapDisabled}
            accessibilityRole="button"
            accessibilityLabel="Abrir mapa de barbearias"
            accessibilityState={{ disabled: mapDisabled }}
            aria-disabled={mapDisabled}
            {...(Platform.OS === 'web' ? ({ title: 'Mapa' } as any) : {})}
            style={({ pressed }) => [
              styles.mapIconButton,
              {
                borderRadius: radius.md,
                borderColor: colors.border.subtle,
                backgroundColor: colors.surface.input,
                opacity: mapDisabled ? 0.45 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={mapDisabled ? colors.text.muted : colors.text.primary}
            />
          </Pressable>
        </View>
      </View>

      {/* Resumo compacto e honesto */}
      {summary ? (
        <View style={[styles.summaryRow, { marginTop: spacing[2] }]}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={colors.text.secondary}
            style={{ marginRight: 5 }}
          />
          <Text
            variant="caption"
            weight="medium"
            color={colors.text.secondary}
            style={{ flex: 1 }}
          >
            {summary}
          </Text>
        </View>
      ) : null}

      {/* Explicação de mapa desabilitado */}
      {mapDisabled && mapDisabledReason ? (
        <Text
          variant="caption"
          color={colors.text.muted}
          style={{ marginTop: 2, marginLeft: 2 }}
        >
          {mapDisabledReason}
        </Text>
      ) : null}

      {/* Aviso ou banner contextual opcional */}
      {notice ? (
        <View style={{ marginTop: spacing[2] }}>{notice}</View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    width: '100%',
  },
  controlsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  controlsRow: {
    flexDirection: 'row',
  },
  controlsStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchWrapper: {
    flex: 1,
    minWidth: 200,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  mapIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

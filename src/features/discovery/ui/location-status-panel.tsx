import React from 'react';
import { View, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';

export type LocationPanelStatus =
  | 'denied'
  | 'unavailable'
  | 'service_unavailable'
  | 'ready';

export interface LocationStatusPanelProps {
  status: LocationPanelStatus;
  canAskAgain?: boolean;
  onRecoverPermission?: () => void | Promise<void>;
  onRetryPosition?: () => void | Promise<void>;
  onManualSearch?: () => void;
  isPlatformWeb?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function LocationStatusPanel({
  status,
  canAskAgain = true,
  onRecoverPermission,
  onRetryPosition,
  onManualSearch,
  isPlatformWeb = Platform.OS === 'web',
  style,
}: LocationStatusPanelProps) {
  const { colors, radius, spacing, isDark } = useTheme();

  if (status === 'ready') {
    return null;
  }

  // 1. Cenário: Permissão negada pelo usuário ou sistema
  if (status === 'denied') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface.elevated,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border.subtle,
            borderRadius: radius.lg,
            padding: spacing[4],
          },
          style,
        ]}
        accessibilityRole="region"
        accessibilityLabel="Painel de localização não permitida"
      >
        <View style={styles.glassWrapper}>
          <View style={styles.contentWrap}>
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(189, 32, 38, 0.15)'
                      : 'rgba(189, 32, 38, 0.08)',
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={22}
                  color={colors.brand.primary}
                />
              </View>

              <View style={styles.headerTextGroup}>
                <Text
                  variant="subhead"
                  weight="bold"
                  color={colors.text.primary}
                >
                  Localização não permitida
                </Text>
              </View>
            </View>

            <Text
              variant="bodySm"
              weight="medium"
              color={colors.text.secondary}
              style={{ marginTop: spacing[3] }}
            >
              Sem acesso à sua localização, não conseguimos mostrar as barbearias mais próximas de você.
            </Text>

            <Text
              variant="caption"
              color={colors.text.muted}
              style={{ marginTop: spacing[2] }}
            >
              Você pode buscar por nome ou escolher um bairro.
            </Text>

            {/* Ações de recuperação */}
            <View style={[styles.actionsRow, { marginTop: spacing[4] }]}>
              {canAskAgain ? (
                <Button
                  variant="primary"
                  title="Permitir localização"
                  onPress={onRecoverPermission}
                  style={styles.actionBtn}
                />
              ) : isPlatformWeb ? (
                <View
                  style={[
                    styles.webNoticeBox,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)',
                      borderColor: colors.border.subtle,
                      borderRadius: radius.md,
                      padding: spacing[3],
                    },
                  ]}
                >
                  <Text variant="caption" color={colors.text.secondary}>
                    Ative o acesso à localização nas configurações do seu navegador para encontrar barbearias próximas.
                  </Text>
                </View>
              ) : (
                <Button
                  variant="primary"
                  title="Abrir configurações"
                  onPress={onRecoverPermission}
                  style={styles.actionBtn}
                />
              )}

              {onManualSearch ? (
                <Button
                  variant="outline"
                  title="Buscar por nome ou bairro"
                  onPress={onManualSearch}
                  style={styles.actionBtn}
                />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // 2. Cenário: Permissão concedida, mas posição GPS indisponível ou expirada
  if (status === 'unavailable') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface.elevated,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border.subtle,
            borderRadius: radius.lg,
            padding: spacing[4],
          },
          style,
        ]}
        accessibilityRole="region"
        accessibilityLabel="Painel de posição indisponível"
      >
        <View style={styles.glassWrapper}>
          <View style={styles.contentWrap}>
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(224, 86, 36, 0.15)'
                      : 'rgba(224, 86, 36, 0.08)',
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Ionicons
                  name="navigate-outline"
                  size={22}
                  color={colors.feedback?.warning ?? '#F59E0B'}
                />
              </View>

              <View style={styles.headerTextGroup}>
                <Text
                  variant="subhead"
                  weight="bold"
                  color={colors.text.primary}
                >
                  Não conseguimos obter sua localização agora.
                </Text>
              </View>
            </View>

            <Text
              variant="bodySm"
              color={colors.text.secondary}
              style={{ marginTop: spacing[3] }}
            >
              Verifique se o GPS está ativado ou tente novamente em alguns instantes.
            </Text>

            <Text
              variant="caption"
              color={colors.text.muted}
              style={{ marginTop: spacing[2] }}
            >
              Você ainda pode explorar e buscar por nome ou bairro.
            </Text>

            <View style={[styles.actionsRow, { marginTop: spacing[4] }]}>
              {onRetryPosition ? (
                <Button
                  variant="primary"
                  title="Tentar novamente"
                  onPress={onRetryPosition}
                  style={styles.actionBtn}
                />
              ) : null}

              {onManualSearch ? (
                <Button
                  variant="outline"
                  title="Buscar por nome ou bairro"
                  onPress={onManualSearch}
                  style={styles.actionBtn}
                />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // 3. Cenário: Falha do serviço de proximidade (ex.: HTTP 503)
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface.elevated,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border.subtle,
          borderRadius: radius.lg,
          padding: spacing[4],
        },
        style,
      ]}
      accessibilityRole="region"
      accessibilityLabel="Painel de serviço de busca indisponível"
    >
      <View style={styles.glassWrapper}>
        <View style={styles.contentWrap}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(224, 86, 36, 0.15)'
                    : 'rgba(224, 86, 36, 0.08)',
                  borderRadius: radius.full,
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color={colors.feedback?.warning ?? '#F59E0B'}
              />
            </View>

            <View style={styles.headerTextGroup}>
              <Text
                variant="subhead"
                weight="bold"
                color={colors.text.primary}
              >
                Serviço temporariamente indisponível
              </Text>
            </View>
          </View>

          <Text
            variant="bodySm"
            color={colors.text.secondary}
            style={{ marginTop: spacing[3] }}
          >
            Não foi possível calcular as barbearias mais próximas no momento. Não se trata de permissão negada nem de GPS desligado.
          </Text>

          <Text
            variant="caption"
            color={colors.text.muted}
            style={{ marginTop: spacing[2] }}
          >
            Você pode tentar novamente em instantes ou buscar manualmente.
          </Text>

          <View style={[styles.actionsRow, { marginTop: spacing[4] }]}>
            {onRetryPosition ? (
              <Button
                variant="primary"
                title="Tentar novamente"
                onPress={onRetryPosition}
                style={styles.actionBtn}
              />
            ) : null}

            {onManualSearch ? (
              <Button
                variant="outline"
                title="Buscar por nome ou bairro"
                onPress={onManualSearch}
                style={styles.actionBtn}
              />
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  glassWrapper: {
    width: '100%',
  },
  contentWrap: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  actionBtn: {
    minHeight: 40,
  },
  webNoticeBox: {
    borderWidth: 1,
    width: '100%',
    marginBottom: 4,
  },
});



import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, Badge, Card } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { formatExceptionLabel } from '../model/availability.types';
import type { AvailabilityException } from '../api/availability.contract';

interface ExceptionCardProps {
  exception: AvailabilityException;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export function ExceptionCard({ exception, onRemove, disabled }: ExceptionCardProps) {
  const { colors, spacing, radius } = useTheme();
  const [year, month, day] = exception.date.split('-');
  const monthLabel = MONTHS[Math.max(0, Number(month) - 1)] ?? month;
  const hoursLabel = formatExceptionLabel(exception);
  const isClosedDay = !exception.openTime;

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: colors.background.card,
          borderColor: colors.border.subtle,
          borderRadius: radius.lg,
          padding: spacing[4],
        },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.dateTile,
            {
              backgroundColor: colors.surface.elevated,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text variant="h2" color={colors.text.primary}>
            {day}
          </Text>
          <Text variant="badge" color={colors.brand.primary}>
            {monthLabel}
          </Text>
          <Text variant="caption" color={colors.text.muted}>
            {year}
          </Text>
        </View>

        <View style={styles.info}>
          <View style={styles.badgeRow}>
            <Badge
              label={isClosedDay ? 'Unidade fechada' : 'Horário especial'}
              tone={isClosedDay ? 'error' : 'warning'}
            />
          </View>

          <View style={styles.hoursRow}>
            <Ionicons
              name={isClosedDay ? 'lock-closed-outline' : 'time-outline'}
              size={16}
              color={colors.text.secondary}
            />
            <Text variant="bodySm" weight="semibold" color={colors.text.primary}>
              {hoursLabel}
            </Text>
          </View>

          {exception.reason ? (
            <Text variant="caption" color={colors.text.secondary} numberOfLines={2}>
              {exception.reason}
            </Text>
          ) : (
            <Text variant="caption" color={colors.text.muted}>
              Sem observação adicional
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remover exceção de ${day}/${month}/${year}`}
          disabled={disabled}
          hitSlop={6}
          onPress={() => onRemove(exception.id)}
          style={({ pressed }) => [
            styles.removeButton,
            {
              backgroundColor: pressed ? colors.feedback.errorBackground : colors.surface.elevated,
              borderRadius: radius.md,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.feedback.error} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateTile: {
    width: 64,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  info: { flex: 1, gap: 7 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  removeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

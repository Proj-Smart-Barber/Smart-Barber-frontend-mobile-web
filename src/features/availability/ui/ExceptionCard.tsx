import { View, StyleSheet } from 'react-native';
import { Text, Button, Badge, Card } from '@/shared/ui';
import { formatExceptionLabel } from '../model/availability.types';
import type { AvailabilityException } from '../api/availability.contract';

interface ExceptionCardProps {
  exception: AvailabilityException;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function ExceptionCard({ exception, onRemove, disabled }: ExceptionCardProps) {
  const [year, month, day] = exception.date.split('-');
  const dateLabel = `${day}/${month}/${year}`;
  const hoursLabel = formatExceptionLabel(exception);

  return (
    <Card accessibilityRole="group" accessibilityLabel={`Exceção em ${dateLabel}`}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text variant="label">{dateLabel}</Text>
          <Badge
            label={hoursLabel}
            tone={exception.openTime ? 'warning' : 'error'}
          />
          {exception.reason ? (
            <Text variant="caption">{exception.reason}</Text>
          ) : null}
        </View>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => onRemove(exception.id)}
          disabled={disabled}
          accessibilityLabel={`Remover exceção de ${dateLabel}`}
        >
          Remover
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: 8,
  },
  info: { flex: 1, gap: 4 },
});

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
    <Card>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text variant="bodySm" weight="semibold">{dateLabel}</Text>
          <Badge
            label={hoursLabel}
            tone={exception.openTime ? 'warning' : 'error'}
          />
          {exception.reason ? (
            <Text variant="caption">{exception.reason}</Text>
          ) : null}
        </View>
        <Button
          title="Remover"
          variant="ghost"
          onPress={() => onRemove(exception.id)}
          disabled={disabled}
        />
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

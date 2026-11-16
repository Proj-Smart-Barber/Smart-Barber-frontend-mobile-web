import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme';
import { Text } from '../../../shared/ui';
import { formatClockRange, formatDurationMinutes, minutesBetween } from '../model/agenda.helpers';
/** Buffer (intervalo/preparo): linha compacta e discreta na linha do tempo. */
export function AgendaBufferRow({ entry }) {
    var _a;
    const { colors, spacing } = useTheme();
    const duration = minutesBetween(entry.startTime, entry.endTime);
    return (<View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            paddingVertical: spacing[1],
            paddingHorizontal: spacing[2],
        }}>
      <Ionicons name="pause" size={14} color={colors.text.muted}/>
      <Text variant="caption" color={colors.text.muted}>
        {(_a = entry.kind) !== null && _a !== void 0 ? _a : 'Intervalo'} · {formatClockRange(entry.startTime, entry.endTime)} ·{' '}
        {formatDurationMinutes(duration)}
      </Text>
    </View>);
}

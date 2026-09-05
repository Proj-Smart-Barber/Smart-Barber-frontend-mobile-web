import React from 'react';
import { Alert, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui';

export function QuickActionsBar() {
  const { colors, spacing } = useTheme();
  const { isCompact } = useAdaptiveLayout();

  const handleQuickBooking = () => {
    Alert.alert(
      'Encaixe Rápido',
      'Funcionalidade de encaixe manual de cliente no balcão. Será conectada ao fluxo de criação de reservas.',
    );
  };

  const handleBlockSlot = () => {
    Alert.alert(
      'Bloquear Horário',
      'Permite bloquear intervalos de almoço, descanso ou pausa na agenda.',
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          'Agende seu horário no Smart Barber com praticidade e exclusividade: https://smartbarber.app',
      });
    } catch {
      // Ignora cancelamentos
    }
  };

  return (
    <View
      style={{
        width: '100%',
        flexDirection: isCompact ? 'column' : 'row',
        alignItems: 'center',
        gap: spacing[3],
      }}
    >
      <Button
        title="Novo Encaixe"
        variant="primary"
        leftIcon={<Ionicons name="add-circle-outline" size={18} color={colors.text.inverse} />}
        onPress={handleQuickBooking}
        style={{ flex: 1, minHeight: 48 }}
      />

      <Button
        title="Bloquear Horário"
        variant="outline"
        leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.text.primary} />}
        onPress={handleBlockSlot}
        style={{ flex: 1, minHeight: 48 }}
      />

      <Button
        title="Compartilhar Link"
        variant="outline"
        leftIcon={<Ionicons name="share-social-outline" size={18} color={colors.text.primary} />}
        onPress={handleShare}
        style={{ flex: 1, minHeight: 48 }}
      />
    </View>
  );
}

import React from 'react';
import { Alert, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui';

import { useSession } from '@/features/auth';

export function QuickActionsBar() {
  const { colors, spacing } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const router = useRouter();
  const { barbershop } = useSession();

  const handleOpenAgenda = () => {
    router.push('/(app)/agenda' as any);
  };

  const handleOpenServices = () => {
    router.push('/(app)/services' as any);
  };

  const handleQuickBooking = () => {
    Alert.alert(
      'Novo Encaixe (Agendamento)',
      'O registro de novos agendamentos (encaixe de cliente) aguarda a disponibilização do endpoint de criação de reservas na API do backend.',
    );
  };

  const handleBlockSlot = () => {
    router.push('/(app)/availability' as any);
  };

  const handleShare = async () => {
    try {
      const catalogUrl = barbershop?.id
        ? `https://smartbarber.app/barbershops/${barbershop.id}/services`
        : 'https://smartbarber.app';
      await Share.share({
        message: `Confira os serviços e novidades da nossa barbearia no Smart Barber: ${catalogUrl}`,
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
        alignItems: isCompact ? 'stretch' : 'center',
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
        title="Serviços"
        variant="outline"
        leftIcon={<Ionicons name="cut-outline" size={18} color={colors.text.primary} />}
        onPress={handleOpenServices}
        textStyle={{ color: colors.text.primary }}
        style={{ flex: 1, minHeight: 48 }}
      />

      <Button
        title="Bloquear Horário"
        variant="outline"
        leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.text.primary} />}
        onPress={handleBlockSlot}
        textStyle={{ color: colors.text.primary }}
        style={{ flex: 1, minHeight: 48 }}
      />

      <Button
        title="Ver Agenda"
        variant="outline"
        leftIcon={<Ionicons name="calendar-outline" size={18} color={colors.text.primary} />}
        onPress={handleOpenAgenda}
        textStyle={{ color: colors.text.primary }}
        style={{ flex: 1, minHeight: 48 }}
      />

      <Button
        title="Ver serviços"
        variant="outline"
        leftIcon={<Ionicons name="share-social-outline" size={18} color={colors.text.primary} />}
        onPress={handleShare}
        textStyle={{ color: colors.text.primary }}
        style={{ flex: 1, minHeight: 48 }}
      />
    </View>
  );
}

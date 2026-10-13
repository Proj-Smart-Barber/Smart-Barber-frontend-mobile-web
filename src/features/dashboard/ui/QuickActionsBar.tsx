import React from 'react';
import { Alert, Platform, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Button, useToast } from '@/shared/ui';
import { getPublicCatalogUrl } from '@/shared/config/env';

import { useSession, getOperationalContext } from '@/features/auth';

export function QuickActionsBar() {
  const { colors, spacing } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const { showToast } = useToast();
  const router = useRouter();
  const session = useSession();
  const { barbershop } = session;
  const operationalContext = getOperationalContext(session);
  const isUnitActive = operationalContext?.unitStatus !== 'INACTIVE';

  const handleOpenAgenda = () => {
    router.push('/(app)/agenda' as any);
  };

  const handleOpenServices = () => {
    router.push('/(app)/services' as any);
  };

  const handleNewBooking = () => {
    if (!isUnitActive) {
      showToast('Esta unidade encontra-se inativa para novos agendamentos.', 'error');
      return;
    }
    router.push('/(app)/new-booking' as any);
  };

  const handleBlockSlot = () => {
    router.push('/(app)/availability' as any);
  };

  const handleShare = async () => {
    const catalogUrl = getPublicCatalogUrl(barbershop?.id);
    const shopName = barbershop?.name || 'Smart Barber';
    const message = `Confira os serviços e catálogo oficial da nossa barbearia no Smart Barber: ${catalogUrl}`;

    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: `${shopName} — Catálogo Oficial`,
            text: message,
            url: catalogUrl,
          });
          showToast('Link do catálogo compartilhado!', 'success');
        } catch (err: any) {
          if (err?.name !== 'AbortError') {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(catalogUrl);
              showToast('Link do catálogo copiado!', 'success');
            }
          }
        }
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(catalogUrl);
        showToast('Link do catálogo copiado!', 'success');
      } else {
        Alert.alert('Catálogo Oficial', `Acesse ou copie o link:\n${catalogUrl}`);
      }
      return;
    }

    try {
      const result = await Share.share({
        message,
        url: catalogUrl,
        title: `${shopName} — Catálogo Oficial`,
      });

      if (result.action === Share.sharedAction) {
        showToast('Link do catálogo compartilhado!', 'success');
      }
    } catch {
      // Ignora cancelamentos intencionais do usuário
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
        title="Ver Agenda"
        variant="primary"
        leftIcon={<Ionicons name="calendar-outline" size={18} color={colors.text.inverse} />}
        onPress={handleOpenAgenda}
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
        title="Compartilhar Catálogo"
        variant="outline"
        leftIcon={<Ionicons name="share-social-outline" size={18} color={colors.text.primary} />}
        onPress={handleShare}
        textStyle={{ color: colors.text.primary }}
        style={{ flex: 1, minHeight: 48 }}
      />

      <Button
        title="Novo Agendamento"
        variant="outline"
        disabled={!isUnitActive}
        leftIcon={<Ionicons name="add-circle-outline" size={18} color={isUnitActive ? colors.text.primary : colors.text.muted} />}
        onPress={handleNewBooking}
        textStyle={{ color: isUnitActive ? colors.text.primary : colors.text.muted }}
        style={{ flex: 1, minHeight: 48 }}
      />
    </View>
  );
}

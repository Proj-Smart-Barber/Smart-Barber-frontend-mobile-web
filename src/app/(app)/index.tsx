import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '@/shared/brand';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Button, Card, Text } from '@/shared/ui';
import { useSession } from '@/features/auth';

export default function AppHomeScreen() {
  const { staff, signOut, restoreSession, status } = useSession();
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme(); const { contentMaxWidth, isCompact } = useAdaptiveLayout();
  const owner = staff?.role === 'OWNER';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <View style={{ minHeight: 64, paddingHorizontal: isCompact ? spacing[4] : spacing[6], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
        <BrandMark variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'} size={36} decorative={false} />
        <Pressable accessibilityRole="button" accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'} onPress={toggleTheme} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.default, backgroundColor: pressed ? colors.surface.selected : colors.surface.default })}><Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.text.secondary} /></Pressable>
      </View>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, alignItems: 'center', padding: isCompact ? spacing[4] : spacing[6] }}>
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing[4] }}>
          <View style={{ gap: spacing[1] }}><Text variant="h1" color={colors.text.primary}>Olá, {staff?.name ?? 'equipe'}.</Text><Text variant="bodySm">Sua sessão está pronta para uso.</Text></View>
          <Card elevated><View style={{ gap: spacing[4] }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] }}><View style={{ flex: 1, gap: spacing[1] }}><Text variant="subhead" color={colors.text.primary}>{staff?.email ?? 'Perfil da equipe'}</Text><Text variant="caption">Acesso autenticado</Text></View><Badge label={owner ? 'Proprietário' : 'Barbeiro'} tone={owner ? 'success' : 'brand'} /></View><View style={{ flexDirection: isCompact ? 'column' : 'row', gap: spacing[3] }}><Button title="Atualizar perfil" variant="outline" leftIcon={<Ionicons name="sync-outline" size={18} color={colors.brand.primary} />} onPress={() => void restoreSession()} style={{ flex: 1 }} /><Button title="Sair" variant="destructive" leftIcon={<Ionicons name="log-out-outline" size={18} color={colors.text.inverse} />} onPress={() => void signOut()} style={{ flex: 1 }} /></View></View></Card>
          <Card><View style={{ gap: spacing[2] }}><Text variant="h2" color={colors.text.primary}>Próximos passos</Text><Text variant="bodySm">As ferramentas de agenda, equipe e operação aparecerão aqui conforme forem disponibilizadas.</Text><Text variant="caption">Status da sessão: {status === 'authenticated' ? 'ativo' : status}</Text></View></Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

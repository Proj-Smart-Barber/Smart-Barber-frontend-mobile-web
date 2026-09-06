import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import {
  Alert,
  Badge,
  Button,
  Card,
  FormField,
  Text,
  TextInput,
} from '@/shared/ui';
import { useSession } from '@/features/auth';
import { useProfileViewModel } from '../model/use-profile-view-model';

export function ProfileView() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const { isCompact, formMaxWidth } = useAdaptiveLayout();
  const router = useRouter();
  const { signOut } = useSession();

  const {
    staff,
    control,
    errors,
    isSubmitting,
    submitError,
    isSuccess,
    successMessage,
    isDirty,
    onSubmit,
  } = useProfileViewModel();

  const isOwner = staff?.role === 'OWNER';

  // Iniciais do profissional
  const initials = staff?.name
    ? staff.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'SB';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
    >
      {/* Top Header com Voltar e Alternador de Tema */}
      <View
        style={{
          minHeight: 56,
          paddingHorizontal: isCompact ? spacing[4] : spacing[6],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: colors.border.subtle,
          backgroundColor: colors.surface.default,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar ao início"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            padding: spacing[2],
            borderRadius: radius.md,
            backgroundColor: pressed
              ? colors.surface.selected
              : 'transparent',
          })}
        >
          <Ionicons
            name="arrow-back-outline"
            size={20}
            color={colors.text.primary}
          />
          <Text variant="bodySm" weight="medium" color={colors.text.primary}>
            Voltar
          </Text>
        </Pressable>

        <Text variant="h3" color={colors.text.primary}>
          Meu Perfil
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isDark ? 'Ativar modo claro' : 'Ativar modo escuro'
          }
          onPress={toggleTheme}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border.default,
            backgroundColor: pressed
              ? colors.surface.selected
              : colors.surface.default,
          })}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={18}
            color={colors.text.secondary}
          />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            paddingHorizontal: isCompact ? spacing[4] : spacing[6],
            paddingVertical: spacing[6],
          }}
        >
          <Card
            style={{
              width: '100%',
              maxWidth: formMaxWidth,
              gap: spacing[6],
            }}
          >
            {/* Bloco do Avatar e Papel */}
            <View style={{ alignItems: 'center', gap: spacing[3] }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: radius.full,
                  backgroundColor: colors.surface.elevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.brand.primary,
                }}
              >
                <Text variant="h1" color={colors.text.primary} weight="bold">
                  {initials}
                </Text>
              </View>

              <Badge
                label={isOwner ? 'Proprietário' : 'Barbeiro'}
                tone={isOwner ? 'brand' : 'success'}
              />

              <Text variant="caption" color={colors.text.muted}>
                {staff?.email}
              </Text>
            </View>

            {/* Mensagens de Sucesso ou Erro */}
            {isSuccess ? (
              <Alert
                title="Sucesso"
                message={successMessage || 'Dados salvos com sucesso.'}
                variant="success"
              />
            ) : null}

            {submitError ? (
              <Alert
                title="Atenção"
                message={submitError}
                variant="error"
              />
            ) : null}

            {/* Formulário de Edição */}
            <View style={{ gap: spacing[4] }}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormField
                    label="Nome do profissional"
                    required
                    error={errors.name?.message}
                  >
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Seu nome completo"
                      disabled={isSubmitting}
                      error={Boolean(errors.name)}
                      leftIcon={
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color={colors.brand.silver}
                        />
                      }
                    />
                  </FormField>
                )}
              />

              <Controller
                control={control}
                name="avatarUrl"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormField
                    label="URL do Avatar / Foto (Opcional)"
                    error={errors.avatarUrl?.message}
                  >
                    <TextInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="https://exemplo.com/sua-foto.jpg"
                      keyboardType="url"
                      autoCapitalize="none"
                      autoCorrect={false}
                      disabled={isSubmitting}
                      error={Boolean(errors.avatarUrl)}
                      leftIcon={
                        <Ionicons
                          name="image-outline"
                          size={18}
                          color={colors.brand.silver}
                        />
                      }
                    />
                  </FormField>
                )}
              />

              {/* Botão de Salvar Alterações de Perfil */}
              <Button
                title="Salvar alterações"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting || !isDirty}
                onPress={onSubmit}
                style={{ marginTop: spacing.sm }}
              />
            </View>

            {/* Divisor */}
            <View
              style={{
                height: 1,
                backgroundColor: colors.border.subtle,
                marginVertical: spacing[2],
              }}
            />

            {/* Seção de Segurança */}
            <View style={{ gap: spacing[3] }}>
              <Text variant="h3" color={colors.text.primary}>
                Segurança e Credenciais
              </Text>

              <Button
                title="Alterar Senha"
                variant="outline"
                leftIcon={
                  <Ionicons
                    name="key-outline"
                    size={16}
                    color={colors.text.secondary}
                  />
                }
                onPress={() => router.push('/(app)/change-password')}
              />
            </View>

            {/* Divisor */}
            <View
              style={{
                height: 1,
                backgroundColor: colors.border.subtle,
                marginVertical: spacing[2],
              }}
            />

            {/* Seção de Sessão / Logout */}
            <View style={{ gap: spacing[3] }}>
              <Button
                title="Sair da Conta"
                variant="ghost"
                leftIcon={
                  <Ionicons
                    name="log-out-outline"
                    size={18}
                    color={colors.feedback.error}
                  />
                }
                onPress={() => signOut()}
                style={{
                  borderColor: colors.border.default,
                }}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

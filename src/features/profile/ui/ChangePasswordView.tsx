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
  Button,
  Card,
  FormField,
  PasswordInput,
  Text,
} from '@/shared/ui';
import { useChangePasswordViewModel } from '../model/use-change-password-view-model';

export function ChangePasswordView() {
  const { colors, spacing, radius } = useTheme();
  const { isCompact, formMaxWidth } = useAdaptiveLayout();
  const router = useRouter();

  const {
    control,
    errors,
    isSubmitting,
    submitError,
    isSuccess,
    successMessage,
    onSubmit,
  } = useChangePasswordViewModel();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
    >
      {/* Top Header */}
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
          accessibilityLabel="Voltar ao perfil"
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
            Perfil
          </Text>
        </Pressable>

        <Text variant="h3" color={colors.text.primary}>
          Alterar Senha
        </Text>

        <View style={{ width: 44 }} />
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
            paddingVertical: spacing[8],
          }}
        >
          <Card
            style={{
              width: '100%',
              maxWidth: formMaxWidth,
              gap: spacing[6],
            }}
          >
            <View style={{ gap: spacing[2] }}>
              <Text variant="h2" color={colors.text.primary}>
                Atualizar Senha
              </Text>
              <Text variant="bodySm" color={colors.text.secondary}>
                Para sua segurança, informe sua senha atual antes de cadastrar uma
                nova credencial de acesso.
              </Text>
            </View>

            {isSuccess ? (
              <View style={{ gap: spacing[4] }}>
                <Alert
                  title="Senha alterada!"
                  message={
                    successMessage ||
                    'Sua senha de acesso foi alterada com sucesso.'
                  }
                  variant="success"
                />
                <Button
                  title="Voltar ao Perfil"
                  variant="primary"
                  onPress={() => router.back()}
                />
              </View>
            ) : (
              <View style={{ gap: spacing[4] }}>
                {submitError ? (
                  <Alert
                    title="Erro ao alterar senha"
                    message={submitError}
                    variant="error"
                  />
                ) : null}

                <Controller
                  control={control}
                  name="currentPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <FormField
                      label="Senha Atual"
                      required
                      error={errors.currentPassword?.message}
                    >
                      <PasswordInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="••••••••"
                        error={Boolean(errors.currentPassword)}
                        disabled={isSubmitting}
                        leftIcon={
                          <Ionicons
                            name="lock-closed-outline"
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
                  name="newPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <FormField
                      label="Nova Senha"
                      required
                      error={errors.newPassword?.message}
                    >
                      <PasswordInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Mínimo 6 caracteres"
                        error={Boolean(errors.newPassword)}
                        disabled={isSubmitting}
                        leftIcon={
                          <Ionicons
                            name="key-outline"
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
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <FormField
                      label="Confirmação da Nova Senha"
                      required
                      error={errors.confirmPassword?.message}
                    >
                      <PasswordInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Repita a nova senha"
                        error={Boolean(errors.confirmPassword)}
                        disabled={isSubmitting}
                        onSubmitEditing={() => onSubmit()}
                        returnKeyType="done"
                        leftIcon={
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={18}
                            color={colors.brand.silver}
                          />
                        }
                      />
                    </FormField>
                  )}
                />

                <Button
                  title="Salvar Nova Senha"
                  variant="primary"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  onPress={onSubmit}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            )}
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

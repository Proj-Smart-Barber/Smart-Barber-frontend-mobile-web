import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';

import { useSession } from '@/features/auth';
import {
  createBarbershopFormSchema,
  CreateBarbershopFormValues,
  formatCnpj,
} from '@/features/barbershop/model/barbershop.schema';
import { BrandMark } from '@/shared/brand';
import { LiquidGlassView } from '@/shared/navigation';
import { useTheme } from '@/shared/theme';
import { Alert, Button, FormField, Text, TextInput } from '@/shared/ui';

export default function BarbershopSetupScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const router = useRouter();
  const { registerBarbershop, signOut, barbershop } = useSession();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Se já tiver barbearia, redireciona para o dashboard
  React.useEffect(() => {
    if (barbershop) {
      router.replace('/(app)');
    }
  }, [barbershop, router]);

  // Form de Criação
  const createForm = useForm<CreateBarbershopFormValues>({
    resolver: zodResolver(createBarbershopFormSchema),
    defaultValues: {
      name: '',
      cnpj: '',
      location: '',
      timezone: 'America/Sao_Paulo',
    },
  });

  const handleCreate = async (values: CreateBarbershopFormValues) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await registerBarbershop(values);
      router.replace('/(app)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar barbearia.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const webBackgroundStyle: any =
    Platform.OS === 'web'
      ? {
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 20% 18%, rgba(124, 135, 159, 0.17), transparent 50%), radial-gradient(ellipse at 82% 57%, rgba(155, 41, 49, 0.105), transparent 55%), #0b0b0b'
            : 'radial-gradient(ellipse at 20% 18%, rgba(159, 170, 191, 0.23), transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(189, 32, 38, 0.06), transparent 55%), #f7f5f3',
        }
      : {};

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[{ flex: 1, backgroundColor: colors.background.primary }, webBackgroundStyle]}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[8],
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: spacing[6] }}>
          <View style={{ marginBottom: spacing[3] }}>
            <BrandMark
              variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
              size={56}
              decorative={false}
            />
          </View>

          <Text variant="display" align="center" style={{ marginBottom: spacing[1] }}>
            Cadastre sua Barbearia
          </Text>
          <Text variant="body" color={colors.text.muted} align="center">
            Para gerenciar agenda e horários, cadastre os dados da sua barbearia.
          </Text>
        </View>

        {/* Error Alert */}
        {errorMessage ? (
          <Alert
            variant="error"
            message={errorMessage}
            style={{ marginBottom: spacing[4] }}
          />
        ) : null}

        {/* Form Container */}
        <LiquidGlassView
          variant="form"
          elevated
          style={{ width: '100%' }}
          contentStyle={{ padding: spacing[6] }}
        >
          <View style={{ gap: spacing[4] }}>
              <Controller
                control={createForm.control}
                name="name"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <FormField label="Nome da Barbearia" error={error?.message} required>
                    <TextInput
                      placeholder="Ex: Barbearia Elite"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={!!error}
                      leftIcon={<Feather name="scissors" size={18} color={colors.text.muted} />}
                    />
                  </FormField>
                )}
              />

              <Controller
                control={createForm.control}
                name="cnpj"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <FormField
                    label="CNPJ"
                    error={error?.message}
                    helperText="Apenas números ou formato com pontuação"
                    required
                  >
                    <TextInput
                      placeholder="00.000.000/0000-00"
                      value={formatCnpj(value || '')}
                      onChangeText={(txt) => onChange(txt.replace(/\D/g, ''))}
                      onBlur={onBlur}
                      keyboardType="numeric"
                      maxLength={18}
                      error={!!error}
                      leftIcon={<Feather name="file-text" size={18} color={colors.text.muted} />}
                    />
                  </FormField>
                )}
              />

              <Controller
                control={createForm.control}
                name="location"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <FormField label="Localização / Endereço" error={error?.message} required>
                    <TextInput
                      placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={!!error}
                      leftIcon={<Feather name="map-pin" size={18} color={colors.text.muted} />}
                    />
                  </FormField>
                )}
              />

              <Controller
                control={createForm.control}
                name="timezone"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <FormField label="Fuso Horário" error={error?.message}>
                    <TextInput
                      placeholder="America/Sao_Paulo"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={!!error}
                      leftIcon={<Feather name="clock" size={18} color={colors.text.muted} />}
                    />
                  </FormField>
                )}
              />

              <Button
                title="Cadastrar Barbearia"
                loading={loading}
                disabled={loading}
                onPress={createForm.handleSubmit(handleCreate)}
                style={{ marginTop: spacing[2] }}
              />
            </View>
        </LiquidGlassView>

        {/* Footer logout */}
        <View style={{ marginTop: spacing[6], alignItems: 'center' }}>
          <Button
            title="Sair da conta"
            variant="ghost"
            onPress={() => void signOut()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';

import { useSession } from '@/features/auth';
import {
  createBarbershopFormSchema,
  CreateBarbershopFormValues,
  linkBarbershopFormSchema,
  LinkBarbershopFormValues,
  formatCnpj,
} from '@/features/barbershop/model/barbershop.schema';
import { useTheme } from '@/shared/theme';
import { Alert, Button, FormField, Text, TextInput, Card } from '@/shared/ui';

type SetupMode = 'create' | 'link';

export default function BarbershopSetupScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const { registerBarbershop, linkBarbershop, signOut, barbershop } = useSession();

  const [mode, setMode] = useState<SetupMode>('create');
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

  // Form de Vínculo
  const linkForm = useForm<LinkBarbershopFormValues>({
    resolver: zodResolver(linkBarbershopFormSchema),
    defaultValues: {
      barbershopId: '',
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

  const handleLink = async (values: LinkBarbershopFormValues) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await linkBarbershop(values.barbershopId);
      router.replace('/(app)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Barbearia não encontrada ou ID inválido.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background.primary }}
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
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.full,
              backgroundColor: colors.surface.selected,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing[3],
            }}
          >
            <Feather name="home" size={26} color={colors.brand.primary} />
          </View>

          <Text variant="display" align="center" style={{ marginBottom: spacing[1] }}>
            Configurar Unidade
          </Text>
          <Text variant="body" color={colors.text.muted} align="center">
            Para gerenciar agenda e horários, vincule ou crie a sua barbearia.
          </Text>
        </View>

        {/* Mode Selector Tabs */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surface.default,
            padding: spacing[1],
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border.default,
            marginBottom: spacing[6],
          }}
        >
          <Pressable
            onPress={() => {
              setMode('create');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              paddingVertical: spacing[2],
              borderRadius: radius.sm,
              backgroundColor: mode === 'create' ? colors.brand.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              weight="semibold"
              color={mode === 'create' ? colors.text.inverse : colors.text.muted}
            >
              Criar Barbearia
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setMode('link');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              paddingVertical: spacing[2],
              borderRadius: radius.sm,
              backgroundColor: mode === 'link' ? colors.brand.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              weight="semibold"
              color={mode === 'link' ? colors.text.inverse : colors.text.muted}
            >
              Vincular ID
            </Text>
          </Pressable>
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
        <Card style={{ padding: spacing[6] }}>
          {mode === 'create' ? (
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
          ) : (
            <View style={{ gap: spacing[4] }}>
              <Text variant="caption" color={colors.text.muted}>
                Informe o código UUID da barbearia à qual você tem vínculo. Se você for o
                proprietário, o sistema confirmará automaticamente.
              </Text>

              <Controller
                control={linkForm.control}
                name="barbershopId"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <FormField label="ID da Barbearia (UUID)" error={error?.message} required>
                    <TextInput
                      placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="none"
                      autoCorrect={false}
                      error={!!error}
                      leftIcon={<Feather name="key" size={18} color={colors.text.muted} />}
                    />
                  </FormField>
                )}
              />

              <Button
                title="Vincular Barbearia"
                loading={loading}
                disabled={loading}
                onPress={linkForm.handleSubmit(handleLink)}
                style={{ marginTop: spacing[2] }}
              />
            </View>
          )}
        </Card>

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

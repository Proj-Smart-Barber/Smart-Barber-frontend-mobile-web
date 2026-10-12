import React, { useState, useCallback } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text, Button, Badge, Skeleton } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { lookupCustomer } from '../api/bookings.api';
import type { CustomerLookupResult } from '../api/bookings.dto';
import type { BookingCustomer } from '../model/booking-flow.types';

export interface CustomerLookupProps {
  shopId: string;
  selectedCustomer: BookingCustomer | null;
  onSelectCustomer: (customer: BookingCustomer) => void;
  onClearCustomer?: () => void;
}

export function CustomerLookup({
  shopId,
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
}: CustomerLookupProps) {
  const { colors, spacing, radius } = useTheme();

  const [lookupType, setLookupType] = useState<'email' | 'cpf'>('email');
  const [searchValue, setSearchValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [foundCustomer, setFoundCustomer] = useState<CustomerLookupResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setErrorMessage(
        lookupType === 'email'
          ? 'Informe o e-mail exato do cliente.'
          : 'Informe os 11 dígitos do CPF do cliente.'
      );
      return;
    }

    if (lookupType === 'cpf') {
      const cleanDigits = trimmed.replace(/\D/g, '');
      if (cleanDigits.length !== 11) {
        setErrorMessage('O CPF deve conter exatamente 11 dígitos.');
        return;
      }
    }

    setIsLoading(true);
    setErrorMessage(null);
    setFoundCustomer(null);

    try {
      const criteria =
        lookupType === 'email'
          ? { email: trimmed }
          : { cpf: trimmed.replace(/\D/g, '') };

      const result = await lookupCustomer(shopId, criteria);
      setFoundCustomer(result);
    } catch (err: any) {
      if (err?.status === 429) {
        setErrorMessage('Muitas consultas em pouco tempo. Aguarde alguns instantes antes de tentar novamente.');
      } else if (err?.status === 503) {
        setErrorMessage('Serviço de busca temporariamente indisponível. Tente novamente.');
      } else if (err?.status === 404) {
        setErrorMessage('Cliente não encontrado com os dados informados.');
      } else {
        setErrorMessage(err?.message || 'Falha ao buscar cliente.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [shopId, lookupType, searchValue]);

  const handleConfirmCustomer = useCallback(() => {
    if (!foundCustomer) return;
    if (!foundCustomer.isEligible) {
      setErrorMessage('Este cliente não está elegível para agendamento na unidade.');
      return;
    }

    onSelectCustomer({
      id: foundCustomer.id,
      name: foundCustomer.name,
      maskedEmail: foundCustomer.maskedEmail,
      maskedPhone: foundCustomer.maskedPhone,
      isEligible: foundCustomer.isEligible,
    });
  }, [foundCustomer, onSelectCustomer]);

  // Se já há um cliente selecionado, exibe cartão de confirmação
  if (selectedCustomer) {
    return (
      <LiquidGlassView
        variant="card"
        elevated
        borderRadius={radius.lg}
        borderColor={colors.brand.primary}
        borderWidth={1}
        contentStyle={{
          padding: spacing[4],
          gap: spacing[2],
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Ionicons name="person-circle" size={28} color={colors.brand.primary} />
            <Text variant="body" weight="bold" color={colors.text.primary}>
              {selectedCustomer.name}
            </Text>
          </View>
          <Badge label="Cliente Selecionado" tone="brand" />
        </View>

        {selectedCustomer.maskedEmail ? (
          <Text variant="caption" color={colors.text.secondary}>
            E-mail: {selectedCustomer.maskedEmail}
          </Text>
        ) : null}

        {onClearCustomer && (
          <Button
            title="Trocar Cliente"
            variant="ghost"
            onPress={onClearCustomer}
            style={{ minHeight: 36, marginTop: spacing[1], alignSelf: 'flex-start' }}
          />
        )}
      </LiquidGlassView>
    );
  }

  return (
    <View style={{ gap: spacing[3] }}>
      <Text variant="bodySm" weight="medium" color={colors.text.primary}>
        Buscar Cliente Cadastrado
      </Text>
      <Text variant="caption" color={colors.text.muted}>
        Para agendamentos na unidade, informe o e-mail exato ou o CPF completo do cliente:
      </Text>

      {/* Seletor de Tipo de Busca */}
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        <Pressable
          onPress={() => {
            setLookupType('email');
            setSearchValue('');
            setErrorMessage(null);
            setFoundCustomer(null);
          }}
          style={{
            flex: 1,
            paddingVertical: spacing[2],
            alignItems: 'center',
            borderRadius: radius.md,
            backgroundColor: lookupType === 'email' ? colors.brand.primary : colors.surface.default,
          }}
        >
          <Text
            variant="caption"
            weight="bold"
            color={lookupType === 'email' ? '#FFFFFF' : colors.text.secondary}
          >
            Buscar por E-mail
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setLookupType('cpf');
            setSearchValue('');
            setErrorMessage(null);
            setFoundCustomer(null);
          }}
          style={{
            flex: 1,
            paddingVertical: spacing[2],
            alignItems: 'center',
            borderRadius: radius.md,
            backgroundColor: lookupType === 'cpf' ? colors.brand.primary : colors.surface.default,
          }}
        >
          <Text
            variant="caption"
            weight="bold"
            color={lookupType === 'cpf' ? '#FFFFFF' : colors.text.secondary}
          >
            Buscar por CPF
          </Text>
        </Pressable>
      </View>

      {/* Input de Busca */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface.default,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border.default,
          paddingHorizontal: spacing[3],
          minHeight: 48,
        }}
      >
        <Ionicons
          name={lookupType === 'email' ? 'mail-outline' : 'card-outline'}
          size={20}
          color={colors.text.muted}
          style={{ marginRight: 8 }}
        />
        <TextInput
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder={lookupType === 'email' ? 'exemplo@email.com' : '00000000000'}
          placeholderTextColor={colors.text.muted}
          keyboardType={lookupType === 'email' ? 'email-address' : 'numeric'}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            color: colors.text.primary,
            fontSize: 15,
          }}
        />
      </View>

      <Button
        title="Localizar Cliente"
        variant="primary"
        loading={isLoading}
        disabled={isLoading || !searchValue.trim()}
        rightIcon={<Ionicons name="search" size={18} color="#FFFFFF" />}
        onPress={handleSearch}
        style={{ minHeight: 46 }}
      />

      {/* Mensagem de Erro */}
      {errorMessage && (
        <View
          style={{
            backgroundColor: colors.surface.default,
            borderRadius: radius.md,
            padding: spacing[3],
            borderLeftWidth: 3,
            borderLeftColor: colors.feedback.error,
          }}
        >
          <Text variant="caption" color={colors.feedback.error}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Resultado Encontrado */}
      {foundCustomer && (
        <LiquidGlassView
          variant="card"
          elevated
          borderRadius={radius.lg}
          borderColor={foundCustomer.isEligible ? colors.border.default : colors.feedback.error}
          borderWidth={1}
          contentStyle={{ padding: spacing[4], gap: spacing[2] }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="body" weight="bold" color={colors.text.primary}>
              {foundCustomer.name}
            </Text>
            <Badge
              label={foundCustomer.isEligible ? 'Elegível' : 'Não Elegível'}
              tone={foundCustomer.isEligible ? 'success' : 'neutral'}
            />
          </View>

          {foundCustomer.maskedEmail && (
            <Text variant="caption" color={colors.text.secondary}>
              E-mail: {foundCustomer.maskedEmail}
            </Text>
          )}

          {foundCustomer.isEligible ? (
            <Button
              title="Confirmar Este Cliente"
              variant="primary"
              rightIcon={<Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              onPress={handleConfirmCustomer}
              style={{ minHeight: 44, marginTop: spacing[2] }}
            />
          ) : (
            <Text variant="caption" color={colors.feedback.error}>
              Este cadastro não está elegível para agendamento presencial.
            </Text>
          )}
        </LiquidGlassView>
      )}
    </View>
  );
}

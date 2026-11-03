import React, { useState, useRef, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Feather, Ionicons } from '@expo/vector-icons';

import { useSession } from '@/features/auth';
import { operationAttemptStore } from '@/shared/operations/operation-attempt-store';
import {
  createBarbershopFormSchema,
  CreateBarbershopFormValues,
  formatCnpj,
} from '@/features/barbershop/model/barbershop.schema';
import {
  formatCep,
  normalizeCep,
} from '@/features/barbershop/lib/cep';
import { buildCanonicalLocation } from '@/features/barbershop/lib/address-formatter';
import { resolveCommercialTimezone } from '@/features/barbershop/lib/commercial-timezone';
import { useAddressByCep } from '@/features/barbershop/model/use-address-by-cep';
import {
  barbershopLocationApi,
  calculateGeoDistanceMeters,
  MAX_PIN_ADJUSTMENT_METERS,
  type GeocodingCandidate,
} from '@/features/barbershop/api/barbershop-location.api';
import { isCandidateExpired } from '@/features/barbershop/model/use-barbershop-location';
import { serverClock } from '@/features/bookings/lib/server-clock';
import { generateUuidV7 } from '@/features/bookings/lib/attempt-id';
import type { GeoPoint } from '@/features/discovery/api/discovery.contract';
import { GoogleMapCanvas } from '@/features/discovery/ui/GoogleMapCanvas';
import { BrandMark } from '@/shared/brand';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { useTheme } from '@/shared/theme';
import { Alert, Button, FormField, Text, TextInput } from '@/shared/ui';

export default function BarbershopSetupScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const router = useRouter();
  const { registerBarbershop, signOut, barbershop, token, identity } = useSession();
  const [createdShopId, setCreatedShopId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [searchingGeo, setSearchingGeo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<GeocodingCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<GeocodingCandidate | null>(null);
  const [adjustedPoint, setAdjustedPoint] = useState<GeoPoint | null>(null);

  // Redireciona quem já acessou a rota com barbearia previamente cadastrada
  const creationInitiatedRef = useRef(false);

  useEffect(() => {
    if (!creationInitiatedRef.current && barbershop && !loading) {
      router.replace('/(app)');
    }
  }, [barbershop, loading, router]);

  // Form de Criação com campos de endereço desacoplados
  const createForm = useForm<CreateBarbershopFormValues>({
    resolver: zodResolver(createBarbershopFormSchema),
    defaultValues: {
      name: '',
      cnpj: '',
      cep: '',
      street: '',
      number: '',
      withoutNumber: false,
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
    },
  });

  const invalidateGeocoding = () => {
    if (selectedCandidate || adjustedPoint || candidates.length > 0) {
      setSelectedCandidate(null);
      setAdjustedPoint(null);
      setCandidates([]);
    }
  };

  // Integração com provedor ViaCEP
  const {
    status: cepStatus,
    isLoading: isSearchingCep,
    errorMessage: cepErrorMessage,
    onCepChange,
    retry: retryCep,
  } = useAddressByCep({
    onAddressResolved: (data) => {
      createForm.setValue('street', data.street, { shouldValidate: true });
      createForm.setValue('neighborhood', data.neighborhood, { shouldValidate: true });
      createForm.setValue('city', data.city, { shouldValidate: true });
      createForm.setValue('state', data.state, { shouldValidate: true });
      invalidateGeocoding();
    },
  });

  const handleSearchGeocoding = async () => {
    const values = createForm.getValues();
    const canonicalAddress = buildCanonicalLocation(values);

    if (canonicalAddress.length < 3) {
      setErrorMessage('Informe os dados de endereço antes de buscar no mapa.');
      return;
    }

    setSearchingGeo(true);
    setErrorMessage(null);
    try {
      const res = await barbershopLocationApi.searchAddress({
        address: canonicalAddress,
        shopId: null,
        token,
      });
      setCandidates(res.candidates);
      if (res.candidates.length > 0) {
        const first = res.candidates[0];
        setSelectedCandidate(first);
        setAdjustedPoint({ ...first.point });
      } else {
        setSelectedCandidate(null);
        setAdjustedPoint(null);
        setErrorMessage(
          'Nenhum candidato encontrado no Google Maps para este endereço. Você pode revisar o endereço ou confirmá-lo depois em Configurações.',
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível validar o endereço no Google Maps agora.';
      setErrorMessage(msg);
    } finally {
      setSearchingGeo(false);
    }
  };

  const handleSelectCandidate = (candidate: GeocodingCandidate) => {
    if (isCandidateExpired(candidate)) {
      setErrorMessage('Candidato expirado. Realize uma nova busca.');
      return;
    }
    setSelectedCandidate(candidate);
    setAdjustedPoint({ ...candidate.point });
    setErrorMessage(null);
  };

  const handleAdjustPin = (point: GeoPoint) => {
    if (!selectedCandidate) return;
    const dist = calculateGeoDistanceMeters(selectedCandidate.point, point);
    setAdjustedPoint(point);
    if (dist > MAX_PIN_ADJUSTMENT_METERS) {
      setErrorMessage(
        `O pino foi movido ${Math.round(dist)}m, acima do limite de ${MAX_PIN_ADJUSTMENT_METERS}m.`,
      );
    } else {
      setErrorMessage(null);
    }
  };

  const handleCreate = async (values: CreateBarbershopFormValues) => {
    creationInitiatedRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      const canonicalLocation = buildCanonicalLocation(values);
      const resolvedTimezone = resolveCommercialTimezone({
        state: values.state,
        city: values.city,
        cep: values.cep,
      });

      let shopId = createdShopId;
      if (!shopId) {
        const created = await registerBarbershop({
          name: values.name.trim(),
          cnpj: values.cnpj,
          location: canonicalLocation,
          timezone: resolvedTimezone,
        });
        shopId = created?.id ?? null;
        setCreatedShopId(shopId);
      }

      if (
        shopId &&
        selectedCandidate &&
        adjustedPoint &&
        !isCandidateExpired(selectedCandidate) &&
        calculateGeoDistanceMeters(selectedCandidate.point, adjustedPoint) <=
          MAX_PIN_ADJUSTMENT_METERS
      ) {
        const actorId = identity?.id;
        if (!actorId) {
          router.replace('/(app)');
          return;
        }

        // Verifica se já existe tentativa incerta prévia antes de gerar nova chave
        try {
          const refs = await operationAttemptStore.listReferences(actorId);
          const pending = refs.find(
            (r) =>
              r.resourceKind === 'LOCATION' &&
              r.resourceId === shopId &&
              (r.status === 'uncertain' || r.status === 'submitting'),
          );
          if (pending) {
            setErrorMessage(
              'Barbearia criada com sucesso! Já existe uma confirmação de localização em andamento. Você pode concluí-la em Configurações > Localização Comercial.',
            );
            return;
          }
        } catch {
          setErrorMessage(
            'Barbearia criada com sucesso! Falha ao consultar o armazenamento local de tentativas. Conclua a localização em Configurações > Localização Comercial.',
          );
          return;
        }

        // Relógio estritamente autoritativo (sem fallback para Date.now)
        let now: number;
        try {
          now = serverClock.getRequiredNow();
        } catch {
          setErrorMessage(
            'Barbearia criada com sucesso! O relógio não está sincronizado com o servidor. Conclua a confirmação em Configurações > Localização Comercial.',
          );
          return;
        }

        // Versão autoritativa obtida do servidor antes do envio (nunca versão 0 cega)
        let expectedVersion = 0;
        try {
          const authoritativeState = await barbershopLocationApi.getLocation(
            shopId,
            token,
          );
          expectedVersion = authoritativeState.version;
        } catch {
          setErrorMessage(
            'Barbearia criada com sucesso! Não foi possível verificar o estado inicial da localização. Conclua a confirmação em Configurações > Localização Comercial.',
          );
          return;
        }

        const mutationId = generateUuidV7(now);

        // Persistência local prévia com fail-closed obrigatório
        try {
          await operationAttemptStore.save(actorId, {
            requestId: mutationId,
            actorId,
            operation: 'UPDATE_LOCATION',
            resourceKind: 'LOCATION',
            resourceId: shopId,
            status: 'submitting',
            createdAt: now,
            originScope: 'UNIT',
          });
        } catch {
          setErrorMessage(
            'Barbearia criada com sucesso! Falha ao salvar a tentativa localmente. O envio foi cancelado por segurança.',
          );
          return;
        }

        try {
          await barbershopLocationApi.updateLocation({
            shopId,
            address: canonicalLocation,
            candidateId: selectedCandidate.candidateId,
            latitude: adjustedPoint.latitude,
            longitude: adjustedPoint.longitude,
            expectedVersion,
            mutationId,
            token,
          });

          await operationAttemptStore
            .save(actorId, {
              requestId: mutationId,
              actorId,
              operation: 'UPDATE_LOCATION',
              resourceKind: 'LOCATION',
              resourceId: shopId,
              status: 'confirmed',
              createdAt: now,
              originScope: 'UNIT',
            })
            .catch(() => undefined);
          await operationAttemptStore.clearResolved(actorId).catch(() => undefined);
        } catch (locErr: unknown) {
          const isUncertain = barbershopLocationApi.isUncertainError(locErr);
          await operationAttemptStore
            .save(actorId, {
              requestId: mutationId,
              actorId,
              operation: 'UPDATE_LOCATION',
              resourceKind: 'LOCATION',
              resourceId: shopId,
              status: isUncertain ? 'uncertain' : 'error',
              createdAt: now,
              originScope: 'UNIT',
            })
            .catch(() => undefined);

          setErrorMessage(
            'Barbearia criada com sucesso! A confirmação de endereço no mapa ficou pendente. Você pode concluí-la em Configurações > Localização Comercial.',
          );
          return;
        }
      }
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

  const cepHelperText = isSearchingCep
    ? 'Consultando CEP...'
    : cepStatus === 'not_found'
    ? 'CEP não encontrado. Preencha manualmente abaixo.'
    : cepStatus === 'error'
    ? cepErrorMessage || 'Serviço de CEP indisponível. Preencha manualmente.'
    : 'Preenchimento automático ao completar 8 dígitos';

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

        {/* Error / Warning Alert */}
        {errorMessage ? (
          <View style={{ marginBottom: spacing[4], gap: spacing[2] }}>
            <Alert
              variant={createdShopId ? 'warning' : 'error'}
              message={errorMessage}
            />
            {createdShopId ? (
              <Button
                title="Ir para Configurações"
                variant="outline"
                onPress={() => router.push('/(app)/settings')}
                testID="setup-go-to-settings-btn"
              />
            ) : null}
          </View>
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

            {/* Seção Endereço */}
            <View style={{ gap: spacing[3], marginTop: spacing[2] }}>
              <Text variant="subhead" weight="semibold" color={colors.text.primary}>
                Endereço
              </Text>

              <Controller
                control={createForm.control}
                name="cep"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <FormField
                    label="CEP"
                    error={error?.message}
                    helperText={cepHelperText}
                    required
                  >
                    <View style={{ gap: spacing[2] }}>
                      <TextInput
                        placeholder="00000-000"
                        value={formatCep(value || '')}
                        onChangeText={(txt) => {
                          const digits = normalizeCep(txt);
                          onChange(digits);
                          invalidateGeocoding();
                          onCepChange(digits);
                        }}
                        onBlur={onBlur}
                        keyboardType="numeric"
                        maxLength={9}
                        error={!!error || cepStatus === 'not_found' || cepStatus === 'error'}
                        leftIcon={<Feather name="map-pin" size={18} color={colors.text.muted} />}
                      />
                      {cepStatus === 'error' ? (
                        <Button
                          title="Tentar novamente"
                          variant="outline"
                          onPress={retryCep}
                        />
                      ) : null}
                    </View>
                  </FormField>
                )}
              />

              <Controller
                control={createForm.control}
                name="street"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <FormField label="Rua / logradouro" error={error?.message} required>
                    <TextInput
                      placeholder="Ex: Av. Paulista"
                      value={value}
                      onChangeText={(txt) => {
                        onChange(txt);
                        invalidateGeocoding();
                      }}
                      onBlur={onBlur}
                      error={!!error}
                      leftIcon={<Feather name="navigation" size={18} color={colors.text.muted} />}
                    />
                  </FormField>
                )}
              />

              <View style={{ gap: spacing[2] }}>
                <Controller
                  control={createForm.control}
                  name="number"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <FormField
                      label="Número"
                      error={error?.message}
                      required={!createForm.watch('withoutNumber')}
                    >
                      <TextInput
                        placeholder="Ex: 1000"
                        value={value}
                        onChangeText={(txt) => {
                          onChange(txt);
                          invalidateGeocoding();
                        }}
                        onBlur={onBlur}
                        error={!!error}
                        editable={!createForm.watch('withoutNumber')}
                        leftIcon={<Feather name="hash" size={18} color={colors.text.muted} />}
                      />
                    </FormField>
                  )}
                />

                <Controller
                  control={createForm.control}
                  name="withoutNumber"
                  render={({ field: { onChange, value } }) => (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel="Sem número"
                      accessibilityState={{ checked: Boolean(value) }}
                      onPress={() => {
                        const next = !value;
                        onChange(next);
                        invalidateGeocoding();
                        if (next) {
                          createForm.setValue('number', '');
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        minHeight: 44,
                        gap: spacing[2],
                      }}
                    >
                      <Ionicons
                        name={value ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={value ? colors.brand.primary : colors.text.secondary}
                      />
                      <Text variant="body" color={colors.text.primary}>
                        Sem número
                      </Text>
                    </Pressable>
                  )}
                />
              </View>

              <Controller
                control={createForm.control}
                name="complement"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <FormField label="Complemento (opcional)" error={error?.message}>
                    <TextInput
                      placeholder="Ex: Sala 42"
                      value={value}
                      onChangeText={(txt) => {
                        onChange(txt);
                        invalidateGeocoding();
                      }}
                      onBlur={onBlur}
                      error={!!error}
                      leftIcon={<Feather name="info" size={18} color={colors.text.muted} />}
                    />
                  </FormField>
                )}
              />

              <Controller
                control={createForm.control}
                name="neighborhood"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <FormField label="Bairro" error={error?.message}>
                    <TextInput
                      placeholder="Ex: Bela Vista"
                      value={value}
                      onChangeText={(txt) => {
                        onChange(txt);
                        invalidateGeocoding();
                      }}
                      onBlur={onBlur}
                      error={!!error}
                      leftIcon={<Feather name="map" size={18} color={colors.text.muted} />}
                    />
                  </FormField>
                )}
              />

              <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                <View style={{ flex: 3 }}>
                  <Controller
                    control={createForm.control}
                    name="city"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <FormField label="Cidade" error={error?.message} required>
                        <TextInput
                          placeholder="Ex: São Paulo"
                          value={value}
                          onChangeText={(txt) => {
                            onChange(txt);
                            invalidateGeocoding();
                          }}
                          onBlur={onBlur}
                          error={!!error}
                          leftIcon={<Feather name="compass" size={18} color={colors.text.muted} />}
                        />
                      </FormField>
                    )}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Controller
                    control={createForm.control}
                    name="state"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <FormField label="UF" error={error?.message} required>
                        <TextInput
                          placeholder="SP"
                          value={value}
                          onChangeText={(txt) => {
                            const uf = txt.toUpperCase().slice(0, 2);
                            onChange(uf);
                            invalidateGeocoding();
                          }}
                          onBlur={onBlur}
                          maxLength={2}
                          error={!!error}
                        />
                      </FormField>
                    )}
                  />
                </View>
              </View>

              <Button
                title="Confirmar localização no mapa"
                variant="outline"
                loading={searchingGeo}
                disabled={searchingGeo || loading}
                onPress={() => void handleSearchGeocoding()}
              />
            </View>

            {candidates.length > 0 ? (
              <View style={{ gap: spacing[2] }}>
                <Text variant="caption" weight="semibold" color={colors.text.secondary}>
                  Candidatos Google Maps ({candidates.length})
                </Text>
                {candidates.map((cand) => {
                  const isSelected =
                    selectedCandidate?.candidateId === cand.candidateId;
                  return (
                    <Pressable
                      key={cand.candidateId}
                      accessibilityRole="radio"
                      accessibilityLabel={`Selecionar endereço ${cand.displayAddress}`}
                      accessibilityState={{ checked: isSelected }}
                      onPress={() => handleSelectCandidate(cand)}
                      style={{
                        minHeight: 48,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        padding: 10,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: isSelected
                          ? colors.brand.primary
                          : colors.border.subtle,
                        backgroundColor: isSelected
                          ? colors.surface.selected
                          : colors.surface.default,
                      }}
                    >
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? colors.brand.primary : colors.text.secondary}
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="caption" weight="bold" color={colors.text.primary}>
                          {cand.displayAddress}
                        </Text>
                        <Text variant="caption" color={colors.text.secondary}>
                          {cand.attribution}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {selectedCandidate && adjustedPoint ? (
              <GoogleMapCanvas
                markers={[
                  {
                    id: selectedCandidate.candidateId,
                    title: selectedCandidate.displayAddress,
                    coordinates: adjustedPoint,
                  },
                ]}
                draggablePin={adjustedPoint}
                onPinDragEnd={handleAdjustPin}
                height={180}
                testID="setup-location-google-map"
              />
            ) : null}

            <Button
              title="Cadastrar Barbearia"
              loading={loading}
              disabled={loading}
              onPress={() => { void createForm.handleSubmit(handleCreate)(); }}
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

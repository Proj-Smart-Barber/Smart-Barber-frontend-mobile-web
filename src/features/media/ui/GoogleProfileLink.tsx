import React, { useState } from 'react';
import { View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { TextInput } from '@/shared/ui/TextInput';
import { Alert } from '@/shared/ui/Alert';
import { mediaApi } from '../api/media.api';
import { validateGoogleMapsUrl } from '../model/google-maps.validator';

export interface GoogleProfileLinkProps {
  googleMapsUrl?: string | null;
  initialUrl?: string | null;
  shopId?: string;
  barbershopId?: string;
  isOwner?: boolean;
  onUrlUpdated?: (newUrl: string | null) => void;
}

export function GoogleProfileLink({
  googleMapsUrl,
  initialUrl,
  shopId,
  barbershopId,
  isOwner = false,
  onUrlUpdated,
}: GoogleProfileLinkProps) {
  const { colors, radius } = useTheme();
  const effectiveUrl = googleMapsUrl ?? initialUrl ?? null;
  const effectiveShopId = shopId || barbershopId;
  const [isEditing, setIsEditing] = useState(false);
  const [urlInput, setUrlInput] = useState(effectiveUrl || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenGoogleMaps = () => {
    if (effectiveUrl) {
      void Linking.openURL(effectiveUrl);
    }
  };

  const handleSave = async () => {
    if (!effectiveShopId) return;
    setValidationError(null);

    const trimmed = urlInput.trim();
    const validation = validateGoogleMapsUrl(trimmed);
    if (!validation.valid) {
      setValidationError(validation.error || 'URL inválida.');
      return;
    }

    setIsSaving(true);
    try {
      const finalUrl = trimmed.length > 0 ? trimmed : null;
      await mediaApi.updateBarbershopGoogleUrl(effectiveShopId, finalUrl);
      onUrlUpdated?.(finalUrl);
      setIsEditing(false);
    } catch (err: any) {
      setValidationError(err?.message || 'Falha ao salvar link do Google Maps.');
    } finally {
      setIsSaving(false);
    }
  };

  // Visão do cliente / visitante
  if (!isOwner) {
    if (!effectiveUrl) return null;

    return (
      <TouchableOpacity
        style={[
          styles.clientButton,
          {
            backgroundColor: colors.surface.input,
            borderColor: colors.border.subtle,
            borderRadius: radius.md,
          },
        ]}
        onPress={handleOpenGoogleMaps}
        accessibilityRole="link"
        accessibilityLabel="Abrir perfil da barbearia no Google Maps"
      >
        <Ionicons name="logo-google" size={18} color="#EA4335" />
        <Text variant="caption" weight="medium" style={{ color: colors.text.primary, flex: 1, marginLeft: 8 }}>
          Ver no Google Maps
        </Text>
        <Ionicons name="open-outline" size={14} color={colors.text.secondary} />
      </TouchableOpacity>
    );
  }

  // Visão do Proprietário (OWNER)
  return (
    <View style={styles.ownerContainer}>
      <View style={styles.ownerHeader}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="logo-google" size={16} color={colors.brand.primary} />
          <Text variant="body" weight="bold">
            Link Oficial do Google Maps
          </Text>
        </View>

        {!isEditing ? (
          <Button
            title={effectiveUrl ? 'Editar link' : 'Adicionar link'}
            variant="ghost"
            onPress={() => setIsEditing(true)}
          />
        ) : null}
      </View>

      {!isEditing ? (
        <View style={styles.currentUrlBox}>
          {effectiveUrl ? (
            <TouchableOpacity onPress={handleOpenGoogleMaps} style={styles.linkRow}>
              <Text variant="caption" style={{ color: colors.brand.primary }} numberOfLines={1}>
                {effectiveUrl}
              </Text>
              <Ionicons name="open-outline" size={14} color={colors.brand.primary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : (
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              Nenhum link do Google Maps configurado. (Opcional)
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.editBox}>
          <TextInput
            value={urlInput}
            onChangeText={(text) => {
              setUrlInput(text);
              if (validationError) setValidationError(null);
            }}
            placeholder="https://maps.app.goo.gl/exemplo"
            autoCapitalize="none"
            keyboardType="url"
          />

          {validationError ? (
            <Alert variant="error" message={validationError} style={{ marginTop: 8 }} />
          ) : null}

          <View style={styles.editActions}>
            <Button
              title="Salvar"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
            />
            <Button
              title="Cancelar"
              variant="outline"
              onPress={() => {
                setUrlInput(effectiveUrl || '');
                setValidationError(null);
                setIsEditing(false);
              }}
              disabled={isSaving}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  ownerContainer: {
    marginVertical: 8,
  },
  ownerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentUrlBox: {
    paddingVertical: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBox: {
    gap: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
});

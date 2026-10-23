import React, { useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { BrandMark } from '@/shared/brand';
import { useAvatarUpload } from '../model/use-media-upload';

export interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdated: (newAvatarUrl: string | null) => void;
  size?: number;
  label?: string;
  customUpload?: (file: File | Blob, fileName: string, mimeType: string) => Promise<string>;
  customRemove?: () => Promise<void>;
  allowsEditing?: boolean;
  aspect?: [number, number];
  shape?: 'circle' | 'rounded';
}

export function AvatarUploader({
  currentAvatarUrl,
  onAvatarUpdated,
  size = 96,
  label = 'Foto de Perfil',
  customUpload,
  customRemove,
  allowsEditing = true,
  aspect = [1, 1],
  shape = 'circle',
}: AvatarUploaderProps) {
  const { colors, radius, isDark } = useTheme();
  const { isUploading, error: hookError, uploadAvatar, removeAvatar } = useAvatarUpload();
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [localUploading, setLocalUploading] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isBusy = customUpload ? localUploading : isUploading;
  const activeError = customUpload ? localError : hookError;

  const handleFileChange = async (event: any) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    try {
      if (customUpload) {
        setLocalUploading(true);
        setLocalError(null);
        const newUrl = await customUpload(file, file.name, file.type);
        onAvatarUpdated(newUrl);
      } else {
        const newUrl = await uploadAvatar(file, file.name, file.type);
        onAvatarUpdated(newUrl);
      }
    } catch (err: any) {
      if (customUpload) {
        setLocalError(err?.message || 'Falha ao atualizar imagem.');
      }
    } finally {
      if (customUpload) setLocalUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePickPhoto = async () => {
    if (isBusy) return;
    setLocalError(null);

    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }

    try {
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        quality: 0.9,
      };
      if (allowsEditing && aspect) {
        pickerOptions.aspect = aspect;
      }
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `avatar_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        if (customUpload) {
          setLocalUploading(true);
          const newUrl = await customUpload(blob, fileName, mimeType);
          onAvatarUpdated(newUrl);
        } else {
          const newUrl = await uploadAvatar(blob, fileName, mimeType);
          onAvatarUpdated(newUrl);
        }
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Falha ao selecionar foto de perfil.');
    } finally {
      if (customUpload) setLocalUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      if (customRemove) {
        setLocalUploading(true);
        setLocalError(null);
        await customRemove();
        onAvatarUpdated(null);
      } else {
        await removeAvatar();
        onAvatarUpdated(null);
      }
    } catch (err: any) {
      if (customRemove) {
        setLocalError(err?.message || 'Falha ao remover imagem.');
      }
    } finally {
      if (customRemove) setLocalUploading(false);
    }
  };

  const borderRadius = shape === 'circle' ? size / 2 : radius.md;
  const imageResizeMode = shape === 'circle' ? 'cover' : 'contain';

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="caption" weight="medium" style={{ color: colors.text.secondary, marginBottom: 8 }}>
          {label}
        </Text>
      ) : null}

      <View style={styles.avatarRow}>
        <View
          style={[
            styles.avatarWrapper,
            {
              width: size,
              height: size,
              borderRadius,
              backgroundColor: colors.surface.input,
              borderColor: colors.border.subtle,
            },
          ]}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : currentAvatarUrl ? (
            <Image
              source={{ uri: currentAvatarUrl }}
              style={{ width: size, height: size, borderRadius }}
              resizeMode={imageResizeMode}
            />
          ) : (
            <BrandMark
              variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
              size={size * 0.4}
              decorative
            />
          )}

          {/* Botão de sobreposição para alterar foto */}
          <TouchableOpacity
            style={[
              styles.cameraOverlay,
              {
                backgroundColor: colors.brand.primary,
                borderColor: colors.surface.elevated,
              },
            ]}
            onPress={handlePickPhoto}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Selecionar nova foto"
          >
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.actionsCol}>
          <Button
            title={currentAvatarUrl ? 'Alterar foto' : 'Enviar foto'}
            variant="outline"
            onPress={handlePickPhoto}
            loading={isBusy}
            disabled={isBusy}
          />

          {currentAvatarUrl ? (
            <Button
              title="Remover foto"
              variant="ghost"
              onPress={handleRemovePhoto}
              disabled={isBusy}
              style={{ marginTop: 4 }}
            />
          ) : null}
        </View>
      </View>

      {/* Input de arquivo invisível para Web */}
      {Platform.OS === 'web' ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      ) : null}

      {activeError ? (
        <Alert
          variant="error"
          title="Erro no upload"
          message={activeError}
          style={styles.alert}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  alert: {
    marginTop: 10,
  },
});

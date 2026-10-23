import React, { useRef, useState, useEffect } from 'react';
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
import { Badge } from '@/shared/ui/Badge';
import { Alert } from '@/shared/ui/Alert';
import { mediaApi } from '../api/media.api';
import { useBarbershopMedia } from '../model/use-media-upload';
import { MEDIA_LIMITS, type GalleryItemDto } from '../api/media.types';

export interface BarbershopGalleryManagerProps {
  shopId: string;
  isOwner?: boolean;
  initialItems?: GalleryItemDto[];
  onItemsChanged?: (items: GalleryItemDto[]) => void;
}

export function BarbershopGalleryManager({
  shopId,
  isOwner = true,
  initialItems,
  onItemsChanged,
}: BarbershopGalleryManagerProps) {
  const { colors, radius, spacing } = useTheme();
  const [items, setItems] = useState<GalleryItemDto[]>(initialItems ?? []);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { isUploading, error, uploadGalleryPhoto } = useBarbershopMedia(shopId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeShopIdRef = useRef<string>(shopId);
  activeShopIdRef.current = shopId;

  useEffect(() => {
    setActionError(null);
    if (initialItems !== undefined) {
      setItems(initialItems);
      return;
    }

    if (!shopId) return;

    let isMounted = true;
    const controller = new AbortController();

    mediaApi
      .getBarbershopGallery(shopId, { signal: controller.signal })
      .then((fetched) => {
        if (isMounted && activeShopIdRef.current === shopId) {
          setItems(fetched);
          onItemsChanged?.(fetched);
        }
      })
      .catch((err: any) => {
        if (controller.signal.aborted) return;
        if (isMounted && activeShopIdRef.current === shopId) {
          setActionError(err?.message || 'Falha ao carregar galeria da barbearia.');
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [shopId, initialItems]);

  const isMaxReached = items.length >= MEDIA_LIMITS.MAX_GALLERY_PHOTOS;

  const handleFileChange = async (event: any) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const targetShopId = shopId;
    setActionError(null);
    try {
      const isFirst = items.length === 0;
      const newItem = await uploadGalleryPhoto(file, file.name, file.type, '', isFirst);
      if (activeShopIdRef.current !== targetShopId) return;
      setItems((prev) => {
        const updated = [...prev, newItem];
        onItemsChanged?.(updated);
        return updated;
      });
    } catch (err: any) {
      if (activeShopIdRef.current !== targetShopId) return;
      setActionError(err?.message || 'Falha ao enviar foto para a galeria.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePickPhoto = async () => {
    if (isMaxReached || isUploading) return;
    const targetShopId = shopId;
    setActionError(null);

    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `foto_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const isFirst = items.length === 0;
        const newItem = await uploadGalleryPhoto(blob, fileName, mimeType, '', isFirst);
        if (activeShopIdRef.current !== targetShopId) return;
        setItems((prev) => {
          const updated = [...prev, newItem];
          onItemsChanged?.(updated);
          return updated;
        });
      }
    } catch (err: any) {
      if (activeShopIdRef.current !== targetShopId) return;
      setActionError(err?.message || 'Falha ao selecionar imagem no dispositivo.');
    }
  };

  const handleSetCover = async (item: GalleryItemDto) => {
    const targetShopId = shopId;
    setActionLoadingId(item.id);
    setActionError(null);
    try {
      await mediaApi.setGalleryCover(targetShopId, item.id);
      if (activeShopIdRef.current !== targetShopId) return;
      setItems((prev) => {
        const updated = prev.map((i) => ({
          ...i,
          isCover: i.id === item.id,
        }));
        onItemsChanged?.(updated);
        return updated;
      });
    } catch (err: any) {
      if (activeShopIdRef.current !== targetShopId) return;
      setActionError(err?.message || 'Falha ao definir foto de capa.');
    } finally {
      if (activeShopIdRef.current === targetShopId) {
        setActionLoadingId(null);
      }
    }
  };

  const handleRemove = async (item: GalleryItemDto) => {
    const targetShopId = shopId;
    setActionLoadingId(item.id);
    setActionError(null);
    try {
      await mediaApi.removeGalleryPhoto(targetShopId, item.id);
      if (activeShopIdRef.current !== targetShopId) return;
      setItems((prev) => {
        const updated = prev.filter((i) => i.id !== item.id);
        onItemsChanged?.(updated);
        return updated;
      });
    } catch (err: any) {
      if (activeShopIdRef.current !== targetShopId) return;
      setActionError(err?.message || 'Falha ao remover foto da galeria.');
    } finally {
      if (activeShopIdRef.current === targetShopId) {
        setActionLoadingId(null);
      }
    }
  };

  const handleMove = async (currentIndex: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const targetShopId = shopId;
    setActionError(null);
    const previousItems = [...items];
    const newItems = [...items];
    const temp = newItems[currentIndex];
    newItems[currentIndex] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    setItems(newItems);
    onItemsChanged?.(newItems);

    try {
      const itemIds = newItems.map((i) => i.id);
      await mediaApi.reorderGallery(targetShopId, itemIds);
      if (activeShopIdRef.current !== targetShopId) {
        return;
      }
    } catch (err: any) {
      if (activeShopIdRef.current === targetShopId) {
        setItems(previousItems);
        onItemsChanged?.(previousItems);
        setActionError(err?.message || 'Falha ao reordenar fotos da galeria.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text variant="body" weight="bold">
            Fotos do Espaço
          </Text>
          <Text variant="caption" style={{ color: colors.text.secondary }}>
            {items.length} de {MEDIA_LIMITS.MAX_GALLERY_PHOTOS} fotos permitidas (máx. 10 MB cada)
          </Text>
        </View>

        <Button
          title="Adicionar Foto"
          variant="outline"
          onPress={handlePickPhoto}
          disabled={isMaxReached || isUploading}
          loading={isUploading}
        />
      </View>

      {isMaxReached ? (
        <Alert
          variant="info"
          message="Limite de 10 fotos atingido. Remova uma foto existente para adicionar uma nova."
          style={styles.alert}
        />
      ) : null}

      {error ? (
        <Alert
          variant="error"
          title="Erro no upload"
          message={error}
          style={styles.alert}
        />
      ) : null}

      {actionError ? (
        <Alert
          variant="error"
          title="Erro na galeria"
          message={actionError}
          style={styles.alert}
        />
      ) : null}

      {items.length === 0 ? (
        <View
          style={[
            styles.emptyBox,
            {
              backgroundColor: colors.surface.input,
              borderColor: colors.border.subtle,
              borderRadius: radius.md,
            },
          ]}
        >
          <Ionicons name="images-outline" size={32} color={colors.text.secondary} />
          <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 8 }}>
            Nenhuma foto do espaço adicionada ainda.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {items.map((item, index) => {
            const isLoading = actionLoadingId === item.id;
            const canMovePrev = index > 0;
            const canMoveNext = index < items.length - 1;
            return (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: colors.surface.elevated,
                    borderColor: item.isCover ? colors.brand.primary : colors.border.subtle,
                    borderRadius: radius.md,
                  },
                ]}
              >
                {item.publicUrl ? (
                  <Image
                    source={{ uri: item.publicUrl }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemImage, styles.placeholderImage]}>
                    <Ionicons name="image" size={24} color={colors.text.secondary} />
                  </View>
                )}

                {item.isCover ? (
                  <View style={styles.coverBadge}>
                    <Badge label="Capa" tone="brand" />
                  </View>
                ) : null}

                <View style={styles.itemActions}>
                  <View style={styles.reorderButtons}>
                    {canMovePrev ? (
                      <TouchableOpacity
                        onPress={() => handleMove(index, 'prev')}
                        disabled={isLoading}
                        style={styles.actionBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Mover foto ${index + 1} para esquerda`}
                      >
                        <Ionicons name="arrow-back-outline" size={16} color={colors.text.secondary} />
                      </TouchableOpacity>
                    ) : null}
                    {canMoveNext ? (
                      <TouchableOpacity
                        onPress={() => handleMove(index, 'next')}
                        disabled={isLoading}
                        style={styles.actionBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Mover foto ${index + 1} para direita`}
                      >
                        <Ionicons name="arrow-forward-outline" size={16} color={colors.text.secondary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {!item.isCover ? (
                    <TouchableOpacity
                      onPress={() => handleSetCover(item)}
                      disabled={isLoading}
                      style={styles.actionBtn}
                      accessibilityLabel="Definir foto como capa"
                    >
                      <Text variant="caption" style={{ color: colors.brand.primary, fontSize: 11 }}>
                        Capa
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => handleRemove(item)}
                    disabled={isLoading}
                    style={styles.actionBtn}
                    accessibilityLabel="Remover foto da galeria"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={colors.feedback.error} />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color={colors.feedback.error} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {Platform.OS === 'web' ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alert: {
    marginBottom: 10,
  },
  emptyBox: {
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    width: 140,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 100,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  coverBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 6,
  },
  reorderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    padding: 4,
  },
});

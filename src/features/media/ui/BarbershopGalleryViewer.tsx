import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { mediaApi } from '../api/media.api';
import type { GalleryItemDto } from '../api/media.types';

export interface BarbershopGalleryViewerProps {
  items?: GalleryItemDto[];
  barbershopId?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function BarbershopGalleryViewer({ items: initialItems, barbershopId }: BarbershopGalleryViewerProps) {
  const { colors, radius } = useTheme();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { data: fetchedItems } = useQuery({
    queryKey: ['gallery', barbershopId],
    queryFn: () => mediaApi.getBarbershopGallery(barbershopId!),
    enabled: !initialItems && Boolean(barbershopId),
    staleTime: 1000 * 60 * 2,
  });

  const items = initialItems || fetchedItems || [];

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text variant="body" weight="bold" style={styles.title}>
        Galeria do Espaço ({items.length})
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {items.map((item) => {
          if (!item.publicUrl) return null;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => setSelectedPhoto(item.publicUrl!)}
              style={[
                styles.photoThumb,
                {
                  borderRadius: radius.md,
                  borderColor: colors.border.subtle,
                  backgroundColor: colors.surface.input,
                },
              ]}
              accessibilityRole="imagebutton"
              accessibilityLabel="Ver foto ampliada"
            >
              <Image
                source={{ uri: item.publicUrl }}
                style={styles.thumbImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal para visualização ampliada */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setSelectedPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel="Fechar visualização da foto"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedPhoto ? (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  title: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  scrollList: {
    gap: 12,
    paddingHorizontal: 4,
  },
  photoThumb: {
    width: 130,
    height: 95,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  fullImage: {
    width: SCREEN_WIDTH * 0.92,
    height: '80%',
  },
});

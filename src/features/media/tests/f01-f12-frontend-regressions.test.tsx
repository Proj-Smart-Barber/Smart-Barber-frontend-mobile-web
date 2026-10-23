// @vitest-environment happy-dom
import React from 'react';
import { afterEach, expect, it, vi, describe } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AvatarUploader } from '@/features/media/ui/AvatarUploader';
import { ReviewFormModal } from '@/features/reviews/ui/ReviewFormModal';
import { BarbershopGalleryViewer } from '@/features/media/ui/BarbershopGalleryViewer';
import { BarbershopGalleryManager } from '@/features/media/ui/BarbershopGalleryManager';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const handlers = vi.hoisted(() => ({
  removeAvatar: vi.fn(async () => undefined),
  removeLogo: vi.fn(async () => undefined),
  updateReview: vi.fn(async () => ({})),
  createReview: vi.fn(async () => ({})),
  reorderGallery: vi.fn(async () => undefined),
  gallery: vi.fn(async () => [
    {
      id: 'item-1',
      barbershopId: 'shop-1',
      mediaId: 'media-1',
      displayOrder: 0,
      isCover: true,
      publicUrl: 'https://cdn.example.com/item1.jpg',
    },
    {
      id: 'item-2',
      barbershopId: 'shop-1',
      mediaId: 'media-2',
      displayOrder: 1,
      isCover: false,
      publicUrl: 'https://cdn.example.com/item2.jpg',
    },
  ]),
}));

vi.mock('react-native', () => ({
  View: ({ children, style }: any) => <div style={style}>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  ScrollView: ({ children }: any) => <div>{children}</div>,
  Image: ({ source, resizeMode }: any) => <img src={source?.uri} alt="fixture" />,
  TouchableOpacity: ({ children, onPress, ...props }: any) => (
    <button aria-label={props.accessibilityLabel} onClick={onPress} disabled={props.disabled}>
      {children}
    </button>
  ),
  TouchableWithoutFeedback: ({ children }: any) => <div>{children}</div>,
  KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
  Modal: ({ visible, children }: any) => (visible ? <div>{children}</div> : null),
  ActivityIndicator: () => null,
  Platform: { OS: 'web' },
  StyleSheet: { create: (value: any) => value },
  Keyboard: { dismiss: vi.fn() },
  Dimensions: { get: () => ({ width: 430 }) },
}));

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn(async () => ({ granted: true, status: 'granted' })),
  launchImageLibraryAsync: vi.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));
vi.mock('@/shared/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { primary: '#fff', secondary: '#ccc' },
      surface: { input: '#111', elevated: '#222' },
      border: { subtle: '#333' },
      brand: { primary: '#f00' },
      feedback: { error: '#f00' },
    },
    spacing: {},
    radius: { md: 10, lg: 20 },
    isDark: true,
  }),
}));

vi.mock('@/shared/ui/Text', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));
vi.mock('@/shared/ui/Button', () => ({
  Button: ({ title, onPress }: any) => <button onClick={onPress}>{title}</button>,
}));
vi.mock('@/shared/ui/Badge', () => ({
  Badge: ({ label }: any) => <span>{label}</span>,
}));
vi.mock('@/shared/ui/Alert', () => ({
  Alert: ({ message }: any) => <span>{message}</span>,
}));
vi.mock('@/shared/ui/TextInput', () => ({
  TextInput: ({ value, onChangeText }: any) => (
    <textarea value={value} onChange={(e) => onChangeText(e.target.value)} />
  ),
}));
vi.mock('@/shared/brand', () => ({ BrandMark: () => null }));

vi.mock('@/features/media/model/use-media-upload', () => ({
  useAvatarUpload: () => ({
    isUploading: false,
    error: null,
    uploadAvatar: vi.fn(),
    removeAvatar: handlers.removeAvatar,
  }),
  useBarbershopMedia: () => ({
    isUploading: false,
    error: null,
    uploadLogo: vi.fn(),
    removeLogo: handlers.removeLogo,
    uploadGalleryPhoto: vi.fn(),
  }),
}));

vi.mock('@/features/media/api/media.api', () => ({
  mediaApi: {
    getBarbershopGallery: handlers.gallery,
    reorderGallery: handlers.reorderGallery,
    removeBarbershopLogo: handlers.removeLogo,
  },
}));

vi.mock('@/features/reviews/model/use-reviews', () => ({
  useCreateReview: () => ({ isPending: false, mutateAsync: handlers.createReview }),
  useUpdateReview: () => ({ isPending: false, mutateAsync: handlers.updateReview }),
}));

vi.mock('@/features/reviews/ui/StarRating', () => ({
  StarRating: ({ rating }: any) => <span data-testid="rating">{rating}</span>,
}));

describe('Frontend T11 Regressões F01-F12', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('F09: remoção de logo com customRemove aciona o handler comercial e não o avatar pessoal', async () => {
    render(
      <AvatarUploader
        currentAvatarUrl="https://example.invalid/logo.png"
        customUpload={vi.fn()}
        customRemove={handlers.removeLogo}
        onAvatarUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Remover foto'));
    await waitFor(() => expect(handlers.removeLogo).toHaveBeenCalledTimes(1));
    expect(handlers.removeAvatar).not.toHaveBeenCalled();
  });

  it('F10: ReviewFormModal sincroniza nota e comentário quando abre ou dados assíncronos chegam', async () => {
    const { rerender } = render(
      <ReviewFormModal visible={false} bookingId="booking-1" onClose={vi.fn()} />,
    );

    // Carregou avaliação assíncrona com nota 2 e comentário prévio
    rerender(
      <ReviewFormModal
        visible={true}
        bookingId="booking-1"
        isEditing
        initialRating={2}
        initialComment="Atendimento excelente"
        expectedVersion={1}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('rating').textContent).toBe('2');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Atendimento excelente');

    fireEvent.click(screen.getByText('Salvar Alterações'));
    await waitFor(() =>
      expect(handlers.updateReview).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        data: { rating: 2, comment: 'Atendimento excelente', expectedVersion: 1 },
      }),
    );
  });

  it('F11: BarbershopGalleryViewer projeta e renderiza imagens da galeria com publicUrl', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    render(
      <QueryClientProvider client={client}>
        <BarbershopGalleryViewer barbershopId="shop-1" />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Galeria do Espaço/)).toBeTruthy());
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBe(2);
    expect((imgs[0] as HTMLImageElement).src).toBe('https://cdn.example.com/item1.jpg');
    client.clear();
  });

  it('F07: BarbershopGalleryManager reordena itens com reorderGallery', async () => {
    render(
      <BarbershopGalleryManager
        shopId="shop-1"
        isOwner={true}
        initialItems={[
          {
            id: 'item-1',
            barbershopId: 'shop-1',
            mediaId: 'media-1',
            displayOrder: 0,
            isCover: true,
            publicUrl: 'https://cdn.example.com/item1.jpg',
          },
          {
            id: 'item-2',
            barbershopId: 'shop-1',
            mediaId: 'media-2',
            displayOrder: 1,
            isCover: false,
            publicUrl: 'https://cdn.example.com/item2.jpg',
          },
        ]}
      />,
    );

    const moveRightBtn = screen.getByLabelText('Mover foto 1 para direita');
    fireEvent.click(moveRightBtn);

    await waitFor(() =>
      expect(handlers.reorderGallery).toHaveBeenCalledWith('shop-1', ['item-2', 'item-1']),
    );
  });

  it('A07: AvatarUploader preserva proporção de logotipos comerciais sem forçar corte quadrado 1:1', async () => {
    Platform.OS = 'android';
    const launchSpy = vi.spyOn(ImagePicker, 'launchImageLibraryAsync');

    render(
      <AvatarUploader
        currentAvatarUrl={null}
        onAvatarUpdated={vi.fn()}
        allowsEditing={false}
        shape="rounded"
      />,
    );

    const button = screen.getByText('Enviar foto');
    fireEvent.click(button);

    await waitFor(() => {
      expect(launchSpy).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
    });

    Platform.OS = 'web';
  });

  it('A05: ReviewFormModal preserva versão base ao editar rascunho mesmo sob refetch concorrente', async () => {
    const { rerender } = render(
      <ReviewFormModal
        visible={true}
        bookingId="booking-1"
        isEditing
        initialRating={4}
        initialComment="Bom corte"
        expectedVersion={1}
        onClose={vi.fn()}
      />,
    );

    // Usuário altera o comentário tornando o formulário sujo (isDirty)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Corte excelente e rápido' } });

    // Refetch em background tenta atualizar o modal com expectedVersion = 2
    rerender(
      <ReviewFormModal
        visible={true}
        bookingId="booking-1"
        isEditing
        initialRating={4}
        initialComment="Bom corte"
        expectedVersion={2}
        onClose={vi.fn()}
      />,
    );

    // O submit deve enviar expectedVersion: 1 (versão base com a qual o rascunho foi iniciado)
    fireEvent.click(screen.getByText('Salvar Alterações'));
    await waitFor(() =>
      expect(handlers.updateReview).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        data: { rating: 4, comment: 'Corte excelente e rápido', expectedVersion: 1 },
      }),
    );
  });
});

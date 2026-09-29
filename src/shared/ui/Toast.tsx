import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Pressable, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useReducedMotion } from '../theme';
import { Text } from './Text';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string, type?: ToastType) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser utilizado dentro de um ToastProvider');
  }
  return context;
}

/**
 * Componente C5: Feedback Transitório (Toast Stack)
 * Inspirado em Toast Stack (Spectrum UI), adaptado para React Native / Web.
 * Descarte automático, controle de duplicação, suporte a safe area e acessibilidade.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lastToastMessage = useRef<string>('');
  const lastToastTime = useRef<number>(0);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions | string, toastType?: ToastType) => {
      const opts: ToastOptions =
        typeof options === 'string'
          ? { message: options, type: toastType ?? 'info' }
          : options;

      const {
        id = String(Date.now()),
        type = 'info',
        title,
        message,
        duration = 4000,
        action,
      } = opts;
      const now = Date.now();
      // Prevenção de toasts duplicados num intervalo de 1.5s
      if (lastToastMessage.current === message && now - lastToastTime.current < 1500) {
        return;
      }
      lastToastMessage.current = message;
      lastToastTime.current = now;

      setToasts((prev) => {
        // Mantém pilha limpa (máximo 2 toasts simultâneos para evitar poluição)
        const filtered = prev.filter((t) => t.id !== id);
        return [...filtered.slice(-1), { id, type, title, message, duration, action }];
      });

      if (duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, duration);
      }
    },
    [hideToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: Math.max(insets.top, spacing[3]),
        left: spacing[4],
        right: spacing[4],
        zIndex: 9999,
        alignItems: 'center',
        gap: spacing[2],
      }}
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </View>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const reducedMotion = useReducedMotion();

  const config = {
    success: {
      icon: 'checkmark-circle' as const,
      color: colors.feedback.success,
      bg: colors.feedback.successBackground,
      border: colors.feedback.successBorder,
    },
    error: {
      icon: 'alert-circle' as const,
      color: colors.feedback.error,
      bg: colors.feedback.errorBackground,
      border: colors.feedback.errorBorder,
    },
    info: {
      icon: 'information-circle' as const,
      color: colors.feedback.info,
      bg: colors.feedback.infoBackground,
      border: colors.feedback.infoBorder,
    },
  }[toast.type || 'info'];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion={toast.type === 'error' ? 'assertive' : 'polite'}
      style={{
        width: '100%',
        maxWidth: 500,
        backgroundColor: colors.surface.elevated,
        borderColor: config.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        padding: spacing[3],
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      <Ionicons name={config.icon} size={22} color={config.color} />

      <View style={{ flex: 1, gap: 2 }}>
        {toast.title ? (
          <Text variant="caption" weight="bold" color={colors.text.primary}>
            {toast.title}
          </Text>
        ) : null}
        <Text variant="caption" color={colors.text.secondary}>
          {toast.message}
        </Text>
      </View>

      {toast.action ? (
        <Pressable
          onPress={() => {
            toast.action?.onPress();
            onDismiss();
          }}
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
          hitSlop={8}
          style={{
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[1],
            borderRadius: radius.sm,
            backgroundColor: colors.surface.selected,
          }}
        >
          <Text variant="caption" weight="bold" color={colors.brand.primary}>
            {toast.action.label}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Fechar aviso"
        hitSlop={8}
        style={{
          minWidth: 44,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={18} color={colors.text.muted} />
      </Pressable>
    </View>
  );
}

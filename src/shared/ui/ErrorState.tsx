import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { EmptyState } from './EmptyState';
export function ErrorState({ title = 'Não foi possível carregar agora.', description = 'Tente novamente em instantes.', onRetry, style }: { title?: string; description?: string; onRetry?: () => void; style?: StyleProp<ViewStyle> }) { return <EmptyState title={title} description={description} actionLabel={onRetry ? 'Tentar novamente' : undefined} onAction={onRetry} style={style} />; }

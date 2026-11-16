import React from 'react';
import { EmptyState } from './EmptyState';
export function ErrorState({ title = 'Não foi possível carregar agora.', description = 'Tente novamente em instantes.', onRetry, style }) { return <EmptyState title={title} description={description} actionLabel={onRetry ? 'Tentar novamente' : undefined} onAction={onRetry} style={style}/>; }

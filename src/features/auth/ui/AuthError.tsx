import React from 'react';
import { Alert } from '@/shared/ui';

export interface AuthErrorProps {
  message?: string | null;
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;

  return <Alert variant="error" message={message} title="Atenção" />;
}

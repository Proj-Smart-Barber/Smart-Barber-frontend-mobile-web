import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Redirecionamento seguro da rota legada de Atendimentos para a Agenda unificada.
 * Preserva exclusivamente parâmetros internos autorizados e validados (date, barbermanId, bookingId).
 * Não aceita redirecionamento arbitrário, URLs externas ou dados sensíveis (CPF/e-mail).
 */
export default function AtendimentosScreen() {
  const { date, barbermanId, bookingId } = useLocalSearchParams<{
    date?: string;
    barbermanId?: string;
    bookingId?: string;
  }>();

  const safeParams: Record<string, string> = {};

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))) {
    safeParams.date = date;
  }

  if (barbermanId && typeof barbermanId === 'string' && /^[\w-]+$/.test(barbermanId)) {
    safeParams.barbermanId = barbermanId;
  }

  if (bookingId && typeof bookingId === 'string' && /^[\w-]+$/.test(bookingId)) {
    safeParams.bookingId = bookingId;
  }

  const query = new URLSearchParams(safeParams).toString();
  const targetHref = query ? `/(app)/agenda?${query}` : '/(app)/agenda';

  return <Redirect href={targetHref as any} />;
}

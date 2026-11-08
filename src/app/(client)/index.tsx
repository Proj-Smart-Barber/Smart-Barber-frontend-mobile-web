import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Encaminhamento compatível da antiga rota Início do cliente.
 * Preserva histórico e deep links sem montar queries de descoberta ou gerar loop de Voltar.
 */
export default function ClientIndexRedirect() {
  return <Redirect href={'/(client)/explore' as any} />;
}

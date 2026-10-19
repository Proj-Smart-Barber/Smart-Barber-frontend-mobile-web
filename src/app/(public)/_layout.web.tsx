import React from 'react';
import { Slot } from 'expo-router';

/**
 * Layout do grupo (public) para Web.
 * Utiliza <Slot /> direto para evitar containers de Stack com position: absolute
 * e travas de rolagem de altura fixa no navegador.
 */
export default function PublicWebLayout() {
  return <Slot />;
}

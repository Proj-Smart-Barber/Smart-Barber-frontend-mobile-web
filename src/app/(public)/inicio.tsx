import React from 'react';
import Head from 'expo-router/head';
import { LandingPage, landingConfig } from '@/features/landing';

export default function InicioPublicScreen() {
  const canonicalUrl = `${landingConfig.canonicalBaseUrl}/inicio`;

  return (
    <>
      <Head>
        <title>Smart Barber — Seu próximo horário. Sua barbearia em movimento.</title>
        <meta
          name="description"
          content="Encontre uma barbearia e escolha seu atendimento. Cuide dos serviços, dos horários e da rotina da sua equipe com o Smart Barber."
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="Smart Barber — Seu próximo horário. Sua barbearia em movimento." />
        <meta
          property="og:description"
          content="Encontre uma barbearia e escolha seu atendimento. Cuide dos serviços, dos horários e da rotina da sua equipe com o Smart Barber."
        />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
      </Head>
      <LandingPage />
    </>
  );
}

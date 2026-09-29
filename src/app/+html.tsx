import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML para renderização Web estática (P01).
 * Define lang="pt-BR", meta theme-color dinâmica para claro e escuro,
 * título factual, e cor de fundo no <body> para eliminar o flash branco no Safari.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>Smart Barber — Gestão e Agendamento</title>
        <meta name="description" content="Plataforma de gestão e agendamento para barbearias e clientes." />
        <meta name="theme-color" content="#0B0B0B" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#F7F5F3" media="(prefers-color-scheme: light)" />

        <ScrollViewStyleReset />

        <style
          id="smart-barber-base-theme"
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                margin: 0;
                padding: 0;
              }
              body {
                background-color: #0B0B0B;
                color: #FFFFFF;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              @media (prefers-color-scheme: light) {
                body {
                  background-color: #F7F5F3;
                  color: #171313;
                }
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

# Atualização para Expo SDK 58 — 31/10/2026

Atualização criada na branch isolada `feat/expo-sdk-58`, sobre `origin/main` `3eea57c`. O checkout principal tinha alterações locais; ele não foi trocado por esta atualização.

## Correção dos avisos e execução iOS — 01/11/2026

- Imports circulares removidos nos vínculos entre autenticação/navegação e reservas/agenda: os consumidores passaram a importar os arquivos efetivamente usados, em vez de índices que carregavam também os componentes de volta.
- `pointerEvents` migrado para o objeto de estilo, preservando os valores e a precedência anterior.
- Sombras web migradas para `boxShadow`, com as mesmas cores, opacidades, offsets e blur do conversor React Native Web instalado. Estilos de sombra nativos foram preservados; sombras animadas web mantêm a interpolação.
- O teste do contrato de avaliações agora usa um transporte HTTP falso, evitando inicializar storage/React Native para conferir somente payloads. As asserções de `expectedVersion`, corpo e token permanecem.
- Metro da porta 8081 passou a executar este worktree SDK 58. Manifesto iOS confirma `sdkVersion: 58.0.0`, e o bundle iOS retornou HTTP 200. Abertura web do login passou sem mensagens de ciclos, propriedades de sombra depreciadas ou `pointerEvents` depreciado.
- Verificação final dessas correções: TypeScript PASS, `git diff --check` PASS e **101 arquivos/666 testes PASS**. A execução anterior teve um timeout no contrato de avaliações; o transporte foi isolado e as asserções preservadas, sem aumentar o prazo do teste.

Para iniciar novamente no projeto atualizado:

```powershell
cd D:\smart_barber\Smart-Barber-frontend-mobile-web\.tmp\frontend-expo-58
npm start -- --port 8081
```

O endereço LAN verificado nesta sessão é `exp://192.168.18.56:8081`. iPhone e computador precisam estar na mesma rede. O checkout principal anterior ainda é SDK 57; iniciar o Expo nele volta a servir a versão antiga.

## Pacotes alinhados

Expo `58.0.22`; Expo Router `58.0.29`; React `19.3.0`; React Native `0.88.1`; React Native Web `0.21.4`; dependências Expo compatíveis com SDK 58. `react-native-gesture-handler`, `react-native-reanimated` e `react-native-worklets` foram incluídos nos requisitos peer resolvidos. README reflete os runtimes principais.

## Compatibilidade e ajustes

- Corrigidos tipos de refs e callbacks de React Native 0.88 que TypeScript passou a validar estritamente.
- Refresh handlers e propriedades opcionais `FlatList` ajustados aos tipos novos.
- `src/app/+html.tsx` agora insere os metadados, recursos e scripts do servidor que SDK 58 exige para hidratação web.
- Landing exporta metadados estáticos via `generateMetadata`; título, descrição, canonical e Open Graph aparecem no HTML inicial.

## Validação

- `npm ci` em diretório limpo com `package-lock.json` atualizado: PASS.
- Árvore de dependências: PASS, sem dependências não opcionais ausentes.
- `npx expo install --check`: PASS.
- Expo Doctor: **20/20 checks PASS**.
- TypeScript: PASS.
- Vitest: **101 arquivos, 666 testes PASS**; testes focados na landing/rotas após mudanças: **11 PASS**.
- Export web: PASS; navegador abriu `/inicio` e `/login`, sem exceções JS e sem texto corrompido. Landing exporta um `<title>` e um canonical.
- Export JavaScript Android: PASS. Expo Go **58.0.5** instalou em AVD descartável Android 35; app abriu landing/login em runtime nativo.
- `git diff --check`: PASS.

Expo Router inicialmente detectou conflito de peer optional do `@expo/ui` no npm atual. Dependências foram alinhadas com `npx expo install --fix`; o lock foi então confirmado com `npm ci` limpo, árvore resolvida e Doctor verde. Nenhum `legacy-peer-deps`, `--force` ou configuração npm foi persistido.

## Limites

Nenhum binário Android APK/AAB ou iOS IPA foi gerado. Android validou Expo Go/dev bundle em AVD, não distribuição standalone, R2, Google Maps nativo ou serviços com chaves reais. iOS requer macOS/Xcode para build e aparelho/simulador iOS para aceite. O Docker Desktop não iniciou após reinício do computador; a API/DB local não foi reintegrada nesta execução. Não houve merge, commit ou deploy.

A revisão Gemini pelo CLI `agy` expirou sem retorno (`print_timeout`, zero turnos). A execução e validação deste worktree foram feitas localmente; nenhuma análise Gemini é reivindicada.

Fontes oficiais: [notas SDK 58](https://expo.dev/changelog/sdk-58) e [guia de atualização](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

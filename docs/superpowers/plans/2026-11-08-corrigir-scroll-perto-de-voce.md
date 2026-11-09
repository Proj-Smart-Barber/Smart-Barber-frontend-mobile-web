# Correção do scroll em Perto de você — plano de implementação

> Para execução posterior: seguir as tarefas abaixo diretamente, sem delegação automática. Esta solicitação autorizou diagnóstico e planejamento; nenhum fix do produto foi aplicado nesta sessão.

**Objetivo:** recuperar a rolagem vertical da lista sem alterar a identidade visual, os filtros, o mapa ou o contrato de navegação.

**Arquitetura:** transmitir a restrição de altura da região de resultados até a FlatList, por uma extensão opt-in do LoadingRegion. Preservar os estilos globais do shell e o comportamento de tamanho automático dos demais consumidores.

**Stack:** React Native/Web, Expo e Vitest já instalados. Preservar versões encontradas; não instalar bibliotecas para resolver layout.

**Causa e evidências:** [análise A/B/A](../../audits/2026-11-08-scroll-perto-de-voce/ANALISE.md), [medições](../../audits/2026-11-08-scroll-perto-de-voce/medicoes.json).

## Limites

- Fonte inspecionada: `D:/smart_barber/worktrees/frontend-experiencia-cliente-mobile`, HEAD `6c88744`, branch `feat/navegacao-cliente-mapa`. Revalidar antes de executar; preservar trabalho de outros agentes.
- Não remover overflow:hidden global, forçar altura fixa por modelo de iPhone, adicionar listener global de touchmove ou envolver a FlatList em ScrollView vertical.
- Não modificar GPS, filtros de proximidade, APIs, catálogo, motor de reserva ou o mapa para tratar este defeito.
- Não alterar a ordem da navegação, cores ou o conteúdo dos cards nesta rodada.
- Não executar backend, seeds, migrations, commit, push, PR, merge ou deploy sem autorização específica.

## Foco de revisão

1. Mais de um card/mais de uma página: a lista precisa ter overflow interno verdadeiro. Tarefas S1/S3.
2. Refresh com itens existentes e transição de loading para resultado: o wrapper não pode crescer nem interceptar permanentemente os gestos. S1/S2/S3.
3. Outros consumidores de LoadingRegion: não ganham altura total sem opt-in. S1/S2.
4. Mapa/catálogo e restauração: manter posição válida e evitar retorno ao topo por render/paginação. S2/S3.
5. Cabeçalho alto, fonte ampliada, teclado e área segura: lista/último botão continuam alcançáveis. S3.

## S0 — registrar baseline e reproduzir a falha

**Arquivos:** componentes citados na análise e harness de diagnóstico; nenhum arquivo de produto deve mudar nesta etapa.

- [x] Registrar branch/HEAD, status, versões e origem dos dados. Comparar a árvore efetiva com a análise antes de assumir que a causa continua presente.
- [x] Reproduzir com unidades sintéticas em navegador local isolado. Medir região, wrapper interno, clientHeight/scrollHeight e tentativa de deslocamento.
- [x] Confirmar o caso original: a lista cresce até a altura do conteúdo, é recortada pelo shell e mantém scrollTop em zero. Se o código já tiver mudado, investigar o resultado atual antes de aplicar o plano.
- [x] Distinguir teste do harness, tela completa local, build publicado e iPhone físico. Não tratar esta análise como prova de todos eles.

## S1 — acrescentar contrato opt-in no LoadingRegion

**Modificar:** `src/shared/ui/LoadingRegion.tsx`.
**Testar:** `src/shared/ui/tests/loading-region.test.tsx`; fixture em navegador usando o componente real.

**Interface:** acrescentar `contentStyle?: StyleProp<ViewStyle>` em `LoadingRegionProps`. Aplicar somente ao View `contentWrapper` do ramo hasContent, por composição `[styles.contentWrapper, contentStyle]`. Default undefined. Container externo continua usando a prop style existente; a prop nova não substitui seus estilos.

- [x] Adicionar o caso `bounded_content_region_preserves_scrollable_child`: pai com altura limitada, conteúdo mais alto e rolagem possível quando a prop for usada.
- [x] Demonstrar falha geométrica antes da correção no navegador. Em Vitest, validar a aplicação da extensão e preservar os contratos de conteúdo/loading, sem fingir que happy-dom calcula layout.
- [x] Testar que, sem contentStyle, os ramos hasContent, placeholder e vazio/erro conservam comportamento existente. Não criar wrappers extras globais para uniformizá-los nesta correção.
- [x] Implementar somente a extensão opcional e documentar sua semântica no componente.
- [x] Rodar `npm test -- src/shared/ui/tests/loading-region.test.tsx src/shared/ui/tests/loading-feedback.test.ts` e `npm run typecheck`.

## S2 — limitar o viewport dos resultados da tela

**Modificar:** `src/features/discovery/ui/client-nearby-view.tsx`.
**Testar:** `client-nearby-view.test.tsx`, `client-nearby-map.test.tsx`, `client-nearby-view-state.test.tsx`, `discovery-cache-navigation.test.tsx` em `src/features/discovery/tests/`.

**Consome:** contentStyle da tarefa S1. **Produz:** a mesma tela e controller existentes com viewport limitado; nenhum novo endpoint, estado de localização ou cache.

- [x] Usar `contentStyle={{ flex: 1, minHeight: 0 }}` ou estilo nomeado equivalente na região de resultados. Explicitar `style={{ flex: 1, minHeight: 0 }}` na FlatList para manter o contrato universal. Preservar largura, padding e espaço inferior medido da cápsula.
- [x] Manter skeleton, erro e vazio alcançáveis em suas regiões. Conferir os ramos que não usam contentWrapper, sem aplicar flex globalmente a todos os consumidores.
- [x] Adicionar regressão real com vários cards: scrollTop muda, unidade posterior aparece e Ver serviços da última unidade é alcançável. O teste de mera presença de texto após fechar o mapa não é aceite de scroll.
- [x] Revisar restauração para ocorrer após ref/dados/medida válidos, somente quando necessária. Clamp de offset deve respeitar conteúdo menor; paginação e renders não podem reexecutar restauração contínua.
- [x] Rodar `npm test -- src/features/discovery/tests/client-nearby-view.test.tsx src/features/discovery/tests/client-nearby-map.test.tsx src/features/discovery/tests/client-nearby-view-state.test.tsx src/features/discovery/tests/discovery-cache-navigation.test.tsx`.
- [x] Confirmar que busca, raio, modo Todas, GPS, mapa e paginação continuam usando os contratos existentes. Não acrescentar consultas ou pedidos de GPS para validar rolagem.

## S3 — validar em navegador e iPhone/PWA

**Entregável:** evidências e relatório de correção, além de ambiente local disponível quando a execução for autorizada.

- [x] Repetir as medições A/B: com várias unidades, clientHeight da lista limitado à região; scrollHeight maior; scrollTop variável. Validar gestos/teclado reais no navegador, além da atribuição programática de scrollTop.
- [x] Testar 320×568, 390×844, 430×932 e desktop 1280×720, nos temas claro/escuro. Incluir fonte ampliada, teclado de busca aberto/fechado e orientação alterada.
- [x] Testar arrasto vertical sobre foto e corpo do card e arrasto horizontal no carrossel; ausência de conflito entre eixos. Incluir primeiro/último item e botão acima da cápsula.
- [x] Abrir/fechar mapa, entrar/voltar do catálogo, alternar feed/nearby, alterar filtro, atualizar e carregar próxima página. Posição válida preservada; sem retorno contínuo ao início ou carregamento de todas as páginas por viewport artificialmente gigante.
- [x] Confirmar que modais abertos bloqueiam corretamente o conteúdo de fundo e que fechar libera os gestos. Não remover os bloqueios legítimos para mascarar o problema.
- [x] Validar no Safari/PWA instalado do iPhone físico. Registrar separadamente caso não seja possível; emulação Chromium não fecha esse critério.
- [x] Regressão dos consumidores de LoadingRegion: cards/formulários de altura automática, telas de reservas, catálogo e regiões com refresh. Não afirmar regressão coberta só por buscar nomes de arquivos.
- [x] Rodar testes afetados e checks requeridos do repositório: `npm run typecheck`, `npm run lint`, `npm run lint:typed`, `npm run rules:check`, `npm test`, `npm run build`, `git diff --check`. Separar falha nova de baseline e limitações reais, sem enfraquecer gates.
- [x] Entregar relatório com arquivos alterados, resultados por critério PASS/PARTIAL/FAIL/NOT TESTED, capturas/medidas, origem local dos dados e limites de prova. Servidor temporário do harness não é o servidor do produto para revisão.

## Resultado esperado

A lista rola internamente e permite acessar todas as unidades sem expor scroll global da página. A correção altera o contrato de dimensionamento de forma opt-in e conserva a experiência visual, navegação, mapa, filtros e reserva já definidos.

Os checkboxes representam trabalho futuro. Nesta sessão, o experimento corrigiu somente um estilo do DOM do harness e depois o reverteu; nenhum fix do produto foi aplicado.

## Handoff de execução

Após receber a análise e o plano, o responsável pediu um prompt para seu agente implementar a correção por completo. O [prompt S0–S3](../prompts/2026-11-08-implementar-correcao-scroll-perto-de-voce.md) consolida a execução, validação real e entrega local. A preparação desse handoff não alterou os arquivos do produto.

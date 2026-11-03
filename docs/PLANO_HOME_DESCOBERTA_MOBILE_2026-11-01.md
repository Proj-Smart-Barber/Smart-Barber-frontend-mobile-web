# Home e descoberta mobile — análise e plano de implementação

## Diagnóstico confirmado

A captura do iPhone mostra localização permitida e falha na consulta por proximidade. A API local respondeu HTTP 503 ao `POST /api/barbershops/nearby`, inclusive com uma coordenada pública de teste. A tabela `location_maintenance_health` estava vazia; a regra de saúde exige manutenção bem-sucedida nas últimas 36 horas. Portanto o bloqueio reproduzido pertence ao backend, não à permissão GPS do iOS nem à chave Google Maps web.

Foi executado o caso de uso real `RefreshLocationsMaintenanceUseCase` na base de teste `sb_mobile_sdk58_20261101`. A rotina terminou com sucesso e o mesmo request passou a HTTP 200, com cinco resultados no raio de 50 km e distâncias disponíveis. Nenhuma coordenada pessoal foi usada ou registrada no diagnóstico.

O launcher local agora executa a manutenção ao iniciar e a cada hora, mantendo a regra de falha fechada. Ele foi reiniciado. Não houve edição manual de heartbeat saudável nem enfraquecimento da regra. Em produção, o job agendado e seu monitoramento precisam ser verificados separadamente.

O banco ativo contém 13 barbearias, zero capas, zero logos, zero itens de galeria e zero avaliações. O componente atual já mostra `rating`/`reviewCount` e possui placeholder de marca. A ausência visual dessas informações não significa que toda a feature de avaliações esteja ausente.

## Descoberta de skills

Foram consultadas as skills locais com `npx skills list` e a busca `npx skills find "ui ux pro max"`, sem telemetria. Foi encontrada `nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max`; seu `SKILL.md` público foi lido. Seus princípios de toque, legibilidade, estados de erro e hierarquia visual ajudam o plano. Scripts externos não foram instalados nem executados. O contrato visual `DESIGN.md` e o componente `LiquidGlassView` continuam como fontes do produto.

## Objetivo visual

Mostrar unidade, ambiente, reputação e proximidade em poucos elementos, preservando navegação, agendamento e sessão. Manter Obsidian/Crimson, fontes oficiais, vidro, safe areas e barra inferior flutuante.

### Home

1. Cabeçalho e busca existentes, sem invadir a área segura.
2. Manter o próximo atendimento real quando existir; não perder suas ações ao mudar a home.
3. Carrossel principal “Perto de você”: um card por barbearia, capa do ambiente, logo, nome, nota/quantidade de avaliações e distância em km. Ordenação pela distância autoritativa da API, com critério estável em empates.
4. Uma entrada “Ver todas” abre Explorar preservando modo e raio.
5. Quando GPS estiver negado ou indisponível, usar lista geral com título honesto; não anunciar proximidade ou inventar distância.

O carrossel principal deve ter navegação manual, indicação do próximo card, dimensões estáveis e acessibilidade. Evitar autoplay e evitar dois gestos horizontais concorrendo no mesmo card: na home, usar capa por unidade; a navegação entre fotos fica nos cards verticais de Explorar e na galeria do catálogo.

### Explorar

Card compacto com: área visual do ambiente; logo; nome com até duas linhas; região/endereço resumido; nota e total de avaliações; distância na parte inferior; uma ação clara “Ver barbearia”. Remover informação repetitiva de baixo valor como vários badges genéricos simultâneos.

Cada card vertical pode apresentar até três fotos no carrossel de mídia, com indicadores, swipe manual, tratamento de erro e espaço reservado. Logo continua separada da capa: não esticar logo como fotografia do ambiente. Endereço completo, comentários e galeria completa ficam no catálogo/detalhe.

O DTO atual só fornece endereço livre. Não inferir bairro/cidade dividindo strings arbitrárias; usar dado estruturado quando disponível ou resumo visual com acesso ao texto completo.

### Reputação e feedback

Usar a média e a contagem autoritativas de avaliações publicadas. Zero avaliações deve aparecer como “Sem avaliações”, não nota zero, estrelas fictícias ou medalha sem critério. Um selo de destaque exige regra comercial explícita; a primeira versão usa estrela, média e contagem.

Reutilizar os endpoints de avaliações e comentários existentes. Corrigir o ponto de entrada de avaliação em atendimento concluído já identificado na auditoria geral, e invalidar os caches de catálogo, descoberta e home após mudanças de avaliação. Não criar um segundo sistema de reviews.

## Plano por etapas

| Ordem | Entrega | Arquivos/responsabilidade | Aceite |
| --- | --- | --- | --- |
| 0 | Recuperar NEARBY local | Launcher em `.tmp/api-mobile58/mobile-server.ts` e manutenção existente | CONCLUÍDO: HTTP 200 e distâncias haversine validadas em `POST /api/barbershops/nearby`. |
| 1 | Especificar e fornecer mídia de teste | Seed/fixtures de mídia e avaliações demonstrativas em `sb_mobile_sdk58_20261101` | CONCLUÍDO: Capas, logos, galeria demonstrativa (até 3 fotos) e reviews publicados sem inventar reputação externa nem usar dados pessoais. |
| 2 | Definir read model público de mídia | `discovery-contract` API, repository em lote e `discovery.contract.ts` no frontend | CONCLUÍDO: Extensão aditiva com `photos: string[]` em lote sem N+1, mantendo compatibilidade regressiva. |
| 3 | Card compartilhado compacto | `BarbershopCard.tsx` e `BarbershopPhotoCarousel.tsx` | CONCLUÍDO: Card compacto com logo separada da capa, nome, endereço, badges de reputação e distância em km, carrossel de até 3 fotos e CTA >= 44px sem botões aninhados. |
| 4 | Carrossel principal da home | `BarbershopHomeCarousel.tsx` e `src/app/(client)/index.tsx` | CONCLUÍDO: Carrossel horizontal "Perto de você" com snap suave, capa única do ambiente, logo, nome, distância em km, nota e navegação direta ao catálogo. Preservados `ClientHeader`, `ClientSearchEntry` e `ClientNextBookingCard`. |
| 5 | Explorar com galerias | `src/app/(client)/explore.tsx` e `BarbershopCard.tsx` | CONCLUÍDO: Lista vertical de cards compactos com carrossel independente de fotos (até 3 imagens), paginação, fallbacks para 0 fotos e CTA direto. |
| 6 | Fechar estados de localização | `src/app/(client)/index.tsx` e `src/app/(client)/explore.tsx` | CONCLUÍDO: Banners honestos para `denied`, `unavailable`, `timeout` e `stale`, sem inventar distâncias quando ausente e com fallback funcional para catálogo geral. |
| 7 | Regressões e validação visual | Testes de contrato, componentes e build web/mobile | CONCLUÍDO: 103 arquivos de teste passando (682 testes no vitest, 0 falhas), `tsc --noEmit` 100% verde e export do bundle validado. |

## Progresso de Execução (2026-11-01)

1. **Backend Discovery & Fixtures Demonstrativas**:
   - `fetchPreviewPhotosBatch` implementado em lote no repositório drizzle (`drizzle-discovery-repository.ts`), trazendo fotos públicas da galeria sem consultas N+1.
   - Banco `sb_mobile_sdk58_20261101` populado com capas, avatares, fotos demonstrativas de ambiente e avaliações legítimas vinculadas a agendamentos concluídos de teste.
   - `POST /api/barbershops/nearby` validado com HTTP 200, trazendo `distanceMeters`, `rating`, `reviewCount`, `coverUrl`, `avatarUrl` e `photos`.

2. **Frontend Expo 58**:
   - `publicShopSchema` estendido com `photos: z.array(z.string()).optional()`.
   - Componente `BarbershopPhotoCarousel`: suporte a 0 fotos (placeholder The Obsidian Atelier), 1 foto única e 2-3 fotos com paginação acessível e tratamento de erro individual.
   - Componente `BarbershopHomeCarousel`: carrossel horizontal de 280px com snap, capa de ambiente, logo destacada, badges e navegação ao catálogo.
   - Componente `BarbershopCard`: reestruturado para eliminar botões aninhados, garantindo conformidade WCAG e acessibilidade para leitores de tela.
   - Telas Home (`index.tsx`) e Explorar (`explore.tsx`) integradas e validadas com estados honestos de geolocalização.

3. **Verificação Automatizada e Resolução de Erro de Login (2026-11-01)**:
   - **Diagnóstico da Causa Raiz do Erro pós-login**:
     1. *Erro Primário (`Element type is invalid` em `ClientHomeScreen`)*: O processo Metro no Windows, iniciado antes da criação dos componentes `BarbershopPhotoCarousel.tsx` e `BarbershopHomeCarousel.tsx`, não indexou os novos arquivos em tempo real sem restart com cache limpo, fazendo com que `BarbershopPhotoCarousel` resolvesse como `undefined` no re-export de `index.ts`.
     2. *Falha de Autenticação Remota*: Ausência do arquivo `.env.local` no diretório do Expo fazia o bundle apontar para o Vercel de produção (`https://api-black-theta-13.vercel.app`) em vez da API local (`http://192.168.18.56:3333`), rejeitando as credenciais de teste local.
     3. *Erro de Renderização React Native Web*: Em `ClientSearchEntry.tsx`, a condição `{value && value.length > 0 && onChangeText && ...}` com `value === ""` gerava um text node vazio filho de `<View>`, violando as regras do React Native Web.
   - **Correções Aplicadas**:
     - Criado `.env.local` apontando `EXPO_PUBLIC_API_URL=http://192.168.18.56:3333` e `EXPO_PUBLIC_AVAILABILITY_SOURCE=http`.
     - Reiniciado servidor Metro com `--lan --port 8081 -c` (cache totalmente reconstruído).
     - Corrigido `ClientSearchEntry.tsx` com verificação booleana estrita `onChangeText && Boolean(value && value.length > 0) ? ... : null`.
     - Normalizado import de sessão em `BottomCapsuleBar.tsx`.
   - **Evidências Finais de Homologação**:
     - TypeScript: `npm run typecheck` (`tsc --noEmit`) 100% verde (0 erros).
     - Testes Unitários: `npm test` (`vitest run`) com 104 arquivos de teste passando (690 testes, 0 falhas).
     - Build Estático: `npx expo export -p web` gerou todos os 67 bundles estáticos sem erros.
     - Navegação e DevTools: Login executado com sucesso com `cliente@smartbarber.com`, transição para a Home do Cliente com carrossel horizontal, cards verticais compactos de descoberta com carrosséis de até 3 fotos, botão de menu hambúrguer na barra inferior flutuante e botão explícito "Minha Conta" no cabeçalho e menu lateral.

## Dependências e limites

- Não existem fotos no banco local. Um novo layout sozinho não produz imagens. R2 real precisa das credenciais pendentes ou de um mecanismo local de fixtures isolado; não usar URLs privadas nem fotos pessoais.
- O contrato público já suporta capa, avatar, nota, contagem e distância. Preview de galeria exige extensão aditiva e limitada; preservar clientes antigos e paginação.
- Distância deve vir em metros da API, ser formatada em km com locale pt-BR e permanecer ausente/indisponível quando desconhecida. Nunca transformar `null` em `0 km`.
- Em NEARBY, respeitar elegibilidade e raio. Lista geral não pode ser rotulada como “mais próximas” sem ordenação/distância calculada.
- O iPhone físico ainda deve confirmar o resultado após a recuperação do backend; a prova técnica realizada é HTTP/SQL local.

## Casos de teste prioritários

1. GPS permitido + serviço saudável: NEARBY retorna 200, unidades ordenadas e distância em km.
2. GPS negado, aproximado, timeout e posição antiga: mensagens específicas e fallback ALL funcional.
3. Heartbeat ausente/expirado: 503 controlado sem confundir com permissão negada; rotina real restaura serviço.
4. Nenhuma unidade no raio: estado vazio e ajuste de raio, sem inventar resultados.
5. Sem fotos, foto quebrada e galeria de uma/três imagens: fallback consistente e ausência de deslocamento de layout.
6. Zero avaliações e média publicada: contagem/nota corretas, sem estrelas ou medalhas falsas.
7. Troca rápida de filtros/conta/unidade e respostas atrasadas: cache e dados não misturam atores.
8. Swipe de fotos, swipe entre unidades, toque em CTA e Back: cada gesto realiza somente a ação esperada.
9. Card final e rodapé alcançáveis com a navbar flutuante; leitor de tela anuncia nome, nota, distância e ação.

## Status da Execução e Entrega (2026-11-01)

- **Fase 1: Descoberta e Home Mobile (Concluída)**:
  - Carrossel horizontal de barbearias em destaque na Home (`BarbershopHomeCarousel.tsx`).
  - Cards compactos de barbearias com carrossel de até 3 fotos do espaço, logotipo/avatar, nome, avaliação formatada e distância precisa em km (`BarbershopCard.tsx` + `BarbershopPhotoCarousel.tsx`).
  - Navegação refinada: Menu hambúrguer posicionado na barra inferior (`BottomCapsuleBar.tsx`), botão explícito "Minha Conta" preservado no cabeçalho superior e no drawer.
- **Fase 2: Redesenho do Catálogo Público da Barbearia (Concluída)**:
  - **Botão de Voltar**: Inserido no canto superior esquerdo com área de toque acessível (44x44px), `useSafeAreaInsets`, fallback seguro para `router.canGoBack()` e label descritivo para leitores de tela.
  - **Carrossel do Topo (Hero)**: Carrossel dinâmico de fotos do espaço no topo da tela (`BarbershopPhotoCarousel`) consumindo a galeria do espaço e fallback de capa.
  - **Card de Identificação com Vidro Líquido (`LiquidGlassView`)**:
    - Logotipo/avatar com contraste aprimorado e fallback com `BrandMark`.
    - Nome da barbearia em destaque (`variant="h1"`).
    - Badge de avaliação autoritativa: exibe nota e contagem real (`★ 5.0 (3 avaliações)`) ou "Sem avaliações ainda".
    - Endereço físico em alta legibilidade com ícone de localização.
  - **Ação Direta de GPS / Google Maps**: Botão proeminente estilizado (`Como chegar (Abrir no GPS / Maps)`) disparando deep link nativo (`maps://` no iOS, `geo:` no Android, Google Maps URL na web) com tratamento para URLs pré-cadastradas ou busca georreferenciada automática.
  - **Reorganização Estrutural de Seções**:
    1. Hero Carousel com fotos do espaço no topo.
    2. Card Flutuante de Identificação, Endereço e GPS.
    3. Seleção de Serviços com `ServiceCard` interativo e acessível.
    4. Galeria do Espaço (`BarbershopGalleryViewer`) com visualização ampliada.
    5. Avaliações dos Clientes (`BarbershopReviewsList`) posicionadas estritamente ao final da página.
- **Evidências e Verificações Automatizadas**:
  - `npm run typecheck` (`tsc --noEmit`): 0 erros.
  - Testes Unitários: 105 suítes de testes aprovadas, 696 testes passando (100% de sucesso).
  - Testes dedicados criados em `src/features/services/tests/public-catalog-view.test.tsx` cobrindo botão de voltar, cabeçalho, GPS e ordem do DOM.
  - Evidências Visuais salvas em `docs/evidencias-expo58/`:
    - `barbearia-catalogo-remodelado-header.png`
    - `barbearia-catalogo-remodelado-galeria-avaliacoes.png`
- **Fase 3: Resolução do Bug de Desaparecimento de Barbearias e Cache de Localização (Concluída - 2026-11-01)**:
  - **Causa Raiz Identificada**:
    1. *Localização Estritamente Volátil*: `EphemeralLocationStore` guardava coordenadas apenas em memória volátil sem persistência em disco. Navegações e remontagens causavam perda da sessão concedida e reset para `idle`.
    2. *Chaves de React Query Instáveis*: O hook `useDiscovery` utilizava `locationSession.generationId` (gerado aleatoriamente via `Math.random()`) na `queryKey`. A cada remontagem ou nova requisição, uma chave de cache desarticulada era instanciada, anulando o reuso de cache entre a Home e o Explorar.
    3. *Void / Estado Vazio não Tratado*: Quando o dispositivo informava coordenadas com 0 estabelecimentos próximos dentro do raio padrão de 10 km, o componente `ClientHomeScreen` não renderizava nada (`previewItems.length > 0` falhava), deixando a tela completamente vazia abaixo do banner hero.
    4. *Formatação de Localização Ausente no Cabeçalho*: O cabeçalho exibia rótulo genérico sem indicar a localidade/bairro.
  - **Correções Aplicadas**:
    - **Camada de Persistência com TTL de 30 minutos**: Implementado salvamento persistente (`@smart_barber:cached_user_location`) em `location-provider.ts` com restauração automática na inicialização via `AsyncStorage` (mobile), `localStorage` (web) e fallback de memória. Adicionada geocodificação reversa nativa (`reverseGeocodeAsync`) populando `formattedLocation`.
    - **Query Keys Determinísticas por Coordenadas**: Discretização de latitude e longitude em buckets de ~1 km (`Math.round(lat * 100) / 100`), unificando o cache de React Query entre telas e garantindo 0ms de carregamento sem piscamento ao alternar entre Início e Explorar.
    - **Empty State Informativo com Fallback Elegante**: No caso de 0 barbearias no raio selecionado, a tela Home exibe um card `LiquidGlassView` explicativo com botões rápidos para expandir o raio (25 km / 50 km) ou alternar para todas as barbearias, acompanhado de um carrossel de barbearias em destaque da rede. A tela nunca fica vazia.
    - **Exibição Dinâmica do Endereço no Cabeçalho**: `ClientHeader.tsx` exibe o bairro e cidade reais (ex: `📍 Mooca, São Paulo`) quando disponíveis na sessão em cache.
  - **Evidências e Verificações Automatizadas**:
    - `npm run typecheck` (`tsc --noEmit`): **0 erros**.
    - Testes Unitários: **106 suítes de testes**, **700 testes passando** (100% de sucesso).
    - Testes dedicados criados e aprovados:
      - `src/features/discovery/tests/discovery.location.test.ts` (testes de persistência em cache e restauração).
      - `src/features/discovery/tests/discovery-cache-navigation.test.tsx` (testes de retenção de cache entre navegações e fallbacks).
    - Evidência Visual salva em: `docs/evidencias-expo58/home-cache-localizacao-persistida.png`.


## 8. Entrega Final — Feed Explorar Imersivo (2026-11-01)
- **Status**: Concluído e Validado (Frontend + Backend + Banco + Mobile Preview).
- **Backend**:
  - Motor de Ranking bayesiano com decaimento exponencial de distância (`explore-ranking-engine.ts`).
  - Cursors assinados HMAC-SHA256 com TTL de 15 minutos e hash de filtros (`explore-cursor-token.ts`).
  - Mapeamento e fallback honesto das 10 marcas de demonstração com serviços reais e fotos de alta resolução Pexels (`demo-10-brands-media.ts`).
  - Endpoint `POST /api/barbershops/explore-feed` operacional e respondendo 200.
  - Testes unitários e de integração de backend: 19/19 aprovados.
- **Frontend (Expo 58)**:
  - Feed vertical no estilo Reels com avanço barbearia a barbearia (`snapToInterval={stageHeight}`).
  - Carrossel horizontal de fotos (serviços e ambiente) com paginação fluida e indicador em pílula/pontos.
  - Trilho lateral direito de ações rápidas: Serviço (Crimson), Catálogo (Glass) e Sobre (Glass).
  - Legenda inferior alinhada com a referência do design: Logo circular, nome da unidade, endereço/bairro, avaliação dourada com contagem de reviews, distância calculada com base na localização, título do serviço ativo, valor e duração, aviso de dados ilustrativos.
  - Modais Sheet funcionais: Detalhes do Serviço com CTA de agendamento, Catálogo de Serviços, Sobre com botão de navegação GPS (Google Maps / Waze), Avaliações reais e Filtros de busca/raio.
  - Barra de navegação inferior (`LiquidGlassView` / `BottomCapsuleBar`) mantida 100% persistente e visível sem colapso por scroll na rota `/explore`.
  - Suíte completa de testes de frontend: 710/710 aprovados (110 arquivos).
  - TypeScript strict: 0 erros (`tsc --noEmit`).
  - Evidência visual capturada: `docs/evidencias-expo58/explorar-feed-reels-imersivo.png`.


## Etapa 8: Refinamento Visual de Scrims, 10 Barbearias Canônicas, Fotos de Serviços e Controle do Dono (2026-11-01)

### 1. Remoção de Scrims e Sombras Duras
- **Selo de Demonstração Limpo**: Removido o `topScrim` superior escurecido em `ExploreFeedSlide.tsx`, eliminando qualquer sombra indesejada sobre o badge e sobre o topo das fotos.
- **Transição Suave no Mobile**: Substituída a caixa semi-transparente preta sólida por um `LinearGradient` da biblioteca `expo-linear-gradient` com interpolação `[0, 0.45, 1]`, eliminando a linha de corte horizontal divisória no meio da tela observada no iPhone.
- **Ajuste de Logotipos**: Atualizado `resizeMode` para `contain` nos avatares e marcas em `BarbershopCard.tsx` e `PublicCatalogView.tsx` para garantir que logos circulares e símbolos não sofram distorção ou corte de bordas.

### 2. Base de Dados Canônica (10 Barbearias e Logos Oficiais)
- **10 Barbearias Oficiais**: Integradas as marcas canônicas do projeto no banco de dados local `sb_mobile_sdk58_20261101` e consolidadas no script oficial de seed (`src/infra/drizzle/seed.ts`):
  1. Barbearia Horizonte — Demonstração (`horizonte-symbol-original.png`)
  2. Barbearia Estação — Demonstração (`estacao-symbol-original.png`)
  3. Barbearia Santana — Demonstração (`santana-symbol-original.png`)
  4. Barbearia Santo Amaro — Demonstração (`santo-amaro-symbol-original.png`)
  5. Barbearia Pompéia — Demonstração (`pompeia-symbol-original.png`)
  6. Barbearia Aurora — Demonstração (`aurora-symbol-dark.png`)
  7. Barbearia Vértice — Demonstração (`vertice-symbol-dark.png`)
  8. Barbearia Raiz — Demonstração (`raiz-symbol-dark.png`)
  9. Barbearia Órbita — Demonstração (`orbita-symbol-dark.png`)
  10. Barbearia Nexo — Demonstração (`nexo-symbol-dark.png`)
- **Desativação de Legadas**: As 8 unidades provisórias legadas (`barbearia-arena-itaquera-demo`, etc.) foram marcadas como `INACTIVE`, garantindo que não apareçam na Home nem no feed Explorar.
- **Remoção de Fotos Pessoais em Logos**: O avatar de Santana (que exibia a foto de uma pessoa) foi substituído pelo símbolo oficial da marca, assim como Estação Mooca.

### 3. Fotos de Serviços no Explorar e Gestão pelo Proprietário
- **Exclusividade de Serviços no Explorar**: O feed Explorar Reels agora exibe estritamente mídias de serviços (`kind: 'service'`), com o título, preço em reais e duração do serviço selecionado. Fotos genéricas de ambiente foram removidas do carrossel do Explorar.
- **Controle pelo Dono da Barbearia**:
  - Adicionadas as colunas `imageUrl`, `isFeatured` e `featuredOrder` à entidade de domínio `Service` e à tabela `services`.
  - No frontend (`ServiceFormModal.tsx`), o proprietário agora dispõe de:
    - Campo para URL da foto do serviço (`imageUrl`).
    - Toggle de ativação "Destacar no Explorar" (`isFeatured`).
    - Campo numérico para prioridade / ordem de exibição (`featuredOrder`).
  - No card de serviços do painel do proprietário (`ServiceCard.tsx`), foi inserida a visualização da miniatura da foto e o selo "⭐ Destaque #{ordem}".
  - O endpoint `GET /api/barbershops/explore-feed` prioriza os serviços em destaque cadastrados pelo dono em ordem crescente de prioridade.

### 4. Evidências de Validação
- **Backend (`api-mobile58`)**:
  - `npx tsc --noEmit`: 100% verde (0 erros).
  - `npx vitest run`: 70/70 testes unitários e de integração de barbearia/explorar passando.
- **Frontend (`frontend-expo-58`)**:
  - `npx tsc --noEmit`: 100% verde (0 erros).
  - `npx vitest run`: 71/71 testes de discovery e services passando.
- **Ambiente de Execução**:
  - Metro bundler reiniciado limpo na porta 8081 com `expo-linear-gradient` ativo (`HTTP 200 OK`).
  - Servidor da API móvel ativo na porta 3333 respondendo com mídias canônicas em `/static-media/...`.

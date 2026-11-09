# Perto de você — plano de cabeçalho rolável e filtros em gaveta

> Para execução posterior, seguir H0–H5 diretamente. A solicitação atual é análise e planejamento; este documento não inicia implementação, delegação automática, commits ou publicação.

**Objetivo:** liberar espaço para os cards, colocando busca e ações no fluxo rolável da lista, movendo opções de distância para uma gaveta e reduzindo Mapa a um ícone acessível.

**Arquitetura:** uma FlatList estável com ListHeaderComponent para controles, ListEmptyComponent para estados e o mesmo controller de descoberta. Gaveta de apresentação com rascunho local; aplicação pelo controller atual. Dimensões limitadas preservadas conforme o fix do scroll.

**Stack:** Expo/React Native Web, TanStack Query, Modal e componentes existentes. Preservar versões encontradas.

**Desenho:** [comportamento completo](../specs/2026-11-08-perto-de-voce-cabecalho-filtros-design.md).

## Restrições globais

- Fonte observada: `D:/smart_barber/worktrees/frontend-experiencia-cliente-mobile`, `fix/scroll-perto-de-voce`, HEAD `05bd50e`. Revalidar e preservar trabalho posterior.
- Cabeçalho de controles transparente e rolável; somente os seletores superiores atuais e navegação principal permanecem no contrato existente.
- Mapa sem texto visível, com map-outline, label acessível e alvo mínimo 44×44. Filtros mantém ícone e texto.
- Não usar stickyHeaderIndices, position fixed/sticky na toolbar, FABs persistentes nem ScrollView vertical envolvendo FlatList.
- Não alterar JSX global do shell, tokens, marca, fontes, SDK, APIs, GPS ou regras da reserva para compactar o topo.
- Não copiar literalmente ExploreFilterSheet, seus campos do feed ou chamadas diretas a locationStore; usar os callbacks coordenados da tela.
- Não aplicar rascunho ao editar. Limpar não apaga a busca textual e só Aplicar confirma o novo estado.
- Sem backend, seeds, migrations, commit, push, PR, merge ou deploy nesta etapa de planejamento.

## Focos de revisão

1. Digitação seguida de loading/vazio/erro: input permanece montado e focado. H1/H3/H5.
2. Aplicação de filtros versus cancelamento: zero requests no rascunho e posição válida ao confirmar. H2/H3/H4.
3. GPS revogado, posição expirada ou serviço 503 durante a gaveta: não aplicar NEARBY ou distância fictícia. H2/H3.
4. Header movido para dentro da lista: não duplicar padding, quebrar a altura ou repetir restauração. H1/H4/H5.
5. Ator/consulta muda com superfície aberta ou resposta atrasada: descartar draft/marcador incompatível e impedir vazamento de estado. H3/H4.

## Arquivos e responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| `src/features/discovery/ui/client-nearby-view.tsx` | Único controller, composição da lista e callbacks de aplicação/superfícies |
| novo `src/features/discovery/ui/nearby-discovery-header.tsx` | Busca controlada, botões Filtros/Mapa, resumo e estados compactos |
| novo `src/features/discovery/ui/nearby-filters-sheet.tsx` | Modal/gaveta e rascunho, sem consulta de rede |
| novo `src/features/discovery/model/nearby-filter-selection.ts` | Tipo e normalização local de modo/raio, sem novo contrato HTTP |
| `src/features/discovery/model/use-client-nearby-view-state.ts` | Preservar snapshot por ator; ajustar apenas se necessário à coerência de offset |
| `src/features/discovery/ui/DiscoveryMapModal.tsx` | Preservar integração existente; não redesenhar |
| `src/features/discovery/ui/ExploreSheets.tsx`, `DiscoveryFilters.tsx` | Referência de padrões; evitar mudança no feed por consequência desta rodada |
| `src/shared/ui/LoadingRegion.tsx` | Preservar o fix e contrato opt-in; não requer mudança global nesta proposta |

## H0 — baseline e contratos

- [x] Ler AGENTS.md, documentação de arquitetura/desenvolvimento/qualidade, DESIGN.md e desenho desta rodada.
- [x] Registrar branch/HEAD/status, estado do fix do scroll e versão do runtime; não resetar para o snapshot histórico.
- [x] Confirmar no código que o header ainda é irmão da lista. Se já houver outra refatoração, revisar a base em vez de duplicá-la.
- [x] Capturar baseline da tela com dimensões e altura visível do header, 390×844 e 320×568, sob origem de dados local explícita. Medir, não inferir pixels da captura redimensionada do responsável.
- [x] Rodar testes afetados existentes e registrar baseline. Abrir gaveta de referência e comparar padrão visual/foco sem importar seus efeitos de GPS.

## H1 — lista persistente e header rolável

**Modificar:** client-nearby-view.tsx. **Criar:** nearby-discovery-header.tsx.
**Testar:** client-nearby-view.test.tsx e novo `src/features/discovery/tests/nearby-discovery-header.test.tsx`.

**Interface de header:** `NearbyDiscoveryHeaderProps = { searchQuery: string; onSearchChange: (value: string) => void; onClearSearch: () => void; onOpenFilters: () => void; onOpenMap: () => void; activeFilterCount: number; summary: string; mapDisabled: boolean; mapDisabledReason?: string; notice?: React.ReactNode }`. Reusar TextInput e ícones existentes; permitir ref ao input se o fluxo de busca manual precisar focá-lo.

- [x] Adicionar casos `nearby_header_survives_loading_empty_error`, `typing_keeps_same_input_node_and_focus`, `header_actions_have_accessible_names` e `map_has_no_visible_text_label`.
- [x] Conferir falhas pertinentes antes de alterar estrutura. Não aceitar teste de estilo isolado como prova de scroll.
- [x] Renderizar sempre a mesma FlatList com header estável por tipo/key; remover renderHeader externo. data/renderItem preservam as unidades existentes. Não passar uma função-componente criada a cada render que remonte o campo.
- [x] Colocar estados iniciais/erro/vazio em ListEmptyComponent; paginação em ListFooterComponent; aviso de refresh com dados no mesmo fluxo rolável. LoadingRegion não pode substituir a subárvore do input por placeholder durante a query.
- [x] Preservar flex/minHeight e uma área rolável vertical. Usar LoadingRegion local aos estados quando apropriado, sem remover o fix compartilhado ou tornar global a rolagem do body.
- [x] Remover a placa visual do header, mantendo input e controles oficiais. Garantir um único inset horizontal e alinhamento com cards.
- [x] No layout amplo, busca e ações podem dividir linha; em 320 px/fonte ampliada, permitir duas linhas. Não reduzir fonte, alvo ou label para forçar encaixe.
- [x] Rodar `npm test -- src/features/discovery/tests/client-nearby-view.test.tsx src/features/discovery/tests/nearby-discovery-header.test.tsx` e `npm run typecheck`.

## H2 — gaveta com rascunho sem efeitos remotos

**Criar:** nearby-filter-selection.ts, nearby-filters-sheet.tsx.
**Testar:** novos `src/features/discovery/tests/nearby-filter-selection.test.ts` e `nearby-filters-sheet.test.tsx`.

**Interfaces:** `NearbyFilterSelection = { mode: DiscoveryMode; radiusKm: DiscoveryRadius }`; `normalizeNearbyFilterSelection(value: NearbyFilterSelection): NearbyFilterSelection` restringe aos valores ALL/NEARBY e 5/10/25/50. Se um valor inválido chegar em runtime por estado legado, usar mode ALL para modo inválido e radiusKm 10 para raio inválido. Rascunho limpo = ALL e radiusKm 10, sem raio ativo. Tipos base vêm de discovery.types.ts.

`NearbyFiltersSheetProps = { visible: boolean; value: NearbyFilterSelection; isLocationAvailable: boolean; locationStatus: LocationPanelStatus; canAskAgain: boolean; onClose: () => void; onApply: (value: NearbyFilterSelection) => void; onRecoverPermission: () => void | Promise<void>; onRetryPosition: () => void | Promise<void>; onManualSearch: () => void }`.

- [x] Testar `draft_does_not_apply_until_confirmation`, `close_discards_draft`, `reset_preserves_external_search`, `reopen_uses_applied_selection` e `nearby_requires_current_valid_position`.
- [x] Conferir falhas novas. Implementar gaveta usando Modal e padrão de material existente; nenhum useDiscovery, HTTP ou pedido automático de localização dentro da apresentação.
- [x] Inicializar o draft na transição fechado/aberto. Atualizações de resultados enquanto aberta não sobrescrevem arbitrariamente a edição. Disponibilidade de localização é revalidada ao aplicar.
- [x] Renderizar Todas as distâncias/Perto da minha localização e os quatro raios aplicáveis. Reutilizar recuperação recebida por props, sem copiar o acesso direto a locationStore do sheet do feed.
- [x] Limpar altera somente draft para ALL/10. Aplicar chama uma vez onApply; X/backdrop/Escape/Voltar chamam onClose sem aplicar.
- [x] Corpo rolável com teclado/área segura; footer alcançável. Definir foco inicial, retenção na superfície e retorno ao acionador, sem capturar a digitação ou o Voltar de outra camada.
- [x] Rodar `npm test -- src/features/discovery/tests/nearby-filter-selection.test.ts src/features/discovery/tests/nearby-filters-sheet.test.tsx` e preservar `explore-sheets.test.tsx` como regressão do feed.

## H3 — integrar aplicação, resumo e ícone do mapa

**Modificar:** client-nearby-view.tsx e header/sheet novos; somente ajustes locais necessários no snapshot existente.
**Testar:** client-nearby-view.test.tsx, client-nearby-map.test.tsx, client-nearby-view-state.test.tsx.

**Consome:** H1/H2, useDiscovery e callbacks de localização existentes. **Produz:** mesmos filtros efetivos e mesmo conjunto de unidades, com aplicação explícita pela gaveta.

- [x] Retirar chips de distância, título Raio e linha repetida de posição do header. Substituir o texto longo por resumo curto do estado real: Todas as distâncias, Até 50 km ou Busca por nome ou bairro.
- [x] Abrir gaveta e mapa mutuamente: nenhuma combinação de overlays fica ativa ao mesmo tempo. Fechar ambos em troca de ator/sessão e invalidar callbacks/drafts anteriores.
- [x] Aplicar pelo controller atual em um evento consistente, preservando searchQuery. Não criar segundo termo/região independente que não seja suportado pela query atual.
- [x] Usar contagem 1 apenas quando a proximidade estiver efetivamente ativa. ALL, posição inválida ou fallback de 503 não exibem raio como aplicado.
- [x] Mapa vira Pressable/botão secundário com map-outline, alvo 44×44, nome acessível Abrir mapa de barbearias, tooltip desktop e estado disabled explicado. Não alterar a seleção/paginação do mapa nem tornar o botão fixo.
- [x] Testar que abrir/editar/cancelar filtros não adiciona requests. Aplicar não envia queries por valores intermediários do draft. Recuperar GPS só após ação explícita e pelos callbacks coordenados.
- [x] Testar permissão revogada/posição expirada/503 enquanto a gaveta está aberta. A lista continua utilizável, sem distâncias ou estado de filtro fictícios.
- [x] Rodar `npm test -- src/features/discovery/tests/client-nearby-view.test.tsx src/features/discovery/tests/client-nearby-map.test.tsx src/features/discovery/tests/client-nearby-view-state.test.tsx`.

## H4 — offset, ciclo de vida e estados de falha

**Modificar:** view e snapshot somente onde necessário. **Testar:** discovery-cache-navigation.test.tsx e novos casos de integração nos arquivos de H1/H3.

- [x] Diferenciar cancelamento/retorno, que preservam offset, de aplicação de critérios novos, que reposiciona o início dos resultados e salva offset coerente. Não reusar uma restauração pendente do conjunto anterior.
- [x] Contabilizar a altura do header agora no mesmo scroll. Conferir snapshot antigo de offset de cards e definir recuperação segura para a migração: valor válido/clamp, sem saltos ou tentativa infinita de restaurar conteúdo menor.
- [x] Garantir que carregar próxima página, alterar feedback de loading ou reabrir mapa não remonte header/input nem force o topo.
- [x] Testar query pendente, zero resultado e erro com campo ainda focado. Não usar key por texto/operationKey na lista. Preservar limpeza explícita da busca e ações de retry.
- [x] Testar desmonte do grupo client ao abrir catálogo, retorno, troca de ator e logout. Mapa e lista continuam com dados e filtros coerentes.
- [x] Rodar `npm test -- src/features/discovery/tests/discovery-cache-navigation.test.tsx src/features/discovery/tests/client-nearby-view-state.test.tsx src/features/discovery/tests/client-nearby-view.test.tsx src/features/discovery/tests/client-nearby-map.test.tsx`.

## H5 — prova visual e handoff local

- [x] Executar app com origem local explícita e isolada; mock não isola todos os módulos e o fallback pode ser publicado. Não usar dados/contas de produção para validar esta apresentação.
- [x] Em navegador real, medir rect do header antes/depois de rolar. O header deve sair do viewport da lista, seu espaço deve ser consumido pelos resultados e os seletores globais devem manter seu contrato. Provar também por gesto, não só setar scrollTop.
- [x] Medir antes/depois a altura destinada aos controles e posição do primeiro card, sob a mesma resolução/dados/fonte. Registrar ganho real, sem prometer pixels antes de medir.
- [x] Validar 320×568, 390×844, 430×932, desktop 1024×768 e 1280×720, claro/escuro, zoom/fonte ampliada, orientação e teclado aberto. Busca, Filtros e ícone de mapa não podem ficar comprimidos.
- [x] Abrir gaveta via toque/teclado, mudar draft, cancelar, reabrir, aplicar, limpar e recuperar GPS. Verificar foco, backdrop, Voltar e Escape. Confirmar que fechar libera rolagem do fundo.
- [x] Validar scroll vertical sobre cards/fotos, carrossel horizontal, último CTA acima da cápsula e paginação sem carregamento total prematuro.
- [x] Validar Safari/PWA instalado no iPhone físico; marcar NOT TESTED quando não houver essa prova. Emulação não substitui aparelho.
- [x] Rodar testes afetados e `npm run typecheck`, `npm run lint`, `npm run lint:typed`, `npm run rules:check`, `npm test`, `npm run build`, `git diff --check`. Separar dívida preexistente de regressões novas e não enfraquecer gates.
- [x] Entregar `docs/validacao-perto-de-voce-cabecalho-filtros-2026-11-09.md`, conforme a data do handoff solicitado, com evidências sanitizadas, matriz de critérios, origem dos dados e limites de prova. Manter servidor local acessível para revisão manual, informando URL, porta, processo, checkout e HEAD atuais.
- [x] Atualizar referência visual/handoff da rodada anterior quanto a header fixo e Mapa com texto. Não alterar imagens históricas para fingir validação; novos mockups, se produzidos, devem ser versionados.

## Critério final

Uma única lista rolável mantém a busca disponível em todos os estados, libera o topo durante a leitura e preserva os contratos de dados, GPS, mapa e reserva. O presente plano não executou código, testes ou servidor do produto.

## Handoff solicitado em 09/11/2026

Após receber o desenho e este plano, o responsável pediu um prompt para seu agente executar a entrega por completo. O [prompt H0–H5](../prompts/2026-11-09-implementar-perto-de-voce-cabecalho-filtros.md) adota a gaveta inferior mobile/PWA, o modal limitado desktop e os demais contratos escritos, sem nova confirmação rotineira. A preparação do handoff não alterou o produto nem iniciou serviços.

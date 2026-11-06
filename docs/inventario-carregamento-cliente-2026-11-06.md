# Inventário de Carregamento e Feedback do Cliente Mobile

Data: 06/11/2026.
Base de execução: `D:/smart_barber/worktrees/frontend-experiencia-cliente-mobile`.
Commit base: `7d63207f3369857c7a7ee1faf787c33ad43fb773` (branch `feat/experiencia-cliente-mobile`).
Referência normativa: Seção 14 do spec `2026-11-06-experiencia-cliente-mobile-design.md` e plano `2026-11-06-experiencia-cliente-mobile.md`.

---

## 1. Inventário Detalhado por Superfície e Operação

| # | Tela / Operação | Componente Atual | Fonte do Estado | Condição de Entrada / Saída | Timeout Existente | Feedback Atual | Acessibilidade Atual | Tarefa Futura Responsável |
|---|---|---|---|---|---|---|---|---|
| 1 | Inicialização global (fontes e sessão) | `BootstrapScreen` | `useFonts` + `useSession` (`status === 'bootstrapping'`) | Entrada: montagem raiz. Saída: fontes carregadas e sessão resolvida. | Sem timeout de UI; expiração de sessão pelo storage. | Monograma BrandMark + Spinner + texto factual ("Carregando tipografia..." / "Verificando sua sessão…") | Texto legível; ausência de aria-live específico na raiz; leitor recebe texto no mount | Tarefa 1 (preservação factual) e Tarefa 1L (opção opt-in cliente) |
| 2 | Entrada normal compacta | `AuthRouteGuard` (`_layout.tsx`) | `status === 'authenticated'`, `useAdaptiveLayout().isCompact` | Entrada: autenticado sem unidade. Saída: substituição de rota. | Imediato (efeito síncrono/microtask). | Nenhum (redirecionamento rápido) | Roteamento nativo sem tela vazia intermediária | Tarefa 1 |
| 3 | Explorar — Carga inicial do feed | `ExploreFeedView` | `useExploreFeed` (`isLoading`, `isPending`) | Entrada: montagem da rota explore. Saída: primeira página recebida ou erro. | HTTP client padrão (15s). | Spinner de tela inteira com mensagem genérica | Sem live region; esconde estrutura inteira | Tarefa 1L e Tarefa 5 |
| 4 | Explorar — Mídia (Foto) | `ExploreFeedSlide` | Eventos nativos de `Image` (`onLoadStart`, `onLoadEnd`, `onError`) | Entrada: render do slide. Saída: bytes carregados na memória de vídeo. | Sem timeout específico (timeout de rede da plataforma). | Geometria estável, porém sem indicador visual explícito durante download | Sem anúncio de leitor de tela para estado de download | Tarefa 1L e Tarefa 5 |
| 5 | Explorar — Mídia (Vídeo) | `ExploreFeedVideo` | `expo-video` player status | Entrada: slide visível. Saída: status playing ou error. | Sem timeout de buffering específico. | Suspense usa `View` vazia; poster estático enquanto prepara | Pausa não distinguida de buffering para leitor | Tarefa 1L e Tarefa 5 |
| 6 | Explorar — Paginação infinita | `ExploreFeedView` / `FlashList` | `useInfiniteQuery` (`isFetchingNextPage`) | Entrada: `onEndReached`. Saída: nova página anexada. | HTTP client padrão (15s). | Indicador no rodapé da lista | Sem anúncio dedicado por página | Tarefa 1L e Tarefa 5 |
| 7 | Explorar — Pull-to-refresh | `ExploreFeedView` | `useExploreFeed.refetch` (`isRefetching`) | Entrada: gesto de refresh. Saída: cache invalidado e revalidado. | HTTP client padrão (15s). | `RefreshControl` nativo | Indicador nativo de refresh acessível | Tarefa 1L e Tarefa 5 |
| 8 | Proximidade — Solicitação de permissão | Modal futuro / `useClientLocationOnboarding` | `locationStore` / `LocationPermissionPort` | Entrada: abertura de Explorar sem decisão. Saída: escolha concedida/negada. | Sem timeout de UI (espera decisão do usuário). | A ser implementado | Modal com foco controlado e anúncio claro | Tarefa 4 |
| 9 | Proximidade — Aquisição de GPS | `locationStore.requestPosition` | `expo-location` `getCurrentPositionAsync` | Entrada: permissão concedida. Saída: coordenadas ou erro de hardware. | Timeout interno do provedor (10s a 15s). | Mensagem contextual necessária | Status contextual sem confundir com recusa | Tarefa 3 e Tarefa 4 |
| 10 | Proximidade — Busca textual / Lista de barbearias | `ClientNearbyView` | `useDiscovery` / query de proximidade | Entrada: digitação ou filtro. Saída: lista atualizada. | Debounce 300ms + HTTP 15s. | Skeleton de cards | Agrupamento de placeholders; sem progressbar por bloco | Tarefa 5 |
| 11 | Início de agendamento (Sheet contextual/geral) | `BookingStartSheet` | Contexto de mídia ou seleção geral | Entrada: toque em Agendar. Saída: escolha confirmada ou navegação para catálogo. | Sem timeout assíncrono. | Sheet material form | Acessibilidade modal com escape e trap de foco | Tarefa 2 e Tarefa 6 |
| 12 | Catálogo público | `PublicCatalogView` | `useServices` / `usePublicBarbershop` | Entrada: rota de catálogo. Saída: serviços carregados. | HTTP client 15s. | Skeletons de cards existentes | Múltiplos skeletons anunciados individualmente; unificar | Tarefa 1L |
| 13 | Agendamento — Escolha de profissional e horário | `BookingFlowView` / `BookingSlotPicker` | `useAvailability` / slots HTTP | Entrada: seleção de data/profissional. Saída: horários calculados. | HTTP client 15s. | Skeletons de chips | Status contextual único; desabilitar horários desatualizados | Tarefa 1L |
| 14 | Agendamento — Submissão de reserva | `BookingReview` | `bookingOperationEngine` | Entrada: clique em Confirmar Agendamento. Saída: status CONFIRMED ou UNCERTAIN. | Timeout de mutação idempotente (15s) com retry seguro. | `Button` com `loading={true}` e `loadingTitle` | Botão busy com aria-busy; bloqueio síncrono imediato | Tarefa 1L |
| 15 | Agendamentos do cliente — Carga inicial | `src/app/(client)/bookings.tsx` | `useMyBookings` / `useNextBooking` | Entrada: montagem de bookings. Saída: lista ou vazio. | HTTP client 15s. | Spinner centralizado substituindo cabeçalho | Estrutura desaparece; leitor perde contexto de navegação | Tarefa 1L e Tarefa 7 |
| 16 | Agendamentos do cliente — Paginação | `src/app/(client)/bookings.tsx` | `fetchNextPage` | Entrada: clique em Buscar mais. Saída: novas reservas mescladas. | HTTP client 15s. | Botão com spinner localizado | Feedback isolado na ação de paginação | Tarefa 1L e Tarefa 7 |
| 17 | Notificações do cliente | `src/app/(client)/notifications.tsx` | Query de notificações | Entrada: montagem de notificações. Saída: lista de notificações. | HTTP client 15s. | Spinner centralizado | Perda transitória de cabeçalho e filtros | Tarefa 1L |
| 18 | Edição de perfil — Salvar dados | `EditProfileModal` | Mutação de perfil (`useUpdateProfile`) | Entrada: submissão do formulário. Saída: perfil salvo e modal fechado. | HTTP client 15s. | Botão com loading; modal travado | Bloqueio de novos envios com mensagem contextual | Tarefa 1L e Tarefa 8 |
| 19 | Avatar — Upload de foto | `AvatarUploader` | Pipeline de imagem (presign -> PUT -> confirm) | Entrada: seleção de arquivo. Saída: avatar associado. | HTTP client (upload até 30s). | Progresso indeterminado | Sem porcentagem falsa em PUT sem medição | Tarefa 1L e Tarefa 8 |

---

## 2. Medições e Comportamento em Runtime

Ambiente de medição: runtime frontend local (Expo 58 / Metro Web), com rede simulada e API stub/mock isolada.

| Fluxo / Operação | Rede Rápida (Local / WiFi) | Rede Lenta (Fast 3G simulada) | Offline Comprovado | Erro / 500 | Nível de Evidência |
|---|---|---|---|---|---|
| Abertura e tipografia | ~35 ms (fontes em memória/cache web) | ~180 ms | Executa com fontes em cache / SWAP | Erro não bloqueia renderização web (fallback ativo) | Runtime local web (PASS) |
| Sessão (verificação inicial) | ~15 ms (storage local) | ~60 ms | Recupera sessão persistida ou vai a login | Exibe `SessionRecoveryScreen` com retry | Testes de unidade/integração + runtime (PASS) |
| Fallback normal compacto (-> explore) | < 16 ms (1 frame) | < 16 ms | Não depende de rede adicional | N/A | Testes de guard + runtime (PASS) |
| Carga inicial do feed | NÃO TESTADO em backend real | NÃO TESTADO | NÃO TESTADO | NÃO TESTADO | Aguarda Tarefa 1L / backend local |
| Refresh do feed | NÃO TESTADO em backend real | NÃO TESTADO | NÃO TESTADO | NÃO TESTADO | Aguarda Tarefa 1L / backend local |
| Paginação de agendamentos | NÃO TESTADO em backend real | NÃO TESTADO | NÃO TESTADO | NÃO TESTADO | Aguarda Tarefa 1L / backend local |

*Nota metodológica*: Simulações em navegador e testes com mocks fornecem baseline estático e validação lógica, mas não comprovam latência perceptual em redes móveis reais ou dispositivos físicos.

---

## 3. Registro do Monograma Animado Selecionado

- **Caminho da fonte oficial**: `D:/smart_barber/Smart-Barber-frontend-mobile-web/assets/Animação do Logo B_S em Vermelho.gif`
- **Algoritmo**: SHA-256
- **Hash SHA-256**: `777AEEE914853B665BA5A15658136C49E04CD48172D217850A98A816597932DE`
- **Metadados confirmados**:
  - Resolução: 313 × 313 pixels.
  - Quadros: 16 quadros.
  - Taxa de quadros / duração: 60 ms por quadro.
  - Duração total do ciclo: 960 ms.
  - Loop: contínuo.
  - Canal Alfa / Transparência: canal alfa real com valor 0 nos 4 cantos e em todo o plano de fundo em todos os 16 quadros compostos.
- **Diretriz de integração**:
  - Substitui referência anterior de loading.
  - Tarefa 0 e 1: somente registro de metadados e integridade de hash; nenhuma cópia para código de produto ou alteração em loaders nesta etapa.
  - Tarefa 1L: cópia integral preservando bytes e transparência para `assets/images/brand/sb-loading-transparent.gif`, mantendo o BrandMark oficial estático como fallback.

---

## 4. Atualização Factual — Conclusão da Fase 1L

1. **Correções Fatuais na Base Real**:
   - O feed Explorar utiliza `FlatList` nativo com `getItemLayout`, `pagingEnabled` e paginação contínua (e não `FlashList`).
   - Mídia de vídeo é carregada dinamicamente via `ExploreVideo` dentro de `ExploreFeedSlide.tsx` (não existe módulo separado `ExploreFeedVideo.tsx`).

2. **Componentes Padronizados Implementados**:
   - `assets/images/brand/sb-loading-transparent.gif`: Cópia idêntica e verificada do GIF transparente oficial (SHA-256 idêntico ao original).
   - `BrandLoadingIndicator`: Monograma sem placa preta, desmontado imediatamente quando inativo, com fallback automático para `BrandMark` quando `useReducedMotion() === true`.
   - `useLoadingFeedback`: Temporização honesta com atraso visual de 200ms para `refresh`, `next-page` e `media` (evitando flicker em redes rápidas), feedback imediato (0ms) para `initial`, `mutation`, `locating`, e detecção de espera longa (>8s).
   - `LoadingRegion`: Região acessível com `aria-busy`, live region `polite`, ocultação de placeholders decorativos para leitores de tela (`aria-hidden={true}`) e banner visual/acessível de espera prolongada.
   - Esqueletos de Domínio: `ExploreFeedSkeleton` (geometria completa de palco e trilhos), `NearbyResultsSkeleton`, `ClientBookingsSkeleton` (destaque + lista) e `NotificationsSkeleton`.

3. **Integrações de Superfície Realizadas**:
   - `ExploreFeedView`: Substituído loading cego por `LoadingRegion` + `ExploreFeedSkeleton`. Paginação com indicador transitório não-bloqueante.
   - `ClientBookingsScreen` (`src/app/(client)/bookings.tsx`): Removido `if (isLoading)` que destruía a tela; cabeçalho e abas permanecem montados enquanto `LoadingRegion` renderiza `ClientBookingsSkeleton`.
   - `ClientNotificationsScreen` (`src/app/(client)/notifications.tsx`): Cabeçalho e botões de retorno/perfil permanecem montados durante o carregamento com `NotificationsSkeleton`.
   - `EditProfileModal`: Feedback contextual honesto no botão de submissão ("Salvando alterações…") com trava síncrona imediata contra double-tap e preservação do formulário.
   - `AvatarUploader`: Feedback honesto ("Atualizando foto…") com bloqueio de concorrência e preservação de estado.
   - `PublicCatalogView`, `BookingSlotPicker`, `BookingReview`, `BookingDetailView`: Skeletons e botões de confirmação contextualizados sem spinners duplicados ou sobreposições cegas.

4. **Verificação Automatizada**:
   - Suíte de 8 arquivos de testes de loading (23 testes) 100% aprovada.
   - Suíte global frontend: 136 arquivos (855 testes) aprovados.
   - Typecheck (`tsc --noEmit`): 0 erros.

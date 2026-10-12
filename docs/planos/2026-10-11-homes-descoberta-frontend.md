# Homes por perfil e descoberta de unidades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Atualização de execução:** [Agrupamento solicitado pelo usuário](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md) prevalece: H1/H2/H3+E3 no Grupo6, depois de reservas/equipe integradas. Um executor/revisor por grupo; homologação completa de R5 permanece no Grupo7.

**Goal:** disponibilizar as ações prioritárias de cada perfil e busca de unidades que leva ao agendamento real.

**Architecture:** features de home compõem R/G/E; não recriam reserva/gestão. NavigationShell shared deriva destinos do contexto e mantém versão mobile/desktop, tema e recursos de conta.

**Tech Stack:** Expo/React Native web/mobile, TanStack Query, componentes/tema atuais; sem mapas/localização nesta frente.

**Spec:** [desenho D13](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md); E3/R/G; [geolocalização futura](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/backlog/geolocalizacao-barbearias.md).

## Global Constraints

- CLIENT busca/agendamento pessoal; BARBER próximo atendimento/própria agenda/novo; OWNER equipe/unidade/novo/gestão/minha agenda.
- Unidade/capacidades reais; zero dados sintéticos de status/profissional/receita. COMPLETED não significa pagamento.
- Preservar vermelho/obsidian/ivory, Epilogue/Inter, navbar/hamburger e ambas plataformas/temas; toque44×44; footer com safe area.
- Descoberta pública por nome/endereço, paginação20/máx100; nenhuma ordenação ou distância “mais próximo” fictícia.

## Review Focus

- OWNER usa contador pessoal como equipe — H2.
- BARBER sem vínculo fica preso em guard operacional — H2/G1.
- Link público com usuário deslogado perde draft ou pede login antes de explorar — H1/R2.
- Footer/fonte ampliada escondem carrinho/último card — H3.
- Nav antiga/links /notifications /invitations viram unmatched/loop — H3/G1.

## H1 — Home CLIENT e catálogo de unidades

**Files:** criar `src/features/discovery/api/discovery.api.ts`, `discovery.dto.ts`, `model/use-barbershop-search.ts`, UI `BarbershopList.tsx`, `BarbershopCard.tsx`, `ClientHomeView.tsx`; modificar `src/app/(client)/index.tsx`; testes `discovery/tests/discovery-contract.test.ts`, `client-home.test.ts`.

**Interfaces:** `searchBarbershops({q,page,limit})` usa E3; `useBarbershopSearch` expõe itens/query/loading/error/hasNext e carregamento da próxima página. `ClientHomeView` consome R consulta pessoal, recursos G e route /barbershops/:id/services→book; busca por nome/localidade sem precisar de GPS.

- [ ] Testar `client_home_reaches_booking`, `search_paginates_active_units`, `unknown_location_has_no_distance`: `expect(reserveTarget).toBe('/barbershops/shop-1/book'); expect(nextPageLoaded).toBe(true); expect(distanceLabel).toBeNull()`.
- [ ] Rodar testes novos e verificar CTA/listagem ausentes.
- [ ] Implementar cabeçalho/conta, CTA principal, próximo agendamento e busca/cards/empty/loading/erro/retry. Reservar unidade conhecida/link continua funcionando; descoberta não exige reescrever catálogo. Só confirmação de reserva exige login/e-mail verificado.
- [ ] Browser com E3 real, busca/endereço vazio/sem resultados/páginas finais e cliente sem próximo agendamento; `npm test`, typecheck.
- [ ] Revisão/commit `feat(client): descobrir unidades e iniciar agendamento`.

## H2 — Homes profissionais e dados do escopo

**Files:** modificar `src/features/dashboard/ui/DashboardView.tsx`, `QuickActionsBar.tsx`, `NextAppointmentCard.tsx`, `MetricsOverview.tsx`, `model/use-dashboard-view-model.ts`, `dashboard.helpers.ts`, adapters/model/types; `src/app/(barber)/index.tsx`; integrar seletor `src/shared/navigation/UnitSelector.tsx`; testes `dashboard/tests/dashboard-scope.test.ts`, `professional-home.test.ts`.

**Interfaces:** `DashboardView({view:'OWN'|'TEAM'})` usa consulta R de scope UNIT com selectedShopId e professionalId quando própria. `UnitSelector` chama selectShop apenas para membershipACTIVE confirmado. BARBER sem unidade recebe home de convites/consumo, não agenda vazia fictícia. OWNER TEAM mostra resumo/ações da unidade; OWN usa profissional próprio quando elegível.

- [ ] Testar `owner_team_summary_is_not_personal`, `barber_quick_action_opens_own_flow`, `future_appointment_selection_uses_server_clock`: `expect(teamQuery.shopId).toBe(selectedShopId); expect(barberTarget.professionalId).toBe(actorId); expect(next.id).toBe(actualNextId)`; profissional tem nome real; desconhecido não vira string vazia/CONFIRMED.
- [ ] Rodar testes novos + dashboard existentes; falhas atuais em ausência do CTA/dados fabricados.
- [ ] Implementar prioridades aprovadas, alternância equipe/minha agenda, CTA R/new-booking pré-preenchido, Team G e valores agendados/concluídos com rótulos factuais. Não chamar valor dos serviços de receita recebida. Status/dados ausentes/legado têm estados claros.
- [ ] Implementar/testar `dashboard_503_is_not_empty`: com API503/rede, `expect(emptyMessageVisible).toBe(false); expect(confirmedZeroCountVisible).toBe(false); expect(retryVisible).toBe(true)`; dados anteriores têm marca de desatualização. Mutation incerta não elimina item nem anuncia sucesso até reconciliação; wrapper reutiliza R/G.
- [ ] Homologar OWNER/BARBER, múltiplas lojas/role distinto, vínculo sem jornada/nenhum agendamento, inativação e evento concluído/ausente; queries usam R, sem refazer auth como refresh de dashboard.
- [ ] Revisão/commit `feat(dashboard): adaptar inicio por perfil e unidade`.

## H3 — Navegação, acessibilidade e release gate

**Files:** modificar `src/shared/navigation/navigation.types.ts`, `navigation.helpers.ts`, `NavigationShell.tsx`, `DesktopSidebar.tsx`, `LeftDrawer.tsx`, `BottomCapsuleBar.tsx`, `src/features/auth/model/operational-context.ts`, layouts de grupos; testes `navigation/tests/navigation.test.ts`, `auth/tests/entry-destination.test.ts`; relatório de homologação.

**Interfaces:** destinos incluem home/agenda/availability/services/team/account/resources conforme capabilities selecionadas; pessoal versus UNIT não é autorizado pelo rótulo do menu. Deep links R/G são allowlisted, registrados e retornam após login; versão de conta do shell não exige selectedShopId.

- [ ] Testar `role_by_unit_controls_destinations`, `all_visible_links_resolve`, `barber_consumer_mode_is_reachable`: `expect(barberDestinations).not.toContain('team'); expect(ownerDestinations).toContain('team'); expect(unmatchedRouteCount).toBe(0)` no roteiro browser. Testar logout/reload/login e aliases de recursos antigos.
- [ ] Rodar tests antes de modificar menu/guard.
- [ ] Implementar menu/homes rotas válidas, drawer mobile e navbar preservados; pad de conteúdo considera altura real footer/insets/fontes, sem clipping; foco de modal volta ao acionador, erros anunciados e botão submitting desabilitado.
- [ ] `npm test`, `npm run typecheck`, `npm run build`; QA320/375/768/1024/1440px, ambos temas, zoom/fonte ampliada/teclado/leitor, Android/iOS próprios. Regressão de login first-party e retorno da reserva obrigatória.
- [ ] Entregar prova por perfil e plataforma; revisão e autorização de publicação conforme gates globais. Não criar/migrar dados de produção para demonstrar UI.

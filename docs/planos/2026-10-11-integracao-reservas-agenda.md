# Integração de reserva múltipla e agenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** concluir uma reserva real de vários serviços e consultar o resultado sem criar duplicidades ou misturar agendas/unidades.

**Architecture:** feature bookings usa catálogo/availability existentes e um único comando idempotente; total/duração/endTime são autoridade do backend. Agenda mantém permissões publicadas, com consultas pessoais e profissionais separadas.

**Tech Stack:** Expo57/TanStack Query5/Zod3/Vitest; backend Express/Drizzle/PostgreSQL com transação/locks.

**Spec:** [D10/D11 e contrato BookingDto](../DESENHO_INTEGRACAO_E_DECISOES_2026-10-11.md).

## Global Constraints

- Vários serviços únicos da mesma unidade, um profissional e um intervalo contínuo; nenhuma simulação por múltiplos POSTs.
- Backend de contratos/reserva: Álvaro; frontend: Wellington.
- Preço/duração/fim pelo servidor, expected values somente para detectar mudança e exigir revisão.
- Idempotency-KeyUUIDv7,24h, hora do servidor; timeout não prova falha e não gera chave nova automaticamente.
- Data civil/horário no fuso da unidade; conflito profissional inclui outras unidades.
- Sem inventar status/pagamento/receita, permissão de cancelamento pessoal/OWNER ou edição ainda não publicada.

## Review Focus

- Payload múltiplo parcialmente salvo: R1 depende de transação backend; testeHTTP/PG não é substituído por mock.
- Fuso do aparelho diferente: R2 conserva data/hora da unidade, inclusive passagem de dia.
- Preço/duração mudou: R2 mostra diferença, revalida slots e pede confirmação explícita.
- Timeout24h+/cleanup: R2 consulta a tentativa por requestId antes de nova chave; indisponível permanece incerto.
- Agenda crossunit/permissão falsa: R3 filtra contexto e não oferece ações não publicadas.

## Task R1 — Adapter, tentativa e contratos

**Files:** criar `src/features/bookings/api/bookings.dto.ts`, `bookings.api.ts`, `model/booking-draft.ts`, `lib/attempt-id.ts` e testes em `src/features/bookings/tests`; reutilizar publicservices/availability APIs existentes.

**Interfaces:** `BookingDraft={shopId,serviceIds,professionalId,date,startTime,expectedTotalPriceInCents,expectedDurationInMinutes}`. `BookingAttempt={key,payload,createdAtServer}` permanece estável até resposta/reconciliação. `createBooking(attempt):Promise<BookingDto>` envia payload D10 e header; `findOwnAttempt(requestId):Promise<BookingDto|null>` chama GETme com filtro exato; `listOwnBookings({scope,cursor,limit})`, `getBooking(id)` usam anexo. UUIDv7 usa entropy segura da plataforma e serverTime, não Math.random/data do aparelho.

- [ ] Testar `multiple_services_use_one_post`, `attempt_replay_keeps_key_and_payload`, `request_id_lookup_is_exact`, `missing_server_clock_blocks_attempt`, `forged_totals_are_not_authority`. Assertions: POSTum; mesma key/payload na recuperação; lookup filtra requestIdmesmo empast; não gerarUUIDcomclockinválido; preço autoritativo é response.
- [ ] Rodar `npm test -- src/features/bookings/tests`; confirmar falhas antes do adapter/model.
- [ ] Implementar schema e draft/attempt; mudar seleção/preço/horário inicia nova revisão, não sobrescreve uma tentativa incerta. API não chama endpoints intermediários serviceItem/cart removidos.
- [ ] Repetir testes/typecheck; verificar fixtures e contrato de Álvaro. Checkpoint `feat: consumir reserva múltipla idempotente` no fluxo autorizado.

## Task R2 — Jornada de reserva e recuperação

**Files:** modificar `src/features/services/model/use-public-services.ts`, `ui/PublicCatalogView.tsx`, `SelectedServicesSummary.tsx`, availabilityadapter quando necessário; criar UI/view-models de bookings e rotas públicas de seleção/confirmação/resultado, preservando a rota de catálogo existente.

**Interfaces:** `useBookingFlow` expõe selecionar serviços/profissional/slot, revisar, confirmar e verificarTentativa. Estado de confirmação reviewing/submitting/confirmed/uncertain/error. Auth necessário pausa e retoma draft legítimo, sem POSTautomático apóslogin. Consulta de slots sempre recebe professionalId.

- [ ] Testar `timezone_does_not_follow_device`, `login_preserves_multiple_selection`, `quote_change_requires_new_confirmation`, `timeout_shows_uncertain`, `expired_attempt_checks_own_bookings_first`. Assertions: stringsdate/startTime da unidade inalteradas; serviçoIDs preservados;409não anuncia reserva; timeoutmantémkey; busca indisponível não gera nova chave/POST.
- [ ] Rodar testes novos e service-model/availability pertinentes; confirmar falhas antes da jornada.
- [ ] Implementar escolha de profissional elegível→slot→resumo→login/confirmemail→POST. Backend listaOWNER eBARBERMAN elegíveis sem PII; sem generalSlot como reserva de pessoa não escolhida.
- [ ] Implementar incerteza com verificação explícita; após24h consultarclientRequestIdpersistente. Preço/duração409 mostra valores antigos/atuais, atualiza catálogo/slots e exige nova confirmação. Só201/replay200 combooking autoritativo vira sucesso.
- [ ] Repetir testes, typecheck/build; checkpoint `feat: integrar confirmação e recuperação de reserva` no fluxo autorizado.

## Task R3 — Consultas pessoais e agenda existente

**Files:** criar tela/model de meusagendamentos em bookings e rota `(client)/bookings.tsx`; modificar `src/features/agenda/api/agenda.http.ts`, `agenda.mapper.ts`, view-model e `src/features/dashboard/api/dashboard.http.ts`, view-model; testes agenda/dashboard/bookings.

**Interfaces:** BookingDto comclientRequestId/statusnullable; agenda profissional comshopIdvalidado e serviçosmúltiplos. Cancelamento existente somente profissional responsável, conforme backend; sucesso invalidaavailability/agenda própria/consulta pessoal pertinente. Não transformar schedulepróprio em agenda da equipe.

- [ ] Testar `consumer_query_is_not_professional_schedule`, `unit_filter_does_not_mix_bookings`, `nullable_phone_status_payment_are_preserved`, `cancel_error_keeps_booking`, `scheduled_value_is_not_received_revenue`. Assertions: ClienteusaGETme; profissionais requershopCtx; nullcontinuanull; erroDELETEconservaitem; interface não exibe faturamento recebido inventado.
- [ ] Rodar testes pertinentes; confirmar falhas de filtro/status antes da correção.
- [ ] Implementar paginação upcoming/past e detalhe próprios, com404seguro; adaptar agenda/serviçosmúltiplos/telefone nullable; remover defaults sintéticos de identidade/status/finanças e protegerqueries comcontexto A3.
- [ ] Repetir testes/typecheck/build; checkpoint `feat: integrar consultas e agenda por unidade` no fluxo autorizado.

## Dependências backend e homologação

- [ ] Álvaro entrega POSTmúltiplo, Idempotency-Key/clock/ledger, clientRequestIddurável, profissionais elegíveis, GETme/detalhe e filtroshopId.
- [ ] HTTP/PG: reservas concorrentes mesmo horário/profissional entre unidades; item/carrinho/booking/ledger rollback; mesma chave/payload distinto; preço alterado; fora da jornada/passado/unidadeinativa/vínculoinadequado.
- [ ] Clock: exatamente24h, futuro>5min, aparelho errado, cleanup e queryexata de tentativa em qualquer período; resposta perdida não cria outra reserva.
- [ ] Web/Android/iOS: seleção apóslogin, reload e incerteza; cancelamento permitido libera slot real sem alegar evento inexistente.

**Estado inicial:** plano escrito; todos os passos NOT EXECUTED.

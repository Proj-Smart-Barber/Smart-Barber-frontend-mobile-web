# Status da Integração dos PRs 28 e 29

Data: 12/10/2026
Branch Local: `feat/integracao-reservas-atendimentos`
Base: `origin/main` (`6a17846bb792fa5e6e039ebcbe1da41573e3fa01`)

---

## Checkpoint I1 — Reconstrução da Base e Isolamento

- **Status:** CONCLUÍDO
- **Bases confirmadas:**
  - `origin/main`: `6a17846bb792fa5e6e039ebcbe1da41573e3fa01`
  - PR #28 (`update-booking-schedule`): `d034a53da1202c536b5de2271a692ae768d9f9a5`
  - PR #29 (`feat/agendamento-jornadas-agenda-recuperacao`): `849908f0f3938f5c7667a9de7b8f023f17221fc4`
- **Ações executadas:**
  - Criada branch local `feat/integracao-reservas-atendimentos` a partir de `origin/main`.
  - Aplicado commit Grupo 4 (`849908f`) via `git cherry-pick -x` (gerou `f4e37f4`).
  - Zero conflitos na aplicação do delta Grupo 4.
  - Criado documento `docs/BASE_INTEGRACAO_PRS_28_29_2026-10-12.md`.
- **Arquivos modificados / novos:**
  - `docs/BASE_INTEGRACAO_PRS_28_29_2026-10-12.md`
  - `docs/STATUS_INTEGRACAO_PRS_28_29_2026-10-12.md`
  - `docs/ANALISE_COMPATIBILIDADE_PRS_28_29_2026-10-12.md`
  - `docs/PROMPT_EXECUCAO_INTEGRACAO_PRS_28_29_2026-10-12.md`
  - `docs/planos/2026-10-12-integracao-prs-28-29.md`
  - `docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md`
- **Próxima Ação:** Bloco 2 / Tarefa I2 — Fechar os contratos de mutations na API (`D:/smart_barber/api`).

---

## Checkpoint I2 — Fechar os Contratos de Mutations na API

- **Status:** CONCLUÍDO
- **Commit API:** `2d5ebd5` (`fix(bookings): reconciliar acoes de reserva no servidor`)
- **Ações executadas:**
  - `CancelBookingController`: suporte a `Idempotency-Key` (UUIDv7), cálculo de `payloadHash` e execução transacional via `OperationAttemptService.executeOnce`.
  - `RescheduleBookingController`: suporte a `Idempotency-Key` (UUIDv7), cálculo de `payloadHash`, locks granulares e execução via `OperationAttemptService.executeOnce`.
  - `TransitionBookingStatusController`: suporte a `Idempotency-Key` (UUIDv7), cálculo de `payloadHash` e execução via `OperationAttemptService.executeOnce`.
  - Factories `makeCancelBookingController`, `makeRescheduleBookingController`, `makeTransitionBookingStatusController` atualizadas com `OperationAttemptService`.
  - Use cases e DTOs de `cancel`, `reschedule` e `transition` atualizados para propagar `tx` e `serverTime` recebidos da autoridade PG.
  - `GetBookingByIdController`: suporte a validação rigorosa de escopo (`PERSONAL` vs `UNIT`).
- **Testes implementados e validados:**
  - `src/infra/drizzle/booking-action-idempotency.integration.spec.ts` (2 testes PASS).
  - `src/infra/http/booking-actions-contract.e2e.spec.ts` (4 testes PASS).
  - Regressões existentes: `booking-contract.e2e.spec.ts` e `booking-lifecycle.integration.spec.ts` (PASS).
  - Typecheck da API: `npx tsc --noEmit` exit 0.
- **Próxima Ação:** Bloco 2 / Tarefa I3 — Concluída. Próxima: I4.

---

## Checkpoint I3 — Motor Unificado de Execuções Recuperáveis (Frontend)

- **Status:** CONCLUÍDO
- **Ações executadas:**
  - Criado `booking-command.types.ts`: união discriminada por `CREATE`, `RESCHEDULE`, `CANCEL`, `COMPLETE`, `NO_SHOW`, validação de versionamento, e `sanitizeCommandForStorage` (schema versionado, zero PII).
  - Criado `booking-operation-engine.ts`: métodos `prepare`, `submit`, `reconcile`, `close`.
    - Padrão persist-before-transport gravando `submitting` antes da rede; falha no storage aborta sem requests.
    - Double-tap guard por `requestId` em voo.
    - Despacho tipado e sincronização autoritativa de relógio via `serverTime`.
    - Tratamento de erro 409 `QUOTE_CHANGED` sem auto-retry e marcação de status `uncertain` para falhas de transporte preservando a mesma chave.
  - Refatorado `BookingFlowEngine` em `booking-draft.ts` para atuar como facade direta sobre `BookingOperationEngine`.
  - Atualizado `use-booking-flow.ts`: remoção de `syncWithServer(new Date())` e exigência de referência autoritativa de relógio.
  - Atualizado `use-booking-detail.ts` e `BookingActionConfirm.tsx`: delegação de `cancel`, `reschedule`, `complete`, `noShow` para `bookingOperationEngine`, remoção de `Date.now()` para chave e suporte a `scope`.
  - Atualizado `BookingRecovery.tsx`: reconciliação e fechamento de tentativas via `bookingOperationEngine`.
  - Alinhado vocabulário de submissão do store no teste `bookings.test.ts` para `submitting` antes do envio.
- **Testes implementados e validados:**
  - `src/features/bookings/tests/booking-operation-engine.test.ts` (12 testes PASS).
  - `src/features/bookings/tests/booking-actions-recovery.test.ts` (5 testes PASS).
  - Suíte completa de bookings: 12 arquivos, 69 testes PASS (exit code 0).
  - Typecheck frontend: `tsc --noEmit` exit code 0.
---

## Checkpoint I4 — Remarcação Navegável, Escopos e Cache Coerentes

- **Status:** CONCLUÍDO
- **Ações executadas:**
  - Criado `src/features/bookings/model/resolve-booking-context.ts`:
    - Validação de escopos `PERSONAL` vs `UNIT` e RBAC de front-end (`ADMIN`, `OWNER`, `MANAGER`, `BARBER`, `CLIENT`).
    - Barbeiro restrito ao seu próprio `barbermanId` (não edita atendimento de outro barbeiro).
    - Validação de autoridade sem bypass do backend: marca permissões e rejeita acessos inválidos.
  - Atualizado `src/features/bookings/model/booking-flow.types.ts`:
    - Adicionado suporte a `flowMode?: 'CREATE' | 'RESCHEDULE'` e `initialBooking?: BookingDto`.
  - Atualizado `src/features/bookings/model/use-booking-flow.ts`:
    - Despacho prioritário para `rescheduleBooking` quando em modo `RESCHEDULE`, garantindo ZERO chamadas a POST `/api/bookings/operational` ou `/api/bookings` durante remarcações.
  - Criada rota `src/app/(account)/bookings/[bookingId]/reschedule.tsx`:
    - Tela dedicada de remarcação consumindo `resolveBookingContext` e reutilizando `BookingFlowView`.
  - Atualizado `src/app/(account)/bookings/[bookingId].tsx` e `src/features/bookings/ui/BookingDetailView.tsx`:
    - Propagação do parâmetro `scope` e inclusão do botão de navegação "Remarcar Agendamento" quando `canReschedule === true`.
  - Atualizado `src/features/bookings/model/booking-query-keys.ts`:
    - Invalidação cirúrgica de cache por escopo e unidade (`shopId`), cobrindo `barbershop`, `bookings`, `agenda` (incluindo `['agenda', 'day', shopId]`), `dashboard` e `notifications`.
    - Isolamento de cache verificado: mutações na Loja A não invalidam Loja B.
- **Testes implementados e validados:**
  - `src/features/bookings/tests/booking-scope.test.ts` (7 testes PASS).
  - `src/features/bookings/tests/booking-reschedule-flow.test.ts` (3 testes PASS).
  - `src/features/bookings/tests/booking-cache-invalidation.test.ts` (2 testes PASS).
  - Suíte completa de bookings: 15 arquivos, 81 testes PASS (exit code 0).
  - Typecheck frontend: `tsc --noEmit` exit code 0.
---

## Checkpoint I5 — Importar Apresentação de Atendimentos sem Endpoints Obsoletos

- **Status:** CONCLUÍDO
- **Ações executadas:**
  - Realizado merge local isolado da branch de apresentação do PR #28 (`origin/update-booking-schedule`).
  - Resolvido conflito de merge em `src/features/bookings/index.ts`, garantindo exports explícitos e eliminando a colisão de tipos (`BookingCustomer`).
  - Eliminados os erros TS2305 ("três hooks ausentes") ao refatorar `use-bookings-view-model.ts`:
    - Consome `useSession` e contexto operacional (`userId`, `shopId`, `role`, `timezone`).
    - Consulta reativa via React Query com `bookingQueryKeys.unitBookings(shopId, ...)` e `fetchUnitBookings(shopId, ...)`.
    - Mutação de remarcação e cancelamento delegadas diretamente a `bookingOperationEngine` (`prepare` + `submit`), passando `expectedVersion` e `scope: 'UNIT'`.
    - Invalidação de queries via `invalidateBookingQueries`.
  - Refatorado `BookingsHttpAdapter` em `src/features/bookings/api/bookings.http.ts`:
    - Eliminado completamente o endpoint obsoleto `/update`, delegando a `rescheduleBooking` (PATCH `/api/bookings/:bookingId/reschedule`).
    - Delegado cancelamento a `cancelBooking` (DELETE `/api/bookings/:bookingId/cancel`).
  - Atualizado `src/features/bookings/ui/BookingManageCard.tsx`:
    - Respeita `capabilities?.reschedule?.allowed` e `capabilities?.cancel?.allowed`.
    - Valores desconhecidos exibem incompletude (`—`), não `0` ou `R$ 0,00`.
    - Validação de telefone para WhatsApp: exige telefone brasileiro válido (10 a 11 dígitos), evitando links para números vazios ou inválidos.
  - Atualizados testes de HTTP e criados novos testes contratuais:
    - `src/features/bookings/tests/bookings.http.test.ts` (7 testes PASS).
    - `src/features/bookings/tests/compute-end-time.test.ts` (11 testes PASS).
    - `src/features/bookings/tests/normalize-bookings-error.test.ts` (7 testes PASS).
    - `src/features/bookings/tests/bookings-view-model.test.ts` (3 testes PASS).
    - `src/features/bookings/tests/bookings-management-contract.test.ts` (2 testes PASS).
- **Testes implementados e validados:**
  - Suíte completa de bookings: 20 arquivos, 111 testes PASS (exit code 0).
  - Typecheck frontend: `tsc --noEmit` exit code 0.
- **Próxima Ação:** Bloco 4 / Tarefa I6 — Rotas e navegação por perfil (criar `/atendimentos`, isolar de `/bookings` pessoal).




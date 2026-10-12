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
- **Próxima Ação:** Bloco 2 / Tarefa I4 — Remarcação navegável, escopos e cache coerentes.


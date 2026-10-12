# Reservas confiáveis e ciclo de atendimento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Atualização de execução:** B1 foi concluída segundo o usuário e está no commit local API `c432b53`. Para as próximas tarefas, prevalece [execução agrupada](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md): B2 com E1 no Grupo1; B3/B4/B5 no Grupo2, uma execução/revisão por grupo. Checklists preservam os critérios originais; resultados B1 não foram reexecutados nesta reorganização.

**Goal:** oferecer contratos reais de reserva múltipla pessoal/operacional, recuperação, agenda autorizada e lifecycle com histórico.

**Architecture:** controllers/factories finos; regras nos use cases atuais e novos; repositórios/transactions PostgreSQL como autoridade. Compartilhar validação de slot/vínculo/capacidade, não confiar no perfil enviado no body.

**Tech Stack:** API em `D:/smart_barber/api`: Express5, Zod4, Drizzle/PostgreSQL, Vitest4/TypeScript7 conforme package atual.

**Spec:** [desenho](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md), decisões D01–D15; [gates globais](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md).

## Global Constraints

- Uma unidade/profissional/intervalo; serviceIds únicos; snapshots individuais e soma autoritativa.
- Cliente até 2h antes (limite inclusivo); equipe até início (limite exclusivo); NO_SHOW manual >=15min; COMPLETED manual após início; sem pagamento inferido.
- Scope PERSONAL/UNIT é contexto de operação, não prova de papel; servidor valida titular ou vínculo ACTIVE.
- Idempotency-KeyUUIDv7 com 24h e operação durável após cleanup; versão em mutations novas; relógio do servidor e instantes do slot.
- Compatibilidade explícita, no-store, autorização por unidade e perfil; migrations isoladas antes de produção autorizada.
- Nos exemplos, `s1/s2/c1/b1` são aliases de fixtures; testes HTTP/PG usam UUIDs válidos definidos estaticamente no harness. Assertions com aliases pertencem a casos de domínio/modelo, sem afirmar que strings inválidas passaram por Zod/DB.

## Review Focus

- Resposta perdida após commit: mesma operação recuperada, incluindo depois de 24h — B2.
- Profissional atende em duas unidades: impedir conflito entre lojas e corrida de desativação — B3.
- Legado agregado/valor desconhecido: não inventar snapshots ou comparecimento — B1.
- Alteração simultânea e prazos exatos: preservar reserva anterior e impedir override de terminal — B4.
- Publicação/backend adiantado: contratos antigos continuam seguros ou cutover coordenado documentado — B5.

## B1 — Persistência de itens, estado e histórico

**Files:** modificar `D:/smart_barber/api/src/infra/drizzle/schema.ts`, `src/domain/enterprise/entities/booking.ts`, `src/domain/enterprise/mappers/booking-mapper.ts`, `booking-details-mapper.ts`, `src/infra/drizzle/repositories/drizzle-bookings-repository.ts`; criar `src/domain/enterprise/entities/booking-service-item.ts`, `src/infra/drizzle/repositories/drizzle-booking-items-repository.ts`; migrations `drizzle/<timestamp>_booking_items_history/migration.sql` e metadata pelo gerador vigente; teste `src/infra/drizzle/booking-items.integration.spec.ts`.

**Interfaces:** `BookingRecord` expõe id/customerId/barbermanId/barbershopId/startsAt/endsAt/timezone/status/version/createdByUserId/clientRequestId. `BookingServiceSnapshot={serviceId:string|null,title:string,priceInCents:number|null,durationInMinutes:number|null,legacyAggregate:boolean}`; novos itens têm ID/valores válidos e legacyAggregate=false. `BookingRepository.getDetails(id)` produz BookingDto da spec; evento conserva ator/instante/versão anterior/nova sem apagar snapshots.

- [ ] Escrever `new_booking_retains_two_snapshots` e `legacy_aggregate_is_not_split`: `expect(saved.services.map(x=>x.serviceId)).toEqual(['s1','s2']); expect(saved.totalPriceInCents).toBe(7000); expect(legacy.services[0].legacyAggregate).toBe(true)`. Alterar serviço atual não muda snapshot salvo; legado sem origem fiel permanece identificado, sem preço/histórico inventados.
- [ ] Rodar `npm test -- src/infra/drizzle/booking-items.integration.spec.ts` no backend com PostgreSQL isolado; observar falha pelo agregado atual.
- [ ] Implementar repositórios/tabelas/mappers e backfill compatível. Persistir cada item de novos comandos e referência histórica do carrinho legado; não reconstruir IDs a partir do título “A+B”. Inventário/contagens/migração forward/rollback são parte da entrega.
- [ ] Rodar teste + `npx tsc --noEmit`; saída PASS. Validar constraints/FKs e rollback sem perda das reservas antigas.
- [ ] Revisar diff; commit neutro local `feat(bookings): persistir itens e historico de reservas`, sem publicação automática.

## B2 — Tentativas idempotentes e reconciliação

**Files:** criar `src/domain/application/services/operation-attempt-service.ts`, `src/domain/application/repositories/operation-attempts-repository.ts`, `src/infra/drizzle/repositories/drizzle-operation-attempts-repository.ts`, controllers/factories `operations/get-operation-attempt` e `close-operation-attempt`, `src/infra/http/routes/operation-attempt.routes.ts`; modificar schema, adapter e montagem das routes; testes `src/infra/drizzle/operation-attempts.integration.spec.ts`.

**Interfaces:** `executeOnce({actorId,operation,requestId,payload}, txCommand):Promise<MutationResult>`; chave única ator+requestId, hash canônico incorpora ação/recurso/unidade/beneficiário/serviços/slot/version. `getOwnAttempt(actorId,requestId):AttemptResult` retorna APPLIED/PENDING/NOT_APPLIED/UNKNOWN + recurso autorizado. `closeOwnAttempt(actorId,requestId)` sela NOT_APPLIED atomicamente sob a mesma autoridade do comando; se já aplicado retorna APPLIED, em execução PENDING/espera. Chave fenced/vencida rejeita originais tardias após cleanup. Nenhuma ausência genérica significa NOT_APPLIED; releitura/replay não devolve recurso privado se autoridade mudou.

`MutationResult/AttemptResult` seguem OperationAttemptResult discriminado da spec, com kinds BOOKING/MEMBERSHIP/REGISTRATION/INVITATION; GET/POSTclose canônicos `/api/operation-attempts/:requestId`. E/G usam o mesmo mecanismo. Resultado durável não duplica CPF/e-mail de cadastro pendente ou senha de ativação; handlers públicos de token seguem D05 anterior.

- [ ] Escrever `same_attempt_commits_once`, `changed_payload_conflicts`, `lost_response_reconciles_after_cleanup`: `expect(bookingCount).toBe(1); expect(feedForCustomer.filter(x=>x.eventId===eventId)).toHaveLength(1); expect(recovered.state).toBe('APPLIED')`. Usuário B não lê tentativa A; TTL exatamente24h/futuro>5min seguem D10 anterior; falha na transação não confirma tentativa.
- [ ] Rodar `npm test -- src/infra/drizzle/operation-attempts.integration.spec.ts`; falha pelo header ignorado atual.
- [ ] Implementar ledger/registro durável, header repassado explicitamente e commit atômico com comando/recurso/notificações reais do feed. Close/registro terminal de rejeição impedem comando tardio; teste `delayed_original_after_close_cannot_commit`: `expect(closed.state).toBe('NOT_APPLIED'); expect(lateOriginal.status).toBe(409); expect(savedBookings).toHaveLength(0)`. Definir consulta durável após limpeza sem renovar a janela de replay.
- [ ] Rodar suíte da tarefa com duas conexões/instâncias; PASS e uma mutation apenas sob concorrência. Validar formato UUID e timestamp real, não só regex.
- [ ] Revisão/commit `feat(bookings): reconciliar tentativas idempotentes`.

## B3 — Reserva pessoal, operacional e agenda por unidade

**Files:** modificar `src/infra/http/controllers/create-booking-controller.ts`, `src/domain/application/use-cases/booking/create-booking/create-booking.ts`, `src/domain/application/use-cases/schedule/calculate-availability/calculate-availability.ts`, repositories de reservas/membership; criar `src/domain/application/services/booking-policy.ts`, controllers/use cases `create-operational-booking`, `lookup-booking-customer`, `fetch-unit-bookings`, factories; testes `src/infra/drizzle/booking-conflicts.integration.spec.ts`, `src/infra/http/controllers/booking/booking-access.spec.ts`.

**Interfaces:** `createPersonalBooking(actor,command)` beneficiário=actor; `createOperationalBooking(actor,shopId,{customerId,...command})` exige membro ACTIVE; BARBERmanId=actor e OWNER escolhe elegível. `lookupCustomer(actor,shopId,{email}|{cpf})` retorna ID/nome/contato mascarado/elegibilidade mínimos. `fetchUnitBookings(actor,shopId,{date,barbermanId,status,page,limit})` limita BARBER a si, retorna items/page/hasNext/serverTime e resumo desse escopo. Usar nomes barbermanId compatíveis, inclusive profissional OWNER.

**Atualização após inventário:** PERSONAL e UNIT são capacidades do POST /api/bookings já registrado. Evoluir CreateBookingController/DTO para scope PERSONAL(default legado) ou UNIT com shopId/customerId obrigatórios; unidade deriva dos serviços e deve coincidir com shopId. PERSONAL rejeita beneficiário indevido; UNIT valida ator/vínculo/profissional. Não criar novo POST /barbershops/:shopId/bookings nem controller duplicado. Funções internas pessoal/operacional seguem distintas quando útil. JSON de negócio tem fonte explícita, sem query substituir o beneficiário/identidade.

Agenda/equipe têm page20/máx100; ordenação estável e índices `bookings(barbershop_id,starts_at,id)`, `bookings(barberman_id,starts_at,ends_at)` e `memberships(barbershop_id,state,joined_at,id)`. Resumo SQL do filtro inteiro, fora de LIMIT/OFFSET, mantém valores entre páginas. Teste21reservas compara count/valores em page1/page2 e role BARBER/OWNER.

- [ ] Escrever `operational_booking_does_not_use_actor_as_customer`, `barber_cannot_assign_colleague`, `cross_unit_conflict_commits_one`: `expect(saved.customerId).toBe('c1'); expect(saved.createdByUserId).toBe('b1'); expect(twoAttempts.filter(x=>x.applied)).toHaveLength(1)`. Actor OWNER em outra unidade não gerencia esta; busca por nome/CPF parcial não é aceita; cliente não verificado não é elegível.
- [ ] Rodar arquivos de teste da tarefa e verificar falhas atuais.
- [ ] Implementar políticas compartilhadas com disponibilidade: unidade/serviço ativos, vínculo elegível, e-mail confirmado, jornada/exceção, passado, instantes ISO↔fuso e versão/orçamento. Resolver conflito/elegibilidade em PG inclusive entre unidades; legado null futuro continua ocupado. Disponibilidade devolve serverTime autoritativo além de slots; listas/detalhes/mutations também. Consumir `professional-membership-unit-of-work` entregue por E1; não criar mutex alternativo.
- [ ] Corrigir factory existente `src/infra/http/factories/make-calculate-availability-controller.ts`: atualmente injeta InMemoryBookingsRepository; usar persistência/autoridade PG de B1/E1. `persisted_booking_blocks_public_slot` deve mostrar que reserva real elimina o slot no GET existente; memória não prova disponibilidade. Ligar CreateBookingUseCase ao writer createWithItems, mantendo legado compatível: a B1 entregou writer, mas o POST ainda usa createWithItemAndCart agregado.
- [ ] Adaptar escritores existentes `src/domain/application/use-cases/service/update-service/update-service.ts`, `service/toggle-service-activation/toggle-service-activation.ts`, `schedule/update-barbershop-schedule/update-barbershop-schedule.ts`, `schedule/create-schedule-exception/create-schedule-exception.ts`, `update-schedule-exception/update-schedule-exception.ts`, `delete-schedule-exception/delete-schedule-exception.ts` (todos sob use-cases). Protocolo: lock de unidade antes de mutar; criação/remarcação seguram unidade+profissionais/vínculos e revalidam depois. Testes PG de writers concorrentes invalidam serviço/preço/jornada entre slots e commit; nenhum resultado de leitura obsoleta é confirmado.
- [ ] Criar `src/infra/http/middlewares/booking-customer-lookup-limit.ts`, serviço/repository de contadores PG e logger redaction compartilhado. Tests `lookup_rate_is_shared_and_redacted`: duas instâncias, requests1–30 passam,31 retorna429/Retry-After; falha de contador503; erro/sucesso no-store; CPF/e-mail ausentes em logger/URL. Chaves ator e ator+unidade; limite configurável30/minute, counting entradas inválidas/não encontrado. Aplicar redaction na camada que já loga errors do adapter.
- [ ] Rodar testes HTTP + PostgreSQL: rodada concorrente, serviço repetido, orçamento mudou, fim incorreto e slot ambíguo. GET pessoal/detalhe paginam 20 (máx100), permitem upcoming/past e campos conhecidos; retorno null legado permanece explícito.
- [ ] Revisão/commit `feat(bookings): criar atendimentos autorizados por unidade`.

## B4 — Cancelar, remarcar, concluir e ausência

**Files:** modificar `src/domain/application/use-cases/booking/cancel-booking/cancel-booking.ts`, `src/infra/http/controllers/cancel-booking-controller.ts`; criar casos/controllers/factories `reschedule-booking`, `transition-booking-status`; usar booking-policy/B2/B1; testes `src/infra/drizzle/booking-lifecycle.integration.spec.ts`.

**Interfaces:** `cancelBooking(actor,{bookingId,scope,expectedVersion,reason?})`, `rescheduleBooking(actor,{bookingId,scope,expectedVersion,...command})`, `transitionBooking(actor,{bookingId,expectedVersion,status:'COMPLETED'|'NO_SHOW',reason?})`, todos → `{booking,serverTime}`. Scope PERSONAL exige titular e2h; UNIT exige responsabilidade/vínculo e prazo de equipe. Capabilities de detalhe usam a mesma policy. Motivo opcional; ator/instante obrigatórios.

- [ ] Escrever `cancellation_boundary_is_server_time`, `reschedule_failure_keeps_original`, `manual_absence_boundary`, `terminal_transition_is_not_overwritten`: `expect(atMinus2h.allowed).toBe(true); expect(atMinus2hPlus1s.allowed).toBe(false); expect(atStart.allowed).toBe(false); expect(noShowAt14m59s.allowed).toBe(false); expect(noShowAt15m.allowed).toBe(true); expect(original.startsAt).toBe(before.startsAt)` após conflito.
- [ ] Rodar `npm test -- src/infra/drizzle/booking-lifecycle.integration.spec.ts`; falha pelas permissões/exclusão atuais e rotas ausentes.
- [ ] Implementar transições/versão/locks e histórico. Revalidar novo slot antes de substituir; mesma unidade/serviços únicos; BARBER não transfere; OWNER/cliente elegíveis podem trocar profissional conforme scope. Mutations B2; materializar feed de notificações na mesma transação, usando repository com tx e unique(eventId,recipientId). Criar/alterar factory/repository de notifications sem HTTP externo dentro do lock. Não converter COMPLETED em pagamento.
- [ ] Testar `committed_notification_survives_restart`, `rolled_back_event_has_no_feed`, `legacy_future_is_busy`: simular perda da resposta imediatamente após commit/retomada; `expect(feedForCustomer.filter(x=>x.eventId===eventId)).toHaveLength(1); expect(feedAfterRollback).toHaveLength(0); expect(legacyOverlap.status).toBe(409)`. Cliente e profissional têm um aviso cada; antigo profissional transferido não recebe acesso ao recurso atual indevido.
- [ ] Rodar teste HTTP/PG: cancelamento×remarcação, conclusão×ausência, orçamento divergente, novo profissional desativado e resposta perdida. Disponibilidade/agenda/consulta pessoal atualizam só após commit e status real; nenhuma notificação anuncia operação rolled back.
- [ ] Testar `deadline_is_checked_after_lock_wait`: começar antes de2h/início, reter lock até ultrapassar a borda, liberar; `expect(response.code).toBe('ACTION_DEADLINE_PASSED'); expect(newEvents).toHaveLength(0); expect(newNotifications).toHaveLength(0)`. Colher `clock_timestamp()` depois dos locks, não CURRENT_TIMESTAMP do começo da transação. Aplicar também a passado/15min/TTL nos respectivos comandos.
- [ ] Revisão/commit `feat(bookings): preservar lifecycle e remarcacao atomica`.

## B5 — Contrato compatível e entrega

**Files:** atualizar `src/infra/http/swagger/index.ts`, routes/factories; criar `src/infra/http/booking-contract.e2e.spec.ts` e artefato sanitizado de exemplos/erros/compatibilidade.

**Interfaces:** exemplos versionados para todos os endpoints B1–B4; erros `SLOT_UNAVAILABLE`, `QUOTE_CHANGED`, `BOOKING_VERSION_CONFLICT`, `ACTION_DEADLINE_PASSED`, `MEMBERSHIP_INACTIVE`, `IDEMPOTENCY_PAYLOAD_MISMATCH`; legados serviceId/endTime e DELETE são explicitamente tratados sem abrir autorização por body incompleto.

QUOTE_CHANGED inclui requestId/NOT_APPLIED terminal, serverTime e `quote={serviceItems,totalPriceInCents,totalDurationInMinutes}` autoritativo, sob lock; sem enviar dados de outra unidade. Testar preço/duração mudados em criação e remarcação: retorno traz diferença real, não grava novo agendamento/alteração, original conserva version/slot e nenhuma notificação de sucesso surge.

- [ ] Teste HTTP do contrato completo: `expect(create.status).toBe(201); expect(detail.services).toHaveLength(2); expect(cancelled.status).toBe('CANCELLED')`; clientes antigos têm fixture específica, inclusive representação 204 quando compatível; mutação nova sem versão é rejeitada.
- [ ] Rodar e confirmar falhas onde Swagger/DTO divergem da main.
- [ ] Atualizar contrato/compatibilidade, documentar corte seguro de legado se necessário e gates de migrator no boot; não resolver autorização reduzindo checks.
- [ ] Usar [inventário auditado](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/INVENTARIO_ENDPOINTS_API_2026-10-11.csv) para completar Swagger e DTOs das rotas atuais. Montar GET /docs-json na app exportada, atualmente ausente/404, sem criar servidor separado. Corrigir serviceIds/endTime e auth opcional do catálogo; /staffs é alias. Não criar URL nova para compensar ausência de documentação ou serializer antigo.
- [ ] `npm test`, `npx tsc --noEmit`, `npm run check` e HTTP/PG isolado; reportar falhas pré-existentes por nome. Publicação/migração só após autorização/backup/alvo confirmado.
- [ ] Entregar contratos/fixtures reais para R/G/H; commit local `docs(api): versionar contratos de reserva e lifecycle`.

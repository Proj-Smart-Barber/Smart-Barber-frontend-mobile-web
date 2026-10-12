# Carrinho, agendamento e agenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Atualização de execução:** [Agrupamento solicitado pelo usuário](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md) prevalece: R1+G1 no Grupo3; R2/R3/R4 no Grupo4; R5 como homologação integrada Grupo7. Um executor/revisor por grupo, mantendo checkpoints/testes internos e critérios deste plano.

**Goal:** ligar catálogo/carrinho às reservas reais, criar rápido para cliente cadastrado e oferecer remarcação/cancelamento/status autorizados.

**Architecture:** feature bookings compartilha engine/contratos/persistência entre entradas pessoal/operacional. Services/availability existentes fornecem catálogo/slots; agenda/dashboard consomem BookingDto autoritativo com contexto e capabilities.

**Tech Stack:** Expo57/React19/RN0.86, Expo Router, TanStack Query5/Zod3/Vitest3/TS6. Instalar AsyncStorage/expo-crypto pelo `npx expo install` durante execução, sem alterar armazenamento de credenciais.

**Spec:** [desenho](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md). Consome [B](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/planos/2026-10-11-reservas-backend.md); [gates globais](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md).

## Global Constraints

- ServiceIds únicos, mesma unidade, um profissional e intervalo contínuo; valores/fim/estado pelo servidor.
- Cliente pessoal; BARBER operacional próprio; OWNER operacional da unidade; lookup e-mail exato/CPF completo, sem persistir identificadores de busca.
- Cancelar/remarcar: consumidor <=2h antes; equipe antes início; ausência manual>=15min; conclusão manual após início; capabilities/servidor autorizam.
- Proxy/cookie de produção web preservados; native API absoluta; segredo não entra no draft/attempt.
- Sem Math.random/clock inventado; tentativa/replay24h; resultado incerto reconcilia antes de mudar payload/chave.

## Review Focus

- Hora UUID aparece 1970 apesar de regex passar — R1 decodifica timestamp real.
- Perda de resposta/recarga/troca de conta — R1/R3 não duplicam ou revelam tentativa de outro ator.
- Login/verificação interrompe seleção — R2 conserva draft e retorna à revisão sem POST automático.
- Remarcação recebe conflito ou vínculo muda no envio — R3/R4 preservam reserva e reconsultam capacidades.
- Fuso/bordas, serviço agregado legado e unidades múltiplas — R2/R4 não fabricam status/preço/nome nem misturam agendas.

## R1 — Contratos, clock e tentativa persistente

**Files:** modificar `src/features/bookings/api/bookings.dto.ts`, `bookings.api.ts`, `model/booking-draft.ts`, `lib/attempt-id.ts`; criar `api/bookings.schema.ts`, `lib/server-clock.ts`, `lib/normalize-booking-error.ts` e shared operations descrito nas Interfaces; testes `tests/attempt-id.test.ts`, `booking-attempt-store.test.ts`, `booking-contract.test.ts`. package/lock para dependencies Expo compatíveis. Port/storage únicos em shared, sem duplicar implementação dentro de bookings.

**Interfaces:** `createBooking(request,key)`, `createOperationalBooking(shopId,request,key)`, `findOwnAttempt(requestId)`, `closeOwnAttempt(requestId)`, `getBookingById(id,scope)`, `fetchMyBookings({scope,page,limit})`, `fetchUnitBookings(shopId,filters)`, `lookupCustomer(shopId,identifier)` produzem DTOs B. `getBookingAvailability(shopId,{serviceIds,date,barbermanId}):Promise<{slots,serverTime,timezone}>` conserva metadata descartada atualmente pelo adapter, reaproveitando a porta antiga de Horários. `generateUuidV7(serverTimestampMs,entropy16)` exige clock/entropy. `prepareAttempt(actorId,operation,payload,clock)` recebe entropy segura web/`Crypto.getRandomBytesAsync(16)` native. Store `read(actorId,requestId)/save(actorId,attempt)/listReferences(actorId)/clearResolved(actorId)/clearPayloadsOnLogout(actorId)`; chave isolada por ator+requestId. Referência incerta após logout não contém payload/cliente/CPF/e-mail/token.

O port/store/result discriminado comum ficam em `src/shared/operations/operation-attempt.types.ts`, `operation-attempt.api.ts`, `operation-attempt-store.ts/.web.ts/.native.ts`; wrappers bookings usam somente kind BOOKING. GET/close canônicos em /api/operation-attempts. G consome mesmo port com store reference-only para CPF/email. A ponte de lifecycle no root limpa payloads de todas essas operações sem criar ciclo auth↔feature.

**Rotas auditadas:** createBooking e createOperationalBooking chamam o mesmo POST /api/bookings. Wrapper operacional envia scope=UNIT/shopId/customerId; pessoal usa PERSONAL e beneficiário da sessão. Não adicionar POST /barbershops/:shopId/bookings no adapter. /bookings/me, /:bookingId, cancel, professionals, availability, convites por ID e notifications/read já existem; ampliar schemas conforme contrato, não criar substitutos por estarem fora do Swagger atual.

- [ ] Testar `uuid_timestamp_roundtrips`, `missing_clock_and_entropy_fail_closed`, `attempt_survives_reload_for_same_actor`, `two_attempts_do_not_overwrite`: `expect(decodeTimestamp(generateUuidV7(1775900000000,bytes))).toBe(1775900000000); expect(readAsOtherActor).toBeNull(); expect(reloaded.payload).toEqual(original.payload)`. Erro de storage bloqueia POST; códigos 409 não são todos QUOTE_CHANGED.
- [ ] Rodar `npm test -- src/features/bookings/tests`; observar falhas reais antes de alterar engine/DTO.
- [ ] Implementar ports/parsers/clock; Web localStorage e native AsyncStorage para tentativa sanitizada, sem migrar tokens. Timestamp usa os seis bytes corretos (40/32/24/16/8/0 bits), versão/variante; monotonic elapsed + referência serverTime, sem fallback de aparelho para novas tentativas. HTTP expõe response ausente/inválida como erro, não confirmed.
- [ ] Criar `src/shared/operations/OperationLifecycleBridge.tsx` fora de src/app (não vira rota). Recebe props genéricas `{actorId,sessionState}` do layout root e reage a unauthenticated/troca de ator; restoring/recoveryRequired não apagam tentativa. Limpa payloads mantendo referências incertas. Shared não importa auth e auth não importa bookings; composição passa identidade/estado e não inicia POST na restauração.
- [ ] Rodar testes e `npm run typecheck`; PASS. Referências [AsyncStorage](https://docs.expo.dev/versions/latest/sdk/async-storage/) e [Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/) para dependências/API, sem pin por versão lembrada.
- [ ] Revisão/commit local `feat(bookings): validar contratos e recuperar tentativas`.

## R2 — Jornada pessoal e retorno de autenticação

**Files:** modificar `src/features/services/model/use-public-services.ts`, `ui/PublicCatalogView.tsx`, `SelectedServicesSummary.tsx`; criar `bookings/model/use-booking-flow.ts`, `booking-flow.types.ts`, `booking-query-keys.ts`, UI `BookingFlowView.tsx`, `BookingReview.tsx`, `ProfessionalPicker.tsx`, `BookingSlotPicker.tsx`; rota `src/app/(public)/barbershops/[shopId]/book.tsx`; integrar retorno seguro em `src/features/auth/model/booking-return-intent.ts`, `src/app/_layout.tsx`; testes `tests/booking-flow.test.ts`, `auth/tests/booking-return-intent.test.ts`.

**Interfaces:** `useBookingFlow({mode:'PERSONAL'|'UNIT',shopId,bookingId?,initialDate?,initialProfessionalId?})` expõe draft, step, reviewing/submitting/confirmed/uncertain/error, seleção/edit/review/submit/reconcile; recebe SessionContext e R1. `setBookingReturnIntent({shopId,draftId})` só permite rota interna pública de reserva revisada. Não aceitar URL arbitrária de redirect.

- [ ] Testar `two_services_reach_review`, `service_change_invalidates_slot`, `login_preserves_selection_without_auto_submit`: `expect(review.serviceIds).toEqual(['s1','s2']); expect(changed.slot).toBeNull(); expect(postCountAfterLogin).toBe(0)`. Slot ISO original e fuso da unidade permanecem iguais em aparelhos com fuso diferente/DST; profissional OWNER elegível é selecionável.
- [ ] Rodar testes da tarefa + service-model/availability; verificar falhas pela ausência de integração atual.
- [ ] Implementar fluxo unidade→cart→profissional→data/slot→revisão→POST. Substituir modal “próxima atualização”; permitir voltar/editar sem perder seleção. Login/verify pausam e retomam revisão legítima, sem ativar operação de equipe por URL. Mostrar prazo de alteração antes de confirmar, inclusive reserva feita a menos de2h do início.
- [ ] QUOTE_CHANGED consome quote autoritativa B5 e exibe itens/valores/durações anteriores e atuais; reconsulta slots e exige nova confirmação. Teste `quote_change_never_autosubmits`: `expect(postCount).toBe(1)` antes de confirmação do usuário; remarcação com orçamento alterado conserva reserva anterior e não anuncia success. Não buscar diferença pelo texto genérico de qualquer409.
- [ ] Rodar tests/typecheck e browser com API B de homologação; somente retorno validado confirma. Dados inválidos, serviço desativado, orçamento alterado e conflito têm estados próprios acessíveis.
- [ ] Revisão/commit `feat(bookings): concluir jornada pessoal de agendamento`.

## R3 — Agendamento rápido, mutations e resultado incerto

**Files:** criar UI `CustomerLookup.tsx`, `BookingResult.tsx`, `BookingRecovery.tsx`, `BookingActionConfirm.tsx`, rota `src/app/(app)/new-booking.tsx`; evoluir use-booking-flow/engine/api com `cancelBooking`, `rescheduleBooking`, `transitionBooking`; testes `tests/operational-booking.test.ts`, `booking-mutations.test.ts`.

**Interfaces:** modo UNIT recebe vínculo ACTIVE/unidade e beneficiário escolhido; BARBER professionalId fixo, OWNER picker elegível. Remarcar usa bookingId/version e não altera shopId/customerId. Comandos R1 com chave estável, scope e expectedVersion; action options vêm de capabilities, não do tipo global.

- [ ] Testar `barber_cannot_pick_colleague`, `owner_unit_is_not_global_privilege`, `lost_create_and_reschedule_preserve_key`, `reschedule_conflict_preserves_original`: `expect(barber.professionalId).toBe(actor.id); expect(otherUnitManage).toBe(false); expect(replay.key).toBe(before.key); expect(original.id).toBe(beforeBooking.id)`. Lookup errado não permite confirmar; terminal não oferece ações incompatíveis.
- [ ] Rodar testes novos antes de implementação.
- [ ] Implementar busca exata com conferência de nome e limpeza do campo/cache ao sair. Novo agendamento entra confirmado via servidor/notificação. Confirmar cancelar/concluir/NO_SHOW; opção de motivo não obrigatória. Erro/timeout mostra tentativa incerta e consulta exata; depois24h não criar chave nova com base em ausência genérica. Não editar payload durante incerteza.
- [ ] Recovery usa ação/copy da spec “Verificar operação anterior”, explicando que close não cancela reserva aplicada. Teste UI de APPLIED/NOT_APPLIED/PENDING/UNKNOWN/503: resultado existente ou revisão liberada somente após fence; demais mantêm incerteza sem nova chave/sucesso/cancelamento anunciados.
- [ ] Browser/HTTP `commit_response_loss_logout_relogin`: após commit perdido→logout→contaB→contaA (>24h incluído), referência A recupera APPLIED, B não vê A e zero novoPOST; se resultado UNKNOWN/payload apagado, oferecer resolução via close autoritativo (não replay inventado). Close só libera nova revisão/chave após NOT_APPLIED fenced; APPLIED mostra resultado existente. Testar original atrasada apósclose. Erro/storage/prazo/versão mantêm mensagem honesta; limpar referência só quando resultado conhecido.
- [ ] Revisão/commit `feat(bookings): integrar agendamento rapido e lifecycle`.

## R4 — Consultas, agenda e cache autoritativo

**Files:** modificar `src/features/bookings/model/use-my-bookings.ts`, `ui/BookingCard.tsx`, `src/app/(client)/bookings.tsx`, agenda/dashboard adapters/mappers/model/contracts, `src/entities/appointment/model/appointment.types.ts` conforme inventário do executor; criar `bookings/model/use-booking-detail.ts`, UI `BookingDetailView.tsx`, `BookingHistory.tsx`, rota `src/app/(account)/bookings/[bookingId].tsx`; tests bookings/agenda/dashboard e `booking-query-keys.test.ts`.

**Interfaces:** keys incluem actorId/scope/shopId/professionalId/date/timezone/page/status. `useBookingDetail(id,scope)` valida BookingDto e expõe actions; listas pessoais paginam upcoming/past; unidade usa fetchUnitBookings. `invalidateBookingQueries(queryClient,{actorId,shopId,oldProfessionalId,newProfessionalId,dates})` cobre disponibilidades/listas/detalhes/agenda/dashboard/notificações afetados, sem restoreSession como refetch genérico.

- [ ] Testar `unit_cache_isolation`, `unknown_legacy_values_remain_unknown`, `personal_list_loads_next_page`, `past_booking_is_not_next`: `expect(keyForShop1).not.toEqual(keyForShop2); expect(missingPriceLabel).not.toBe('R$ 0,00'); expect(loadedIds).toHaveLength(21)`. Nome profissional vem do DTO/identidade correspondente; sem CONFIRMED fabricado; COMPLETED não equivale a PAID.
- [ ] Rodar tests de agenda/dashboard/bookings; falhas esperadas nos adapters/chaves atuais.
- [ ] Implementar consultas/paginação/detalhes e actions R3; trocar endpoint pessoal por unidade só em modo autorizado. Mapear serviço múltiplo/legado, phone nullable e estados reais. Destaque futuro/atual usa serverTime/fuso; WhatsApp só se contato válido e permitido, sem enviar mensagem nesta implementação por ferramenta.
- [ ] `npm test`, `npm run typecheck`, `npm run build`; navegador mostra alterações após commit sem recriar sessão. Cadastros/telefone/valores ausentes recebem estados factuais.
- [ ] Revisão/commit `feat(agenda): consultar reservas e acoes por contexto`.

## R5 — Aceite ponta a ponta

**Files:** criar relatório sanitizado de homologação e roteiro reproduzível do fluxo; se automatizado, harness browser no diretório de testes da feature, com credencial fornecida em runtime, sem login/senha gravados.

**Interfaces:** consome R1–R4/B/E; retorna PASS/PARTIAL/FAIL/NOT TESTED por web/Android/iOS, com estado do DB/tentativas e IDs não secretos necessários.

- [ ] Reproduzir antes/depois casos: cliente com dois serviços; profissional para outro cliente; owner muda profissional; conflito concorrente; cancel2h/borda; NO_SHOW15min; completed; replay; notificações sem unidade; troca de shop; retorno de login. Assertions incluem uma reserva/um evento, histórico e perda de resposta sem duplicidade.
- [ ] Executar contra PostgreSQL/API de homologação, sem usar produção como banco de testes de reservas.
- [ ] Corrigir somente divergências demonstradas e preservar login/cookie/proxy; repetir checks afetados.
- [ ] Suíte/typecheck/build + browser real aprovado; native validado separadamente ou explicitamente NOT TESTED. A fixture unitária não fecha o pacote.
- [ ] Entregar ao plano H/G e revisão; publicação somente autorizada, após gates globais.

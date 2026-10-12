# Integração dos PRs28/29 — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans para executar os checkpoints abaixo. Método preservado: um executor para o pacote integrado, com revisão independente ao final e correção dos achados antes de liberar a entrega. Este documento é planejamento; não autoriza publicação, merge ou deploy.

**Goal:** preservar as entregas dos dois desenvolvedores e produzir uma versão única, compilável e testada de reservas/Atendimentos, com contratos, permissões, recuperação e cache coerentes.

**Architecture:** a tela Atendimentos do PR28 passa a ser uma apresentação do domínio de reservas do Grupo4, usando BookingDto, adapters e execução recuperável comuns. POST /bookings, PATCH /reschedule e /status, DELETE /cancel e GET/close de operações existentes permanecem autoridades HTTP. A API recebe somente as correções indispensáveis para esses contratos funcionarem; não haverá outro ledger ou outra política de remarcação.

**Tech Stack:** frontend Expo57/React19/RN0.86, Expo Router, TanStack Query5/Zod/Vitest/TypeScript; API Express/Drizzle/PostgreSQL/Vitest. Confirmar versões nos package/lock atuais antes de executar.

**Spec:** `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md`, planos R2/R3/R4 e `docs/ANALISE_COMPATIBILIDADE_PRS_28_29_2026-10-12.md`. Este plano especifica a integração/correção das quatro recomendações, preservando D01–D16.

## Baseline e evidência

Revalidados no GitHub durante esta preparação, em12/10:

| Referência | SHA | Observação |
| --- | --- | --- |
| main frontend | `6a17846bb792fa5e6e039ebcbe1da41573e3fa01` | Grupo3 integrado por squash |
| PR28 | `d034a53da1202c536b5de2271a692ae768d9f9a5` | Aberto, mergeable=true; imports de três hooks ausentes |
| PR29 | `849908f0f3938f5c7667a9de7b8f023f17221fc4` | Aberto, mergeable=false; delta Grupo4 sobre parent1d94c28 |
| Grupo3 original | `1d94c28` | Conteúdo funcional equivalente ao main observado |

Auditoria anterior: main+PR29 tem20 conflitos; PR28+PR29 tem21, somente o barrel é interseção incremental direta. Aplicação do delta1d94c28→849908f sobre main passou sem conflito. Typecheck PR29 passou; teste de storage pending/submitting falhou isoladamente. Candidato combinado: TypeScript falhou por hooks ausentes/BookingCustomer;305testes passaram e1falhou. Isso não é homologação HTTP/browser/native.

O clone `.tmp/pr-28-29-audit-20261012` contém um experimento com resolução parcial, **não uma base de implementação aprovada**. Não iniciar execução nele nem copiar sua árvore inteira para o projeto.

## Global Constraints

- Preservar branches/arquivos/commits de terceiros e as correções de login. Nomes neutros, sem nomes de agentes/ferramentas.
- Um CPF/conta; vários serviços únicos de uma unidade/profissional/intervalo em uma reserva. OWNER pode atender; papel operacional é do vínculo ACTIVE selecionado.
- PERSONAL: consumidor altera os próprios até2h antes inclusive. UNIT: BARBER própria agenda; OWNER equipe; alterações antes do início exclusivo. COMPLETED após início e NO_SHOW manual>=15min; sem pagamento inferido.
- Toda mutation nova tem key UUIDv7, versão nas alterações e comando imutável. Persistir antes de enviar; prazo24h não elimina referência incerta nem prova não aplicação.
- Clock de servidor e elapsed monotônico; ausência de clock/entropy/storage bloqueia novo envio. UNKNOWN/404/503/resposta inválida não libera key nova. Close de APPLIED preserva recurso.
- Lookup CPF/e-mail transitório; credenciais e dados privados não entram em URL/log/draft/storage. Cache e callbacks isolados por ator/contexto/unidade.
- API real é autoridade de permissão/cotação/versão/fence. Enviar header sem ledger no servidor não comprova idempotência.
- Sem nova home, geolocalização, contratação, cobrança, cadastro profissional ou gestão de equipe dos grupos5/6. Ajustes estritamente necessários no fluxo existente são deste pacote.
- Produção não é banco de teste. Boot da API pode migrar: verificar alvo antes de importar app/testes/migrator.

## Review Focus

1. Atualização de base traz de volta commits já integrados e sobrescreve outro desenvolvedor — I1/I5 verificam delta/autoria/diff e heads.
2. Ação salva no servidor, perde resposta e modal gera nova key — I2/I3 testam after-commit response-loss, replay, close e referência durável.
3. Equipe abre detalhe com scope PERSONAL ou remarcação UNIT dispara criação — I4 testa destinos e PATCH exclusivo com bookingId/version original.
4. Invalidation usa prefixo diferente e outra unidade vê cache antigo — I4/I5 testam queries reais ativas e isolamento, não apenas igualdade de arrays.
5. Node/testes mocks passam enquanto menu, refresh/deep link e API falham — I6/I7 validam browser/HTTP/PG e registram cobertura native separada.

## Organização das quatro recomendações

| Bloco | Tarefas | Resultado verificável |
| --- | --- | --- |
| 1. Atualizar base do PR29 | I1 | Cópia isolada sobre main com somente delta Grupo4 e alterações atuais preservadas |
| 2. Corrigir pendências do PR29 e dependências | I2–I4 | API/execução recuperável, clock, remarcação, permissões e cache funcionando |
| 3. Integrar apresentação do PR28 | I5–I6 | Atendimentos reaproveitado, exports/rotas sem ambiguidade e um domínio comum |
| 4. Validar composição e preparar revisão | I7–I8 | Evidência unitária/HTTP/PG/browser, revisão independente e pacote local pronto para publicação autorizada |

Ordem: I1→I2→I3→I4→I5→I6→I7→I8. O desenvolvimento frontend independente pode continuar enquanto uma dependência API é corrigida, mas o aceite integrado exige I2. Um executor por pacote; se houver colaboração autorizada, backend/I2 e frontend/I3 podem ter owners distintos, checkouts e schemas de teste separados.

## I1 — Reconstruir base e preservar os dois PRs

**Files/artifacts:** criar checkout/worktree novo e `docs/BASE_INTEGRACAO_PRS_28_29_2026-10-12.md`; preservar o checkout original e o relatório de compatibilidade.

**Interfaces:** consome os heads atuais e delta Grupo4; produz branch local neutra `feat/integracao-reservas-atendimentos`, bases registradas e ownership por tarefa.

- [ ] Reconsultar main e PRs28/29, registrar SHA/remotes/status e verificar mudanças posteriores. Se os heads mudaram, repetir comparação dos arquivos afetados; não aplicar patch antigo sobre trabalho novo.
- [ ] Criar isolamento seguindo using-git-worktrees aplicável. Preservar trabalho não commitado; manter refs locais de recuperação dos heads. Não usar o clone experimental nem reset/rebase no checkout compartilhado.
- [ ] Iniciar a branch de integração no main confirmado. Aplicar o commit Grupo4 `849908f` com `git cherry-pick -x` **somente se** parent1d94c28 e delta observados continuam válidos. Não reaplicar8e0f324/1d94c28 já integrados por squash. Havendo mudança de baseline, enumerar o novo delta antes de adaptar.
- [ ] Conferir `git diff <mainSha>...HEAD`, autoria/proveniência e comparar com delta original; preservar diferenças legítimas de main, inclusive a linha adicional do dossiê. Registrar comandos/resultado. Nenhuma modificação do PR28 é importada ainda.
- [ ] Commit/checkpoint local `chore(integration): registrar bases e escopo dos PRs`. Não atualizar a branch remota do PR29 por force push nesta etapa.

**Gate:** nenhuma perda de trabalho, base correta e delta só do Grupo4. Publicação/rewrite de branches existentes fica em I8 e precisa de autorização própria.

## I2 — Fechar os contratos de mutations na API

**Responsabilidade:** correção indispensável do backend para testar integração, reaproveitando E1/B2/B3/B4 existentes. Se a execução não tiver acesso de escrita à API, preparar diff/patch revisável no checkout autorizado e relatar essa dependência; não substituir por sucesso em mock.

**Files API:** `src/infra/http/controllers/cancel-booking-controller.ts`, `controllers/booking/reschedule-booking.controller.ts`, `transition-booking-status.controller.ts`, factories respectivas; use cases cancel/reschedule/transition e DTOs; `services/operation-attempt-service.ts`, `professional-membership-unit-of-work.ts`, repositories/transações quando necessário; `booking.routes.ts`, Swagger e mappers. Testes novos `src/infra/drizzle/booking-action-idempotency.integration.spec.ts` e `src/infra/http/booking-actions-contract.e2e.spec.ts`.

**Interfaces:** mutations canônicas recebem actor da sessão, scope validado, Idempotency-Key e expectedVersion; operação semântica CREATE_BOOKING/RESCHEDULE_BOOKING/CANCEL_BOOKING/TRANSITION_BOOKING_STATUS é consistente entre ledger e frontend. Todos produzem o BookingDto autoritativo e resultado recuperável BOOKING. GET detalhe pode receber scope PERSONAL/UNIT explícito, **sem que esse parâmetro conceda acesso**.

- [ ] Confirmar rotas/factories montadas e transações reais. Na leitura desta preparação, cancel/reschedule não consomem key e expectedVersion é opcional. Escrever testes HTTP que falham se o mesmo requestId repetir evento/alteração ou não aparecer no GET/close.
- [ ] Rodar `npm test -- src/infra/drizzle/booking-action-idempotency.integration.spec.ts src/infra/http/booking-actions-contract.e2e.spec.ts` em PG isolado verificado. Registrar RED pertinente, sem expor DATABASE_URL.
- [ ] Ligar handlers existentes ao executeOnce e **mesmo tx** de recurso/evento/feed; não envolver use case que abre outro commit independente. Protocolo tentativa→unidades→profissionais globais→vínculos→reserva/evento, IDs ordenados, clock PG após todos os locks. Hash inclui ação/recurso/unidade/beneficiário/slot/serviços/version e dados efetivamente submetidos; rejeitar mismatch.
- [ ] Key/versão são obrigatórias no contrato novo. Compatibilidade legada deve ser explícita e não abrir atalho sem as garantias novas. Registrar rejeição terminal/fence para QUOTE_CHANGED e resultados definitivos. Falhas de autorização/revalidação falham fechado; replay/GET/close não devolvem DTO privado após perda de acesso.
- [ ] Usar uma política de scope para mutation e detalhe/capabilities. PERSONAL exige beneficiário=ator; UNIT exige vínculo/agenda autorizados. OWNER em outra unidade negado. Permissão para atuação profissional não altera prazo pessoal de quem é também consumidor.
- [ ] Manter /reschedule como única remarcação consumida neste pacote. API PR50 é referência/dependência externa; não mergeá-lo nem alterar sua branch. Se /update já tiver sido publicado no momento da execução, registrar consumidores existentes e preparar compatibilidade delegando à mesma policy/tx/version/ledger, em entrega específica revisável; não habilitar segunda autoridade.
- [ ] Testes PG de request concorrente/key/versão, rollback após mutação antes do ledger, notificações únicas, prazo atravessado após lock, conflito que conserva original, NOT_APPLIED→original tardia e APPLIED consultável após24h. Assert `newEvents===1`, `sameKey.resource.id===first.id`, `closeApplied` mantém reserva; rollback deixa versão/slot/eventos/feed originais.
- [ ] Atualizar contratos/exemplos, rodar regressões de operações/lifecycle, TypeScript/checks da API e checkpoint `fix(bookings): reconciliar acoes de reserva no servidor`.

**Gate:** HTTP/PG provam ledger real das ações; DTO/instantes/version/fence/capabilities/feed coerentes. Se histórico cronológico de eventos continuar indisponível, registrar limitação expressa da UI; não inventar trilha. Esse endpoint de histórico não será criado por conveniência nesta integração.

## I3 — Uma execução recuperável para criar/remarcar/cancelar/status

**Files frontend:** `src/features/bookings/model/booking-draft.ts`, criar `booking-command.types.ts` e `booking-operation-engine.ts`; `model/use-booking-flow.ts`, `use-booking-detail.ts`, `ui/BookingActionConfirm.tsx`, `BookingRecovery.tsx`; `lib/server-clock.ts`, `normalize-booking-error.ts`; adapters/DTOs/schemas em bookings/api e `src/shared/operations` quando necessário. Testes `booking-operation-engine.test.ts`, `booking-actions-recovery.test.ts`, `bookings.test.ts`, contratos/clock/store/lifecycle existentes.

**Interfaces:** `BookingCommand` discriminado por CREATE/RESCHEDULE/CANCEL/COMPLETE/NO_SHOW contém actorId/scope/shopId e o body imutável, bookingId/expectedVersion obrigatórios nas alterações. `BookingOperationEngine.prepare(command)`, `submit()`, `reconcile()`, `close()` usam um registro por actorId/requestId e transport real. BookingFlowEngine torna-se facade compatível sobre essa execução, sem segundo store/regra de replay. `useBookingDetail` e modal chamam o mesmo serviço; referências resultantes seguem OperationAttemptResult existente.

Tipos/retornos a publicar em `booking-command.types.ts`: `PreparedBookingOperation={requestId:string,command:Readonly<BookingCommand>,createdAt:number}` e `BookingOperationData={booking:BookingDto,serverTime?:string}`. `prepare(command:BookingCommand):Promise<PreparedBookingOperation>` prepara/persiste o comando; `submit()`, `reconcile()` e `close()` retornam `Promise<OperationAttemptResult<BookingOperationData>>`. Callers só exibem sucesso após validar APPLIED; data pode estar ausente por accessChanged. actorId/contexto não são enviados como identidade autorizadora no JSON: o servidor deriva o ator da sessão. Campos required da union impedem RESCHEDULE/CANCEL/COMPLETE/NO_SHOW sem bookingId/expectedVersion; COMPLETE/NO_SHOW mapeiam para TRANSITION_BOOKING_STATUS com status correspondente.

- [ ] Escrever testes RED: sem clock/entropy/storage zero requests; CANCEL após response-loss mantém key; UNKNOWN/503/404/close{} não cria outra; após relogin sem payload só reconcilia; side effect aplicado uma vez após replay/close.
- [ ] Fixar vocabulário: frontend reviewing/submitting/confirmed/uncertain/error; servidor PENDING/APPLIED/NOT_APPLIED/UNKNOWN. O teste atual pending/submitting deve esperar **submitting antes do envio** e confirmed após confirmação, mantendo assertions de persist-before-request. Não inserir estado inválido apenas para fazer teste passar.
- [ ] Remover syncWithServer(new Date()) e Date.now() nos callers de novas operações. Sync só a partir de serverTime validado da resposta HTTP; intervalos usam performance.now ou fonte monotônica suportada; sem referência retornar erro de recuperação de clock. Não gerar key em cada clique/render de modal.
- [ ] Capturar comando **completo e igual ao enviado** antes de persistir; o estado atual do componente/cliente selecionado não pode mudar o replay. Whitelist de storage inclui bookingId/action/scope/version/slot/dados não sensíveis necessários. reason é opcional: se tratado como transitório e não persistido, conservar somente referência e não reconstruir replay com reason diferente. CPF/e-mail/credenciais/DTOs de cliente nunca são persistidos.
- [ ] Versionar o schema persistido do comando. Tentativas antigas sem action/bookingId suficientes mantêm referência/key e só podem ser consultadas/fechadas; não reinterpretar um registro antigo CREATE_BOOKING como criação nova se ele representava remarcação. Corrupção/erro de storage não equivale a ausência segura para iniciar nova mutation.
- [ ] Status submitting é gravado antes do transporte; falha de save produz zero requests. Doubletap usa trava por tentativa e sessão. Resposta perdida/JSON inválido/erro após envio fica incerta; erro genérico não vira prova de não aplicação. Falha de save após APPLIED não altera o fato conhecido; reconsulta segura resolve persistência sem nova mutation.
- [ ] Reconcile valida envelope/kind, operation e resource/data: BOOKING pode conter `{booking,serverTime}`. APPLIED sem acesso/dados indica aplicado com acesso alterado; não confirmar DTO inventado nem criar outra reserva. NOT_APPLIED só libera nova revisão quando vindo de decisão autoritativa. Sem payload após logout/TTL não existe replay inventado.
- [ ] Persistir/limpar coordenadamente com lifecycle. Testar operação em voo→logout→contaB→resposta tardia: zero PII em storage/cacheB, referênciasA opacas, erro de cleanup explícito e novo envio bloqueado se necessário. Não usar clearAllForActor que apague incertezas.
- [ ] QUOTE_CHANGED exige quote validada e NOT_APPLIED/fence conforme I2; usuário revisa preço/duração e reconfirma; nenhuma key/POST automática ao receber cotação. Retomar após login/verify também não envia mutation.
- [ ] Rodar focused tests e `npm run typecheck`; checkpoint `fix(bookings): compartilhar execucao recuperavel das acoes`.

**Gate:** todos os callers de mutation passam pelo mesmo caminho seguro; mock não substitui a prova PG de I2. O teste isolado conhecido e os novos cenários passam.

## I4 — Remarcação navegável, scopes e cache coerentes

**Files:** `src/features/bookings/model/booking-query-keys.ts`, `use-booking-detail.ts`, `use-booking-flow.ts`, `booking-flow.types.ts`; `ui/BookingDetailView.tsx`, `BookingFlowView.tsx`, `BookingReview.tsx`; `src/app/(account)/bookings/[bookingId].tsx`; criar `src/app/(account)/bookings/[bookingId]/reschedule.tsx`; `src/features/agenda/api/agenda.api.ts`, `agenda.http.ts`; availability/dashboard/notifications keys e callers afetados. Testes `booking-reschedule-flow.test.ts`, `booking-cache-invalidation.test.ts`, `booking-scope.test.ts`.

**Interfaces:** `resolveBookingContext({actorId,selectedMembership,booking,requestedScope})` valida contexto frontend sem substituir RBAC; `useBookingFlow` recebe modo explícito CREATE ou RESCHEDULE e initialBooking em remarcação. keys de detalhe/unidade incluem actorId/scope/shopId; `invalidateBookingQueries` usa os builders reais, não arrays divergentes.

- [ ] Testar RED: botão Remarcar abre reserva original/version em PERSONAL/UNIT; em UNIT+bookingId dispara **PATCH /reschedule e zeroPOST /bookings**. Troca de customer/shop em remarcação é proibida; BARBER não transfere.
- [ ] Rota de detalhe lê/valida scope e a unidade real da reserva, não fixa PERSONAL para todos. Scope da URL nunca autoriza terceiro; contexto inválido mostra negação. Backend fornece capabilities do mesmo contexto em I2; não mesclar prazo pessoal/equipe.
- [ ] Conectar botão Remarcar ao fluxo quando capabilities.reschedule.allowed=true. Pré-carregar serviço/profissional/data originais, preservar valores conhecidos e permitir nova escolha de slot/cotação. expectedVersion vem da reserva carregada. Mudança de versão reconsulta e exige confirmação, não atualiza silently.
- [ ] Despacho por operação vem **antes** da distinção PERSONAL/UNIT. CREATE UNIT continua POST; RESCHEDULE de ambos continua PATCH. operation/requestId do ledger é RESCHEDULE_BOOKING, não CREATE_BOOKING por facade antiga. Conflict/quote mantém reserva original intacta.
- [ ] Centralizar keys de agenda (`['agenda','day',...]` atualmente) e invalidação por prefixo correto; detalhes/listas/agenda/dashboard/feed autenticados isolados por ator/unidade/contexto. Cobrir disponibilidade na porta usada por Horários e pela reserva. Troca de profissional/data invalida antigas/novas seleções.
- [ ] Testar com QueryClient e queries registradas: ao aplicar mutation, agenda do shopA/atorA é marcada stale/reconsultada e shopB/atorB permanece intacta; payload não acessível por key alheia. Testar sucesso seguido de falha de refetch: manter ação aplicada e mostrar dados desatualizados/retry, sem reenviar mutation.
- [ ] Preservar paginação pessoal real20, resumo unitário independente da página, null legado, timezone/startsAt e serverTime. Ações sem version/instante/authority necessários falham fechado. UI de horário usa fuso da unidade; nenhuma soma de unknown como0/PAID.
- [ ] Rodar testes acima+agenda/dashboard, typecheck e checkpoint `fix(bookings): alinhar remarcacao contexto e cache`.

**Gate:** remarcação realmente acessível para perfis permitidos e sem criar outra reserva; caches ativos se atualizam corretamente sem restoreSession.

## I5 — Importar Atendimentos preservando autoria e usando o domínio comum

**Files PR28:** `src/features/bookings/api/bookings.contract.ts`, `bookings.http.ts`, `normalize-bookings-error.ts`; `model/use-bookings-view-model.ts`, `bookings-state.ts`, `compute-end-time.ts`; `ui/BookingsView.tsx`, `BookingsHeader.tsx`, `BookingManageCard.tsx`, `EditBookingSheet.tsx`, `BookingCancelDialog.tsx`; `index.ts`; arquivos de navegação/dashboard/agenda/shared-ui do diff28. Novos testes `bookings-view-model.test.ts`, `bookings-management-contract.test.ts`; adaptar testes PR28 de HTTP/duração/normalização.

**Interfaces:** Atendimentos consome OperationalContext existente de auth (`userId,shopId,role,timezone`), passando userId como actorId na composição do comando e normalizando os roles unitários conhecidos; não redefinir o tipo global para fazer o adapter caber. Dados são BookingDto comuns. Leitura usa fetchUnitBookings/keysI4; comandos usam engineI3/policyI2. DTO de cliente canônico é BookingCustomerDto; seleção de cliente pode ser BookingCustomerSelection. Barrel usa exports explícitos sem BookingCustomer duplicado.

- [ ] Reconsultar headPR28 e importar em isolamento **via merge local sem commit imediato** após snapshot local das tarefas anteriores. Preservar autoria/história do PR28; o merge observado tende a conflitar no index, mas tratar quaisquer novos conflitos semanticamente. Não escolher ours/theirs para o pacote inteiro nem alterar a branch do outro desenvolvedor.
- [ ] Inventariar imports/componentes de PR28. Typecheck reproduz os três hooks ausentes e teste de exports reproduz colisão; corrigir consumidores, não restaurar uma API paralela chamada /update só para compilar.
- [ ] `useBookingsViewModel` usa contexto selecionado e query paginada da unidade: BARBER própria agenda, OWNER pode escolher equipe/minha agenda quando atende. Nenhuma consulta privada deve disparar sem contexto válido, mesmo antes de UI retornar EmptyState.
- [ ] Remover chamadas de rede de BookingsHttpAdapter paralelo; se uma facade de compatibilidade for útil para UI, ela delega exclusivamente aos adapters/engine comuns. Atualizar/remover types obsoletos só após migrar todos os imports. Preservar computeEndTime como **estimativa visual**, nunca autoridade de slot/preço/prazo.
- [ ] BookingManageCard recebe status/version/capabilities/startsAt/endsAt/timezone e snapshots; ações condicionadas a autoridade/prazo. Valores desconhecidos exibem incompletude, não zero. Telefone vazio/inválido não habilita WhatsApp; abertura é ação do usuário.
- [ ] EditBookingSheet usa disponibilidade/fluxo I4 e snapshot/version reais, não HH:mm livre contra /update. Preservar visual/calendário/resumo compacto; mudanças de serviços/profissional seguem regra aprovada. BookingCancelDialog preserva confirmação por pressão longa e acessibilidade, mas delega execução ao mesmo comando persistido de cancelamento; timeout mantém tentativa/modal de recuperação.
- [ ] Unificar vocabulário de erros e invalidations. Uma tela não pode anunciar sucesso antes da leitura validada nem apagar tentativa incerta ao fechar modal. Refetch503 mostra dado antigo sinalizado/retry, sem falso vazio/sucesso.
- [ ] Rodar testes de ambos os módulos, typecheck e commit/merge local preservando proveniência `refactor(bookings): integrar apresentacao de atendimentos`.

**Gate:** tela do PR28 funciona pelos mesmos endpoints/políticas/tentativas do Grupo4; nenhum hook ausente, export ambíguo ou atalho /update permanece no frontend.

## I6 — Rotas e navegação por perfil

**Files:** criar `src/app/(app)/atendimentos.tsx`; não manter `(app)/bookings.tsx` operacional novo; atualizar `(app)/_layout.tsx`, navigation.types/helpers, BottomCapsuleBar/DesktopSidebar/LeftDrawer e testes; ajustar callers de agenda/dashboard/shared confirm helper para destino real. Preservar `(client)/bookings.tsx` e detalhe de conta. Testes `navigation.test.ts`, novo `bookings-navigation.test.ts`.

**Interfaces/destinos:** `/atendimentos` é operação privada; `/bookings` permanece consumo pessoal; `/bookings/:bookingId` e `/bookings/:bookingId/reschedule` são recursos autenticados com scope validado; `/new-booking` é entrada UNIT. Os grupos Expo podem qualificar navegação interna, mas os pathnames públicos precisam ser distintos.

- [ ] Testar RED: Atendimentos não compete com Minhas Reservas no mesmo /bookings; refresh/deep links preservam perfil/contexto. Só adicionar destino visível se contexto operacional válido. OWNER que atende pode acessar minha agenda; OWNER global sem vínculo correspondente não ganha privilégio.
- [ ] Preservar menu/drawer/sidebar e melhorias visuais do PR28, label compacta/acessível e overflow do dashboard. Trocar links para destino canônico /atendimentos, atualizar activeDestination por pathname exato; não interpretar qualquer caminho containing bookings como Atendimentos.
- [ ] PR28 ainda não foi merged no baseline; seu /bookings operacional não é um contrato público estabelecido. Não criar redirect duplicado que recrie ambiguidade. Se houver consumidor legado confirmado na execução, `/bookings` deve resolver destino por entrada/escopo seguro sem duas telas concorrentes; registrar essa compatibilidade e teste.
- [ ] Detalhe/ações abertos pela agenda levam scope UNIT, recursos pessoais levam PERSONAL, sem conceder autoridade pela URL. CLIENT/PLATFORM_ADMIN não veem operação da unidade sem vínculo permitido.
- [ ] Usar shared confirm-destructive-action após mudança de localização do PR28 e atualizar todos os imports, sem manter cópias divergentes. Validar foco/teclado/leitor/touch44px/safearea/navbar e temas atuais.
- [ ] Rodar navegação/guards/typecheck/build e checkpoint `fix(navigation): separar atendimentos de reservas pessoais`.

**Gate:** destinos únicos e acessíveis, papéis por unidade corretos e melhorias de ambos preservadas.

## I7 — Homologação da composição

**Files:** criar roteiro/harness em `tests/integration/bookings-prs.integration.spec.ts` ou infraestrutura equivalente já suportada; relatório `docs/HOMOLOGACAO_INTEGRACAO_PRS_28_29_2026-10-12.md`. Não instalar framework novo se browser manual+tests existentes comprovarem os critérios. Credenciais apenas em runtime.

**Interfaces:** consome candidato integrado e API/PG isolados; entrega PASS/PARTIAL/FAIL/NOT TESTED por contrato/plataforma, base/versões e passos reproduzíveis sanitizados.

- [ ] Rodar suite frontend `npm test`, `npm run typecheck`, `npm run build` e suite/checks API após I2. Esperar exit0, sem impor número histórico280/306: registrar número efetivo e nomes. Falhas não podem ser ocultadas por skip/assertion frouxa/timeout maior.
- [ ] HTTP/PG real: CLIENT cria2serviços→me/detalhe; BARBER agenda cliente próprio profissional; OWNER escolhe equipe; remarcação3campos→mesmoID/version+1 e zero nova reserva; cancel/status→eventos/feed únicos. Confirmar vários serviços persistidos e identidade do ator/beneficiário.
- [ ] Falha após commit com resposta descartada em proxy/harness isolado: cada ação resolve pelo GET da tentativa; replay mesma key não duplica; closeAPPLIED não cancela; closeNOT_APPLIED impede original tardia. Logout→B→A e24h+ preservam referência e zero novas mutations. Não confundir mock rejeitado antes do save com esse cenário.
- [ ] Bordas temporais PG: consumidor−2h permite e−2h+1s nega; equipe no início nega; NO_SHOW14m59s nega e15m permite; COMPLETED antes início nega. Espera pelos locks atravessando prazo deve negar sem efeito. Fuso do aparelho diferente não altera instant/slot.
- [ ] Browser desktop/mobile viewport: catálogo→login/verificação→revisão sem autoPOST; /atendimentos, /bookings, detalhe/remarcar por deep link e refresh; troca de shop/conta; confirmação longa/teclado; display dark/light; ausência declock/storage0requests; retorno às listas/agenda/dashboard/feed após ações. Manter próxima fila/valores factuais e histórico limitado sem inventar eventos.
- [ ] Regressão login→reload→refresh→logout→segundo login no transporte web/cookie/proxy, native URL absoluta e storage de credenciais preservados. Não usar produção como fixture nem enviar mensagens a clientes.
- [ ] Android/iOS: validação independente se houver ambiente; caso contrário NOT TESTED, sem declarar pacote multiplataforma homologado por Expo Export. Registrar limitações da trilha de auditoria e qualquer contrato backend faltante.
- [ ] Emitir relatório por evidência, anexar testes/reprodução/IDs não secretos necessários; corrigir somente problemas demonstrados e repetir checks afetados.

**Gate:** nenhum bloqueador de Git/compilação/contrato/privacidade/recuperação; browser/HTTP/PG essenciais comprovados. Native não testado é limitação explícita de release, não PASS.

## I8 — Revisão independente e publicação somente após autorização

**Files/artifacts:** diff final, relatório I7 e `docs/ENTREGA_INTEGRACAO_PRS_28_29_2026-10-12.md` com mapa de commits/proveniência/pendências/publicação proposta.

- [ ] Revisor independente lê os dois diffs originais e candidato: preservação da UI28 e core29, autoria, versões/keys/transações, fail-closed, clock/storage/lifecycle, RBAC/cache/rotas, legado/preços e testes reais. Classificar achados; corrigir e repetir checks afetados antes de veredito.
- [ ] Comparar heads dos PRs/main novamente. Se houver novos commits, integrar em isolamento e revalidar os pontos afetados; não publicar em cima de trabalho posterior por referência antiga.
- [ ] Preparar pacote concreto de publicação: diff/commits corrigidos por responsabilidade, títulos/descriptions coerentes com a entrega final, plano de API/deploy e checks obrigatórios. A execução local não altera, fecha ou comenta automaticamente PR28/29/50.
- [ ] Proposta padrão: fornecer correções do PR29 e adaptação do PR28 em commits distinguíveis no candidato; coordenar publicação com os autores. Atualizar a branch do PR29 ou publicar branch integrada só após autorização explícita da estratégia final. Se precisar reescrever branch própria, backup remoto conhecido e force-with-lease com SHA esperado; nunca force push na branch de outro autor.
- [ ] Ordem de release: API indispensável validada/disponível antes de frontend consumidor; registrar compatibilidade e migration necessária. Proteções/checks/review humana continuam: a exceção emergencial do antigo PR26 não vale aqui. Merge/deploy/backup/migration de produção precisam de autorização específica no final.
- [ ] Após publicação autorizada, acompanhar checks/deploy e verificar login/leituras e fluxo acordado sem criar fixtures destrutivas em produção. Se regressão, reverter somente commits deste release e preservar commits terceiros; mudanças de schema exigem plano forward/rollback comprovado, não drop automático.

**Entrega desta execução futura:** candidato local revisado, testes/evidências, limitações e publicação pronta para decisão. Não marcar PRs merged nem Grupo4 homologado em produção antes disso.

## Coverage e critérios de conclusão

| Achado/recomendação | Tarefa | Aceite |
| --- | --- | --- |
| 20 conflitos herdados do PR29 | I1 | Delta Grupo4 sobre main, histórico/snapshots preservados |
| pending/submitting e clockfallback | I3 | Estado válido; zeroenvio sem referência real; callers cobertos |
| key enviada mas ignorada no servidor | I2 | Ledger HTTP/PG recupera todas as mutations |
| Três hooks ausentes/tiposduplicados | I5 | Consumidores migrados; TypeScript exit0 |
| /update vs /reschedule | I2/I5 | Um contrato/autoridade, nenhum atalho frontend |
| remarcação sem entrada/UNITcriaPOST | I4 | Botão real, PATCH mesmoID/version, zeroPOST |
| scopePERSONALfixo e privilégio global | I2/I4/I6 | Contexto válido e política do mesmo scope |
| keys não invalidam agenda/dados cruzados | I4/I5 | QueryClient com queries reais demonstra isolamento/invalidation |
| /bookingsambíguo e OWNERatende | I6 | /atendimentos distinto, deep links/menus por vínculo |
| claims280PASS/browser sem nova evidência | I7/I8 | Relatório atual e revisão independente, sem promover mocks a produção |

Self-review desta preparação: quatro recomendações mapeadas; arquivos/interfaces/testes/gates definidos; execuções futuras seguem método já escolhido. Nenhum código de aplicação, branch remota, PR ou banco foi alterado nesta elaboração. Requisitos pendentes são executáveis/condicionados ao acesso autorizado, não declarados já concluídos.

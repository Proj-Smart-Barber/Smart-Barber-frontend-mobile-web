# Equipe, cadastro profissional e descoberta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Atualização de execução:** [Agrupamento solicitado pelo usuário](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md) prevalece: E1+B2 no Grupo1; E2+G2/G3 no Grupo5; E3+H1/H2/H3 no Grupo6. Um executor/revisor por grupo, mantendo checkpoints/testes internos e estes critérios.

**Goal:** entregar dados/ações de equipe para OWNER, cadastro CPF com conta única e unidades públicas para a home cliente.

**Architecture:** evoluir barbershop/membership/invitations existentes; cadastro profissional pendente usa convite/aceite comuns. Descoberta é leitura pública independente das mutations de equipe; nenhuma distância é calculada sem geolocalização.

**Tech Stack:** Express/Zod/Drizzle/PostgreSQL/Vitest no backend `D:/smart_barber/api`.

**Spec:** [desenho D05/D10/D13/D16](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md), [cadastro D05 anterior](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_INTEGRACAO_E_DECISOES_2026-10-11.md), [plano global](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md).

## Global Constraints

- CPF/conta únicos; OWNER informa nome/CPF/e-mail, titular define credencial/aceita. Conta existente não tem identidade/senha alteradas pelo owner.
- MEMBER ACTIVE/INACTIVE por unidade; conta BARBER preservada; retorno exige novo convite/aceite.
- Não inativar com atendimento futuro/em andamento; criação/remarcação E/B compartilham autoridade PostgreSQL.
- Recursos públicos de unidade não incluem CPF/ownerId/e-mail privado; paginação20/máx100; geolocalização futura.
- Contratos/migrations publicados somente com autorização; mesma disciplina de gates globais e B2 para mutations.

## Review Focus

- CPF/e-mail apontam a contas distintas ou mudam entre cadastro e aceite — E2.
- Criação entra depois de verificar desligamento — E1.
- Novo convite após INACTIVE não apaga períodos/histórico — E2.
- Membro OWNER em outra unidade tenta listar/editar equipe — E1.
- Busca pública de endereço vazio/acentos e unidades inativas — E3.

## E1 — Equipe e desligamento por unidade

**Reaproveitamento confirmado:** GET /barbershops/:shopId/professionals é seleção pública mínima e não substitui gestão privada de estado/version/membershipId; /users/me/barbershops já lista vínculos pessoais. Ampliar essas consultas/repositories e criar somente team/deactivation privados. status no DTO pessoal atual é da loja, não do vínculo. IDs públicos de profissional são userId, diferentes do membershipId da desativação.

**Files:** modificar `src/domain/enterprise/entities/membership.ts`, `src/domain/application/repositories/memberships-repository.ts`, `src/infra/drizzle/repositories/drizzle-memberships-repository.ts`, `src/infra/drizzle/mappers/drizzle-membership-mapper.ts`, schema e routes; criar use cases/controllers/factories `list-unit-team` e `deactivate-unit-membership`, teste `src/infra/drizzle/membership-lifecycle.integration.spec.ts`.

**Interfaces:** `TeamMemberDto={membershipId,userId,name,role,state:'ACTIVE'|'INACTIVE',version:number,joinedAt,endedAt?,avatarUrl?}`; `listUnitTeam(actor,shopId,{state,page,limit})→{items,page,hasNext,serverTime}`; `deactivateMembership(actor,shopId,membershipId,expectedVersion)→TeamMemberDto`. Version está presente na listagem/detalhe/resultado e Swagger; concorrente gera MEMBERSHIP_VERSION_CONFLICT. GET me/barbershops/capabilities/profissionais usam ACTIVE. OWNER não desativa a si/ownership como atalho: mudança de dono não faz parte desta entrega.

**Prerequisite/ownership:** B1 entrega campos/estados das reservas. E1 cria `src/domain/application/services/professional-membership-unit-of-work.ts` (port) e `src/infra/drizzle/services/drizzle-professional-membership-unit-of-work.ts` (impl), com `withLocks({unitIds,professionalIds,membershipIds}, work)`: refs em ordem estável, clock PG e leitura/revalidação sob locks. B3/B4 e aceite/revogação E2 consomem este mesmo port; B2 acrescenta a chave de tentativa antes dos locks de recurso. E1 testa corrida com fixture/comando controlado; integração HTTP final da corrida pertence a B3. Sem copiar locks locais entre use cases.

Port inclui `unitIds` e segue unidade→profissionais globais→vínculos→reserva; time fresco apóslocks. Lista20/máx100 por joinedAt/id e SQL indexado. B2 executa desativação e demais mutations autenticadas com resource.kind=MEMBERSHIP/REGISTRATION/INVITATION, sem CPF/senha duplicados no ledger. Após resposta perdida, GET/close de operação revalida autorização e resolve recurso, não dispara novo convite/desligamento.

- [ ] Testar `future_booking_blocks_deactivation`, `booking_deactivation_race`, `owner_in_other_unit_is_denied`: `expect(blocked.code).toBe('MEMBERSHIP_HAS_BOOKINGS'); expect(race.inactive && race.createdFutureBooking).toBe(false); expect(otherUnit.status).toBe(403)`.
- [ ] Rodar `npm test -- src/infra/drizzle/membership-lifecycle.integration.spec.ts`; falha pelo estado/rota ausentes.
- [ ] Implementar listagem/policy/estado/versão/evento sob a mesma disciplina de lock/transaction B3/B4; legado null futuro/em andamento bloqueia também; mostrar IDs autorizados das reservas bloqueadoras. Testar versão lida→desativação versus vínculo alterado→409 e nenhuma inativação. Não apagar conta/reservas ou vínculos de outras lojas.
- [ ] Testar PG/HTTP: INACTIVE sai de profissionais/disponibilidade e perde operação; consumer e convites de conta continuam permitidos. Janela CONFIRMED em andamento bloqueia; estado terminal real ou término da janela resolve impedimento.
- [ ] Depois de B2, testar `deactivation_response_loss_reconciles`: efeito uma vez, resultado MEMBERSHIP/version no GET da tentativa, mesma key não duplica evento; close depois do commit devolve APPLIED. Fechamento antes de original atrasada impede inativação. Integração final HTTP com B3 fecha a corrida; não introduzir ciclo para entregar o port inicial.
- [ ] Revisão/commit `feat(team): gerir vinculos e desligamento por unidade`.

## E2 — Cadastro CPF, ativação e novo aceite

**Reaproveitamento confirmado:** criar/listar/revogar convites e aceitar/recusar por ID ou token já têm rotas/factories/use cases. Ampliar handlers existentes, sem outro endpoint/caso de aceite paralelo. Cadastro CPF/ativação não existe como rota, apesar da tabela. Corrigir autorização do detalhe por ID (destinatário/OWNER autorizado) e unificar promoção CLIENT→BARBER/membership/convite na transação; hoje a promoção ocorre antes dela.

**Files:** evoluir `src/domain/application/use-cases/invitations/invite-barberman/invite-barberman.ts`, `respond-to-invitation/respond-to-invitation.ts`, controllers/factories de invitations e schema `barberRegistrations`; criar use cases/controllers `create-barber-registration`, `activate-barber-registration`, factories/repository; teste `src/infra/drizzle/barber-registration.integration.spec.ts`.

**Interfaces:** `createBarberRegistration(actor,shopId,{name,cpf,email})→RegistrationDto` pendente + convite comum; `activateRegistration(token,{password,...requiredIdentity})` conserva D05 anterior; `acceptById(actor,id)` atualiza vínculo e somente CLIENT→BARBER quando cabível. Conta OWNER não é rebaixada. Convite novo pode reativar vínculo INACTIVE após aceite, com novo período/history.

- [ ] Testar matriz D05: livre/livre; CPF/e-mail mesma conta; CPF existente/e-mail divergente; CPF livre/e-mail ocupado; contas distintas. `expect(existingUser.passwordHash).toBe(originalHash); expect(userCountForCpf).toBe(1); expect(stateAfterInvite).toBe('INACTIVE'); expect(stateAfterAcceptance).toBe('ACTIVE')`.
- [ ] Rodar `npm test -- src/infra/drizzle/barber-registration.integration.spec.ts`; observar lacuna de rotas/ativação real.
- [ ] Implementar identificação pendente/consumo transacional/unique indexes e handlers compartilhados com convite. Aceite exige titular correto/e-mail confirmado/vínculo inviter ainda autorizado; cadastro novo não concede BARBER por signup público. Race CPF/email e revogação/aceite são revalidados em PG. Limpeza de PII pendente após30d segue D05, sem apagar identidade da conta.
- [ ] Rodar testes unitários + HTTP/PG: aceite/recusa por ID e link, conta errada, nova senha não aplicada a existente, convites expirados/revogados, retorno após desligamento e outras unidades preservadas. Entrega real de e-mail é homologação própria, não fixture.
- [ ] Testar cadastro/convite/revogação com resposta perdida e retomada: resultado REGISTRATION/INVITATION uma vez, consulta/close resolve antes de nova chave; storage/ledger de tentativa não retém credenciais/CPF/e-mail além da finalidade D05. Ativação/token públicos usam consumo atômico anterior, não replay de senha.
- [ ] Revisão/commit `feat(team): concluir cadastro profissional com identidade unica`.

## E3 — Descoberta pública sem geolocalização

**Files:** criar controller/use case/factory `list-public-barbershops`; modificar `src/infra/http/routes/barbershop.routes.ts`, repository/schema indexes aplicáveis e Swagger; teste `src/infra/http/controllers/barbershop/list-public-barbershops.spec.ts` e HTTP fixture paginada.

**Interfaces:** `GET /api/barbershops?q=&page=1&limit=20` → `{items:[{id,name,location,timezone,avatarUrl?}],page,hasNext}`; q busca nome/endereço textual; apenas ACTIVE, ordenação estável nome/id. Não presumir campo city estruturado no schema atual. Futura busca por coordenadas é outro contrato.

- [ ] Testar `inactive_unit_is_not_public`, `pagination_is_stable`, `public_dto_has_no_owner_identity`: fixture com uma unidade ativa e uma inativa; `expect(items.map(x=>x.id)).toEqual([activeUnitId]); expect(nextPageIds.some(x=>firstPageIds.includes(x))).toBe(false); expect(publicItem).not.toHaveProperty('ownerId')`. Não testar status em campo que o DTO público não contém.
- [ ] Rodar teste para observar rota faltante/DTO atual excessivo.
- [ ] Implementar listagem/normalização de q/paginação20/máx100, dados públicos e tratamento de endereço ausente; verificar SQL parametrizado/índices sem inventar distâncias.
- [ ] Testar HTTP com nome/acentos/endereço vazio, páginas finais, limit inválido e unidade desativada; `npm test`, `npx tsc --noEmit`, `npm run check`.
- [ ] Revisão/commit `feat(barbershops): listar unidades publicas para descoberta`; atualizar Swagger/exemplos de E1–E3 e entregar a G/H.

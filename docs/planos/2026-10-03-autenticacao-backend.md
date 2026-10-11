# Autenticação backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar identidade única, sessão persistente revogável, verificação/recuperação, acesso do gestor e cadastro profissional iniciado pelo proprietário.

**Architecture:** Evoluir User e membership, mantendo casos de uso/serviços de aplicação com Either e portas injetadas. Operações de identidade e tokens usam unidade de trabalho Drizzle; HTTP traduz contratos sem conceder permissões por campos do corpo.

**Tech Stack:** TypeScript, Express, PostgreSQL, Drizzle, bcryptjs, jsonwebtoken e Vitest já presentes.

**Spec:** [Desenho aprovado](../DESENHO_AUTENTICACAO_2026-10-03.md) e [contrato C01–C10](../CONTRATO_AUTENTICACAO_2026-10-03.md), que decide interfaces/valores usados abaixo.

## Global Constraints

- Uma conta por CPF, com um único tipo vigente: cliente, barbeiro, proprietário ou gestor da plataforma.
- Cliente precisa de conta, autenticação e e-mail confirmado para agendar.
- Proprietário inicia o cadastro do barbeiro; o titular ativa seu acesso. Cliente existente evolui na mesma conta, preservando CPF, ID, credenciais e histórico.
- Barbeiro pode integrar várias unidades e agendar serviços para si. Mantém o tipo barbeiro após sair da última unidade.
- Proprietário pode administrar e atender. Seu cadastro de conta/barbearia já está pronto e será preservado.
- Recuperação de acesso e confirmação por e-mail nesta entrega. Google, Apple, MFA e recrutamento ficam para evolução futura.
- Planos, métricas comerciais e cobrança ficam para evolução futura; gestor recebe somente acesso previsto em C02.
- Repositório alvo: `D:/smart_barber/api`, base inspecionada `main@5564d5bf0df757389ef6f4b508f748fe7cc0035a`; revalidar checkout/HEAD antes de executar.
- Arquivos abaixo são relativos à API; nenhuma migração em banco real, mensagem real, commit, push ou deploy sem autorização explícita da execução. Passos de commit são condicionais; nomes neutros.
- Testes HTTP importam factory isolada, nunca o entrypoint com migração/segredos; PostgreSQL somente descartável e identificado como teste.

## Review Focus

- CPF criado por cadastro público durante ativação profissional: preservar identidade e exigir autenticação correspondente — B05.
- OWNER legado sem e-mail verificado: preservar gestão existente sem declarar contato verificado; novo OWNER conclui setup — B01/B06.
- Refresh com resposta perdida/duas abas e logout concorrente: resultado determinístico e sem ressuscitar sessão — B03.
- Query/body tentando substituir IDs do caminho ou autor: parâmetros e identidade autoritativos prevalecem — B00/B06.
- Migração com CPF/e-mail equivalente ou tipo ambíguo: interromper imposição de unicidade/classificação, sem merge — B01/B02.

## Mapa de arquivos e dependências

B00 prepara HTTP testável; B01 define identidade; B02 cria persistência transacional; B03/B04 implementam sessão e ações; B06 perfil/integração é executada ANTES de B05 cadastro profissional, fornecendo sua autorização concreta. Ordem: B00→B01→B02→B03→B04→B06→B05. Os IDs são estáveis, não representam obrigatoriamente ordem numérica. Contratos C01–C10 são a interface compartilhada. Novas classes de aplicação não importam Express ou configuração global de ambiente.

### Task B00: HTTP isolado, autoria e manutenção fora do acesso público

**Files:** Modify `src/app.ts`, `src/core/infra/http-response.ts`, `src/core/infra/adapters/express-route-adapter.ts`, `src/infra/http/middlewares/ensure-user-is-authenticated.ts`; Create `src/infra/http/create-app.ts`, `src/infra/http/auth-request-context.ts`, `src/infra/http/create-app.spec.ts`, `src/core/infra/adapters/express-route-adapter.spec.ts`, `test/helpers/http-request.ts`.

**Interfaces:** Produces `createApp(options:{routes:Router;allowedOrigins:string[]}):Express`, sem inicialização de banco/migração; `HttpResponse` acrescenta `headers?:Record<string,string|string[]>`; contexto contém body/params/query separados, Origin, headers browser e ator `{userId,sessionId?}`. A forma flat legada permanece, com params prevalecendo sobre query/body e ator atribuído por último. Novos controllers validam body estrito separado.

- [ ] **Step 1:** Criar testes `public_maintenance_is_unavailable` e `author_and_path_cannot_be_overridden`:

```ts
expect((await request(app, 'GET', '/api/system/migrate')).status).toBe(404);
expect((await request(app, 'POST', '/api/system/demo-seed')).status).toBe(404);
expect(captured.userId).toBe(authenticatedUserId);
expect(captured.shopId).toBe(pathShopId);
```

`request(app,method,path,body?)` será helper HTTP local em `test/helpers/http-request.ts`, criado nesta tarefa; `captured` vem de controller spy do teste com query/body forjados.

- [ ] **Step 2:** `npm test -- src/infra/http/create-app.spec.ts src/core/infra/adapters/express-route-adapter.spec.ts`; esperado FAIL nas regras novas.
- [ ] **Step 3:** Implementar factory; retirar chamadas de manutenção/migração do HTTP/boot. Manutenção usa CLI interna existente. Distinguir JWT inválido/expirado (401 código C08) de repositório indisponível (503); preservar envelope error objeto e headers. Não retornar exceções/segredos.
- [ ] **Step 4:** Reexecutar comando; esperado PASS, incluindo teste de nenhum migrador chamado pela factory. Registrar comparação das rotas públicas existentes de catálogo.
- [ ] **Step 5:** Revisar diff; se commit autorizado, `fix: proteger entrada http e separar manutencao`.

### Task B01: CPF canônico, tipo e cadastro compatível

**Files:** Create `src/domain/enterprise/entities/value-objects/cpf.ts`, `email-identity.ts`, seus `.spec.ts`, `src/domain/application/use-cases/_errors/invalid-identity-input-error.ts`, `src/domain/application/auth/auth.types.ts`, `scripts/audit-auth-identities.ts`; Modify `src/domain/enterprise/entities/user.ts`, `membership.ts`, `src/domain/application/repositories/users-repository.ts`, `test/repositories/in-memory-users-repository.ts`, `src/domain/application/use-cases/users/create-user/create-user.ts`, `create-user-dto.ts`, `create-user-response.ts`, `create-user.spec.ts`, `src/infra/http/controllers/create-user-controller.ts`, `src/domain/enterprise/mappers/user-mapper.ts`.

**Interfaces:** Produces Cpf/EmailIdentity/UsersRepository de C09 e tipos C01; User passa a conter accountType/status/emailVerifiedAt, sem mudar ID/senha. `auditAuthIdentities({databaseUrl,outputPath}):Promise<{conflicts:number;ambiguous:number}>` em CLI somente leitura; relatório usa IDs e valores mascarados. Consumes classificação C07. `create-user` recebe purpose CLIENT/OWNER; só ausência durante janela explícita é OWNER legado.

- [ ] **Step 1:** Testar `cpf_equivalence`, `invalid_repeated_cpf`, `public_registration_cannot_create_privileged_types`, `owner_legacy_signup_preserved`, com assertions:

```ts
expect(Cpf.create('111.444.777-35').value.toString()).toBe('11144477735');
expect(Cpf.create('11111111111').isLeft()).toBe(true);
expect(resultForBarberOrAdmin.isLeft()).toBe(true);
expect(existingOwner.password.toString()).toBe(originalHash);
```

Fixtures sintéticas `.test`, sem credenciais reais; testes de Either verificam Right antes de acessar value.

- [ ] **Step 2:** `npm test -- src/domain/enterprise/entities/value-objects src/domain/application/use-cases/users/create-user`; esperado FAIL das novas validações/contratos.
- [ ] **Step 3:** Implementar C01/C02/C07; resolver CPF/e-mail separadamente, rejeitar divergência e novo cadastro duplicado, não atualizar usuário por `save`. User.create preserva `props.createdAt` quando fornecido; mapper/update não reescrevem a data original durante transição. Gerar auditoria sem escrever banco. Login legado curto continua válido; senha nova segue C01.
- [ ] **Step 4:** Mesmo comando PASS e `identity_transition_preserves_created_at`; testar e-mail equivalente e CPF mascarado concorrentemente em B02, não tratar o teste em memória como prova de UNIQUE real.
- [ ] **Step 5:** Diff e commit condicional `feat: definir identidade unica e tipos de conta`.

### Task B02: Persistência transacional, migração ensaiável e limites compartilhados

**Files:** Modify `src/infra/drizzle/schema.ts`, `src/infra/drizzle/repositories/drizzle-users-repository.ts`, `src/infra/drizzle/repositories/drizzle-barbershops-repository.ts`, `src/infra/drizzle/migrator.ts`; Create `src/domain/application/auth/auth-unit-of-work.ts`, `src/domain/application/repositories/auth-sessions-repository.ts`, `auth-action-tokens-repository.ts`, `barber-registrations-repository.ts`, `memberships-repository.ts`, `identity-outbox-repository.ts`, `auth-rate-limits-repository.ts`, `auth-audit-repository.ts`, `src/infra/drizzle/auth/auth-unit-of-work.ts`, `auth.schema.spec.ts`, `test/helpers/create-pg-auth-fixture.ts`, `scripts/migrate-auth-identities.ts`, `docs/auth-migration-runbook.md` no backend. Gerar SQL/snapshot Drizzle com `npm run db:generate`; registrar os caminhos gerados no PR, sem inventar nome de arquivo automático.

**Interfaces:** Produces AuthUnitOfWork C09. `AuthTransactionRepositories` contém portas users/sessions/actionTokens/memberships/registrations/outbox/audit. Contratos das portas: `sessions.findByCredentialHash(hash)`, `sessions.rotate(sessionId,expectedGeneration,replacement)`, `sessions.revokeFamily(sessionId)`, `memberships.findByUserAndShop(userId,shopId)`, `memberships.upsertActive(userId,shopId,role)`, `registrations.findPending(id)`, `registrations.consume(id,expectedGeneration,status)`, `actionTokens.consume(hash,purpose)`, `outbox.enqueue(message)`, `audit.append(event)`, todos Promise e executados no contexto transacional. `AuthRateLimiter.consume({key,limit,windowSeconds,now}):Promise<{allowed:boolean;retryAfterSeconds:number}>` usa storage compartilhado.

- [ ] **Step 1:** Criar testes PG `equivalent_cpf_unique`, `rollback_preserves_identity`, `migration_preserves_history`, `shared_rate_limit`:

```ts
expect(await fixture.countUsersByCpf('11144477735')).toBe(1);
expect(await fixture.readIdentityLinks()).toEqual(originalLinks);
expect(await fixture.countOutbox()).toBe(0); // após rollback injetado
expect((await secondWorker.consume(sameLimitKey)).allowed).toBe(false);
```

Helper desta tarefa expõe essas funções e `uow`, usa `TEST_DATABASE_URL` loopback, banco com sufixo `_test`, fixtures descartáveis e teardown somente do schema de teste verificado.

- [ ] **Step 2:** `npm test -- src/infra/drizzle/auth/auth.schema.spec.ts`; executar somente após validar banco de teste. Esperado FAIL nas constraints/transações novas; ausência de banco é BLOCKED, nunca PASS.
- [ ] **Step 3:** Criar tabelas de sessões/gerações/replay cifrado, tokens de ação, cadastros, outbox, auditoria e contadores. Acrescentar campos canônicos/tipo/estado e estados de membership. Implementar CAS/locks: erro inconsistente de cadastro/ativação lança AuthTransactionAbort e desfaz tudo; resultado de segurança DENIED_REVOKED comita revogação e é traduzido para 401 fora da transação. Migrador dedicado faz dry-run por padrão, preserva IDs/FKs e exige revisão do inventário B01; impedir execução dupla dos caminhos antigos divergentes. Não apagar/fundir identidades.
- [ ] **Step 4:** Mesmo comando PASS + ensaio migrar/validar/recuperar em cópia descartável com conflitos. Recuperação restaura snapshot ensaiado; não executar downgrade que descarte contas criadas depois do cutover. Registro ambíguo fica REVIEW_REQUIRED e não recebe permissão.
- [ ] **Step 5:** Diff/SQL revisados; commit condicional `feat: persistir identidade e operacoes de autenticacao`.

### Task B03: Sessão revogável, transportes e concorrência

**Files:** Create `src/domain/application/auth/session-service.ts`, `session-service.spec.ts`, `src/domain/application/auth/clock.ts`, `token-signer.ts`, `src/infra/auth/jwt-token-signer.ts`, `src/infra/auth/refresh-replay-cipher.ts`, `src/infra/http/auth/session-transport.ts`, `session-transport.spec.ts`, `src/infra/http/controllers/users/session-controller.ts`, `src/infra/http/factories/make-session-controller.ts`, `test/helpers/create-session-fixture.ts`; Modify sign-in use case/controller/factory, `users.routes.ts`, `ensure-user-is-authenticated.ts`, `optional-user-authentication.ts`, `src/infra/env.ts`.

**Interfaces:** Produces SessionService/SessionCredentials C09; `Clock.now():Date`; `TokenSigner.sign({sub,sid},expiresInSeconds):Promise<string>` e `verify(token):Promise<{sub,sid,exp}>`; replay cipher encrypt/decrypt somente no adaptador. Consumes B02 e C04; controller concentra cookies/headers e autoriza transporte antes do serviço.

- [ ] **Step 1:** Fixture desta tarefa constrói SessionService com clock injetado; testes `absolute_expiry`, `refresh_response_loss`, `parallel_tabs_conflict`, `late_refresh_after_logout`, `web_cannot_request_native`:

```ts
expect(normal.expiresIn).toBe(900);
expect(admin.expiresAt.getTime() - fixture.now.getTime()).toBe(28_800_000);
expect(replayed.refreshToken).toBe(first.refreshToken);
expect(parallelError.code).toBe('SESSION_REFRESH_CONFLICT');
expect(await fixture.familyIsRevokedAfterLogout()).toBe(true);
expect(webJson.refresh_token).toBeUndefined();
```

- [ ] **Step 2:** `npm test -- src/domain/application/auth/session-service.spec.ts src/infra/http/auth/session-transport.spec.ts`; esperado FAIL.
- [ ] **Step 3:** Implementar C03/C04: prazos absolutos, rotação/CAS, janela cifrada 30s e replay tardio revogador. Emitir JWT com sid; persistir fonte de transporte; middleware consulta sessão/conta atuais. Login explícito web revoga/substitui cookie anterior. Logout recebe refresh mesmo com JWT expirado e revoga toda família; logout-all exige senha atual. Limites C01. Não delegar classificação NATIVE a campo forjado.
- [ ] **Step 4:** Mesmo comando PASS; HTTP fixture comprova Origin/null/body spoof/cookie nativo rejeitados, flags/path corretos, CORS sem wildcard e 30 dias/8h não prorrogados. Acrescentar testes PG `late_reuse_commits_revocation` (geração antiga após30s e geração atual ambas rejeitadas depois do commit) e `replay_cannot_regress_cookie` (g0→g1→g2; repetir chave g0 devolve409 sem Set-Cookie, preservando g2).
- [ ] **Step 5:** Commit condicional `feat: renovar e revogar sessoes por plataforma`.

### Task B04: Confirmação, recuperação, troca de senha, entrega e gestor

**Files:** Create `src/domain/application/auth/identity-action-service.ts`, `.spec.ts`, `identity-message-sender.ts`, `src/infra/http/controllers/users/identity-action-controller.ts`, `src/infra/http/factories/make-identity-action-controller.ts`, `src/infra/identity/dispatch-identity-messages.ts`, `.spec.ts`, `src/infra/identity/provider-identity-message-sender.ts`, `scripts/provision-platform-admin.ts`, `test/helpers/create-identity-action-fixture.ts`; Modify `users.routes.ts`, `src/infra/env.ts`, `package.json` para comandos internos de dispatch/provisão.

**Interfaces:** Produces IdentityActionService/IdentityMessageSender C05/C09 e `dispatchIdentityMessages({limit:20})`; `provisionPlatformAdmin({email,cpf,name}):Promise<{userId,activationQueued}>`, somente execução interna, sem senha fixa; gera ação de estabelecimento de credenciais via fluxo protegido e confirmação do gestor. Consumes B02/B03. Adaptador provider recebe configuração injetada e endpoint de sandbox autorizado; nenhum segredo na classe/fixture.

- [ ] **Step 1:** Testes `action_purpose_isolated`, `reset_single_use_revokes_all`, `delivery_failure_is_retryable`, `admin_not_publicly_creatable`:

```ts
expect((await service.confirmEmail(resetToken)).isLeft()).toBe(true);
expect(await fixture.activeSessionCount(userId)).toBe(0);
expect(await fixture.outboxStatus(messageId)).toBe('QUEUED');
expect(await fixture.publicSignupWithPurpose('PLATFORM_ADMIN')).toBe(400);
```

- [ ] **Step 2:** `npm test -- src/domain/application/auth/identity-action-service.spec.ts src/infra/identity/dispatch-identity-messages.spec.ts`; esperado FAIL.
- [ ] **Step 3:** Implementar tokens por finalidade/TTL, consumo e revogação atômicos, resposta 202 genérica, GET sem consumo, limites C01 e URLs de origem/scheme permitidos. Reset/troca trava usuário e invalida todos os tokens PASSWORD_RESET pendentes. Persistir outbox cifrado e retries C05; prover runner interno controlado, sem endpoint público. Script gestor cria identidade pendente com senha aleatória inacessível (hash armazenado, nunca revelada) e solicita confirmação/reset separados para definir credenciais; conta só recebe platform:enter depois de ativa/confirmada. CPF/e-mail de tipo diferente é conflito, sem elevação silenciosa. Documentar configuração do adaptador e runner no runbook; entrega real é verificada em H02.
- [ ] **Step 4:** Mesmo comando PASS; tests clock 24h/30min, erro 410 após uso/expiração, `reset_invalidates_other_links` e `password_change_invalidates_pending_reset`, dois resets concorrentes com uma única alteração válida, conta suspensa/revisão sem ativação por reset, fornecedor falhando sem fingir entrega. No sandbox real autorizado, guardar evidência sanitizada de confirmação/recuperação recebida.
- [ ] **Step 5:** Commit condicional `feat: confirmar contato e recuperar acesso`.

### Task B05: Cadastro profissional, preview/aceite e revogação por unidade

**Files:** Create `src/domain/application/auth/barber-registration-service.ts`, `.spec.ts`, `src/infra/http/controllers/users/barber-registration-controller.ts`, `src/infra/http/controllers/barbershop/barbers-controller.ts`, `src/infra/http/factories/make-barber-registration-controller.ts`, `make-barbers-controller.ts`, `test/helpers/create-barber-registration-fixture.ts`; Modify `barbershop.routes.ts`, `users.routes.ts`.

**Interfaces:** Produces BarberRegistrationService C09 e operações list/resend/revoke/decline/preview C06. Consumes B02/B04 + AuthorizationService concreto de B06, executada antes desta tarefa. Testes unitários podem injetar fake da mesma porta; composição HTTP usa a implementação real. Nunca compartilhar senha do titular com owner.

- [ ] **Step 1:** Testes `client_becomes_barber_same_identity`, `public_signup_races_activation`, `two_units_same_identity`, `wrong_account_cannot_accept`, `revocation_keeps_type`:

```ts
expect(receipt.userId).toBe(originalClientId);
expect(await fixture.passwordHash(originalClientId)).toBe(originalHash);
expect(raceError.code).toBe('ACTIVATION_REQUIRES_SIGN_IN');
expect(await fixture.countUsersByCpf(cpf)).toBe(1);
expect(await fixture.typeAfterLastRevocation()).toBe('BARBER');
```

- [ ] **Step 2:** `npm test -- src/domain/application/auth/barber-registration-service.spec.ts`; esperado FAIL.
- [ ] **Step 3:** Implementar C06 com transação de reconsulta/CAS, vínculo único e replay por chave. Separar cadastro novo de conta existente; nenhuma senha/e-mail do proprietário sobrepõe conta encontrada. Tipos incompatíveis 409; revogar vínculo sem apagar histórico; preview não consome, decline não modifica tipo. Validar owner/unit novamente no aceite; reenvio invalida geração anterior e estados terminais não reabrem.
- [ ] **Step 4:** Mesmo comando PASS + PG integração B02 para CPF/vínculo/duas unidades concorrentes, rollback do outbox e titular com e-mail não verificado. Testar informação pessoal ausente da listagem/preview.
- [ ] **Step 5:** Commit condicional `feat: cadastrar barbeiros por proprietario e preservar identidade`.

### Task B06: Perfil autoritativo e fronteiras de autorização existentes

**Files:** Create `src/domain/application/auth/authorization-service.ts`, `.spec.ts`, `src/infra/http/dtos/session-profile-dto.ts`, `src/infra/http/controllers/users/fetch-personal-bookings-controller.ts`, `src/infra/http/factories/make-fetch-personal-bookings-controller.ts`; Modify get-user-profile use case/response/controller/factory, fetch-user-barbershops use case/controller, `booking.routes.ts`, controllers de agenda/cancelamento, use cases `booking/fetch-staff-barberman-schedule`, `fetch-barberman-daily-schedule-with-details`, `fetch-client-bookings`, `cancel-booking`, `repositories/bookings-repository.ts`, `infra/drizzle/repositories/drizzle-bookings-repository.ts`, respectivas specs/repositórios in-memory; incorporar autorização em create-barbershop e mutações de serviços/horários existentes.

**Interfaces:** Produces AuthorizationService/SessionProfile C02/C03/C09; agenda acrescenta shopId obrigatório v1 e filtra por userId/unidade/data. `fetchPersonalBookings({userId,page,limit})` e `BookingsRepository.findManyByUser({userId,page,limit})` retornam C08 por carrinho do titular. OWNER atual é preservado como C02; C07 controla cliente legado.

- [ ] **Step 1:** Testes `unit_id_does_not_grant_permission`, `owner_pending_finishes_setup`, `legacy_owner_not_falsely_verified`, `personal_bookings_not_other_user`, `unverified_cannot_book`:

```ts
expect((await authorization.requireUnitPermission(foreignShop)).isLeft()).toBe(true);
expect(ownerPending.personalPermissions).toContain('barbershops:create:self');
expect(legacyOwner.user.emailVerified).toBe(false);
expect(otherUserBookingIds).not.toContain(privateBookingId);
expect((await authorization.assertCanBookForSelf(unverified)).isLeft()).toBe(true);
```

- [ ] **Step 2:** `npm test -- src/domain/application/auth/authorization-service.spec.ts src/domain/application/use-cases/users/get-user-profile src/domain/application/use-cases/booking`; esperado FAIL nos novos escopos.
- [ ] **Step 3:** Implementar C02/C08, menu/permissão derivadas da conta/vínculo atual, profile null somente revisão, consulta pessoal por titular. Agenda simples/detalhada agora respeita shopId; cancelamento continua pelo profissional pertinente, sem novo cancelamento de consumidor/equipe. Compatibilidade de agenda legada só quando houver uma única unidade autorizada; múltiplas unidades recebem erro seguro para atualizar sessão/cliente. Corrigir middleware opcional para não promover token inválido a leitura privada. Criação comercial de reserva continua fora do pacote; expor política `assertCanBookForSelf` para fase de agendamento.
- [ ] **Step 4:** Mesmo comando PASS + fixtures HTTP com duas unidades/dois titulares e conta bloqueada. Provar ownerId e membership OWNER coerentes e proteger profissional alvo em mutação de horário; preservar regra createdBy/owner existente.
- [ ] **Step 5:** Commit condicional `feat: autorizar acessos por identidade e unidade`.

## Conclusão backend e handoff

- [ ] Executar `npm test`, `npx tsc --noEmit`, `npm run check` e `git diff --check`; separar falha preexistente de regressão, sem declarar PASS com erro essencial.
- [ ] Atualizar `src/infra/http/swagger/index.ts` conforme C01–C10 e fixtures de contrato do plano H01. Exemplos sem segredos; nenhum endpoint comercial/MFA/social.
- [ ] Entregar schema/SQL/runbook, contratos, versões suportadas, TTLs e prova de revogação ao frontend. A versão backend v1 deve estar em homologação antes da troca do frontend.
- [ ] Migração/runner/e-mail/proxy reais e cutover só nas etapas H02/H03 autorizadas. Não usar scripts de seed/rotas de manutenção para contornar a ausência da integração.
- [ ] Revisar planos antes de execução. Commits sugeridos não são autorização; publicação das issues depende da revisão solicitada pelo usuário.

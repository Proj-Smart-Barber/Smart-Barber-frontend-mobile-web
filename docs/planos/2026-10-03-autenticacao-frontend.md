# Autenticação frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar o login único, sessões persistentes e jornadas CLIENT/BARBER/OWNER/PLATFORM_ADMIN com permissões autoritativas e cadastro profissional pelo proprietário.

**Architecture:** Manter Expo Router e a separação app/features/entities/shared. Extrair uma engine de sessão testável, injetar API/persistência, usar DTOs validados e política central de destinos; o shell operacional existente continua atendendo OWNER/BARBER.

**Tech Stack:** React/React Native Web, Expo/Expo Router, TypeScript, TanStack Query, React Hook Form, Zod, SecureStore e Vitest existentes.

**Spec:** [Desenho aprovado](../DESENHO_AUTENTICACAO_2026-10-03.md) e [contrato C01–C10](../CONTRATO_AUTENTICACAO_2026-10-03.md). Valores/interface dos testes derivam do contrato, não de rotas futuras presumidas.

## Global Constraints

- Uma conta por CPF, com um único tipo vigente: cliente, barbeiro, proprietário ou gestor da plataforma.
- Cliente precisa de conta, autenticação e e-mail confirmado para agendar.
- Proprietário inicia o cadastro do barbeiro; o titular ativa seu acesso. Cliente existente evolui na mesma conta, preservando CPF, ID, credenciais e histórico.
- Barbeiro pode integrar várias unidades e agendar serviços para si. Mantém o tipo barbeiro após sair da última unidade.
- Proprietário pode administrar e atender. Seu cadastro de conta/barbearia já está pronto e será preservado.
- Recuperação de acesso e confirmação por e-mail nesta entrega. Google, Apple, MFA e recrutamento ficam para evolução futura.
- Preservar design system, temas, logos oficiais, navegação operacional responsiva e telas existentes. Gestor tem área privada inicial sem métricas/planos simulados.
- Repositório: `D:/smart_barber/Smart-Barber-frontend-mobile-web`, base `fix/auth-users-endpoint-compatibility@bf650406967f67c21337567544774578b3b5df99`; revalidar checkout e preservar trabalho preexistente.
- Sem implementação autorizada agora; commits/depêndencias/deploy futuros exigem autorização própria. Nomes neutros. Documentação usa pasta `docs/planos` para respeitar a nomenclatura do projeto.
- Backend v1 em homologação é pré-condição de integração real; fixtures não substituem HTTP/cookies/e-mail/device. Nenhum refresh longo no armazenamento web de JavaScript.

## Review Focus

- Login/refresh conclui depois de logout ou troca de conta: não grava credencial, perfil ou cache tardio — F03.
- Cookie/SecureStore indisponível: não fingir sessão durável nem fazer fallback inseguro — F02/F03.
- Cliente ou barbeiro sem vínculo acessa URL OWNER_SETUP/services: bloqueio central e nenhuma query operacional — F05.
- CPF passou a existir após preview SET_PASSWORD: ativação pede login e preserva a conta — F06.
- Retorno externo/token no URL/seleção antiga após verificação: capturar/limpar token, destino permitido, revalidar catálogo — F04.

## Mapa e sequência

F01 tipos/API; F02 HTTP/persistência; F03 engine/provider; F04 formulários/links; F05 destinos/permissões/áreas; F06 equipe/ativação; F07 reservas pessoais e integração de agenda. Contrato C01–C10 é compartilhado. `staff/isOwner/barbershop/token` são adaptadores temporários para consumidores existentes, derivados de perfil/vínculo validado, nunca do ID de loja público.

### Task F01: Tipos, DTOs, mappers e API v1

**Files:** Create `src/entities/user/model/user.types.ts`, `src/entities/user/index.ts`, `src/features/auth/api/auth.contract.ts`; Modify `src/features/auth/api/auth.dto.ts`, `auth.mapper.ts`, `auth.api.ts`, `src/features/auth/index.ts`, tests `auth.api.test.ts`, `auth.mapper.test.ts`; Create `src/features/auth/tests/auth.contract.test.ts`.

**Interfaces:** Produces SessionProfile, Permission e Login/Refresh responses C03; AuthApi C09. `parseSessionProfile(raw:unknown):SessionProfile` com Zod, `mapSessionProfile(dto):SessionProfile` e `isOperationalMembership(profile,id):boolean` verificam estado/tipo/papel/unidade. `accountType:null` somente REVIEW_REQUIRED/permissões vazias. API recebe HttpClient por construtor; nenhuma chamada escolhe papel pelo usuário na tela de login.

- [ ] **Step 1:** Testar `reject_unknown_role_or_contract`, `review_requires_empty_permissions`, `register_returns_user_id`, `canonical_route_no_business_404_fallback`:

```ts
expect(() => parseSessionProfile(rawUnknownType)).toThrow();
expect(parsedReview.personalPermissions).toEqual([]);
expect(registration.userId).toBe(ids.client);
expect(fetchCalls.some(call => call.url.includes('/api/staffs'))).toBe(false);
```

- [ ] **Step 2:** `npm test -- src/features/auth/tests/auth.contract.test.ts src/features/auth/tests/auth.api.test.ts src/features/auth/tests/auth.mapper.test.ts`; esperado FAIL.
- [ ] **Step 3:** Implementar contratos/validação; usar userId, purpose explícito CLIENT/OWNER e `contractVersion:1`; admitir somente o campo legado staff tipado C03/C07 sem usá-lo para autorização; não traduzir erro404 para endpoint de outro tipo. Backend antigo/incompatível gera estado explícito de indisponibilidade de contrato, sem login falso. Types de Staff existentes permanecem somente compatibilidade operacional.
- [ ] **Step 4:** Mesmo comando PASS; fixtures de todos os tipos/estados e resposta incompleta. `npm run typecheck` detecta consumidores a migrar em F03/F05; registrar falhas dessa transição sem declarar pacote pronto.
- [ ] **Step 5:** Commit condicional `feat: consumir contrato de identidade unificada`.

### Task F02: HTTP por plataforma e persistência segura

**Files:** Create `src/shared/storage/session-persistence.ts`, `.web.ts`, `.native.ts`, `.memory.ts`, `src/shared/api/auth-access-port.ts`, `src/shared/api/tests/http-client.auth.test.ts`, `src/shared/storage/tests/session-persistence.test.ts`, `scripts/configure-web-api-proxy.mjs`, `scripts/tests/configure-web-api-proxy.test.mjs`; Modify `src/shared/api/http-client.ts`, `src/shared/config/env.ts`, `src/shared/storage/index.ts`, `token-storage.ts`, `.web.ts`, `.native.ts`, `vercel.json`, `package.json` para script de configuração.

**Interfaces:** `AuthAccessPort={getToken():string|null;renew():Promise<void>;getEpoch():number}`; HttpClient aceita essa porta e `{authRetry?:'READ_ONCE'|'NONE'}`. `SessionPersistence={readRefresh():Promise<string|null>;commitRefresh(value:string,shouldCommit:()=>boolean):Promise<void>;clearRefresh():Promise<void>;writeLogoutMarker():Promise<void>;hasLogoutMarker():Promise<boolean>;clearLogoutMarkerAfterExplicitLogin():Promise<void>;subscribeLogout(listener:()=>void):()=>void}`. Web readRefresh=null (cookie gerido pelo browser); nativo usa SecureStore. `commitRefresh/clearRefresh` serializam e checam época para não sobrescrever a saída com conclusão tardia.

- [ ] **Step 1:** Testar `cookie_refresh_not_in_js`, `native_failure_not_suppressed`, `only_get_retries_once`, `proxy_before_spa`:

```ts
expect(await webPersistence.readRefresh()).toBeNull();
await expect(nativePersistence.commitRefresh(token, () => true)).rejects.toThrow();
expect(mutationAttempts).toBe(1);
expect(readAttempts).toBe(2);
expect(config.rewrites[0].source).toBe('/api/:path*');
```

- [ ] **Step 2:** `npm test -- src/shared/api/tests/http-client.auth.test.ts src/shared/storage/tests/session-persistence.test.ts`; `node --test scripts/tests/configure-web-api-proxy.test.mjs`; esperado FAIL.
- [ ] **Step 3:** Web resolve API pela origem atual e envia credentials/include + WEB_COOKIE; nativo usa origem absoluta configurada, body NATIVE e sem cookies. Acesso fica em memória; remover leitura secreta automática do storage pelo HttpClient. Token nativo legado `smart_barber_access_token` é retirado na migração de sessão e exige login v1, sem inventar refresh. Falha SecureStore é explícita. Implementar marcador C04/evento storage. Gerador de proxy aceita `--api-origin https://host-autorizado --output caminho`, valida origem HTTPS sem credenciais/query/fragment/path e grava rewrite API antes de SPA; tests só escrevem diretório temporário. URL de homologação é entrada do release autorizado, não host inventado. Configuração real em H02.
- [ ] **Step 4:** Comandos PASS. Validar base web absoluta por origem, params/paths e timeout15s; a mudança não duplica `/api`. Sem prova real de Cookie/Set-Cookie, marcar persistência web não homologada.
- [ ] **Step 5:** Commit condicional `feat: transportar sessoes com persistencia por plataforma`.

### Task F03: Engine de sessão, geração e compatibilidade de hooks

**Files:** Create `src/features/auth/model/session-engine.ts`, `session.dependencies.ts`, `src/features/auth/tests/helpers/create-session-fixture.ts`; Modify `model/auth-state.ts`, `model/use-session.tsx`, `tests/session-engine.test.ts`, `lib/normalize-auth-error.ts`, `tests/normalize-auth-error.test.ts`, `src/shared/api/api-errors.ts`, `src/app/_layout.tsx` para injeção/provider (guard em F05).

**Interfaces:** Produces SessionEngine/SessionSnapshot/LogoutResult C09. `createSessionFixture({platform:'web'|'native',now:Date})` expõe `{engine,api,persistence,clock,queryClient,resolvePendingLogin,resolvePendingRefresh}` com promises controladas. useSession recebe snapshot e ações por subscribe; mantém compatibilidade temporária `staff/isOwner/barbershop/token/signUp/registerBarbershop`, derivada de identidade/membership atuais. `registerBarbershop` atualiza perfil após criação, não concede OWNER só pelo retorno de ID; falha posterior não repete criação já concluída.

- [ ] **Step 1:** Testar `logout_wins_over_late_login`, `late_refresh_cannot_write_native_store`, `offline_logout_survives_reopen`, `two_tabs_logout`, `profile_503_keeps_credentials`:

```ts
expect(f.engine.getSnapshot().status).toBe('UNAUTHENTICATED');
expect(f.engine.getSnapshot().profile).toBeNull();
expect(await f.persistence.readRefresh()).toBeNull();
expect(await f.persistence.hasLogoutMarker()).toBe(true);
expect(f.temporaryFailureRemovedCredential).toBe(false);
```

- [ ] **Step 2:** `npm test -- src/features/auth/tests/session-engine.test.ts src/features/auth/tests/normalize-auth-error.test.ts`; esperado FAIL nas condições controladas.
- [ ] **Step 3:** Implementar épocas antes de await, single-flight refresh, retry C04 e cachecancel/clear. Web valida persistência por refresh imediato após login; se cookie bloqueado, não declarar sessão durável e tenta revogar sessão recém-emitida por acesso atual. Native write protegido pela época/serialização. Restore verifica marcador antes de qualquer refresh; logout-all/troca de senha limpam contexto. Ler perfil autoritativo em restauração/login/retorno de foreground; refresh de dados não chama restoreSession. Normalizar códigos, não texto de exceções; erro404/403 não significa credencial inválida. PUBLIC não fica bloqueado por falha de restauração privada.
- [ ] **Step 4:** Mesmo comando PASS, incluindo revogação online, expiração30d/8h com clock e estado correto em SecureStore/cookie indisponível. Testar mensagens por LogoutResult: limpeza persistente sem revogação → “Você saiu deste aparelho. A revogação da sessão no servidor ainda não foi confirmada”; storage/marcador falha → saída persistente não concluída, orientar nova tentativa; nunca “Saiu de todos os aparelhos” sem remoteRevoked. `npm run typecheck`; nada usa `default-staff-id` para operação autenticada.
- [ ] **Step 5:** Commit condicional `feat: controlar ciclo e concorrencia da sessao`.

### Task F04: Cadastro cliente, confirmação, recuperação e retorno seguro

**Files:** Create routes `src/app/(auth)/register-client.tsx`, `verify-email.tsx`, `forgot-password.tsx`, `reset-password.tsx`; Create `src/features/auth/ui/ClientRegisterForm.tsx`, `EmailVerificationScreen.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `model/use-identity-actions.ts`, `model/password.schema.ts`, `lib/auth-link.ts`, `model/return-intent.ts`, tests `identity-actions.test.ts`, `auth-link.test.ts`, `password.schema.test.ts`, `return-intent.test.ts`; Modify `(auth)/_layout.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`, `register.schema.ts`, `use-register-view-model.ts`, `features/services/model/use-public-services.ts`, `ui/PublicCatalogView.tsx`.

**Interfaces:** `parseAuthLink(url:string):{kind:'verify'|'reset'|'barber';token:string}|null` aceita origem configurada/scheme smartbarber; `sanitizeReturnIntent(raw:unknown):{shopId:string;serviceIds:string[]}|null` permite apenas IDs válidos, sem preço/horário reservado; `useIdentityActions()` usa métodos C09. OWNER envia purpose OWNER, cliente CLIENT. Persistir intenção sem segredos em sessionStorage web/SecureStore nativo; após login/confirmar contato reconsultar catálogo e descartar serviços inativos/de outra unidade.

- [ ] **Step 1:** Testar `external_return_rejected`, `scanner_get_does_not_confirm`, `preserve_selection_without_reserving`, `owner_signup_unchanged_journey`:

```ts
expect(sanitizeReturnIntent({returnTo:'https://evil.example.test'})).toBeNull();
expect(confirmPostCallsAfterOpeningLink).toBe(0);
expect(intent.serviceIds).toEqual(selectedServiceIds);
expect(intent).not.toHaveProperty('confirmedSlot');
expect(ownerRegisterPayload.purpose).toBe('OWNER');
```

- [ ] **Step 2:** `npm test -- src/features/auth/tests/identity-actions.test.ts src/features/auth/tests/auth-link.test.ts src/features/auth/tests/password.schema.test.ts src/features/auth/tests/return-intent.test.ts`; esperado FAIL.
- [ ] **Step 3:** Login continua único sem seletor de tipo; links “Criar conta”, “Cadastrar barbearia” e “Esqueci minha senha”. Reusar componentes/formulários e preservar fluxo OWNER; cliente pede nome/CPF/e-mail/senha/confirmação. Senha nova C01, login legado sem mínimo novo; validação UTF-8 equivalente à API, mínimo explicado e excesso “Senha muito longa. Use uma senha menor”, sem truncate/normalizar. Confirmação/reset exigem ação POST explícita; mensagens202 genéricas,410 expirado,429 nova tentativa. Confirmação204 reconsulta perfil quando houver sessão; guard resolve destino novo. Sem sessão, mostrar confirmação e entrada; se o perfil continuar pendente, oferecer entrada na conta correspondente sem troca silenciosa. Consulta falhando vira recuperação, não reinicia cadastro. Link já usado permite continuar somente quando perfil próprio já indicar confirmação. Capturar token e remover URL sem registrar segredo; recuperar retorno somente permitido. Não apresentar confirmação comercial de reserva pronta.
- [ ] **Step 4:** Comandos PASS + `npm run typecheck`; testes `confirm_email_refreshes_destination` para CLIENT/OWNER com unidade, sem segunda criação de barbearia; `unicode_password_byte_limit` com ASCII/acentos/emoji/colagem/erro do servidor. Roteiro de teclado/foco, autofill, loading/double-submit, temas/mobile/erros/reenvio. O teste unitário do modelo não substitui a verificação visual/nativa H02.
- [ ] **Step 5:** Commit condicional `feat: cadastrar clientes e recuperar acesso por email`.

### Task F05: Destinos, permissões, unidade e áreas por identidade

**Files:** Create `src/features/auth/model/access-policy.ts`, `ui/AccessGate.tsx`, `ui/AccessRestrictedScreen.tsx`, `tests/access-policy.test.ts`; Create `src/app/(client)/client/_layout.tsx`, `index.tsx`, `profile.tsx`, `src/app/(admin)/admin/_layout.tsx`, `index.tsx`, `src/app/(app)/professional-profile.tsx`, `select-barbershop.tsx`; Create `src/features/account/ui/AccountHome.tsx`, `PlatformHome.tsx`, `MembershipSelector.tsx`; Modify root/_layout, `(app)/_layout.tsx`, `services.tsx`, `availability.tsx`, `shared/navigation/navigation.types.ts`, `DesktopSidebar.tsx`, `LeftDrawer.tsx`, `BottomCapsuleBar.tsx`, `navigation.helpers.ts`, dashboard/agenda/availability/services view-models para gates/chaves.

**Interfaces:** Produces resolveDestination C09, `can(profile,permission,membershipId?):boolean`, `buildNavigation(profile,membershipId):NavigationItem[]`. Cliente `/client`, gestor `/admin`, operação atual `(app)`; BARBER sem vínculo `/professional-profile`. Seleção: última preferência apenas se válida; uma unidade ativa seleciona automaticamente; várias sem preferência validada mostram seletor. URLs não selecionam vínculo não autorizado.

- [ ] **Step 1:** Testar `client_never_goes_owner_setup`, `barber_no_units_keeps_professional_home`, `owner_pending_setup_then_verification`, `unknown_is_denied`, `selected_unit_revoked`:

```ts
expect(resolveDestination(clientSnapshot)).toBe('CLIENT_HOME');
expect(resolveDestination(barberWithoutUnits)).toBe('PROFESSIONAL_HOME');
expect(can(clientProfile, 'services:manage', shopA)).toBe(false);
expect(resolveDestination(ownerPendingWithoutUnit)).toBe('OWNER_SETUP');
expect(can(reviewProfile, 'platform:enter')).toBe(false);
```

- [ ] **Step 2:** `npm test -- src/features/auth/tests/access-policy.test.ts src/shared/navigation/tests/navigation.test.ts`; esperado FAIL.
- [ ] **Step 3:** Implementar gates de rota e query antes de montar telas operacionais. Cliente pendente segue verificação; OWNER legado ACTIVE segue fluxo atual; OWNER novo pode setup e depois verificação; BARBER novínculo nunca vê criação de barbearia. Gestor área privada inicial com conta/saída, sem métricas ou plano. BARBER/OWNER têm acesso pessoal sem trocar tipo. Corrigir defaults UNKNOWN→BARBER/default-staff-id e chaves sem identidade; `staff/isOwner` derivam da seleção autorizada e são removidos gradualmente dos consumidores modificados. Preservar navegação responsiva e ações existentes.
- [ ] **Step 4:** Comandos PASS, `npm run typecheck`, `npm run build`; acessar diretamente services/admin/setup e comprovar que queries proibidas não disparam. Testar várias unidades/revogação/volta de foreground; PUBLIC permanece acessível sem login.
- [ ] **Step 5:** Commit condicional `feat: direcionar acessos por identidade e vinculo`.

### Task F06: Equipe do proprietário e ativação profissional

**Files:** Create `src/features/team/api/team.api.ts`, `team.dto.ts`, `model/team.schema.ts`, `use-team-view-model.ts`, `ui/TeamManagementView.tsx`, `BarberRegistrationForm.tsx`, `tests/team.api.test.ts`, `tests/team.model.test.ts`; Create `src/features/auth/ui/BarberActivationScreen.tsx`, `model/use-barber-activation.ts`, `tests/barber-activation.test.ts`; Create routes `(app)/team.tsx`, `(auth)/activate-barber.tsx`; Modify auth/group layout e navegação para Equipe somente quando team:manage.

**Interfaces:** `TeamApi.create(shopId,input,idempotencyKey)`, `list(shopId,page,limit)`, `resend(shopId,id)`, `revokeRegistration(shopId,id)`, `revokeMember(shopId,userId)` → C06; `previewActivation(token)`, `activate({token,newPassword?})`, `decline(token)` → C06. View-model mantém a mesma chave ao retry de envio/perda de resposta; nova intenção usa nova chave. Ativação usa sessão atual sem enviar CPF/ID de titular arbitrário.

- [ ] **Step 1:** Testar `owner_initiates_barber_registration`, `activation_race_returns_to_login`, `wrong_identity_not_switched_silently`, `last_unit_revoked_not_delete_account`:

```ts
expect(secondAttempt.idempotencyKey).toBe(firstAttempt.idempotencyKey);
expect(activationState.mode).toBe('SIGN_IN'); // após409 REQUIRES_SIGN_IN
expect(refreshProfileCallsAfterAccept).toBe(1);
expect(deleteAccountCalls).toBe(0);
```

- [ ] **Step 2:** `npm test -- src/features/team/tests src/features/auth/tests/barber-activation.test.ts`; esperado FAIL.
- [ ] **Step 3:** Tela OWNER cadastra profissional; lista distingue pendente/entregue/ativo/expirado/recusado/revogado, sem anunciar e-mail entregue ao receber202 QUEUED. Preview apresenta unidade e ação; SET_PASSWORD cria credenciais somente para CPF novo e termina em “Conta ativada. Entre para continuar”, sem `/me` antes do login comum; SIGN_IN preserva conta existente e reconsulta perfil após aceite. 409 de corrida volta à entrada com token em memória e confirma na mesma identidade. Conta errada: “Este cadastro pertence a outra conta. Entre na conta correta para aceitar ou recusar”; troca somente explícita, cancelar mantém a sessão atual. Recusa204 mostra término/retorno, sem mudança de tipo ou refresh como se fosse aceite. Reenvio/revogação do pending; remoção de membro exige confirmação e não apaga usuário. Após mudança de vínculo no owner, reconsultar perfil, invalidar contexto e notificar outras abas sem segredos.
- [ ] **Step 4:** Comandos PASS, `npm run typecheck`; `new_activation_requires_explicit_login`, `confirm_existing_activation_refreshes_profile`, `wrong_account_cannot_decline` e `cancel_account_switch_keeps_session`; homologar CPF já CLIENT e duas unidades, link GET sem aceitação, recusa sem transição, owner sem permissão, falha de entrega/recuperação e limite429. BARBER não possui cadastro autônomo.
- [ ] **Step 5:** Commit condicional `feat: gerenciar entrada de barbeiros por unidade`.

### Task F07: Reservas pessoais e agenda profissional com escopo

**Files:** Create `src/features/personal-bookings/api/personal-bookings.api.ts`, `model/use-personal-bookings.ts`, `ui/PersonalBookingsView.tsx`, `tests/personal-bookings.api.test.ts`, routes `(client)/client/bookings.tsx`, `(app)/personal-bookings.tsx`; Modify `features/agenda/api/agenda.http.ts`, `agenda.dto.ts`, `features/dashboard/api/dashboard.http.ts`, respectivos tests/http e view-models.

**Interfaces:** `PersonalBookingsApi.list({page,limit})` → C08; consulta usa usuário atual na chave e nenhum userId no pedido. `AgendaHttp` acrescenta shopId autorizado à consulta profissional; consumer e profissional usam fontes/chaves distintas. Nenhum campo de status ausente é convertido em “confirmado”.

- [ ] **Step 1:** Testar `personal_request_has_no_arbitrary_owner`, `two_units_not_mixed`, `missing_status_stays_unknown`:

```ts
expect(requestUrl).not.toContain('userId=');
expect(new URL(agendaUrl).searchParams.get('shopId')).toBe(selectedShopId);
expect(presentation.statusLabel).toBeUndefined();
expect(personalQueryKey).not.toEqual(professionalQueryKey);
```

- [ ] **Step 2:** `npm test -- src/features/personal-bookings/tests src/features/agenda/tests/agenda.http.test.ts src/features/dashboard/tests/dashboard.http.test.ts`; esperado FAIL.
- [ ] **Step 3:** Integrar leitura pessoal B06 para CLIENT/BARBER/OWNER; loading/empty/retry/paginação e links seguros. Agenda profissional acompanha vínculo selecionado e dados próprios. Manter cancelamento atual somente quando autorização do profissional/contrato existente permitir. Sem POST de reserva do domínio, não adicionar confirmação/cancelamento/reagendamento de consumidor funcional ou simulado.
- [ ] **Step 4:** Comandos PASS, `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`; testar render de datas/horários por timezone persistido, inclusive unidades em fusos diferentes; H02 prova HTTP com duas contas/unidades. Não declarar reserva comercial concluída com esse teste de leitura/autorização.
- [ ] **Step 5:** Commit condicional `feat: separar reservas pessoais de agenda profissional`.

## Handoff e execução futura

- [ ] Backend B00–B06 fornece contrato homologado, fixtures e versões; F01/F02 podem avançar com fixtures durante sua construção, mas release depende do HTTP real.
- [ ] Executar H01–H03 do [plano de homologação](2026-10-03-autenticacao-homologacao.md). Provas de web/persistência/SecureStore/e-mail devem ser registradas separadamente de unitários.
- [ ] Revisar cada tarefa e alcance do diff; cadastro OWNER/telas existentes não são redesenhados.
- [ ] Encerrar planejamento entregando planos/contrato e índice; publicar issues somente após revisão/autorização solicitada. Método de execução será escolhido depois dessa etapa.

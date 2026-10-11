# Integração de autenticação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** integrar login, confirmação, recuperação, sessão persistente e destinos dos quatro tipos sem inferir permissões.

**Architecture:** AuthApi e HTTP existentes consomem o contrato projetado; engine de sessão puro controla lifecycle, armazenamento e identidade. Provider React e gates usam snapshots autoritativos, preservando a jornada OWNER e o design system.

**Tech Stack:** Expo57, React19.2, React Native0.86, TanStack Query5, Zod3 frontend; Express5/Zod4/Drizzle/PostgreSQL backend.

**Spec:** [desenho aprovado D01–D07/D12](../DESENHO_INTEGRACAO_E_DECISOES_2026-10-11.md).

## Global Constraints

- Web/Android/iOS; preservar arquitetura, cadastro OWNER e alterações preexistentes.
- Sem planos, métricas de plataforma, Google/Apple, MFA, push ou recrutamento.
- Timeout HTTP15s; sem retry automático de mutations; sem SLA de produção presumido.
- Refresh web somente cookie protegido; native somente SecureStore, sem fallback para storage inseguro.
- Nova senha15 code points e até72bytes UTF-8; login legado não recebe a validação de criação.
- Ator/permissão vêm do servidor; CPF/e-mail/vínculo local não concedem acesso.
- Branch/commit neutros; nenhum merge/push/deploy/migração real implícito neste plano.

## Review Focus

- Logout offline/refresh ambíguo: tarefa A2 mantém revogação pendente e impede restauração indevida.
- Duas abas/novo login: tarefa A2 serializa mutations, ignora geração antiga e não difunde tokens.
- OWNER em outro navegador: tarefa A3 retoma onboardingIntent sem atribuir OWNER antes de criar unidade.
- Unicode/legado: tarefa A3 diferencia nova senha e senha usada para login.
- CLIENT/BARBER sem vínculo/gestor: tarefa A3 não dispara queries profissionais nem envia usuário ao setup OWNER por default.

## Dependências e contrato de backend

Responsável Álvaro: schema accountType/credentialVersion/onboardingIntent, SessionDto/serverTime e locks/revogação, cookies/Origin/no-store, confirmaçãoPOST e links, políticas de senha/limites, gestor restrito. HttpResponse/adapter precisam propagar headers Set-Cookie/Location e redirect, além de redaction, sem quebrar responses legadas. Interfaces HTTP estão no anexo da spec; não usar as rotas do PR36. Frontend pode ter testes com fixtures antes da entrega, mas não declarar integração completa até HTTP/cookies/e-mail reais.

Base antes de editar: reconciliar main frontend991aff2 com bf65040 e trabalho não commitado; revalidar main API contra23fca4f. Snapshot `.tmp` é evidência, não checkout de execução.

## Task A1 — Contratos e transporte da sessão

**Files:** modificar `src/features/auth/api/auth.dto.ts`, `auth.api.ts`, `auth.mapper.ts`, `src/shared/api/http-client.ts`, `api-errors.ts`, `src/shared/config/env.ts`, `vercel.json`; testes `src/features/auth/tests/auth.api.test.ts`, `auth.mapper.test.ts`; criar `src/entities/user/model/user.types.ts`, `src/shared/api/tests/session-transport.test.ts`.

**Interfaces:** AuthApi produz `SessionGrant={accessToken,refreshToken?,accessExpiresAt,sessionExpiresAt,serverTime}` a partir de SessionDto; `getIdentity(accessToken):Promise<AuthIdentity>` e `getMemberships(accessToken):Promise<Membership[]>`. AuthIdentity usa campos de `/me` da spec; Membership usa `/me/barbershops`, sem membershipStatus inventado. Native `refresh(refreshToken)`/`signOut(refreshToken)` enviam o corpo; web ignora argumento secreto e usa cookie. HTTP oferece delegate `setSessionHooks({getAccessToken:()=>string|null,onAccessExpired:()=>Promise<void>})`; chamadas de login/refresh/sign-out não entram no próprio interceptor.

Compatibilidade interna até A2/A3: login mantém DTO HTTP snake_case para callers existentes e `mapSessionDtoToGrant(dto)` fornece o grant da engine; getMe/getMyBarbershops são wrappers temporários de getIdentity/getMemberships. Não duplicar chamada remota nem política. Provider pode expor props antigas de apresentação enquanto callers migram; nenhuma release intermediária conserva defaults inseguros de papel.

- [ ] Escrever casos `web_refresh_has_no_secret_body`, `native_refresh_sends_secret`, `profile_requires_account_type`, `sign_out_accepts_204`, `server_error_is_not_invalid_credentials`. Assertions: `expect(body).toEqual({})` no web; `expect(body).toEqual({refresh_token:'refresh-fixture'})` no native; DTO sem accountType falha validação;204 resolve sem JSON;503 mantém classificação temporária.
- [ ] Rodar `npm test -- src/features/auth/tests/auth.api.test.ts src/features/auth/tests/auth.mapper.test.ts src/shared/api/tests/session-transport.test.ts`; confirmar falha pelo contrato novo ausente.
- [ ] Implementar mapeamento/grant/perfil, formatos de erro de transição e delegate. Web usa origem atual como base e paths `/api/...`; não concatenar `/api/api` nem passar base relativa inválida a newURL. Native usa URL absoluta da API. Rewrite preserva prefixo `/api` no destino e precede SPA; desabilitar cache, aplicar no-store e no-referrer conforme spec. Não ler Set-Cookie em JS. Homologação local deve usar proxy de mesma origem equivalente ou ambiente HTTPS de teste configurado, sem esconder essa dependência no Metro.
- [ ] Repetir os testes e `npm run typecheck`; sucesso é contrato validado sem aceitar papel ausente ou token longo no web.
- [ ] Registrar checkpoint de revisão/commit convencional `feat: integrar contratos de autenticação`, somente no fluxo de execução autorizado.

## Task A2 — Engine, persistência e coordenação

**Files:** criar `src/features/auth/model/session-engine.ts`, `src/shared/storage/session-storage.ts`, `session-storage.web.ts`, `session-storage.native.ts`; modificar `src/features/auth/model/use-session.tsx`, `auth-state.ts`, `src/shared/storage/index.ts`, adaptadores token-storage existentes e testes `src/features/auth/tests/session-engine.test.ts`; criar `src/shared/storage/tests/session-storage.test.ts`.

**Interfaces:** `createSessionEngine({transport,persistence,clock,loadIdentity,loadMemberships})` retorna `getSnapshot`, `subscribe`, `restore`, `signIn`, `refresh`, `signOut`, `refreshIdentity`, `selectShop`. Snapshot contém status restoring/authenticated/unauthenticated/recoveryRequired, identidade, vínculos, selectedShopId e revocationPending. Persistence `read/save/markLogoutPending/clear` guarda um registro native com o par ou apenas marcador/intenção não secreta web. A1 é a autoridade de transporte/DTO; datas são metadados do servidor.

- [ ] Substituir teste que monta lifecycle manualmente por testes do engine real: `concurrent_expiry_refreshes_once`, `logout_blocks_late_restore`, `offline_logout_survives_restart`, `ambiguous_native_refresh_revokes_before_login`, `storage_failure_is_reported`. Assertions: refresh chamado uma vez; estado após saída continua unauthenticated; marcador bloqueia refresh após novo engine; sign-out do token anterior precede novo login; erro de SecureStore não é suprimido.
- [ ] Rodar `npm test -- src/features/auth/tests/session-engine.test.ts src/shared/storage/tests/session-storage.test.ts`; confirmar falhas antes da engine nova.
- [ ] Implementar generation/single-flight e fila de mutations. Web usa lock por origem para login/refresh/saída e lifecycle entre abas sem tokens; native usa um blob SecureStore. Logout/refresh ambíguo segue D03, nunca retry de token consumido. Perfil503 não concede acesso nem remove credencial como se fosse401.
- [ ] Vincular provider e HTTP delegate; token explícito nas consultas de bootstrap evita dependência circular/interceptor recursivo. Cache é isolado por usuário/unidade; saída/troca remove queries e rejeita respostas antigas.
- [ ] Repetir testes/typecheck; conferir engine real em promessas controladas, não apenas helper de JWT/storage. Registrar checkpoint `feat: coordenar ciclo de sessão` no fluxo autorizado.

## Task A3 — Telas comuns, gates e regressão OWNER

**Files:** modificar login/register schemas/view-models/UI em `src/features/auth`, `src/app/_layout.tsx`, `(auth)/_layout.tsx`, `(app)/_layout.tsx`, `(app)/barbershop-setup.tsx`, `src/entities/staff/model/role.mapper.ts`, `src/shared/navigation`; consumir user.types da tarefa A1 e criar `src/features/auth/model/operational-context.ts`, rotas `(auth)/verify-email.tsx`, `reset-password.tsx`, `password-recovery.tsx`, `src/app/(client)/index.tsx`, `(barber)/index.tsx`, `(platform)/index.tsx` e layouts próprios; testes de schemas/gates.

**Interfaces:** `getOperationalContext(snapshot):{userId,shopId,role:'OWNER'|'BARBERMAN',timezone}|null`; não usar accountType como papel unitário. `resolveEntryDestination(snapshot,intent)` usa tipo, hint OWNER e membership validada. CLIENT/BARBER sem unidade têm destinos mínimos de conta/convites/agendamentos; gestor tem início protegido sem recursos futuros. Métodos AuthApi de e-mail/senha têm requests/responses do anexo, sem login automático.

- [ ] Testar `owner_intent_survives_verification`, `client_never_enters_owner_setup_by_default`, `barber_without_shop_has_no_operational_context`, `owner_in_barber_membership_has_unit_permissions`, `new_password_unicode_limits`. Assertions: contexto profissional null sem vínculo; papel unitário BARBERMAN mesmo com tipoOWNER quando esse for o vínculo selecionado; `😀`.repeat(15) válido, repeat(14) inválido; ASCII72 válido/73 inválido; login de senha legada não falha por mínimo15.
- [ ] Rodar testes existentes de login/register/role e novos de gates, confirmando falhas esperadas.
- [ ] Implementar cadastro→envio→confirmação→login; preservar conta criada quando envio falhar. Parser de link capta fragmento/querylegada antes de analytics; confirmação/reset só por ação explícita. Publicação de associações de links permanece gate de deployment separado.
- [ ] Remover default-staff-id e não-OWNER→BARBER de queries de dashboard/agenda. Revalidar contexto no servidor e bloquear execução sem ele. Não alterar identidade por storage/hint/CPF.
- [ ] Repetir testes, typecheck e `npm run build`; registrar checkpoint `feat: integrar jornadas e destinos de autenticação` no fluxo autorizado.

## Homologação necessária

- [ ] Executar também o [plano seedDB](2026-10-11-seeddb-autenticacao.md): contas fictícias verificadas, backfill somente gerenciado e usuário externo não-seed ainda bloqueado até confirmar e-mail.
- [ ] HTTP/PG: verificação, reset, mudanças de senha, revogação/rotação em duas instâncias, JWT antigo após logout/reset, prazo30d/8h.
- [ ] Browser real: Set-Cookie, reload, fechamento/reabertura, duas abas, Origin indevido, cache/referrer/logs e resposta tardia/abort. Sem essa prova, persistência web não está concluída.
- [ ] Android/iOS: SecureStore real, cold start, links novos/legados e retorno à jornada correta.
- [ ] Regressão OWNER com conta nova, já existente e e-mail não verificado; gestor sem provisionamento público.

**Estado inicial:** plano escrito; todos os passos acima NOT EXECUTED.

# Integração de convites e cadastro profissional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** responder convites pela notificação/lista com a mesma conta, sem expor tokens ou duplicar vínculo/identidade.

**Architecture:** um caso de resposta e uma transação canônica atendem tanto ID quanto token; controllers/factories preservam Express→use case→repository→Drizzle. Frontend invitations separado da sessão consome DTOs e reconsulta estado/identidade/vínculos.

**Tech Stack:** Express5, Zod4, Drizzle/PostgreSQL/Vitest backend; Expo57, TanStack Query5 e Vitest frontend.

**Spec:** [desenho D04–D06/D08/D13](../DESENHO_INTEGRACAO_E_DECISOES_2026-10-11.md); [bloco E.1 da análise](../ANALISE_INTEGRACAO_BACKEND_2026-10-11.md).

## Global Constraints

- Backend+frontend de resposta por ID/transição: nossa execução. Álvaro: schema, migrações, regras/metadata de identidade e demais rotas de cadastro/preview.
- Uma conta por CPF; um tipo global e vínculos separados por unidade; titular verificado e destinatário correto.
- Sem token/hash no feed; ator da sessão e ID exclusivamente do path; homônimos body/query400.
- Aceite/recusa explícitos; abrir notificação não responde; prazo/estado revalidado no servidor.
- API main atual é baseline; nunca implementar sobre a cópia de evidência `.tmp` ou alterar banco real para testar.

## Review Focus

- CPF/e-mail cruzados: V1/V2 rejeitam identidade divergente e preservam credencial existente.
- Aceite/recusa/revogação concorrentes: V1 usa uma transição condicional no PG.
- Path/ator adulterados: V2 não usa query para sobrescrever identificador.
- Aceite confirmado/refetch falhou: V3 mantém resultado e oferece atualizar sem segundo aceite.
- Conta trocada/link errado: V3 não escolhe primeiro convite nem aplica resposta a outra identidade.

## Dependências

Antes do fluxo profissional completo: Álvaro entrega accountType, metadados CPF/targetUserId, cadastro profissional e sua ativação/preview/detalhe conforme anexo da spec. Nossa implementação dos endpoints pode ser verificada isoladamente antes, mas isso não prova conversão CLIENT→BARBER/cadastro por CPF. Backend compartilhado tem dono único durante V1/V2; não editar os mesmos arquivos em paralelo com Álvaro.

## Task V1 — Caso canônico e transação de resposta

**Files API:** criar `src/domain/application/use-cases/invitations/respond-to-invitation/respond-to-invitation.ts` e teste correspondente; adaptar accept-invitation/decline-invitation e seus DTOs/testes, revoke-invitation/testes; contratos `invitations-repository.ts`/`memberships-repository.ts`, repositories Drizzle respectivos e in-memory. Toda mudança de accountType usa schema entregue por Álvaro; nenhuma segunda migração de identidade nesta tarefa.

**Interfaces:** `InvitationReference={kind:'id',invitationId:string}|{kind:'token',token:string}`; `RespondToInvitationUseCase.execute({userId,action:'ACCEPT'|'DECLINE',reference})` retorna Either com os DTOs accepted/declined existentes. Port `respondAtomically({invitationId,userId,action})` revalida destinatário, CPF quando vinculado ao cadastro, prazo/estado e retorna resultado committed ou erro de domínio; nenhum transaction Drizzle vaza para domínio. Revogação disputa a mesma condiçãoPENDING. Casos por token existentes delegam ao fluxo comum.

- [ ] Escrever testes `accept_by_id_keeps_user_identity`, `wrong_recipient_cannot_respond`, `terminal_or_expired_cannot_respond`, `token_and_id_share_transition`; assertions: mesmo userId/CPF/hash da senha; um membership; nenhuma escrita no erro; tipoCLIENT→BARBER somente na mesma transação, OWNER preservado.
- [ ] Rodar `npm test -- src/domain/application/use-cases/invitations`; confirmar falhas para referênciaID/commit condicional ausentes.
- [ ] Implementar resolver ID/hash e validação compartilhada. No PG, resposta revalida linha sob condição/lock de estado; insertmembership+aceite+promoção de tipo necessária são integrais. Unique existente shop/user não substitui revalidação de estado. Recusa não promove/cria vínculo; revoke não apaga usuário.
- [ ] Adaptar repositórios in-memory sem usar seus testes como prova PG; repetir suíte pertinente/TypeScript/Biome. Registrar checkpoint `feat: unificar resposta de convites` no fluxo autorizado.

## Task V2 — Endpoints autenticados por ID

**Files API:** criar controllers `src/infra/http/controllers/invitations/accept-invitation-by-id.controller.ts`, `decline-invitation-by-id.controller.ts`, testes e factories homônimas; modificar `src/infra/http/routes/invitation.routes.ts`, Swagger e adapter específico de extração necessário. Não reescrever silenciosamente o adapter de toda API.

**Interfaces:** POST `/api/invitations/:invitationId/accept` e `/decline`, Bearer, sem token/userId no body;200 DTO atual. Controller recebe `{invitationId,userId}` de contexto confiável;400UUID/homônimo/invalid_invitation,401autenticação. V1 produz validação/transação; V2 não cria regra de aceite alternativa.

- [ ] Testar `id_route_uses_actor_and_path`, `reject_body_query_homonyms`, `id_response_matches_token_response`. Assertions: token no feed inexistente; forjar userId/invitationId no body/query resulta400; UID de outro usuário nunca ganha membership; DTOsucesso tem campos do anexo.
- [ ] Rodar testes desses controllers/rotas; confirmar falhas antes da montagem.
- [ ] Implementar middleware/factory/controller e validação UUID. Preservar POSTs atuais por token. Não incluir token secreto no novo DTO.
- [ ] Repetir suíte de invitations, `npx tsc --noEmit` e `npm run check`; registrar checkpoint `feat: responder convites por identificador` no fluxo autorizado.

## Task V3 — Jornada invitations no frontend

**Files frontend:** criar `src/features/invitations/api/invitations.dto.ts`, `invitations.api.ts`, `model/use-invitation-response.ts`, UI de detalhe/lista, testes; rotas `(app)/invitations.tsx`, `(auth)/invitation.tsx`, `(auth)/activate-barber.tsx` e tela OWNER de cadastro/listagem integrada à navegação existente.

**Interfaces:** `acceptById(id):Promise<AcceptedDto>`, `declineById(id):Promise<DeclinedDto>`, `getInvitation(id):Promise<InvitationDto>` e resolver por token do anexo. Mutation por convite é sending/committed/uncertain/error. Criação/lista/reenvio/revogação/ativação profissional usam contratos de Álvaro, não a rota mail-only como se cadastrasse CPF.

- [ ] Testar `read_is_not_response`, `accepted_but_refetch_failed_stays_accepted`, `wrong_account_keeps_context`, `existing_account_activation_does_not_replace_password`, `multiple_invitations_resume_exact_id`. Assertions: abrir detalhe não chamaaccept;200 mantém accepted mesmo com503deperfil; login retoma ID específico; senha de ativação nunca altera conta existente.
- [ ] Rodar testes novos; confirmar falhas antes de API/model/UI.
- [ ] Implementar UI OWNER com dados mínimos e conflito orientado, titular com conta existente/ativação nova, login/confirm beforeaccept. Resolver link para ID; contexto sem segredo persistente; desativar ambos botões durante resposta.
- [ ] Após resposta, invalidar detalhe/lista/feed, `/me` e memberships; reconsultar autoridade antes de liberar unidade. Timeout reconsulta detalhe, não repete mutation cegamente. Expirado é derivado doexpiresAt e não enumEXPIRED inventado.
- [ ] Repetir testes, typecheck e build; registrar checkpoint `feat: integrar jornadas de convite` no fluxo autorizado.

## Homologação necessária

- [ ] HTTP/PG real: aceite+aceite, aceite+recusa, aceite+revoke e rollback; exatamente um terminal/vínculo, também quando ID e token concorrem.
- [ ] CPF/e-mail mesma conta/cruzados, nova conta criada entre convite/ativação, várias unidades, último vínculo removido mantendo BARBER.
- [ ] Web/native: convite aberto por aviso/link, conta errada, estado terminal, falha de leitura/refetch e retorno de login.

**Estado inicial:** plano escrito; todos os passos NOT EXECUTED.

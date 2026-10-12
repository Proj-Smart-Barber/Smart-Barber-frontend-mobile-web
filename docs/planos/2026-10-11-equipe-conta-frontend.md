# Gestão de equipe e recursos da conta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Atualização de execução:** [Agrupamento solicitado pelo usuário](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md) prevalece: G1+R1 no Grupo3; G2/G3+E2 no Grupo5. Um executor/revisor por grupo, preservando critérios e o gate da agenda do Grupo4 antes do fechamento de G2.

**Goal:** permitir OWNER gerir profissionais/convites/jornadas, e qualquer conta acessar convites/notificações/reservas pessoais corretamente.

**Architecture:** nova feature team usa API E e componentes shared; invitations mantém respostas recebidas. Recursos de conta ficam fora do guard operacional; SessionEngine atualiza identidade/vínculos autoritativos, sem invalidations fictícias.

**Tech Stack:** Expo Router/TanStack Query/Zod/Vitest e design system atual.

**Spec:** [desenho](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md); depende de [E](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/planos/2026-10-11-equipe-descoberta-backend.md) e lifecycle/agenda [R](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/planos/2026-10-11-reservas-frontend.md).

## Global Constraints

- OWNER administra apenas unidade selecionada com vínculo ACTIVE; BARBER não administra colegas; CPF não duplica conta.
- Revogar convite não é desativar vínculo; reservas futuras/em andamento bloqueiam desligamento.
- Retorno exige novo convite/aceite, preservando histórico; conta existente não tem senha/CPF/e-mail alterados pelo gestor.
- Recursos de conta não exigem unidade; alteração de vínculo só é exibida como concluída após atualização autoritativa.

## Review Focus

- CLIENT sem unidade não consegue responder convite/notificação pelo guard atual — G1.
- Aceite muda DB, mas queries invalidadas não atualizam sessão — G1.
- CPF existe e e-mail diverge; activation tenta mudar senha da conta existente — G3.
- Desativação concorre com agendamento e resposta se perde — G2.
- OWNER em uma unidade/BARBER em outra conserva menu errado — G1/G2.

## G1 — Recursos da conta e contexto do vínculo

**Files:** modificar `src/app/_layout.tsx`, auth `model/use-session.tsx`, `session-engine.ts`, `operational-context.ts`; mover/aliasar rotas de notifications/invitations para `src/app/(account)/notifications.tsx`, `notifications/[notificationId].tsx`, `invitations.tsx`; modificar invitation-response hooks/engine e notification targets; testes `auth/tests/account-route-guard.test.ts`, `session-engine.test.ts`, `invitations/tests/invitation-response.test.ts`.

**Interfaces:** `useSession().refreshIdentity():Promise<void>` propaga erro temporário e reavalia selectedShopId contra vínculos ACTIVE. `resolveAccountDestination(target)` só produz rotas válidas autorizadas. `getOperationalContext(snapshot)` falha fechado para vínculo ausente/inativo/role desconhecido; isOwner é do vínculo selecionado.

- [ ] Testar `client_can_open_account_resources`, `accepted_invite_refreshes_engine`, `refresh_failure_does_not_claim_new_access`: `expect(clientDestination).toBe('/(account)/invitations'); expect(after.identity.accountType).toBe('BARBER'); expect(failedRefetch.state).toBe('refetchFailed')`. Outro OWNER global não vira owner desta unidade.
- [ ] Rodar testes e observar falhas dos guards/Promise.allSettled/keys atuais.
- [ ] Implementar refreshIdentity exposto, erro honesto/retry após aceite já aplicado e selecionador válido. Preservar links antigos de conta com alias seguro, retorno da reserva R2, onboarding OWNER e recuperação/logout; não converter rota de gestão em recurso comum.
- [ ] Tests/typecheck/build e browser login→convite→aceite→home profissional; CLIENT abre notificação/detalhe próprios; sem unidade não entra na operação. Testar erro de perfil503 e vínculo removido.
- [ ] Revisão/commit `fix(account): liberar recursos pessoais e atualizar vinculos`.

## G2 — Tela de equipe, agenda/jornada e desligamento

**Files:** criar `src/features/team/api/team.dto.ts`, `team.api.ts`, `model/use-team.ts`, `team-capabilities.ts`, UI `TeamView.tsx`, `TeamMemberCard.tsx`, `TeamMemberDetail.tsx`, `DeactivateMemberConfirm.tsx`; rotas `src/app/(app)/team.tsx`, `team/[membershipId].tsx`; integrar availability UI por profissional com API existente; testes `team/tests/team-policy.test.ts`, `team-integration.test.ts`.

**Interfaces:** `listTeam(shopId,{state,page})`, `deactivateMember(shopId,id,expectedVersion,key)` usam E; `useTeam({actorId,shopId})` separa membros ativos/inativos de convites. Detalhe abre agenda R por profissional e jornada/exceções do contrato existente somente OWNER; BARBER própria jornada fica leitura.

Consome `src/shared/operations` R1 e OperationAttemptResult. Desativação salva referência por ator/requestId e expectedVersion da listagem; timeout/recarga/logout/relogin consultam/fecham antes de nova chave. Resultado kind MEMBERSHIP atualiza member/version/capabilities; não assumir BookingDto. E lista20/máx100 e version em todas as representações.

Usar copy de recuperação da spec para vínculo/cadastro/convite: verificar/close preserva recurso já aplicado. UI de erro/leitura503 ou mutation incerta não remove membro nem anuncia desligamento; testes com APPLIED/NOT_APPLIED/PENDING/UNKNOWN503 cobrem isso em G2/G3.

- [ ] Testar `revoke_invite_is_not_deactivate`, `pending_bookings_block_deactivation`, `unit_change_resets_selection`: `expect(blockedAction.enabled).toBe(false); expect(otherShopMemberVisible).toBe(false)`. Versão/timeout reconsultam resultado e não removem membro como se confirmado.
- [ ] Rodar testes de G2 antes da implementação.
- [ ] Implementar listagem/paginação/detalhe/jornada, ações autorizadas, confirmação e bloqueio com reservas que precisam ser resolvidas. Cancelar/remarcar usa R e política até início; depois conferir DB/estado do vínculo. Owner não apaga conta nem autoriza operação de terceiro por role global.
- [ ] Testar API/homologação: vínculo inativado desaparece de profissionais/seleções; outras unidades permanecem; chamada concorrente é tratada pelo backend e não “corrigida” no frontend.
- [ ] Revisão/commit `feat(team): integrar gestao de profissionais por unidade`.

## G3 — Cadastro profissional e convites enviados

**Files:** criar team UI `ProfessionalRegistrationForm.tsx`, `SentInvitationsList.tsx`; evoluir invitations DTO/API para enviados/revogação/registration; modificar `src/app/(auth)/activate-barber.tsx` e retorno de convite existente; testes `team/tests/professional-registration.test.ts`, `invitations/tests/activation-identity.test.ts`.

**Interfaces:** `registerProfessional(shopId,{name,cpf,email},key)`, `listSentInvitations(shopId,page)`, `revokeSentInvitation(shopId,id,key)` consomem E/D05; activation/signup não pode conceder BARBER livre nem sobrescrever credencial existente. CPF canônico, máscara visual; conflict message genérica aprovada na spec anterior.

Cadastro/convites usam shared operations com referência opaca somente; CPF/e-mail/password não entram em payload persistido nem hash local. Em perda de resposta, recuperar REGISTRATION/INVITATION pelo requestId; APPLIED mostra recurso autorizado, UNKNOWN/PENDING pede resolução, NOT_APPLIED fenced permite nova revisão. Não restaurar formulário sensível a partir do storage. Teste commit→timeout→reload/logout→relogin comprova convite/cadastro únicos, inclusive24h+.

- [ ] Testar `existing_cpf_reuses_account_after_acceptance`, `identity_conflict_leaks_no_email`, `inactive_return_requires_acceptance`: `expect(accountCountForCpf).toBe(1); expect(message).not.toContain(existingEmail); expect(accessBeforeAccept).toBe(false)`.
- [ ] Rodar os testes novos para identificar lacunas reais de formulário/adapters.
- [ ] Implementar cadastro OWNER, pendências/estados enviado/aceito/recusado/revogado/expirado, revogação e novo convite para retorno. Ativação mantém convite até resposta do titular; limpar identificadores sensíveis dos estados persistidos/logs/cache ao sair; UI não redefine senha do profissional.
- [ ] HTTP/browser: conta errada, CPF/email conflitantes, link expirado, race de ativação, conversão preserva agendamentos pessoais; e-mail real testado em ambiente autorizado ou NOT TESTED.
- [ ] `npm test`, `npm run typecheck`, `npm run build`; revisão/commit `feat(team): integrar cadastro e convites profissionais`; entregar rotas/capabilities ao plano H.

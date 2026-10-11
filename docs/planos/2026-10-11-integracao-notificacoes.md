# Integração da central de notificações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** exibir avisos próprios, registrar leitura ao abrir detalhes e encaminhar corretamente às ações de convite.

**Architecture:** feature notifications com DTO/api/query/model/UI separados; TanStack Query coordena paginação/refetch. Estado remoto de leitura e detalhe do convite não são confundidos com a mutation de resposta.

**Tech Stack:** Expo57/React/TanStack Query5/Zod3/Vitest; backend Express/Drizzle PostgreSQL.

**Spec:** [D08/D09/D13 e anexo](../DESENHO_INTEGRACAO_E_DECISOES_2026-10-11.md).

## Global Constraints

- Backend de leitura/detalhe/paginação: Álvaro; frontend: Wellington. Resposta de convite por ID pertence ao plano de convites/nossa execução.
- Leitura ao abrir detalhes, persistida pelo servidor; sem aceite/recusa automático.
- Page20/max100, cursor sortAt+ID, unreadCount remoto; sem lista ilimitada/polling constante.
- Sem push ou produção de eventos de reservas nesta integração; não simular avisos ausentes.
- Sem CPF/e-mail/token desnecessários no feed; query keys por userId, cache limpo na troca de conta.

## Review Focus

- Contador parcial confundido com total: N1 utiliza unreadCount do servidor, não page.filter.length.
- Leitura falhou: N2 conserva detalhe, não anuncia readAt persistido.
- Aceite confirmado/refetch falhou: N2 mantém resposta distinta da leitura/reconsulta.
- Referência antiga/terminal: N2 usa detalhe autenticado por ID, não somente listaPENDING.
- Troca de conta: N1/N2 nunca apresentam ou aplicam resposta do feed anterior.

## Task N1 — Contrato/query de feed e leitura

**Files:** criar `src/features/notifications/api/notifications.dto.ts`, `notifications.api.ts`, `model/notification-queries.ts`, `tests/notifications.api.test.ts`, `notification-queries.test.ts`.

**Interfaces:** `list({cursor?,limit?}):Promise<{notifications:NotificationDto[],nextCursor:string|null,unreadCount:number}>`; `markRead(id):Promise<{notification:{id:string,readAt:string}}>` consomem GETnotifications/PATCHread da spec. Query key incluiuserId/cursor; markRead não aceita actor no body. Campo readAt/referências/createdAt nullable no feed é preservado.

- [ ] Escrever `unread_count_is_not_page_count`, `repeat_read_preserves_first_timestamp`, `query_key_is_user_scoped`, `foreign_notification_is_not_readable`. Assertions: resposta de20avisos podeunreadCount=50; PATCH usa IDsemuserId/token; primeira data não muda;404não remove sessão.
- [ ] Rodar `npm test -- src/features/notifications/tests`; confirmar falhas antes do adapter/model.
- [ ] Implementar schema/adapter/query; reconsulta no foco/abertura e após mutations, sem intervalpoller. Paginação encerra somente comnextCursor=null. No-store e erros distinguemfeedvazio de indisponível.
- [ ] Repetir testes e typecheck; validar contract fixture com implementação de Álvaro antes de indicar integração. Checkpoint `feat: consumir feed e leitura de notificações` no fluxo autorizado.

## Task N2 — Lista, detalhe e navegação

**Files:** criar UI/view-models/testes em `src/features/notifications`, `src/app/(app)/notifications.tsx`, `src/app/(app)/notifications/[notificationId].tsx`; modificar navegação/sidebar/drawer/cápsula existentes conforme design system. Usar as interfaces do plano de convites, sem duplicar mutation em notifications.

**Interfaces:** `openNotification(id)` resolve aviso próprio, dispara markRead e obtém detalhe de referênciaINVITATION. readState e invitationResponseState separados; aceita/recusa pelos métodos V3. Aviso com referência indisponível apresenta estado seguro; não selecionar outro convite da lista.

- [ ] Testar `open_list_does_not_mark_read`, `open_details_marks_read_once`, `read_failure_does_not_hide_accepted_invitation`, `revoked_reference_disables_response`, `late_old_user_response_is_ignored`. Assertions: feedloading não chamaPATCH; abrir detalhe chama; erro de leitura mantém detalhe e aceite confirmado; estadoREVOKED sem botões; geração/usuário anterior não altera UI/cache.
- [ ] Rodar testes correspondentes; confirmar falhas sem implementação.
- [ ] Implementarloading/error/vazio/pagination, badgesreadAt/unreadCount e detalhe com retry de leitura independente. Após200aceite+refetch503, mostrar resultado confirmado e açãoAtualizar; não repetiraceite.
- [ ] Repetir testes, typecheck e build; verificar navegação responsiva/tema/acessibilidade sem mudar acabamento visual existente. Checkpoint `feat: integrar central de notificações` no fluxo autorizado.

## Backend e homologação

- [ ] Álvaro implementa PATCHread idempotente restrito ao destinatário, GETdetailInvitation e paginação/count próprios conforme spec.
- [ ] Verificar contador com mais de20avisos, createdAtnull/cursor, duas leituras concorrentes e aviso de outra conta.
- [ ] Browser/native: detalhe lido no próximo acesso/dispositivo, leitura falhou sem ação de convite implícita e troca de conta sem dados antigos.

**Estado inicial:** plano escrito; todos os passos NOT EXECUTED.

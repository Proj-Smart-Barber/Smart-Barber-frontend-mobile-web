# Agenda, Atendimentos e integrações pendentes — análise de13/10/2026

Status: **análise factual concluída; escopo, abordagem e desenho principal confirmados pelo usuário; plano/prompt revisados com parecer APPROVED**. Este documento não autoriza implementação nem constitui evidência de código corrigido.

Skills aplicadas: brainstorming; grill-me, que delega a grilling instalada; ui-ux-pro-max. A investigação de fatos foi delegada conforme grilling. Não foram alterados src, branches, PRs, bancos ou configuração de produção nesta análise.

## Bases e evidência

- Frontend main7fd864c e branch local28024c4 têm a mesma árvore src.
- Backend main4249abd, após merge do PR51, e cópia local1e2d880 têm a mesma árvore src. O checkout antigo D:/smart_barber/api está em2d5ebd5 e não é a autoridade contratual desta análise.
- Swagger publicado foi lido por GET https://api-black-theta-13.vercel.app/docs-json. Conjunto método/path igual ao Swagger local; isso não homologa o comportamento das mutations.
- A imagem enviada mostra os dois destinos Agenda/Atendimentos. A redundância de dados e ações foi confirmada no código, não inferida somente da imagem.
- Esta auditoria é estática, com leitura do Swagger publicado; não houve novo teste HTTP autenticado, criação de reserva ou teste de dispositivo físico.

## Conclusão sobre as telas

Agenda e Atendimentos consultam as mesmas reservas da unidade, mas são implementações distintas. Ambas têm calendário/data e resumo; Atendimentos acrescenta edição/cancelamento e recuperação, enquanto Agenda conserva a timeline. O pedido atual determina um destino operacional único Agenda, preservando as funcionalidades úteis das duas entregas e sua autoria.

O agendamento não requer criar outro endpoint: **POST /api/bookings já é consumido nos modos PERSONAL e UNIT**. A lacuna principal da criação operacional está na descoberta/navegação e no retorno ao contexto correto, não na ausência da rota de criação.

## Achados concretos para o planejamento

| Prioridade | Achado | Evidência |
| --- | --- | --- |
| P1 | A página /new-booking existe, mas nenhum CTA/menu do produto a abre | app/(app)/new-booking.tsx; AgendaView/Timeline/FreeSlotCard e busca global de new-booking |
| P1 | Home diz que o endpoint de reservas não existe e mostra “Novo Encaixe (Em breve)” | features/dashboard/ui/QuickActionsBar.tsx:25 |
| P1 | Resultado e recuperação UNIT enviam para Meus Agendamentos pessoal do ator | BookingResult.tsx:25–26; BookingFlowView.tsx:221–233 |
| P1 | Home ainda cancela pela chamada DELETE sem body/key/version | dashboard/api/dashboard.http.ts:updateAppointmentStatus; rota atual exige key e expectedVersion |
| P1 | Agenda perde metadados de reserva usados para ações | agenda.http.ts mapeia para AgendaAppointmentEntry sem version/startsAt/endsAt/timezone/capabilities; o detalhe canônico já dispõe deles |
| P1 | Dia/horário e “próximo” da Agenda usam relógio/fuso do dispositivo | use-agenda-view-model.ts e agenda.http.ts:getAgendaDay; comparar instantes com serverTime/fuso da unidade |
| P1 | Agenda e Atendimentos carregam somente a primeira página de até100 reservas | agenda.http.ts e use-bookings-view-model.ts limit100; backend tem page/limit/total/hasNext e summary do escopo inteiro. Unidade com mais itens pode ocultar reservas |
| P2 | Agenda só oferece cancelar; não abre detalhe, remarcação, conclusão ou falta | AgendaTimeline.tsx:18–38; AgendaAppointmentCard.tsx:258–282; BookingDetailView já oferece ações por capacidades |
| P2 | Cancelar na Agenda aparece sem capability e os erros não são expostos | agenda.api.ts:46–49 busca capability após clique; viewmodel tem try/finally sem estado de erro/recuperação; card diz “excluído” apesar do cancelamento lógico |
| P2 | Novo agendamento e troca de contexto não reiniciam corretamente o rascunho | use-booking-flow.ts inicializa states por props sem reset por unidade; BookingResult reset apenas muda step. Troca de unidade não foi reproduzida em runtime e não há seletor de produto encontrado |
| P2 | Falha ao carregar serviços/profissionais/disponibilidade vira lista vazia | use-booking-flow.ts retorna data??[]/loading, mas não os erros separados; pode aparecer como “nenhum horário” |
| P2 | Dashboard ignora estado real e fabrica indicadores | dashboard.http.ts força CONFIRMED, duração30 e zeros de métricas; consulta schedule/details sem contexto de unidade. Corrigir o necessário para consistência dos fluxos; redesenho completo da home permanece domínio próprio |

### Evitar falsos positivos

- Membership.status existe e é o **status da barbearia**, atualmente ACTIVE/INACTIVE. Membership.state é o **estado do vínculo**. A condição de new-booking usando status mistura conceitos, mas não prova que toda unidade ACTIVE fica bloqueada.
- O repositório de memberships atuais retorna vínculos ACTIVE e authApi normaliza state na entrada. Autorizar o fluxo pelo contexto/vínculo real e tratar status da unidade separadamente.
- O initialProfessionalId da rota usa accountType global, mas o hook corrige BARBERMAN pelo vínculo selecionado; não foi demonstrado bypass.
- staff.role usado pela Agenda deriva do vínculo selecionado no useSession. O fallback default-staff-id exige endurecimento quando o contexto falta, mas não comprova bug em toda sessão autenticada normal.
- A API não retorna profissional.name no DTO canônico de reserva. Para exibir nomes reais é necessário cruzar com a listagem de profissionais autorizada, não inventar nome a partir do ID.

## Jornada operacional já implementada em código

Busca por e-mail exato/CPF completo → cliente existente e elegível → vários serviços → profissional → slots calculados pelo backend para esses serviços/profissional/data → revisão → POST único UNIT com shopId/customerId/key → resultado/recuperação.

BARBERMAN fica na própria agenda; OWNER escolhe profissional elegível. O beneficiário é o cliente selecionado, distinto do ator operacional. O lookup não cria cliente novo. As regras previamente aprovadas de conta/CPF único, e-mail confirmado, prazos de2h para consumidor e início para equipe, não comparecimento manual após15min e desativação com atendimentos resolvidos continuam referências do planejamento.

O fluxo pessoal tem evidência anterior de navegador. Os testes atuais UNIT cobrem adapters/payloads com mocks e engines, mas não a entrada real por Agenda → formulário → confirmação → retorno Agenda. Não apresentar cobertura de PERSONAL como prova de UNIT.

## Limite dos horários livres

Agenda HTTP gera apenas APPOINTMENT; FREE_SLOT/HOLD/BUFFER existem nos tipos/mocks. O cartão Livre é informativo e não prova contrato real de intervalos livres. /availability exige os serviços escolhidos e profissional/data, porque a duração depende do carrinho. Não preencher gaps da timeline como promessa de reserva disponível sem consulta autoritativa.

## Rotas existentes e faltantes

- 53 operações na montagem canônica API,13aliases /staffs e5operações diretas do app:71operações HTTP explícitas. /docs/* é uma montagem adicional de middleware.
- 38operações documentadas no Swagger publicado/local. Faltam17canônicas de produto; incluindo13aliases e3operações system,33operações registradas não estão documentadas. Não há operação documentada sem registro.
- Das53canônicas:41possuem ligação estática API→hook/tela,3somente camada API,1variante GET de confirmação e8sem consumidor. **Esses números não significam41jornadas completas**, como mostram as lacunas de Agenda/home/criação.
- As8sem consumidor incluem5lacunas reais de equipe/convites OWNER e3fluxos legados substituídos; não inventar necessidade de telas para aliases/infra/legado.

### Backend existe, falta conectar ao produto

| Domínio | Operações | Situação |
| --- | --- | --- |
| Equipe | GET team; PATCH team/:membershipId/deactivation | Sem API/hook/tela do frontend |
| Convites enviados OWNER | POST/GET invitations por unidade; DELETE invitationId | Sem gestão, listagem ou revogação na UI |
| Conta | POST logout-all; PATCH me/password | Métodos AuthApi prontos, sem tela/ação encontrada |
| Serviço por ID | GET services/:serviceId | Método getService pronto; edição já usa objeto da listagem. Não é uma feature ausente inteira |
| Jornada por profissional | schedules/exceptions com barbermanId | Backend suporta, adapters têm parâmetros, UI atual opera a jornada geral da unidade |
| Convites recebidos/feed | Lista/detalhe/aceite/recusa por ID e notificações/leitura | Ligação encontrada; detalhe de notificação procura só na primeira página do feed e pode perder deep link antigo |

### Backend realmente ausente

- POST /api/barbers/activate é chamado por activate-barber.tsx, mas não está registrado. A API atual de convites não cria a conta; cadastro normal e resposta autenticada ao convite são o fluxo disponível. E2/G3 ainda precisam de contrato próprio para o cadastro pelo OWNER planejado.
- Listagem/busca pública de barbearias não existe. Consulta por ID, memberships próprios e catálogo por unidade não substituem descoberta. Impacto na home CLIENT e no início de reserva sem link direto.
- Rotas gerenciais da plataforma/admin não existem; há identidade/autenticação e painel básico. Planos e geolocalização continuam backlog conforme decisões anteriores.
- Não há endpoint de detalhe de notificação por ID; a tela usa o feed paginado. Registrar a restrição e decidir solução no domínio de notificações.

## UX e requisitos não funcionais para confirmar

- Preservar design system existente obsidian/crimson/ivory e componentes; a pesquisa ui-ux-pro-max orienta acessibilidade/interação, sem substituir automaticamente paleta/fontes pela recomendação genérica.
- Ações principais descobríveis; alvos de44px, espaçamento, foco/teclado, rótulos e erro anunciado; verificar375/768/1024/1440px e Android/iOS separadamente.
- Fonte autoritativa de disponibilidade, capacidades, prazo, preço, versão e fuso; CPF/e-mail de lookup não persistidos. Isolamento por ator/unidade, logout e operação incerta preservados.
- Paginação/caches devem distinguir itens carregados de totais do backend. Manter parâmetros existentes60s de sincronização/staleTime, aviso de lentidão5s e desatualização5min como referência inicial, sujeitos ao desenho confirmado.
- Manutenção: um fluxo compartilhado de comandos/recuperação e uma fonte de reservas; preservar trabalho/autoria de Pedro/Jhon e arquitetura atual. Fluxos de consumidor e operação não devem se confundir.

## Entendimento apresentado ao usuário

A confirmação solicitada delimita: Agenda única operacional; criação completa para cliente cadastrado; fluxo pessoal separado; visual/regras/web-mobile preservados; auditoria geral com lacunas de outros domínios registradas, sem incluir automaticamente equipe/admin/geolocalização; paginação/erros explícitos e nenhum dado de disponibilidade inventado.

O usuário confirmou o escopo, escolheu manter Agenda e integrar ações e aprovou o desenho de papéis/filtro/detalhe/CTA/retorno. O registro detalhado está em PLANO_AGENDA_UNIFICADA_E_CRIACAO_2026-10-13.md e sua revisão em REVISAO_AGENDA_UNIFICADA_2026-10-13.md. Não repetir decisões de negócio já aprovadas sem evidência concreta de conflito. Geolocalização já está registrada em docs/backlog/geolocalizacao-barbearias.md.

## Matriz completa de operações e consumidores

Legenda: “Consumidor” é ligação estática. “API sem tela” não significa endpoint inexistente. “Sem consumidor” pode ser legado; observar domínio acima. Evidência vem dos arquivos indicados; não equivale a teste runtime.

| Método | Path | Ligação frontend | Swagger publicado | Consumidor principal |
| --- | --- | --- | --- | --- |
| POST | `/api/users` | Consumidor API + hook/tela | Sim | `src/features/auth/api/auth.api.ts:85`; `src/app/(auth)/register.tsx:4` |
| POST | `/api/users/sessions/auth` | Consumidor API + hook/tela | Sim | `src/features/auth/api/auth.api.ts:24`; `src/features/auth/model/use-session.tsx:36` |
| POST | `/api/users/sessions/refresh` | Consumidor API + hook/tela | Sim | `src/features/auth/api/auth.api.ts:48`; `src/features/auth/model/use-session.tsx:37` |
| POST | `/api/users/sessions/sign-out` | Consumidor API + hook/tela | Sim | `src/features/auth/api/auth.api.ts:61`; `src/features/auth/model/use-session.tsx:38` |
| POST | `/api/users/sessions/logout-all` | API sem tela | Não | `src/features/auth/api/auth.api.ts:71` |
| POST | `/api/users/verification-email` | Consumidor API + hook/tela | Sim | `src/features/auth/api/auth.api.ts:140`; `src/app/(auth)/verify-email.tsx:56` |
| GET | `/api/users/verification-email/confirm` | Alias/variante | Sim | — |
| POST | `/api/users/verification-email/confirm` | Consumidor API + hook/tela | Não | `src/features/auth/api/auth.api.ts:147`; `src/app/(auth)/verify-email.tsx:32` |
| POST | `/api/users/password-recovery` | Consumidor API + hook/tela | Sim | `src/features/auth/api/auth.api.ts:157`; `src/app/(auth)/password-recovery.tsx:30` |
| POST | `/api/users/password-recovery/reset` | Consumidor API + hook/tela | Sim | `src/features/auth/api/auth.api.ts:164`; `src/app/(auth)/reset-password.tsx:51` |
| GET | `/api/users/me` | Consumidor API + hook/tela | Sim | `src/features/auth/api/auth.api.ts:99`; `src/features/auth/api/auth.api.ts:171` |
| PATCH | `/api/users/me/password` | API sem tela | Não | `src/features/auth/api/auth.api.ts:78` |
| GET | `/api/users/me/barbershops` | Consumidor API + hook/tela | Não | `src/features/auth/api/auth.api.ts:117`; `src/features/auth/model/use-session.tsx:42` |
| POST | `/api/barbershops` | Consumidor API + hook/tela | Sim | `src/features/barbershop/api/barbershop.api.ts:14`; `src/features/auth/model/use-session.tsx:178` |
| GET | `/api/barbershops/:shopId` | Consumidor API + hook/tela | Sim | `src/features/barbershop/api/barbershop.api.ts:36`; `src/features/availability/api/availability.http.ts:97` |
| GET | `/api/barbershops/:shopId/professionals` | Consumidor API + hook/tela | Não | `src/features/bookings/api/bookings.api.ts:77`; `src/features/bookings/model/use-booking-flow.ts:29` |
| GET | `/api/barbershops/:shopId/team` | Sem consumidor | Sim | — |
| PATCH | `/api/barbershops/:shopId/team/:membershipId/deactivation` | Sem consumidor | Sim | — |
| POST | `/api/barbershops/:shopId/customers/lookup` | Consumidor API + hook/tela | Sim | `src/features/bookings/api/bookings.api.ts:133`; `src/features/bookings/ui/CustomerLookup.tsx:7` |
| GET | `/api/barbershops/:shopId/bookings` | Consumidor API + hook/tela | Sim | `src/features/bookings/api/bookings.api.ts:102`; `src/features/agenda/api/agenda.http.ts:100` |
| GET | `/api/barbershops/:shopId/services` | Consumidor API + hook/tela | Sim | `src/features/services/api/services.api.ts:14`; `src/features/services/model/use-services-management.ts:14` |
| POST | `/api/barbershops/:shopId/services` | Consumidor API + hook/tela | Sim | `src/features/services/api/services.api.ts:56`; `src/features/services/model/use-services-management.ts:14` |
| GET | `/api/barbershops/:shopId/services/:serviceId` | API sem tela | Sim | `src/features/services/api/services.api.ts:40` |
| PATCH | `/api/barbershops/:shopId/services/:serviceId` | Consumidor API + hook/tela | Sim | `src/features/services/api/services.api.ts:73`; `src/features/services/model/use-services-management.ts:14` |
| PATCH | `/api/barbershops/:shopId/services/:serviceId/activation` | Consumidor API + hook/tela | Sim | `src/features/services/api/services.api.ts:91`; `src/features/services/model/use-services-management.ts:14` |
| POST | `/api/bookings` | Consumidor API + hook/tela | Sim | `src/features/bookings/api/bookings.api.ts:29`; `src/features/bookings/api/bookings.api.ts:52` |
| GET | `/api/bookings/me` | Consumidor API + hook/tela | Não | `src/features/bookings/api/bookings.api.ts:86`; `src/features/bookings/model/use-my-bookings.ts:16` |
| GET | `/api/bookings/barberman/schedule` | Sem consumidor | Sim | — |
| GET | `/api/bookings/barberman/schedule/details` | Consumidor API + hook/tela | Sim | `src/features/agenda/api/agenda.http.ts:109`; `src/features/dashboard/api/dashboard.http.ts:63` |
| GET | `/api/bookings/:bookingId` | Consumidor API + hook/tela | Não | `src/features/bookings/api/bookings.api.ts:124`; `src/features/bookings/model/use-booking-detail.ts:25` |
| DELETE | `/api/bookings/:bookingId/cancel` | Consumidor API + hook/tela | Sim | `src/features/bookings/api/bookings.api.ts:156`; `src/features/agenda/api/agenda.http.ts:194` |
| PATCH | `/api/bookings/:bookingId/reschedule` | Consumidor API + hook/tela | Sim | `src/features/bookings/api/bookings.api.ts:179`; `src/features/bookings/model/use-booking-detail.ts:25` |
| PATCH | `/api/bookings/:bookingId/status` | Consumidor API + hook/tela | Sim | `src/features/bookings/api/bookings.api.ts:202`; `src/features/bookings/model/use-booking-detail.ts:25` |
| GET | `/api/barbershops/:shopId/schedules` | Consumidor API + hook/tela | Não | `src/features/availability/api/availability.http.ts:122`; `src/features/availability/model/use-availability-view-model.ts:18` |
| PUT | `/api/barbershops/:shopId/schedules` | Consumidor API + hook/tela | Sim | `src/features/availability/api/availability.http.ts:146`; `src/features/availability/model/use-availability-view-model.ts:18` |
| GET | `/api/barbershops/:shopId/schedule-exceptions` | Consumidor API + hook/tela | Não | `src/features/availability/api/availability.http.ts:200`; `src/features/availability/model/use-availability-view-model.ts:18` |
| POST | `/api/barbershops/:shopId/schedule-exceptions` | Consumidor API + hook/tela | Não | `src/features/availability/api/availability.http.ts:222`; `src/features/availability/model/use-availability-view-model.ts:18` |
| PATCH | `/api/barbershops/:shopId/schedule-exceptions/:exceptionId` | Consumidor API + hook/tela | Não | `src/features/availability/api/availability.http.ts:249`; `src/features/availability/model/use-availability-view-model.ts:18` |
| DELETE | `/api/barbershops/:shopId/schedule-exceptions/:exceptionId` | Consumidor API + hook/tela | Não | `src/features/availability/api/availability.http.ts:286`; `src/features/availability/model/use-availability-view-model.ts:18` |
| GET | `/api/barbershops/:shopId/availability` | Consumidor API + hook/tela | Não | `src/features/availability/api/availability.http.ts:292`; `src/features/bookings/api/bookings.api.ts:228` |
| POST | `/api/barbershops/:shopId/invitations` | Sem consumidor | Sim | — |
| GET | `/api/barbershops/:shopId/invitations` | Sem consumidor | Sim | — |
| DELETE | `/api/barbershops/:shopId/invitations/:invitationId` | Sem consumidor | Sim | — |
| POST | `/api/invitations/accept` | Sem consumidor | Sim | — |
| POST | `/api/invitations/decline` | Sem consumidor | Sim | — |
| GET | `/api/invitations` | Consumidor API + hook/tela | Sim | `src/features/invitations/api/invitations.api.ts:9`; `src/features/invitations/model/use-invitation-response.ts:21` |
| POST | `/api/invitations/:invitationId/accept` | Consumidor API + hook/tela | Não | `src/features/invitations/api/invitations.api.ts:19`; `src/features/invitations/model/use-invitation-response.ts:36` |
| POST | `/api/invitations/:invitationId/decline` | Consumidor API + hook/tela | Não | `src/features/invitations/api/invitations.api.ts:23`; `src/features/invitations/model/use-invitation-response.ts:36` |
| GET | `/api/invitations/:invitationId` | Consumidor API + hook/tela | Não | `src/features/invitations/api/invitations.api.ts:14`; `src/features/invitations/model/use-invitation-response.ts:28` |
| GET | `/api/notifications` | Consumidor API + hook/tela | Sim | `src/features/notifications/api/notifications.api.ts:8`; `src/features/notifications/model/notification-queries.ts:8` |
| PATCH | `/api/notifications/:notificationId/read` | Consumidor API + hook/tela | Não | `src/features/notifications/api/notifications.api.ts:19`; `src/features/notifications/model/notification-queries.ts:19` |
| GET | `/api/operation-attempts/:requestId` | Consumidor API + hook/tela | Sim | `src/shared/operations/operation-attempt.api.ts:26`; `src/features/bookings/model/booking-operation-engine.ts:422` |
| POST | `/api/operation-attempts/:requestId/close` | Consumidor API + hook/tela | Sim | `src/shared/operations/operation-attempt.api.ts:60`; `src/features/bookings/model/booking-operation-engine.ts:483` |
| POST | `/api/staffs` | Alias/variante | Não | `src/features/auth/api/auth.api.ts:90`; `src/app/(auth)/register.tsx:4` |
| POST | `/api/staffs/sessions/auth` | Alias/variante | Não | `src/features/auth/api/auth.api.ts:30`; `src/features/auth/model/use-session.tsx:36` |
| POST | `/api/staffs/sessions/refresh` | Alias/variante | Não | — |
| POST | `/api/staffs/sessions/sign-out` | Alias/variante | Não | — |
| POST | `/api/staffs/sessions/logout-all` | Alias/variante | Não | — |
| POST | `/api/staffs/verification-email` | Alias/variante | Não | — |
| GET | `/api/staffs/verification-email/confirm` | Alias/variante | Não | — |
| POST | `/api/staffs/verification-email/confirm` | Alias/variante | Não | — |
| POST | `/api/staffs/password-recovery` | Alias/variante | Não | — |
| POST | `/api/staffs/password-recovery/reset` | Alias/variante | Não | — |
| GET | `/api/staffs/me` | Alias/variante | Não | `src/features/auth/api/auth.api.ts:105`; `src/features/auth/model/use-session.tsx:41` |
| PATCH | `/api/staffs/me/password` | Alias/variante | Não | — |
| GET | `/api/staffs/me/barbershops` | Alias/variante | Não | `src/features/auth/api/auth.api.ts:126`; `src/features/auth/model/use-session.tsx:42` |
| GET | `/docs-json` | Infra, fora da UI | Sim | — |
| GET | `/api/system/migrate` | Infra, fora da UI | Não | — |
| GET | `/api/system/demo-seed` | Infra, fora da UI | Não | — |
| POST | `/api/system/demo-seed` | Infra, fora da UI | Não | — |
| GET | `/` | Infra, fora da UI | Sim | — |
| USE | `/docs/*` | Infra, fora da UI | Não | — |

## Lacunas de documentação canônica

- `POST /api/users/sessions/logout-all`
- `POST /api/users/verification-email/confirm`
- `PATCH /api/users/me/password`
- `GET /api/users/me/barbershops`
- `GET /api/barbershops/:shopId/professionals`
- `GET /api/bookings/me`
- `GET /api/bookings/:bookingId`
- `GET /api/barbershops/:shopId/schedules`
- `GET /api/barbershops/:shopId/schedule-exceptions`
- `POST /api/barbershops/:shopId/schedule-exceptions`
- `PATCH /api/barbershops/:shopId/schedule-exceptions/:exceptionId`
- `DELETE /api/barbershops/:shopId/schedule-exceptions/:exceptionId`
- `GET /api/barbershops/:shopId/availability`
- `POST /api/invitations/:invitationId/accept`
- `POST /api/invitations/:invitationId/decline`
- `GET /api/invitations/:invitationId`
- `PATCH /api/notifications/:notificationId/read`

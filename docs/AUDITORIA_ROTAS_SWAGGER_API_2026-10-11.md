# Auditoria de rotas e Swagger — reaproveitamento no plano

## Conclusão

Há várias rotas aproveitáveis que não aparecem no Swagger. Não criar novamente listagem/detalhe de reserva, disponibilidade, profissionais, leitura de notificações ou aceite de convite por ID. Evoluir o contrato/implementação dessas rotas quando necessário.

O Grupo1 continua necessário: seus quatro endpoints privados de equipe/desativação e operações/get/close não estão registrados. A mudança concreta para reduzir duplicação é **usar o POST /api/bookings existente também para criação operacional**, ampliando autorização/body, em vez de criar outro POST de reserva em /barbershops/:shopId/bookings. A listagem privada da unidade continua uma capacidade distinta da agenda pessoal existente.

## Base e metodologia

- API local: `c432b53501e4ba4772a9a80ab02b40acb1f5993b`, B1; branch `fix/cors-credentials-api`, sem alterações locais no momento auditado.
- Main remoto/publicação de referência: `a1ba2dae035b10b10fb4d3a56bb6126ae3994cae`; não presumir que B1 está publicada.
- Inventário estático de todas as montagens/router/métodos em app.ts/routes, incluindo routers aninhados e aliases; leitura de controllers/use cases/repositories das capacidades do plano. Extração da especificação Swagger como objeto literal sem importar env/app/DB nem disparar migrator.
- HTTP público somente documentação: GET /docs/200, GET /docs/swagger-ui-init.js200, GET /docs-json404. Swagger publicado foi extraído do objeto swaggerDoc incorporado no init.js. Não se conclui que a interface inteira esteja quebrada pelo404 do JSON; o spec incorporado existe.
- Nenhum servidor local, banco, teste de escrita, login, reserva, convite ou rota de manutenção foi executado nesta auditoria. Não há homologação funcional dos62endpoints. A API existente tem migrator no boot; não foi inspecionada a execução interna de seu hosting.

## Resultado quantitativo

| Categoria | Quantidade |
| --- | ---: |
| Operações HTTP explicitamente registradas |62 |
| Aliases /api/staffs do router /api/users |13 |
| Operações excluindo esses aliases |49 |
| Paths Swagger local/publicado |26 |
| Operações Swagger local/publicado |29 |
| Registradas sem documentação, excluindo aliases |20 |
| Destas, operações de negócio sem documentação |17 |
| Destas, rotas de manutenção sem documentação |3 |
| Documentadas sem registro equivalente no código |0 |

Os62incluem health/3manutenção, mas não assets do middleware Swagger nem HEAD/OPTIONS automáticos do Express/CORS. Para comparação, nomes de parâmetros e trailing slash foram normalizados; trocar :id por :bookingId não é nova rota.

[Inventário completo CSV](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/INVENTARIO_ENDPOINTS_API_2026-10-11.csv), com método/path, middleware de autenticação, presença em Swagger, alias, arquivo/linha/factory. “Sem middleware de autenticação na rota” não certifica ausência de política dentro do caso de uso.

## Já disponíveis: consumir ou ampliar a mesma rota

| Endpoints | Contrato/capacidade encontrados | Encaminhamento |
| --- | --- | --- |
| Família /api/users, incluindo auth/refresh/sign-out/logout-all, confirmação GET/POST, recuperação, me/password/barbershops |13métodos; /api/staffs é o mesmo router | Usar /users como canônico; preservar aliases legados sem criar controllers para cada tipo de usuário |
| POST /api/bookings | Aceita serviceIds[] e legado serviceId; customerId é sempre userId da sessão; soma preço/duração | Ampliar este POST para PERSONAL/UNIT e beneficiário validado, sem segundo POST operacional |
| GET /api/bookings/me?page= | Existe, autenticado, páginas de20 | Reutilizar; ampliar metadados/filtros/DTO/clock/actions, não criar “meus agendamentos” paralelo |
| GET /api/bookings/:bookingId | Existe; cliente da reserva ou profissional responsável | Reutilizar; ampliar OWNER autorizado e representar os campos B1/capabilities |
| GET /api/bookings/barberman/schedule e /details?date= | Agenda do profissional autenticado; /details usa mapper rico B1 | Preservar consulta pessoal; não interpretar como agenda da equipe/unidade |
| DELETE /api/bookings/:bookingId/cancel | Existe, só responsável; repository apaga reserva/itens/eventos/notificações | Evoluir a mesma rota para cancelamento lógico/prazos/versão/novas capacidades, sem criar outro cancelamento |
| GET /api/barbershops/:shopId/professionals | Público, professionals[{id,name,role}] | Reutilizar para seleção; private team tem outra representação/finalidade |
| GET /api/barbershops/:shopId/availability | date/serviceIds/barbermanId, slots ISO; soma duração | Reutilizar rota; corrigir factory/validação/fuso/clock antes de confiar na disponibilidade |
| GET/PUT /api/barbershops/:shopId/schedules | Consultar/substituir jornada, escopo profissional quando informado | Reutilizar na gestão; ampliar disciplina transacional/escopo existente |
| GET/POST /api/barbershops/:shopId/schedule-exceptions e PATCH/DELETE /:exceptionId | CRUD de exceções por unidade/profissional | Reutilizar handlers e validação; não criar novo CRUD de horários |
| GET/POST /api/barbershops/:shopId/services e GET/PATCH /:serviceId, PATCH /activation | Catálogo/gestão já existem; leituras com autenticação opcional | Reutilizar; Swagger atualmente declara bearer obrigatório em leituras públicas |
| POST/GET /api/barbershops/:shopId/invitations e DELETE /:invitationId | Enviar/listar/revogar pendente por e-mail | Ampliar/compartilhar, sem novo sistema de convite; revogação não desliga vínculo aceito |
| GET /api/invitations e GET /:invitationId | Lista/detalhe recebidos | Reutilizar; detalhe precisa da checagem de destinatário/OWNER autorizado no handler existente |
| POST /api/invitations/:invitationId/accept e /decline | Resposta por ID já registrada e compartilhada com caso de uso existente | Não recriar aceite/recusa por ID |
| POST /api/invitations/accept e /decline | Apresentação legada por token, mesmo domínio de resposta | Preservar compatibilidade; não duplicar a regra de aceite por causa da URL distinta |
| GET /api/notifications?cursor=&limit= e PATCH /:notificationId/read | Feed paginado20/máx100, nextCursor/unreadCount e leitura | Reutilizar feed/read; novos eventos geram linhas nesse mecanismo, não outro feed |
| POST /api/barbershops e GET /:shopId | Criar/consultar uma unidade | Reutilizar; coleção pública de descoberta é leitura diferente de um ID ou de vínculos pessoais |

## Capacidades ausentes: novas rotas justificadas

| Proposta | Por que não existe equivalente completo |
| --- | --- |
| GET /api/barbershops/:shopId/team | professionals é público/minimal; não entrega membershipId/state/version/períodos/gestão/paginação |
| PATCH /api/barbershops/:shopId/team/:membershipId/deactivation | DELETE convite revoga pendência; não inativa vínculo aceito |
| GET /api/operation-attempts/:requestId e POST /:requestId/close | clientRequestId/bookingEvents da B1 são correlação/histórico, não ledger/fechamento compartilhado |
| POST /api/barbershops/:shopId/customers/lookup | Não há busca autorizada exata por CPF/e-mail para criação em nome de terceiro |
| GET /api/barbershops/:shopId/bookings | Agenda existente é própria, não autorização/listagem da equipe com resumo e filtro de unidade |
| PATCH /api/bookings/:bookingId/reschedule | Não há remarcação atômica; POST novo e DELETE antigo não a substituem |
| PATCH /api/bookings/:bookingId/status | Estado/history no modelo B1 não implica endpoint de conclusão/ausência |
| POST /api/barbershops/:shopId/barber-registrations e ativação prevista em D05 | Tabela pendente existe, mas sem repository/controller/use case/rota; convite por email não cadastra CPF nem ativa cadastro |
| GET /api/barbershops?q=&page=&limit= | GET de unidade por ID e GET de vínculos /users/me/barbershops não são catálogo público |

Essas novas rotas devem reutilizar repositories/casos/policies comuns onde apropriado. Não implementar duas variantes de operações ou de ativação/aceite.

## Ajuste de criação operacional: ampliar POST existente

Novo contrato v2 do POST /api/bookings:

- PERSONAL (default compatível com legado): cliente=usuário autenticado; rejeitar beneficiário de terceiro/metadata conflitante, sem fallback silencioso para reservar para si.
- UNIT: body contém scope=UNIT, shopId/customerId e seleção comum; shopId deve coincidir com a unidade derivada dos serviços. BARBER fica na própria agenda; OWNER escolhe profissional elegível do vínculo ACTIVE. Scope/body nunca concede papel.
- UserId/createdBy vêm da sessão; timestamps, total e duração vêm da regra servidor. Validar JSON de negócio via body conhecido, sem permitir query sobrescrever fonte de identidade/autorização.
- Controller seleciona criação pessoal/operacional e ambas compartilham policy/transaction/ledger. O adapter frontend createOperationalBooking pode continuar existindo como função, chamando o mesmo POST com esse body.
- Documentar schemas PERSONAL/UNIT, erro de autorização e compatibilidade B5. Não criar POST /barbershops/:shopId/bookings nem alias adicional sem necessidade comprovada. O GET privado dessa coleção continua no plano.

## Divergências importantes além da documentação

1. **B1 não ligou o POST ao writer de itens individuais.** CreateBookingUseCase ainda monta ServiceItem/ShoppingCart agregados e chama createWithItemAndCart. createWithItems existe no repository, mas precisa ser usado pela criação no Grupo2. Não refazer B1 nem considerar uma rota existente como fluxo completo.
2. **Disponibilidade HTTP usa InMemoryBookingsRepository na factory.** Não lê reservas persistidas desse ambiente. A rota existe, porém ainda não comprova que um slot está livre; corrigir a injeção para Drizzle/autoridade comum e testar reserva real bloqueando slot.
3. **Cancelamento apaga o histórico entregue pela B1.** delete remove notifications/bookingEvents/bookingServiceItems/bookings. Alterar a implementação da rota existente no Grupo2, sem reaproveitar delete físico para cancellation.
4. **DTOs explícitos de /me e /:id omitem campos novos.** B1 tem mapper rico com status/version/instantes/clientRequestId/totais, mas esses controllers serializam subset. Unificar representação, sem criar novas URLs para contornar mapper antigo.
5. **Membership/status precisam de distinção.** status em /users/me/barbershops é estado da loja, não vínculo; E1 deve acrescentar lifecycle e filtrar corretamente. ID público do profissional é userId, não membershipId da desativação.
6. **Aceite existente precisa evolução, não duplicação.** Atualmente insere novo membership/rejeita existente e salva promoção CLIENT→BARBER antes da transação da resposta; ampliar para retorno INACTIVE→ACTIVE/atomicidade. Detalhe por ID deve verificar destinatário/OWNER autorizado antes de retornar email.

## Swagger a corrigir

- Registrar GET /docs-json retornando swaggerDocument na mesma app exportada por Vercel, sem iniciar server separado. A configuração atual aponta a uma rota que não foi montada. Documentação pública deve refletir o app real.
- Acrescentar17operações de negócio ausentes (lista completa no inventário), inclusive /bookings/me, detalhe, professionals/availability/GETschedules/exceptions, aceite/detalhe por ID, notification read, logout-all/password/memberships/POSTemail-confirm.
- POST /bookings no Swagger exige serviceId/endTime e não mostra serviceIds/expected values, apesar de suportados no controller. Atualizar contrato para legado/v2 com exemplos completos.
- Descrever auth optional em catálogo público e JWT/cookie/transporte de sessão; prefix /staffs é compatibilidade do mesmo router, não uma API diferente de barbeiro.
- Documentar cursor/limit/unreadCount já entregues em notifications; seu feed não precisa ser recriado.
- Os29métodos documentados correspondem a rotas registradas; a principal lacuna é documentação ausente/contrato antigo, não29rotas fantasmas.
- Há3rotas de manutenção em app.ts sem middleware de autenticação na declaração: GET /api/system/migrate, GET/POST /api/system/demo-seed. Não são APIs de produto nem devem ser chamadas para validar este inventário. GET migrate tem efeito de escrita; proteger/inventariar acesso operacional antes de release, sem executar saneamento nesta auditoria.

## Fontes e limites

Montagem: [index](D:/smart_barber/api/src/infra/http/routes/index.ts:12), [app](D:/smart_barber/api/src/app.ts:41). Rotas: [booking](D:/smart_barber/api/src/infra/http/routes/booking.routes.ts:14), [barbershop](D:/smart_barber/api/src/infra/http/routes/barbershop.routes.ts:11), [schedule](D:/smart_barber/api/src/infra/http/routes/schedule.routes.ts:15), [invitations](D:/smart_barber/api/src/infra/http/routes/invitation.routes.ts:14), [users](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:20), [notifications](D:/smart_barber/api/src/infra/http/routes/notification.routes.ts:10).

Pontos de implementação: [create controller](D:/smart_barber/api/src/infra/http/controllers/create-booking-controller.ts:16), [create use case](D:/smart_barber/api/src/domain/application/use-cases/booking/create-booking/create-booking.ts:136), [availability factory](D:/smart_barber/api/src/infra/http/factories/make-calculate-availability-controller.ts:16), [delete físico](D:/smart_barber/api/src/infra/drizzle/repositories/drizzle-bookings-repository.ts:459), [Swagger source](D:/smart_barber/api/src/infra/http/swagger/index.ts:3).

Prova: inventário/semântica estáticos e HTTP de documentação pública. Não executadas mutations/transações nem comprovada a segurança funcional de todas as operações. Alterações realizadas nesta auditoria são documentos/planejamento/inventário; código da API permanece intacto.

## Anexo — todos os registros HTTP encontrados

Middleware indica somente a autenticação declarada na rota; políticas dos use cases exigem análise própria. /docs é middleware de documentação e não entra nestes62registros.

| Método | Path normalizado | Auth na rota | Swagger | Alias | Fonte |
| --- | --- | --- | --- | --- | --- |
| GET | / | Sem middleware | Sim | — | [src/app.ts:103](D:/smart_barber/api/src/app.ts:103) |
| POST | /api/barbershops | JWT | Sim | — | [src/infra/http/routes/barbershop.routes.ts:11](D:/smart_barber/api/src/infra/http/routes/barbershop.routes.ts:11) |
| GET | /api/barbershops/:shopId | Sem middleware | Sim | — | [src/infra/http/routes/barbershop.routes.ts:16](D:/smart_barber/api/src/infra/http/routes/barbershop.routes.ts:16) |
| GET | /api/barbershops/:shopId/availability | Sem middleware | Não | — | [src/infra/http/routes/schedule.routes.ts:55](D:/smart_barber/api/src/infra/http/routes/schedule.routes.ts:55) |
| GET | /api/barbershops/:shopId/invitations | JWT | Sim | — | [src/infra/http/routes/barbershop-invitation.routes.ts:18](D:/smart_barber/api/src/infra/http/routes/barbershop-invitation.routes.ts:18) |
| POST | /api/barbershops/:shopId/invitations | JWT | Sim | — | [src/infra/http/routes/barbershop-invitation.routes.ts:11](D:/smart_barber/api/src/infra/http/routes/barbershop-invitation.routes.ts:11) |
| DELETE | /api/barbershops/:shopId/invitations/:invitationId | JWT | Sim | — | [src/infra/http/routes/barbershop-invitation.routes.ts:25](D:/smart_barber/api/src/infra/http/routes/barbershop-invitation.routes.ts:25) |
| GET | /api/barbershops/:shopId/professionals | Sem middleware | Não | — | [src/infra/http/routes/barbershop.routes.ts:17](D:/smart_barber/api/src/infra/http/routes/barbershop.routes.ts:17) |
| GET | /api/barbershops/:shopId/schedule-exceptions | Sem middleware | Não | — | [src/infra/http/routes/schedule.routes.ts:28](D:/smart_barber/api/src/infra/http/routes/schedule.routes.ts:28) |
| POST | /api/barbershops/:shopId/schedule-exceptions | JWT | Não | — | [src/infra/http/routes/schedule.routes.ts:34](D:/smart_barber/api/src/infra/http/routes/schedule.routes.ts:34) |
| DELETE | /api/barbershops/:shopId/schedule-exceptions/:exceptionId | JWT | Não | — | [src/infra/http/routes/schedule.routes.ts:48](D:/smart_barber/api/src/infra/http/routes/schedule.routes.ts:48) |
| PATCH | /api/barbershops/:shopId/schedule-exceptions/:exceptionId | JWT | Não | — | [src/infra/http/routes/schedule.routes.ts:41](D:/smart_barber/api/src/infra/http/routes/schedule.routes.ts:41) |
| GET | /api/barbershops/:shopId/schedules | Sem middleware | Não | — | [src/infra/http/routes/schedule.routes.ts:15](D:/smart_barber/api/src/infra/http/routes/schedule.routes.ts:15) |
| PUT | /api/barbershops/:shopId/schedules | JWT | Sim | — | [src/infra/http/routes/schedule.routes.ts:21](D:/smart_barber/api/src/infra/http/routes/schedule.routes.ts:21) |
| GET | /api/barbershops/:shopId/services | Opcional | Sim | — | [src/infra/http/routes/service.routes.ts:13](D:/smart_barber/api/src/infra/http/routes/service.routes.ts:13) |
| POST | /api/barbershops/:shopId/services | JWT | Sim | — | [src/infra/http/routes/service.routes.ts:19](D:/smart_barber/api/src/infra/http/routes/service.routes.ts:19) |
| GET | /api/barbershops/:shopId/services/:serviceId | Opcional | Sim | — | [src/infra/http/routes/service.routes.ts:25](D:/smart_barber/api/src/infra/http/routes/service.routes.ts:25) |
| PATCH | /api/barbershops/:shopId/services/:serviceId | JWT | Sim | — | [src/infra/http/routes/service.routes.ts:31](D:/smart_barber/api/src/infra/http/routes/service.routes.ts:31) |
| PATCH | /api/barbershops/:shopId/services/:serviceId/activation | JWT | Sim | — | [src/infra/http/routes/service.routes.ts:37](D:/smart_barber/api/src/infra/http/routes/service.routes.ts:37) |
| POST | /api/bookings | JWT | Sim | — | [src/infra/http/routes/booking.routes.ts:14](D:/smart_barber/api/src/infra/http/routes/booking.routes.ts:14) |
| GET | /api/bookings/:bookingId | JWT | Não | — | [src/infra/http/routes/booking.routes.ts:34](D:/smart_barber/api/src/infra/http/routes/booking.routes.ts:34) |
| DELETE | /api/bookings/:bookingId/cancel | JWT | Sim | — | [src/infra/http/routes/booking.routes.ts:39](D:/smart_barber/api/src/infra/http/routes/booking.routes.ts:39) |
| GET | /api/bookings/barberman/schedule | JWT | Sim | — | [src/infra/http/routes/booking.routes.ts:24](D:/smart_barber/api/src/infra/http/routes/booking.routes.ts:24) |
| GET | /api/bookings/barberman/schedule/details | JWT | Sim | — | [src/infra/http/routes/booking.routes.ts:29](D:/smart_barber/api/src/infra/http/routes/booking.routes.ts:29) |
| GET | /api/bookings/me | JWT | Não | — | [src/infra/http/routes/booking.routes.ts:19](D:/smart_barber/api/src/infra/http/routes/booking.routes.ts:19) |
| GET | /api/invitations | JWT | Sim | — | [src/infra/http/routes/invitation.routes.ts:28](D:/smart_barber/api/src/infra/http/routes/invitation.routes.ts:28) |
| GET | /api/invitations/:invitationId | JWT | Não | — | [src/infra/http/routes/invitation.routes.ts:49](D:/smart_barber/api/src/infra/http/routes/invitation.routes.ts:49) |
| POST | /api/invitations/:invitationId/accept | JWT | Não | — | [src/infra/http/routes/invitation.routes.ts:35](D:/smart_barber/api/src/infra/http/routes/invitation.routes.ts:35) |
| POST | /api/invitations/:invitationId/decline | JWT | Não | — | [src/infra/http/routes/invitation.routes.ts:42](D:/smart_barber/api/src/infra/http/routes/invitation.routes.ts:42) |
| POST | /api/invitations/accept | JWT | Sim | — | [src/infra/http/routes/invitation.routes.ts:14](D:/smart_barber/api/src/infra/http/routes/invitation.routes.ts:14) |
| POST | /api/invitations/decline | JWT | Sim | — | [src/infra/http/routes/invitation.routes.ts:21](D:/smart_barber/api/src/infra/http/routes/invitation.routes.ts:21) |
| GET | /api/notifications | JWT | Sim | — | [src/infra/http/routes/notification.routes.ts:10](D:/smart_barber/api/src/infra/http/routes/notification.routes.ts:10) |
| PATCH | /api/notifications/:notificationId/read | JWT | Não | — | [src/infra/http/routes/notification.routes.ts:17](D:/smart_barber/api/src/infra/http/routes/notification.routes.ts:17) |
| POST | /api/staffs | Sem middleware | Não | /users | [src/infra/http/routes/users.routes.ts:20](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:20) |
| GET | /api/staffs/me | JWT | Não | /users | [src/infra/http/routes/users.routes.ts:52](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:52) |
| GET | /api/staffs/me/barbershops | JWT | Não | /users | [src/infra/http/routes/users.routes.ts:62](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:62) |
| PATCH | /api/staffs/me/password | JWT | Não | /users | [src/infra/http/routes/users.routes.ts:57](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:57) |
| POST | /api/staffs/password-recovery | Sem middleware | Não | /users | [src/infra/http/routes/users.routes.ts:44](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:44) |
| POST | /api/staffs/password-recovery/reset | Sem middleware | Não | /users | [src/infra/http/routes/users.routes.ts:48](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:48) |
| POST | /api/staffs/sessions/auth | Sem middleware | Não | /users | [src/infra/http/routes/users.routes.ts:21](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:21) |
| POST | /api/staffs/sessions/logout-all | JWT | Não | /users | [src/infra/http/routes/users.routes.ts:27](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:27) |
| POST | /api/staffs/sessions/refresh | Sem middleware | Não | /users | [src/infra/http/routes/users.routes.ts:22](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:22) |
| POST | /api/staffs/sessions/sign-out | Sem middleware | Não | /users | [src/infra/http/routes/users.routes.ts:26](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:26) |
| POST | /api/staffs/verification-email | Sem middleware | Não | /users | [src/infra/http/routes/users.routes.ts:32](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:32) |
| GET | /api/staffs/verification-email/confirm | Sem middleware | Não | /users | [src/infra/http/routes/users.routes.ts:36](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:36) |
| POST | /api/staffs/verification-email/confirm | Sem middleware | Não | /users | [src/infra/http/routes/users.routes.ts:40](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:40) |
| GET | /api/system/demo-seed | Sem middleware | Não | — | [src/app.ts:51](D:/smart_barber/api/src/app.ts:51) |
| POST | /api/system/demo-seed | Sem middleware | Não | — | [src/app.ts:70](D:/smart_barber/api/src/app.ts:70) |
| GET | /api/system/migrate | Sem middleware | Não | — | [src/app.ts:43](D:/smart_barber/api/src/app.ts:43) |
| POST | /api/users | Sem middleware | Sim | — | [src/infra/http/routes/users.routes.ts:20](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:20) |
| GET | /api/users/me | JWT | Sim | — | [src/infra/http/routes/users.routes.ts:52](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:52) |
| GET | /api/users/me/barbershops | JWT | Não | — | [src/infra/http/routes/users.routes.ts:62](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:62) |
| PATCH | /api/users/me/password | JWT | Não | — | [src/infra/http/routes/users.routes.ts:57](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:57) |
| POST | /api/users/password-recovery | Sem middleware | Sim | — | [src/infra/http/routes/users.routes.ts:44](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:44) |
| POST | /api/users/password-recovery/reset | Sem middleware | Sim | — | [src/infra/http/routes/users.routes.ts:48](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:48) |
| POST | /api/users/sessions/auth | Sem middleware | Sim | — | [src/infra/http/routes/users.routes.ts:21](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:21) |
| POST | /api/users/sessions/logout-all | JWT | Não | — | [src/infra/http/routes/users.routes.ts:27](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:27) |
| POST | /api/users/sessions/refresh | Sem middleware | Sim | — | [src/infra/http/routes/users.routes.ts:22](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:22) |
| POST | /api/users/sessions/sign-out | Sem middleware | Sim | — | [src/infra/http/routes/users.routes.ts:26](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:26) |
| POST | /api/users/verification-email | Sem middleware | Sim | — | [src/infra/http/routes/users.routes.ts:32](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:32) |
| GET | /api/users/verification-email/confirm | Sem middleware | Sim | — | [src/infra/http/routes/users.routes.ts:36](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:36) |
| POST | /api/users/verification-email/confirm | Sem middleware | Não | — | [src/infra/http/routes/users.routes.ts:40](D:/smart_barber/api/src/infra/http/routes/users.routes.ts:40) |

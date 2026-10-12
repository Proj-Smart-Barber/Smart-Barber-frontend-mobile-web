# Prompt — Grupo 2: reservas e ciclo de atendimento completo

Execute integralmente **o Grupo 2 (B3 + B4 + B5)** do Smart Barber em uma execução, com checkpoints internos e revisão independente ao final. Inclua primeiro os ajustes indispensáveis da base E1/B2 constatados abaixo. O objetivo é entregar contratos reais de backend para o frontend implementar carrinho, agendamento pessoal/rápido, agenda e ações de atendimento.

## Repositório, base e documentos

Trabalhe em `D:/smart_barber/api`. Leia os AGENTS.md aplicáveis, confira branch/HEAD/diff e preserve alterações de terceiros: você não está sozinho no código. Confirme que a base contém B1 (`c432b53` ou equivalente integrado) **e toda a implementação do Grupo1**, mesmo que ainda sem commit. Não trocar por main e perder essas entregas. Registre a base efetiva; não presumir que o relatório do executor comprova deploy ou aprovação de todos os contratos.

Leia integralmente:

1. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md` — Grupo2 e dependências.
2. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/planos/2026-10-11-reservas-backend.md` — B3/B4/B5 e constraints globais; B1/B2 como dependências.
3. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` — D01–D16, DTOs, permissões, tentativas e decisões técnicas.
4. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` e `REVISAO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` — gates e correções aceitas. O APPROVED histórico antecede a última consolidação das rotas.
5. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/AUDITORIA_ROTAS_SWAGGER_API_2026-10-11.md` e `INVENTARIO_ENDPOINTS_API_2026-10-11.csv` — baseline de reutilização; atualizar a comparação com a entrega do Grupo1.
6. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/planos/2026-10-11-equipe-descoberta-backend.md` — somente E1 para preservar suas garantias.

A execução por grupos prevalece sobre instruções antigas de trocar executor a cada tarefa. Mantenha TDD e checkpoints por unidade testável. Um revisor diferente examina todo o grupo ao final. Não reabrir decisões de negócio aprovadas nem pedir aprovação repetida de escolhas rotineiras.

## Evidência recebida e checkpoint inicial obrigatório

O relatório do executor do Grupo1 informa 263 testes aprovados, TypeScript sem erros e revisão APPROVE em PostgreSQL isolado `localhost:5433/smartbarber_isolated_test_20261011`. Esses resultados não foram reexecutados nesta preparação. Reconfirme o alvo efetivo antes de importar testes/app/migrator; não confiar apenas no nome do banco ou em uma URL de exemplo. Não imprimir credenciais/tokens. O app integra migração no boot.

Na leitura estática da base local, foram encontradas lacunas relevantes para as reservas:

- `src/infra/http/controllers/barbershop/deactivate-unit-membership.controller.ts` chama `executeOnce`, mas seu callback ignora o `tx` recebido e chama `DeactivateUnitMembershipUseCase.execute`.
- `src/domain/application/use-cases/barbershop/deactivate-unit-membership/deactivate-unit-membership.ts` abre outro `withLocks`; `DrizzleProfessionalMembershipUnitOfWork.withLocks` abre uma nova `db.transaction`. Efeito e ledger podem, portanto, commitarem separadamente. O fluxo também não adquire o lock global do profissional previsto no protocolo.
- `src/domain/application/services/operation-attempt-service.ts` devolve `responsePayload` em replay, consulta e close sem revalidar autorização atual ao recurso. `accessChanged` aparece no tipo, mas não é usado nesses fluxos.
- O mesmo serviço calcula `expiresAt`, mas não aplica a validade temporal de requestId; o controller de desativação aceita chave arbitrária e versão opcionais. O relatório usa `req_deactivate_001`, que não é UUIDv7.
- O unit-of-work usa fallback `new Date()` se o relógio PG não vier; a garantia de horário autoritativo não permite confirmar uma mutation com esse fallback.

Confira se houve mudanças desde essa leitura. Antes de ligar reservas ao core, escreva testes que reproduzam as lacunas ainda existentes e corrija o mínimo necessário, sem criar outro ledger/UoW:

1. Uma transação e um contexto compartilhados para tentativa, locks de recursos, mutação, evento e feed. Repositories devem consumir o mesmo `tx`, sem commit independente no callback. Desativação também deve participar do protocolo global de locks. Se IDs forem descobertos antes da transação, revalidá-los depois dos locks.
2. Ordem única: tentativa → unidades ordenadas → profissionais globais ordenados → vínculos ordenados → reserva/evento. Consulte `clock_timestamp()` após **todos os locks relevantes**, inclusive lock da reserva; não reutilizar tempo colhido antes de uma espera posterior. Falha de relógio falha fechada.
3. Revalidar acesso ao recurso em replay/GET/close: preservar comprovação APPLIED e referência permitida, mas remover dados privados e indicar `accessChanged` quando a autoridade mudou. Outra conta nunca lê a tentativa. Não persistir DTOs com identidade privada sem necessidade.
4. Validar UUIDv7/timestamp real, janela de 24h e tolerância de futuro da spec anterior referenciada pelo plano (máximo 5 minutos). Resultado aplicado/fechado continua consultável depois da janela; chave antiga desconhecida ou fenced não pode criar um efeito novo. Cleanup não elimina a decisão durável nem reabre a chave.
5. Mutations novas exigem Idempotency-Key; alterações exigem expectedVersion. Desativação nova não pode contornar esses controles pela ausência de header/body. Preserve compatibilidade explicitamente onde necessária, sem downgrade silencioso.
6. Ausência/404 em consulta é UNKNOWN, nunca prova de NOT_APPLIED. Rejeição definitiva, inclusive QUOTE_CHANGED, deve ter decisão terminal recuperável e impedir original tardia; falha inesperada/rollback não pode anunciar sucesso. Close de APPLIED preserva o recurso.

Teste: provoque falha na escrita final do ledger **depois de executar a mudança de vínculo** e confirme rollback da mudança/evento. Teste espera por locks atravessando prazo, replay após perda de permissão, chave inválida/vencida/futura, limpeza seguida de original tardia e resultado consultável após24h. Registre os ajustes como correções de dependência, não como reimplementação de E1/B2. Se um bloqueio indispensável persistir, termine o trabalho independente possível e não declare o grupo pronto.

## 1. B3 — Criar reservas e consultar agendas

### Reaproveitamento obrigatório de rotas

Evoluir existentes:

- `POST /api/bookings`: criação PERSONAL e UNIT no mesmo endpoint.
- `GET /api/bookings/me`, `GET /api/bookings/:bookingId`.
- `GET /api/bookings/barberman/schedule` e `/schedule/details`.
- GET de disponibilidade, serviços e profissionais da unidade; writers de serviços/jornada/exceções existentes.
- GET/PATCH de notificações e GET/close de operações já entregues.

Criar somente capacidades ainda ausentes após conferir o código:

- `POST /api/barbershops/:shopId/customers/lookup`.
- `GET /api/barbershops/:shopId/bookings`.
- As duas mutations de B4 descritas adiante.

**Não criar POST /api/barbershops/:shopId/bookings**, outra autenticação de barbeiro, outro feed, outro ledger ou outro mecanismo local de locks.

### Criação pessoal e operacional

Evoluir `src/infra/http/controllers/create-booking-controller.ts` e `src/domain/application/use-cases/booking/create-booking/create-booking.ts`; criar/evoluir booking-policy, lookup, agenda de unidade, factories e repositories conforme B3.

- PERSONAL beneficia o ator autenticado, inclusive BARBER/OWNER consumindo como cliente; rejeitar customerId de terceiro. Default PERSONAL somente no contrato legado explicitamente tratado.
- UNIT exige shopId/customerId e vínculo ACTIVE na unidade. BARBER agenda na própria agenda; OWNER escolhe profissional elegível da equipe. Papel enviado no body não concede autorização. Unidade derivada dos serviços deve coincidir com shopId.
- Cliente beneficiário precisa de conta elegível e e-mail confirmado. Reserva operacional confirma imediatamente; ator e beneficiário são campos distintos.
- Um agendamento: serviceIds únicos, mesma unidade, um profissional, intervalo contínuo, soma de duração/preço autoritativa. Persistir snapshots individuais reais com `createWithItems` da B1, sem agregado ShoppingCart como substituto.
- Validar unidade/serviços ativos, profissional/vínculo, jornada/exceções, passado, instantes/fuso e orçamento revisado. Não confiar no endTime/totais fornecidos pelo cliente.
- Conflitos PostgreSQL inclusive profissional em duas unidades. Legado com status null e intervalo futuro/em andamento permanece ocupado conservadoramente.
- ActorId vem da sessão; dados de negócio vêm do JSON explícito. Query/header/body não podem sobrescrever identidade/beneficiário/scope por merge genérico do adapter.
- Normalização/hash unificados incluem ação, scope, recurso, unidade, beneficiário, serviços, slot e versão. Replays não ignoram diferenças de beneficiário/ação.

Corrigir `src/infra/http/factories/make-calculate-availability-controller.ts`, que na auditoria injeta InMemoryBookingsRepository, para persistência PG. Demonstre que reserva persistida elimina o slot no GET existente.

Integre os writers de preço/ativação de serviços/jornada/exceções ao mesmo protocolo de locks da unidade. Teste alteração concorrente entre seleção e commit; horário/orçamento obsoleto não pode ser confirmado.

### Lookup protegido

- Apenas equipe autorizada da unidade, busca por exatamente um e-mail exato ou CPF completo no body; não por nome/CPF parcial.
- Retornar identificação mínima para confirmar cliente, contatos mascarados e elegibilidade; não expor CPF completo/contas privadas de terceiros.
- Limitador compartilhado PG, 30/min configurável por ator e ator+unidade. Contar inválidos/não encontrado; 31ª retorna429 com Retry-After; falha do contador retorna503.
- Redação de CPF/e-mail nos logs, inclusive errors do adapter; nenhum identificador na URL. Cache-Control: no-store em sucesso/erro.

### Consultas e DTOs

- BookingDto rico e consistente em criação, me, detalhe e agendas: itens/snapshots, totais, estados reais/legado explícito, version, ator/beneficiário, instantes/timezone, clientRequestId e serverTime.
- Capacidades para cancelar/remarcar/concluir/ausência calculadas pela mesma policy das mutations, com reasonCode/deadlineAt.
- CLIENT vê próprios; BARBER na operação vê própria agenda; OWNER autorizado vê unidade. Consumidor profissional conserva consultas pessoais. Negar acesso por outra unidade/perda de vínculo.
- Paginação20/máx100, ordenação estável e índices; filtros previstos no plano. Detalhe individual não recebe paginação de lista.
- Resumo SQL do filtro autorizado completo, independente da página. Valores legados desconhecidos indicam incompletude, não zero inventado/receita recebida.
- Corrigir serializers explícitos que hoje omitem novos campos B1; reutilizar URLs, não criar outro detalhe/me para contornar isso.

## 2. B4 — Cancelar, remarcar e registrar atendimento

Evoluir `DELETE /api/bookings/:bookingId/cancel` com cancelamento lógico; **não chamar delete físico que apaga reserva, itens, eventos e notificações**.

Criar, se ainda ausentes:

- `PATCH /api/bookings/:bookingId/reschedule`.
- `PATCH /api/bookings/:bookingId/status` para COMPLETED/NO_SHOW.

Todas as alterações novas usam expectedVersion, Idempotency-Key, policy comum e transação única do core.

- PERSONAL: cliente/consumidor altera os próprios até exatamente2h antes, limite inclusivo.
- UNIT: BARBER altera própria agenda; OWNER a unidade, até antes do início, limite exclusivo.
- Remarcação permite serviços/data/horário/profissional na mesma unidade; BARBER não transfere. Validar destino e preço antes de substituir. Falha mantém reserva original, snapshots, versão e horário.
- QUOTE_CHANGED entrega requestId, operationState NOT_APPLIED terminal, serverTime e quote autoritativa `{serviceItems,totalPriceInCents,totalDurationInMinutes}`. Não aplicar automaticamente nova cotação; nova revisão/confirmação usa nova tentativa somente após resolver a anterior.
- COMPLETED: manual pela equipe responsável após início; NO_SHOW: manual, a partir de15min do início inclusive. Nada automático e nenhum estado significa pagamento.
- Proibir sobrescrita de terminal por concorrência. Preservar histórico de ator/instante/versões. Legado não ganha comparecimento inventado; ações dependem de intervalo conhecido e autoridade.
- Materializar notificações no feed existente na mesma transação da reserva/evento/ledger, com unique(eventId,recipientId). Replay/restart não duplica. Cliente/profissional recebem avisos conforme spec; antigo profissional após transferência não obtém acesso indevido à reserva atual.
- Rede/e-mail não executam dentro dos locks. Uma linha de outbox sem aviso consultável não comprova o feed integrado. Push e envio WhatsApp não fazem parte deste grupo.

## 3. B5 — Contratos, compatibilidade e documentação

Atualize Swagger no app exportado e as rotas/factories existentes. Monte `GET /docs-json`, ausente na auditoria, e teste que responde com o mesmo spec usado pela UI. Confira todas as operações do inventário e as adicionadas pelos grupos1/2, corrigindo autenticação opcional do catálogo, serviceIds/endTime, erros e exemplos.

Documente respostas reais de sucesso/replay/PENDING/UNKNOWN/NOT_APPLIED, recursos discriminados, accessChanged e cabeçalhos; mantenha um formato canônico para o frontend. O relatório do Grupo1 contém exemplos diferentes dos DTOs locais: gere fixtures sanitizadas a partir do HTTP efetivo, sem copiar formatos divergentes.

Compatibilidade serviceId/endTime/DELETE e aliases users/staffs é explícita e testada. Se um cliente antigo não enviar o requisito obrigatório do contrato novo, rejeitar/documentar corte seguro; não remover autorização/versão/idempotência para fazê-lo passar. Preserve CORS, cookies/refresh e fluxo de login já corrigido em produção.

Erros distintos conforme spec: SLOT_UNAVAILABLE, QUOTE_CHANGED, BOOKING_VERSION_CONFLICT, ACTION_DEADLINE_PASSED, MEMBERSHIP_INACTIVE, IDEMPOTENCY_PAYLOAD_MISMATCH, além dos erros do core. Não responder503 como agenda vazia/sucesso. Confirme headers no-store e roteamento correto de endpoints estáticos antes de /:bookingId.

## Testes e critérios obrigatórios

Preserve os testes B1/E1/B2 e execute os checklists detalhados B3/B4/B5. Use UUIDs válidos em HTTP/PG, fixtures isoladas e barreiras determinísticas para concorrência.

- Dois snapshots persistidos e imutáveis após alterar catálogo; soma autoritativa, serviços repetidos/outros shops rejeitados.
- UNIT salva customerId distinto de createdByUserId; PERSONAL não aceita terceiro. BARBER não agenda colega; OWNER de outra unidade é negado; e-mail não confirmado bloqueia beneficiário.
- Dois POSTs reais concorrentes para mesmo profissional, inclusive unidades diferentes: um efeito; criação real × desativação nunca deixa vínculo inativo com nova reserva futura.
- Serviço/preço/jornada/exceção alterados concorrentemente exigem revalidação sob locks; slot público reflete reserva PG.
- Lookup entre instâncias respeita30/min,429/Retry-After,503 e redação/no-store.
- 21reservas em duas páginas: resumo estável do filtro completo, escopo BARBER/OWNER correto; detalhe e serializers trazem DTO integral.
- Prazos: cliente exatamente−2h permite, +1s nega; equipe no início nega; NO_SHOW14m59s nega,15m permite. Espera pelo lock atravessando prazo deve negar sem efeito/evento/feed.
- Remarcação com conflito preserva original; troca de serviços/profissional respeita unidade/autoridade; QUOTE_CHANGED é recuperável e não altera original.
- Cancelamento lógico conserva snapshots/eventos e libera disponibilidade; corridas cancelar×remarcar e concluir×ausência produzem transição consistente.
- Resposta perdida/restart/replay/close/cleanup>24h: resultado correto, um efeito/feed; original tardia não aplica depois de fence. Falha depois do comando e antes do ledger faz rollback de todos.
- Mudança de autoridade remove DTO privado de replay/GET/close, mantendo resultado durável permitido.
- Notificação commitada aparece no GET existente após restart; rollback gera zero aviso; ator também beneficiário não recebe duplicata do mesmo evento.
- HTTP completo: criação→me/agenda/detalhe→ações→histórico/feed; versões/capabilities/erros; Swagger/docs-json coerentes; regressão de login/refresh/logout e clientes legados.

Arquivos de teste previstos no plano:

- `src/infra/drizzle/booking-conflicts.integration.spec.ts`.
- `src/infra/http/controllers/booking/booking-access.spec.ts`.
- `src/infra/drizzle/booking-lifecycle.integration.spec.ts`.
- `src/infra/http/booking-contract.e2e.spec.ts`.
- Regressões `booking-items.integration.spec.ts`, `membership-lifecycle.integration.spec.ts`, `operation-attempts.integration.spec.ts` e `team-and-operations-http.spec.ts` nos caminhos da entrega Grupo1.

Após validar alvo PG, rode testes focados com `npx vitest run <arquivos>`; registre falha pertinente antes da correção e resultado depois. Ao fim: `npm test`, `npx tsc --noEmit`, `npm run check`. Informe falhas pré-existentes separadamente, sem aumentar timeout só para ocultar erro/deadlock. SQL/migrations precisam de prova PG, não apenas mocks. Não execute seed/admin/migrations contra produção para testar.

## Revisão, entrega e limite do grupo

Revisor independente deve conferir diff integral, atomicidade/locks/prazos/fence, autorização/privacy, snapshots/compatibilidade, feed, contratos/Swagger e evidências HTTP/PG. Corrija achados e repita checks afetados. Não usar o APPROVE anterior como aprovação dessas alterações.

Entregue base/commits, arquivos alterados, migrations testadas, correções das dependências, lista de endpoints novos/reutilizados, fixtures versionadas e exemplos para o frontend, comandos/resultados e revisão/correções. Classifique critérios PASS/PARTIAL/FAIL/NOT TESTED e atualize checklists só com evidência. Não marcar o grupo completo com bloqueadores ou aceites obrigatórios sem teste.

Um executor por grupo, checkpoints/commits locais neutros. Não fazer push, PR, merge, deploy ou migration de produção automaticamente. Não implementar frontend, cadastro/ativação CPF, novas homes, planos ou geolocalização nesta execução.

Pare após a revisão do Grupo2. Informe que Grupo3 (R1+G1) pode consumir os contratos reais entregues; se já iniciado com fixtures, precisa alinhá-las. Grupo4 só avança com grupos2/3 aprovados.

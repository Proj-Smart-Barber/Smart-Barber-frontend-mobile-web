# Prompt — primeira tarefa B1 do plano de agendamento

Copie o texto abaixo para o agente de implementação. A primeira tarefa da ordem aprovada é no backend; as telas dependem dessa persistência.

---

Implemente exclusivamente **B1 — Persistência de itens, estado e histórico**, do plano aprovado do Smart Barber. Esta instrução autoriza a implementação local dessa tarefa e seu commit local após validação/revisão. Não avance para E1/B2/B3 nem altere produção.

## Contexto e leitura obrigatória

Repositório de execução: `D:/smart_barber/api`.

Leia antes de editar:

1. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/planos/2026-10-11-reservas-backend.md` — constraints e tarefa B1.
2. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` — decisões D01–D16, DTOs, legado e consistência.
3. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` — sequência B1→E1→B2→B3→B4/B5 e gates.
4. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/REVISAO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` — objeções resolvidas S/C/U.
5. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/ANALISE_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` — baseline auditada e limites da prova anterior.

O plano e o método já foram aprovados. Não peça novamente aprovação das mesmas decisões. Confirme a revisão atual da API antes de trabalhar: a baseline auditada era `a1ba2dae`, não presuma que continue sendo a mais recente. Inspecione AGENTS.md aplicáveis, branch, diff e padrões existentes. Preserve trabalho de terceiros; se necessário, use checkout/worktree isolado do backend. Não execute reset/stash ou substitua alterações alheias para obter um checkout limpo.

## Método de execução

Use execução por tarefas com revisão independente, conforme escolha do usuário. Se houver delegação, o executor é responsável apenas por B1 e um revisor diferente verifica a implementação depois dos testes. Você não está sozinho no codebase: preserve alterações de outros e ajuste a integração sem revertê-las.

Siga `superpowers:subagent-driven-development` e TDD quando disponíveis, lendo as skills antes de aplicá-las. A revisão deve usar o código/SQL/diff e resultados reais; não aceitar apenas o relato do executor. Não inicie outras tarefas enquanto revisa B1.

## Problema a resolver

A API já aceita vários serviceIds, mas os persiste como um item agregado com título “A + B” e referência ao primeiro serviço. Isso perde a lista fiel de serviços e impede um histórico completo do carrinho.

B1 entrega modelo, persistência, mappers e migration compatíveis para itens individuais e histórico. Não entrega o novo fluxo operacional, idempotência ou lifecycle completo: essas integrações pertencem às próximas tarefas. Testar os novos writers/repositories com dois itens reais não equivale a afirmar que o POST atual já foi integrado por B3.

## Escopo e arquivos

Responsabilidade exclusiva: código/schema/migrations/testes da API necessários a B1. Documentação local de evidências da tarefa pode ser acrescentada. Não implementar frontend.

Revisar/modificar, conforme os caminhos reais:

- `D:/smart_barber/api/src/infra/drizzle/schema.ts`
- `D:/smart_barber/api/src/domain/enterprise/entities/booking.ts`
- `D:/smart_barber/api/src/domain/enterprise/mappers/booking-mapper.ts`
- `D:/smart_barber/api/src/domain/enterprise/mappers/booking-details-mapper.ts`
- `D:/smart_barber/api/src/infra/drizzle/repositories/drizzle-bookings-repository.ts`

Criar ou adaptar os equivalentes existentes:

- `D:/smart_barber/api/src/domain/enterprise/entities/booking-service-item.ts`
- `D:/smart_barber/api/src/infra/drizzle/repositories/drizzle-booking-items-repository.ts`
- `D:/smart_barber/api/src/infra/drizzle/booking-items.integration.spec.ts`
- Migration `D:/smart_barber/api/drizzle/<timestamp>_booking_items_history/migration.sql` e metadata pelo gerador/padrão instalado.

Não crie repositories concorrentes ou uma arquitetura nova caso existam abstrações adequadas. Mudanças mínimas em callers atuais para manter compilação/compatibilidade são permitidas; não expandem o escopo para B3.

## Modelo e requisitos

- `BookingRecord`: id, customerId, barbermanId, barbershopId, startsAt, endsAt, timezone, status, version, createdByUserId e clientRequestId, com compatibilidade documentada dos campos legados.
- `BookingServiceSnapshot`: serviceId (nullable apenas no legado sem identificação fiel), title, priceInCents, durationInMinutes e legacyAggregate. Novos itens possuem ID/preço/duração válidos e legacyAggregate=false; dados históricos desconhecidos não recebem valores inventados.
- Uma reserva nova na porta de persistência pode conter dois ou mais snapshots, gravados atomicamente com a reserva. Se a gravação falhar, não deixar itens/reserva parciais.
- Totais vêm dos snapshots persistidos, em centavos/minutos. Exemplo: dois itens de4000/30min e3000/20min resultam em7000/50min. Fixture de HTTP/PG usa UUIDs válidos, não strings literais “s1/s2”.
- Mudanças posteriores no catálogo não alteram títulos/preços/durações históricos.
- Histórico conserva ator, instante, versões e referência da reserva; não apaga itens/eventos. B1 prepara as estruturas; regras/endpoints de cancelamento/remarcação/status pertencem a B4.
- Status previstos: CONFIRMED, CANCELLED, COMPLETED e NO_SHOW. Não classifique atendimento antigo como concluído/ausente apenas pelo relógio.
- Legado agregado permanece identificado como legacyAggregate=true. Não reconstruir IDs pelo título “A+B” nem fingir que o primeiro serviceId representa todos os serviços. Preserve vínculos existentes e valores comprováveis; valores/estado sem origem fiel permanecem desconhecidos.
- Não reinterprete datas/fusos históricos silenciosamente: inventarie os formatos existentes e documente casos cuja conversão para instantes não possa ser comprovada. Preserve leitura compatível e indique tratamento explícito de dados ambíguos.

## Migration e proteção dos dados

Antes de gerar/aplicar, inventarie schema, migrations, relações de shopping cart/service items/bookings e contagens. Defina backfill forward e procedimento de rollback/recovery que conserve os registros, inclusive reservas legadas agregadas.

Use apenas PostgreSQL local/de homologação isolado, identificado e verificado. Se não houver ambiente adequado, avance no código/testes e informe o bloqueio de homologação, sem substituir prova PG por memória ou apontar para produção.

Não use `db:push`, seed ou migration em produção. A aplicação atual executa migrator no boot: não inicie servidor com conexão desconhecida nem dispare deploy para testar a migration. Não edite credenciais/usuários/permissões/seed de produção. Não registre senha, DATABASE_URL, token ou dados pessoais em evidências.

## Testes e verificação

1. Escreva os testes e observe falha pelo defeito real antes de implementar.
2. `new_booking_retains_two_snapshots`: persistir e reler dois IDs/títulos/preços/durações individuais e totais7000/50.
3. `legacy_aggregate_is_not_split`: agregado continua marcado, sem itens/IDs inventados.
4. `catalog_edit_does_not_rewrite_history`: editar/desativar serviço atual não altera snapshot persistido.
5. `failed_item_write_rolls_back_booking`: falha na gravação de item não deixa reserva ou itens parciais.
6. `migration_preserves_legacy_counts_and_links`: aplicar em cópia isolada, comparar contagens/referências/valores antes/depois e validar rollback/recovery sem perda.
7. Testar leitura de valores/status desconhecidos, constraints/FKs e compatibilidade dos callers/queries atuais, sem fingir que dados desconhecidos valem zero.

No backend, executar:

```text
npm test -- src/infra/drizzle/booking-items.integration.spec.ts
npx tsc --noEmit
npm test
```

Execute também os checks existentes aplicáveis às alterações. Informe falhas pré-existentes por nome; não as oculte nem amplie correções fora de B1. Artefatos de migration devem ser exercitados com PostgreSQL real, não apenas analisados ou gerados.

## Revisão e entrega

Revisor independente confere schema/SQL/mappers/callers, fidelidade do legado, transação, constraints, conversão temporal, migration/recovery, testes e ausência de expansão para próximas tarefas. Corrija achados dentro de B1 e repita os checks afetados.

Após validação/revisão, faça commit local neutro, por exemplo `feat(bookings): persistir itens e historico de reservas`. Branch neutra, por exemplo `feat/booking-items-history`. Não incluir nomes de ferramentas/agentes em branch/commit/artefatos de código. Não faça push, PR, merge, deploy ou migration de produção automaticamente.

Entregue: arquivos alterados; revisão base; modelo final e compatibilidade; inventário/backfill/recovery; comandos/resultados; falhas/bloqueios reais; revisão independente e correções; status PASS/PARTIAL/FAIL/NOT TESTED e commit local, se criado. Atualize o checklist B1 somente conforme evidências. Indique o que B1 oferece para E1, sem declarar B2/B3/B4 concluídas.

Pare ao concluir B1 e sua revisão; a próxima tarefa é E1, mas não a execute neste pedido.

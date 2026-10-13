# Análise de compatibilidade — PRs #28 e #29

Data: 12/10/2026. Auditoria de leitura do GitHub e testes locais isolados. Nenhum PR foi alterado, comentado, aprovado ou merged; nenhuma mudança foi publicada.

## Conclusão

**Os PRs não estão prontos para integração direta.** Há um conflito textual direto nos exports, implementações paralelas de remarcação/cancelamento, incompatibilidade com contratos atuais e quebra de compilação do PR28 após sua atualização com main. O PR29 também precisa regularizar sua base e corrigir uma falha de teste já existente nele.

Aproveitar os componentes visuais e ajustes de navegação do PR28 sobre os adapters/contratos compartilhados do Grupo4; não manter duas autoridades de mutations com políticas diferentes.

## Bases confirmadas no GitHub

| Referência | SHA | Situação consultada |
| --- | --- | --- |
| main | `6a17846bb792fa5e6e039ebcbe1da41573e3fa01` | Grupo3 integrado via PR27 |
| [PR28](https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/pull/28) | `d034a53da1202c536b5de2271a692ae768d9f9a5` | Aberto, mergeable=true; 30 arquivos no diff |
| [PR29](https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/pull/29) | `849908f0f3938f5c7667a9de7b8f023f17221fc4` | Aberto, mergeable=false; 104 arquivos no diff |

PR28 é de Bruxx092 e adiciona Atendimentos; PR29 é de wellingtonspdev e entrega Grupo4 mais commits anteriores na história da branch. Nenhuma review submetida retornou nas consultas dos dois PRs. Combined status retornou Vercel success para PR28 e nenhuma entrada de status para PR29; isso não substitui typecheck e não prova ausência de outros check runs.

A descrição do PR28 diz que a branch está atrás de main e em conflito no bookings.api.ts. Essa descrição está desatualizada: seu head atual já contém o merge de main e o GitHub/simulação permitem o merge textual. Contudo, os hooks que a tela nova precisa desapareceram do arquivo compartilhado.

## Simulação de Git — PASS/FAIL textual

Clone descartável: `D:/smart_barber/Smart-Barber-frontend-mobile-web/.tmp/pr-28-29-audit-20261012`. Download dos heads somente para leitura; branch/arquivos de aplicação do checkout original preservados.

| Combinação | Resultado |
| --- | --- |
| main + PR28 | PASS: merge-tree sem conflitos |
| main + PR29 | FAIL: 20 caminhos em conflito |
| PR28 + PR29 | FAIL: 21 caminhos em conflito |
| Aplicar somente o delta Grupo4 (parent 1d94c28 → 849908f) sobre main | PASS: simulação com base explícita, sem conflitos |

No diff incremental de cada PR contra main, o único caminho em comum é `src/features/bookings/index.ts`. Os demais20 conflitos vêm da história do PR29: a branch conserva o commit original do Grupo3 enquanto main contém sua integração por squash. Não atribuir esses20 conflitos ao outro desenvolvedor.

Confirmei que `git diff 1d94c28 6a17846` contém apenas uma linha adicional no dossiê de login, sem diferença de implementação. Portanto, uma atualização da branch que reaplique apenas o commit Grupo4 sobre main deve reduzir esses conflitos; a simulação abaixo passou. Isso ainda não foi executado na branch do PR.

Comandos usados no clone:

```text
git merge-tree --write-tree 6a17846bb792fa5e6e039ebcbe1da41573e3fa01 d034a53da1202c536b5de2271a692ae768d9f9a5
git merge-tree --write-tree 6a17846bb792fa5e6e039ebcbe1da41573e3fa01 849908f0f3938f5c7667a9de7b8f023f17221fc4
git merge-tree --write-tree d034a53da1202c536b5de2271a692ae768d9f9a5 849908f0f3938f5c7667a9de7b8f023f17221fc4
git merge-tree --write-tree --merge-base=1d94c28 6a17846bb792fa5e6e039ebcbe1da41573e3fa01 849908f0f3938f5c7667a9de7b8f023f17221fc4
```

## Achados com impacto de integração

### P1 — PR28 importa hooks ausentes

`src/features/bookings/model/use-bookings-view-model.ts:16–18` importa:
- useCancelBookingMutation
- useDayBookingsQuery
- useUpdateBookingMutation

O bookings.api.ts do head atual PR28 possui os adapters do Grupo3 e não exporta esses hooks. TypeScript reproduziu três TS2305. A integração com PR29 também mantém esses erros. Não basta preservar o arquivo do PR28 ou do PR29 por inteiro; adaptar os consumidores à API compartilhada.

### P1 — Remarcação paralela e contrato divergente

PR28: `BookingsHttpAdapter.updateBooking` envia PATCH `/api/bookings/:id/update`, com date/startTime/endTime, sem expectedVersion/Idempotency-Key/scope. Cancel também não envia body/key.

PR29: adapters usam PATCH `/reschedule` e DELETE `/cancel` com os novos campos/key quando fornecidos, BookingDto e capabilities. A API main atual tem /reschedule e /status, **não /update**.

A rota /update existe na branch de [API PR50](https://github.com/Proj-Smart-Barber/api/pull/50), ainda aberta na consulta. Portanto, a chamada não é uma rota imaginária, mas depende de outra entrega e implementa uma política separada.

O UpdateBookingUseCase lido nessa branch verifica profissional/ownerId e overlap, altera date/startTime/endTime e salva; não usa o unit-of-work compartilhado, expectedVersion, ledger, política terminal/prazo ou atualização explícita de startsAt/endsAt. O feed é chamado depois do save. Isso é incompatibilidade estática com as garantias planejadas do Grupo4, não prova de exploração ou de comportamento em produção. Usar /reschedule como autoridade compartilhada, ou fazer /update delegar à mesma política se houver compatibilidade necessária.

A descrição antiga do PR28 sobre cliente não receber aviso não deve ser tratada como verdade atual: PR50 já declara inclusão do cliente. Não executei entrega real de notificações para confirmar.

### P2 — Colisão de tipo no barrel

PR28 exporta `BookingCustomer` em `api/bookings.contract.ts:7`. PR29 exporta outro `BookingCustomer` em `model/booking-flow.types.ts:29`.

Preservar os exports dos dois no index.ts produziu TS2308. Unificar tipos ou usar exports explícitos/aliases sem perder as interfaces dos dois consumidores.

### P2 — Duas telas/políticas para o mesmo atendimento

PR28 cria rota operacional `(app)/bookings`, lista do dia, EditBookingSheet e BookingCancelDialog. PR29 tem agenda por unidade, detalhe de conta, ações e engine compartilhada.

PR28 DTO descarta status/version/capabilities/instantes/legacyAggregate; a tela oferece editar/cancelar sem essas capacidades, calcula prazo/data pelo aparelho e soma preço desconhecido como0. Adaptar apresentação ao BookingDto atual e aos comandos compartilhados; não reintroduzir permissões/preços fabricados.

PR28 adiciona `(app)/bookings`, enquanto já existe `(client)/bookings`. Os grupos são removidos do pathname público, gerando /bookings em ambos. Links qualificados por grupo podem funcionar, mas refresh/deep link e seleção do menu precisam de validação específica. Não houve prova browser dessa ambiguidade nesta auditoria.

### P2 — Cache e contexto por unidade precisam de unificação

O view model PR28 depende de useDayBookingsQuery(date), sem passar unidade/ator. Se esses hooks forem restaurados na forma antiga, não aproveitarão o escopo de unidade do Grupo4 automaticamente. A leitura do endpoint schedule/details é do profissional autenticado, não uma agenda explicitamente da unidade selecionada.

No PR29, AGENDA_QUERY_KEYS.day começa com `['agenda','day',shopId,...]`, mas invalidateBookingQueries usa `['agenda',shopId]`. Esses prefixos não se correspondem; atualização não invalida aquela agenda por esse caminho. Reusar um único catálogo de keys/invalidações nas telas dos dois PRs.

## Pendências do próprio PR29, independentes de PR28

1. Teste `bookings.test.ts:172` espera status `pending`, enquanto engine salva `submitting`. Reproduzido tanto no PR29 sozinho quanto no candidato combinado. Ajustar contrato/assertion coerentemente; não contabilizar os280testes anteriores como resultado confirmado do head atual.
2. `use-booking-flow.ts:226` sincroniza ServerClock com new Date() quando falta referência; `BookingActionConfirm.tsx:47/102` usa Date.now() como fallback e a ação cria chave nova a cada tentativa. Isso contraria falha fechada e recuperação persistida exigidas no plano; as alterações compartilhadas não garantem que todos os callers as usem.
3. Detalhe da conta fixa scope PERSONAL, inclusive quando aberto pela equipe. A tela atual de detalhe não apresenta botão de remarcação; a rota pública /book não passa bookingId. Há código de reschedule no hook, mas não encontrei entrada de UI ligada a ele nesse caminho. Esse ponto impede afirmar remarcação completa só pela existência do adapter. Além disso, o branch UNIT do submit precede bookingId, devendo ser revisto antes de ligar remarcação operacional para não criar nova reserva por engano.
4. Trilha detalhada de eventos permanece pendência API explicitamente relatada; não tratar como audit trail completo implementado.

Esses achados são recorte de compatibilidade, não revisão completa de todo Grupo4.

## Testes executados nesta auditoria

Dependencies reutilizadas do frontend local; TypeScript/Vitest executados no clone, sem instalar pacotes ou alterar lockfiles. Os tipos de rotas Expo gerados do checkout foram copiados ao clone para evitar erro ambiental de segments. Os três TS2305 persistiram. Vitest apresentou warning de resolução de config Expo, mas concluiu a execução; contratos HTTP desses testes são mocks.

| Cenário | Resultado observado |
| --- | --- |
| PR28 atual — typecheck isolado | FAIL: três exports de hooks ausentes |
| PR28 — seus três arquivos de testes novos | PASS: 25/25 |
| Candidato PR28+PR29 — typecheck | FAIL: mesmos três TS2305 + colisão BookingCustomer TS2308 |
| Candidato combinado — suíte completa | 50 arquivos PASS /1FAIL; 305 testes PASS /1FAIL |
| PR29 sozinho — teste bookings.test.ts | 8PASS /1FAIL, mesma assertion pending/submitting |
| PR29 sozinho — npm run typecheck | PASS, exit0 |
| HTTP real/API produção/browser/native da combinação | NOT TESTED |
| Build da combinação | NOT TESTED; integração não liberada pelos erros acima |

O candidato combinado é **apenas experimento**, não resolução aprovada: os20 conflitos herdados foram escolhidos do PR29 e o barrel preservou exports dos dois. Nada disso foi aplicado na branch de trabalho original ou no GitHub.

## Sequência recomendada para integrar

1. Atualizar PR29 para main preservando apenas o delta Grupo4, evitando reintroduzir commits já integrados por squash. A simulação do delta passou sem conflito.
2. Corrigir teste/callers/keys/contextos do PR29 e seus requisitos pendentes, sem relaxar o plano.
3. Adaptar PR28 para usar DTO/queries/operations/mutations compartilhados: uma política de remarcação/cancelamento, por unidade, com version/key e recuperação. Preservar sua UI de Atendimentos, calendário, confirmação visual e ajustes de overflow/helper.
4. Resolver barrel de forma explícita, revisar /bookings vs caminhos por perfil e garantir entradas acessíveis para OWNER que também atende.
5. Validar composição completa: TypeScript, testes, build e browser com API isolada, incluindo timeout após commit, troca de unidade/conta, /reschedule, cancelamento e feed. Revalidar heads no momento da integração.
6. Somente depois submeter a revisão humana/merge autorizado. Nenhum dos dois deve ser integrado como está.

## Anexo — 21 conflitos na combinação original

- `docs/DOSSIE_INCIDENTE_LOGIN_PRODUCAO_2026-10-11.md`
- `docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md`
- `src/app/(account)/_layout.tsx`
- `src/app/_layout.tsx`
- `src/features/bookings/api/bookings.api.ts`
- `src/features/bookings/api/bookings.dto.ts`
- `src/features/bookings/index.ts`
- `src/features/bookings/lib/normalize-booking-error.ts`
- `src/features/bookings/lib/server-clock.ts`
- `src/features/bookings/model/booking-draft.ts`
- `src/features/bookings/tests/booking-contract.test.ts`
- `src/features/bookings/tests/server-clock.test.ts`
- `src/features/bookings/ui/BookingCard.tsx`
- `src/shared/operations/OperationLifecycleBridge.tsx`
- `src/shared/operations/operation-attempt-store.native.ts`
- `src/shared/operations/operation-attempt-store.web.ts`
- `src/shared/operations/operation-attempt.api.ts`
- `src/shared/operations/operation-attempt.types.ts`
- `src/shared/operations/tests/operation-attempt-api.test.ts`
- `src/shared/operations/tests/operation-attempt-store.test.ts`
- `src/shared/operations/tests/operation-lifecycle-bridge.test.ts`


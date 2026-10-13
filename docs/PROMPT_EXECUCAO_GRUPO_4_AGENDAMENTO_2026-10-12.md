# Prompt — Grupo 4: carrinho, agendamento e agenda completos

Execute integralmente **o Grupo 4 (R2 + R3 + R4)** do Smart Barber em uma execução, com checkpoints internos e revisão independente ao final. Entregue a jornada navegável e integrada: vários serviços em uma reserva, entrada pessoal e operacional, retorno de login/verificação, recuperação de resultado incerto, agenda/detalhe e ações de atendimento.

## Base, leituras e ownership

Implemente em `D:/smart_barber/Smart-Barber-frontend-mobile-web`. Consulte contratos em `D:/smart_barber/api`. Leia AGENTS.md aplicáveis, confira branch/HEAD/diff e preserve trabalhos de terceiros: você não está sozinho no código. Nomes de branch/commit neutros.

A entrega local do Grupo3 foi encontrada no commit frontend `1d94c28`. Confirme que a base contém esse commit ou equivalente, além das correções de login. API precisa conter B1 e grupos1/2. Não partir de uma main que descarta essas entregas. O relatório do Grupo3 informa248testes, typecheck/build e revisão APPROVE; não foram reexecutados nesta preparação, e isso não comprova homologação browser/native ou deploy.

Leia integralmente, relativos ao frontend:

1. `docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md` — Grupo4 e dependências.
2. `docs/planos/2026-10-11-reservas-frontend.md` — R2/R3/R4, interfaces e constraints globais; R1 como dependência e R5 como aceite futuro.
3. `docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` — decisões D01–D16, contratos e recuperação.
4. `docs/PLANO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` e `REVISAO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` — gates/correções aceitas.
5. `docs/PROMPT_EXECUCAO_GRUPO_3_AGENDAMENTO_2026-10-12.md` e `docs/PROMPT_EXECUCAO_GRUPO_2_AGENDAMENTO_2026-10-11.md` — garantias exigidas das dependências.
6. `docs/planos/2026-10-11-equipe-conta-frontend.md` e `2026-10-11-homes-descoberta-frontend.md` — somente contratos de navegação/actions que os grupos5/6 consumirão.

Ownership: services/bookings/agenda, adapters de dashboard afetados, booking-return-intent, rotas de reserva/detalhe e testes. Reuse shared operations/session/guards do Grupo3. Correções indispensáveis dessas dependências fazem parte do checkpoint abaixo e exigem seus testes de regressão; não criar outra store, relógio ou ledger por feature.

Não implementar gestão de equipe/cadastro CPF/homes novas/geolocalização. Atualizar os consumidores atuais de agenda/dashboard é necessário, mas o redesenho das homes fica no Grupo6. Uma execução por grupo prevalece sobre trocar executor por pequena tarefa; checkpoints/TDD internos permanecem.

## 0. Conferir e corrigir dependências antes de ligar mutations às telas

Compare handlers/factories/mappers reais da API com os schemas/adapters. O relatório do Grupo3 descreve GET/close como status/result/CLOSED, mas os controllers locais consultados devolvem OperationAttemptResult com **state/resource/serverTime**, e GET também envelope `attempt`. Baseie fixtures na implementação efetiva, não naquele exemplo divergente.

Lacunas encontradas na leitura estática local que devem ser confirmadas e corrigidas minimamente se persistirem:

- `src/shared/operations/operation-attempt.api.ts`: close usa fallback `raw.state ?? 'NOT_APPLIED'`. **Remover:** resposta ausente/malformada nunca comprova fence nem libera nova key. GET/close precisam de parser de estado/recurso e contexto; invalidade mantém operação incerta. ServerTime ausente não pode virar relógio do aparelho.404 continua UNKNOWN, sem inventar tempo autoritativo.
- `src/features/bookings/api/bookings.api.ts`: create aceita key opcional; cancel/reschedule/status não enviam Idempotency-Key. Novas mutations deste fluxo exigem key estável, expectedVersion quando alteração e scope explícito. Evoluir assinaturas com compatibilidade controlada dos callers existentes; testar o header/body de todos os métodos, inclusive DELETE.
- `src/features/bookings/model/booking-draft.ts`: engine atual usa Date.now como fallback, considera qualquer409 mudança de orçamento e não integra store/reconciliação. Evoluí-lo para consumir ServerClock/normalizeBookingError/shared operations; não reutilizar essa lógica insegura por estar exportada.
- `ServerClock` cai em Date.now se performance.now faltar. Novas operações devem falhar sem fonte monotônica válida, nunca substituir autoridade por relógio de parede. Tempo ausente/inválido não pode gerar nova tentativa.
- Stores web/native sanitizam apenas alguns campos de primeiro nível e persistem `result`; logout remove apenas payload, podendo conservar resultado/mensagem com PII. Use whitelist por tipo e, nas incertas após logout/expiração, preserve somente referência opaca permitida. REGISTRATION/INVITATION sensíveis não podem persistir formulário/e-mail/CPF/senha nem hash sensível, mesmo aninhados. BOOKING persiste só comando necessário, não DTO de cliente.
- LifecycleBridge dispara cleanup assíncrono e ignora falhas. Teste e coordene limpeza vs envio/resposta tardia/troca de conta para impedir regravar payload antigo ou enviar após falha indispensável de storage. Restaurar/recovery temporário não é logout.

TDD: close com `{}` ou estado desconhecido não retorna NOT_APPLIED; todos os métodos enviam a mesma key; qualquer409 não vira QUOTE_CHANGED; ausência de clock/storage gera zeroPOST; logout com resultado contendo dados privados deixa só referência e resposta tardia não repopula storage. Revise com o revisor as mudanças compartilhadas; sem nova arquitetura ou ampliação de produto.

Confira garantias backend indispensáveis: replay/fence/QUOTE_CHANGED terminal, permissões por unidade, versões, histórico e feed. Se API não cumprir um contrato, registre endpoint/arquivo/request/expected/actual sanitizados e devolva ao responsável Grupo2. Não ocultar deficiência com validação frontend nem declarar integração completa por mock. Desenvolva partes independentes possíveis sem mexer na API silenciosamente.

## 1. R2 — Carrinho e jornada pessoal

Modificar `src/features/services/model/use-public-services.ts`, `ui/PublicCatalogView.tsx`, `SelectedServicesSummary.tsx`; substituir modal de “próxima atualização” por ação de continuar o fluxo real.

Criar/evoluir:

- `src/features/bookings/model/use-booking-flow.ts`, `booking-flow.types.ts`, `booking-query-keys.ts` e engine atual.
- UI `BookingFlowView.tsx`, `BookingReview.tsx`, `ProfessionalPicker.tsx`, `BookingSlotPicker.tsx` em bookings/ui.
- `src/app/(public)/barbershops/[shopId]/book.tsx`.
- `src/features/auth/model/booking-return-intent.ts`, integrações mínimas em login/verify/root.

Interface: `useBookingFlow({mode:'PERSONAL'|'UNIT',shopId,bookingId?,initialDate?,initialProfessionalId?})` expõe draft/passos/seleções/revisão/submit/reconcile e estados reviewing/submitting/confirmed/uncertain/error, consumindo sessão/contratos/core existentes.

Jornada: unidade → serviços → profissional → data/horário → revisão → confirmação explícita → resultado.

- Carrinho com serviceIds únicos, uma unidade, um profissional e intervalo contínuo. Totais da seleção orientam revisão; backend confirma snapshots/soma. Não criar uma reserva/POST por serviço.
- Alterar serviços/profissional/data invalida slot e cotação quando afetados. Voltar/editar mantém seleção compatível. Troca de unidade não mistura carrinhos; serviços removidos/desativados exigem revisão.
- Catálogo/fluxo pessoal pode ser explorado sem sessão. Para confirmar, conta/e-mail verificado. Login/cadastro/verificação preservam apenas draft público sanitizado e destino interno validado `{shopId,draftId}`; retornar à revisão, **zeroPOST automático**.
- PERSONAL beneficia a conta autenticada, inclusive BARBER/OWNER consumindo. Não transformar URL/returnIntent em permissão UNIT.
- Use slots originais ISO e timezone autoritativo da unidade. Não usar fuso do aparelho para reinterpretar horário; conservar slotStartAt quando previsto no contrato. Não inventar fim se o backend rejeitar duração/slot.
- Revisão mostra serviços, profissional, unidade, data/horário no fuso da unidade, duração total, valor, cliente próprio e regra de cancelamento. Reserva a menos de2h do início deve informar que o prazo pessoal de alteração já terminou.
- QUOTE_CHANGED compara itens/valores/durações antigos vs quote autoritativa, revalida slots e exige nova revisão/confirmação.409 de versão/slot não recebe essa mensagem. Nova tentativa só depois de decisão terminal/fence comprovados; remarcação mantém original.
- Antes de POST: capturar comando/key imutáveis, persistir tentativa sanitizada, validar sessão/contexto/clock/entropy/storage e marcar submitting. Doubletap e rerender não podem criar keys/POSTs adicionais.

## 2. R3 — Agendamento rápido, ações e recuperação

Criar UI `CustomerLookup.tsx`, `BookingResult.tsx`, `BookingRecovery.tsx`, `BookingActionConfirm.tsx`, rota `src/app/(app)/new-booking.tsx`; compartilhar fluxo/engine da jornada pessoal.

- UNIT exige vínculo ACTIVE na unidade selecionada. Somente cliente cadastrado/elegível; buscar por e-mail exato OU CPF completo, conferir nome antes de reservar.
- BARBER agenda **para um cliente na própria agenda profissional**; OWNER escolhe qualquer profissional elegível da unidade, inclusive si quando atende. “Agendar para mim” como consumidor é entrada PERSONAL separada. OWNER em outra unidade não ganha gestão da selecionada.
- Lookup transitório: não guardar identificador nos drafts/attempts/URL/cache/querykeys/logs. Limpar formulário/dados ao sair, trocar unidade/conta ou perder acesso.429 mostra espera e503 erro/retry, nunca cliente inexistente falso.
- Criação pessoal/UNIT usa o mesmo POST `/api/bookings`; UNIT informa shopId/customerId e salva createdByUserId distinto no servidor. Reserva operacional confirma imediatamente pelo retorno autoritativo; não enviar WhatsApp/e-mail manual por ferramenta.
- Cancel/reschedule/status exigem expectedVersion/key/scope e confirmação. Capabilities atuais habilitam a UI; backend é autoridade final. Nunca usar tipo global como substituto de permissão da unidade.
- Cancelar/remarcar pessoal: até exatamente2h antes inclusive; equipe: antes do início exclusivo. Erro de prazo/versão/vínculo reconsulta sem repetir ação automaticamente.
- Remarcação edita data/horário/serviços/profissional na **mesma unidade**, mantendo cliente/reserva. BARBER não transfere; OWNER/cliente têm opções autorizadas. Revisar qualquer mudança de preço/duração; falha conserva original. Não fazer cancelamento seguido de nova criação como atalho.
- COMPLETED pela equipe após início; NO_SHOW manual após15min inclusive. Confirmar intenção, motivo opcional; nada automático nem inferência de pagamento. Estados terminais não oferecem ações incompatíveis.
- Timeout/rede/503/JSON inválido após envio: uncertain, conservar key/comando e consultar exato requestId. Não editar payload nem trocar key enquanto a anterior estiver indefinida. Retry de leitura não é replay de mutation.
- APPLIED: mostrar recurso existente validado, atualizar cache; se accessChanged/DTO ausente, informar aplicação/acesso alterado sem dados privados nem recriar recurso.
- NOT_APPLIED comprovado/fenced: permitir nova revisão. PENDING/UNKNOWN/404/503: continuar incerto.24h ou falta de payload não prova não aplicação.
- Ação “Verificar operação anterior” e close explícito explicado: fechar tentativa aplicada **não cancela o agendamento**. Close NOT_APPLIED libera nova revisão; APPLIED mostra resultado existente. Sem payload após logout/expiração, não inventar replay.
- Logout→outra conta→mesma conta recupera só referências do ator correto. Resposta tardia não atualiza tela/cache/storage da nova conta; zeroPOST automático na recarga/relogin/consulta.

## 3. R4 — Consultas, detalhe, agenda e cache

Modificar `src/features/bookings/model/use-my-bookings.ts`, `ui/BookingCard.tsx`, `src/app/(client)/bookings.tsx`; criar `model/use-booking-detail.ts`, `ui/BookingDetailView.tsx`, `BookingHistory.tsx` e `src/app/(account)/bookings/[bookingId].tsx`.

Integrar agenda/dashboard nos arquivos existentes `src/features/agenda/api/agenda.contract.ts`, `agenda.http.ts`, `agenda.mapper.ts`, `model/use-agenda-view-model.ts` e consumidores de dashboard identificados no inventário. Ajustar `src/entities/appointment/model/appointment.types.ts` se necessário. Reuse shell/navbar/components atuais.

- Listas/detalhes reais para consumidor e unidade, com múltiplos serviços, totais/snapshots, profissional/cliente mínimos, estados/version/capabilities e instantes. Status/null/preço desconhecido não viram CONFIRMED/R$0/PAID; nome profissional vem de fonte autorizada, não ID ou texto fixo.
- Agenda UNIT usa endpoint da unidade; BARBER filtro próprio, OWNER equipe; agenda pessoal continua disponível aos profissionais. Mudança de ator/unidade/contexto reseta seleções privadas e reconsulta capabilities.
- Paginação da unidade preserva metadata e resumo do filtro inteiro. Não somar páginas para reconstruir receita ou apresentar valor agendado como recebido. Preserve hasIncompleteData/statusCounts se API os fornecer, harmonizando nome de total real em vez de copiar exemplo divergente.
- GET pessoal atual retorna `{bookings}` com páginas fixas20 sem total/hasNext. Preserve isso: carregue próximas páginas explicitamente, deduplique IDs e só confirme fim ao receber página vazia/menos20 conforme contrato real. Não fabricar total/hasNext autoritativo. Se a busca no servidor não aceitar upcoming/past, filtro visual cobre apenas dados carregados e informa limite; não afirmar histórico completo sem percorrer páginas/prova. Pedido de extensão necessária volta ao Grupo2.
- Datas civis e instantes são distintos. Destaque de próximo atendimento usa serverTime/fuso e ignora passado/terminal; não deduz COMPLETED automaticamente por horário passado.
- Histórico somente de eventos/dados reais autorizados. Se detalhe não oferece eventos, não inventar sequência/atores a partir de status/version: registrar contrato faltante e bloquear aceite de histórico completo até resolver.
- Keys incluem actorId/scope/shopId/professionalId/date/timezone/page/status quando aplicáveis. Não vazar cache entre unidades/contas. Erro503 mostra retry/dados antigos sinalizados, não lista vazia/sucesso falso.
- `invalidateBookingQueries(queryClient,{actorId,shopId,oldProfessionalId,newProfessionalId,dates})` cobre disponibilidade, listas/detalhe, agendas/dashboard e notificações afetadas após confirmação. Na remarcação, invalidar profissional/datas antigos e novos. Não usar restoreSession como refetch genérico.
- Contato WhatsApp só se telefone autorizado/válido; esconder ou desabilitar com motivo quando ausente. Botão abre ação do usuário, sem enviar mensagem nesta execução por ferramenta.
- Publicar destinos/callbacks de abrir agenda/detalhe/remarcar e novo agendamento que grupos5/6 usarão. Links internos funcionam em web/native sem telas Expo duplicadas ou redirect loops.

## UX e testes de aceite

Preserve estilo atual crimson/obsidian/ivory, fontes e componentes shared, dark/light, navegação adaptativa. Passos curtos com resumo editável; CTA fixo respeita safearea/navbar. Loading/empty/error/submitting/uncertain distintos, sem sucesso antes do servidor; touch44px, teclado/foco/labels e mensagens acessíveis. Nada de termos ledger/UUID/locks na copy de produto.

Testes previstos: `src/features/bookings/tests/booking-flow.test.ts`, `operational-booking.test.ts`, `booking-mutations.test.ts`, `booking-query-keys.test.ts`; `src/features/auth/tests/booking-return-intent.test.ts`; agenda/dashboard e regressões core/session/transport.

Siga TDD e preserve os checklists R2/R3/R4. Critérios indispensáveis:

- Dois serviços chegam à revisão e geram umPOST/uma reserva com dois snapshots reais. Mudar seleção invalida slot; doubletap não duplica.
- Login/verificação/reload preservam draft público e retornam à revisão com zeroPOST; redirect externo/UNIT adulterado é rejeitado.
- BARBER agenda cliente na própria agenda; OWNER escolhe equipe da selecionada; consumidor profissional usa PERSONAL. Conta não elegível/lookup errado não permite confirmar.
- Todos os métodos enviam key/version/scope; conflito mantém original, QUOTE_CHANGED nunca autoenvia e expõe diferença real; cancel é lógico, COMPLETED não é pagamento.
- UI de APPLIED/NOT_APPLIED/PENDING/UNKNOWN/404/503 e close malformado: sem nova key/sucesso falso; resultado aplicado sem DTO não vira nova criação.
- Prova integrada commit→resposta perdida→reload/logout→contaB→contaA, inclusive24h+: A recupera resultado, B não vê, zero novoPOST. Testar original tardia apósclose; perda de payload impede replay inventado.
- Store failure antes de enviar gera zeroPOST; limpeza/resposta tardia não ressuscitam PII; fonte de relógio ausente impede keynova.
- Bordas pessoais2h/equipeinício/NO_SHOW15min e versão/permissão alteradas recebem mensagens corretas; fuso diferente do aparelho preserva slot.
- 21reservas carregadas em duas páginas, deduplicadas; resumo da unidade estável; legado desconhecido/status real; próximo destaque nunca passado.
- Cache isolado e invalidações corretas após criação/remarcação/cancel/status, sem recriar sessão; feed reflete operação aplicada.
- Entradas/rotas reais ligam catálogo→reserva→resultado→lista/agenda→detalhe→ações. Regressão login/reload/refresh/logout/segundo login intacta.

Depois de confirmar API/PG de homologação isolados, valide navegador real e endpoints montados. Não usar produção como fixture, não chamar system/migrate/seed por conveniência; o boot da API pode migrar o banco. Credenciais somente em runtime, nenhuma no artefato.

Mocks verificam lógica local; não comprovam contrato HTTP/PG ou UX browser. Não substituir evidência de response-loss/fence por Promise rejeitada antes de salvar. Se necessário, harness de perda de resposta atua após commit observável no ambiente isolado.

Rodar testes focados, `npm test`, `npm run typecheck`, `npm run build`. Native Android/iOS têm evidência separada; buildweb/testeNode não os homologa. Declare NOT TESTED onde sem ambiente. A homologação de produto integrado do Grupo7 permanece necessária.

## Revisão, entrega e parada

Um executor mantém o contexto do grupo inteiro. Revisor independente verifica diff, retorno de autenticação, permissões, frontend+contratos, keys/clock/storage/fence, cache, navegação, UX e testes reais. Corrigir achados e repetir checks afetados. APPROVE dos grupos anteriores não aprova estas mudanças.

Entregar base/commits, arquivos, ajustes indispensáveis do Grupo3, contratos/rotas/callbacks para grupos5/6, matriz de evidência por critério/plataforma, testes/comandos/resultados e revisão/correções. Pendências API devem indicar requisito/endpoint/expected/actual e dono Grupo2; não esconder bloqueadores nem marcar checklists sem prova. PASS/PARTIAL/FAIL/NOT TESTED, distinguindo unitário, HTTP/PG, browser e native.

Não declarar Grupo4 integrado completo enquanto algum requisito indispensável de recuperação/autoridade/histórico estiver bloqueado. Concluir trabalho independente possível e explicar o bloqueio concreto. Não reabrir decisões de negócio aprovadas.

Pare após R2+R3+R4. Não fazer push, PR, merge, deploy/migração de produção automaticamente. Não implementar os grupos5/6/7 nem alterações backend sem escopo próprio. A próxima entrega planejada será Grupo5 (E2+G2+G3), usando as rotas/actions reais deste grupo.

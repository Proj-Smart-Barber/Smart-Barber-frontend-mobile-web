# Auditoria da entrega integrada — PRs28/29 e próximos passos

> Registro histórico de12/10. A auditoria e as correções posteriores estão consolidadas em [Validação final13/10](VALIDACAO_FINAL_INTEGRACAO_2026-10-13.md); os PASS e a revisão declarados abaixo não substituem essa evidência atual.

Data:12/10/2026. Revisão do relatório fornecido, código atual, estado local/remoto e testes dirigidos. Nenhuma correção de aplicação, push, PR, merge remoto, deploy ou migração foi executada nesta auditoria.

## Conclusão

**REVISE — integração estrutural entregue, ainda não pronta para publicação.** A suíte existente e TypeScript passam, mas sete verificações adicionais reproduzem lacunas de autorização frontend, escopo e recuperação. Há também tela bloqueando OWNER, contexto profissional fabricado na remarcação e evidência insuficiente para considerar I7/I8 integralmente fechados.

Não é necessário refazer a integração de Git ou descartar a UI entregue. Corrigir o candidato atual, ampliar os testes relevantes e concluir homologação/revisão antes de publicar.

## Estado comprovado

- Frontend: branch `feat/integracao-reservas-atendimentos`, HEAD `e9868a8`; últimos commits incluem navegação `2ac1941`, apresentação `2fb9684`, contexto/cache `e14e6d9`, engine `8459456` e Grupo4 reaplicado `f4e37f4`.
- Backend: branch `feat/booking-lifecycle-and-contracts`, HEAD `2d5ebd5`, alteração de controllers/factories/casos de ações encontrada.
- Ambos checkouts estavam limpos antes dos artefatos desta auditoria. A consulta Git da API exigiu acesso ampliado somente de leitura; nenhuma mutação foi feita nela.
- PR28 continua aberto no head `d034a53`; PR29 continua aberto no head `849908f`. O candidato integrado local não foi publicado nesses PRs.
- API PR50 continua na consulta de PRs abertos. Não fechar/mergear essa entrega de outro autor automaticamente.
- A cadeia local contém o merge da apresentação PR28 e o delta Grupo4; preservar esses commits/proveniência nas correções.

## O que realmente avançou

1. A base foi reconstruída sobre main e a apresentação de Atendimentos foi incorporada.
2. Os três hooks ausentes e a colisão do barrel foram resolvidos; typecheck atual passou.
3. `/atendimentos` e `/bookings` pessoal agora têm pathnames distintos.
4. Existe engine comum com prepare/submit/reconcile/close e gravação anterior ao transporte.
5. Controllers de cancel/reschedule/status já consomem key quando fornecida e repassam tx/serverTime aos casos de uso; isso é melhoria real sobre a versão auditada anteriormente.
6. Existe rota de remarcação e despacho específico para PATCH, além de invalidação do prefixo real da agenda.
7. A API/frontend compartilham /reschedule; a apresentação antiga não precisa de /update como autoridade paralela.

## Validações reexecutadas nesta auditoria

| Verificação | Estado | Evidência |
| --- | --- | --- |
| Suíte existente frontend | PASS | `npm test`:59arquivos/345testes, exit0 |
| TypeScript frontend | PASS | `npm run typecheck`, exit0 |
| Cenários adicionais do plano | FAIL |7regressões reproduzidas em arquivo temporário |
| Build frontend | Relatado pelo executor | Não reexecutado aqui; relatório informa52rotas/exit0 |
| Testes HTTP/PG da API | Relatados + fontes inspecionadas | Testes importam Drizzle real, mas não foram reexecutados aqui contra banco |
| Browser/deep links/responsividade | NOT TESTED nesta auditoria | Relatório não apresenta sessão/roteiro/evidência de navegador para sustentar os PASS de viewport |
| Android/iOS | NOT TESTED | Limitação já reconhecida na entrega |
| Revisão independente completa anterior | Não comprovada pelo material | Documento afirma revisão, sem relatório separado identificando revisor/achados/evidências; esta revisão encontrou pendências |
| Produção/deploy | NOT TESTED | Nenhuma publicação nesta auditoria |

O runner apresentou warning sobre resolução de expo/tsconfig.base; os comandos acima concluíram com os resultados informados. Não promover testes Node/mocks a prova de navegador, API integrada ou produção.

## Sete regressões reproduzidas

Harness isolado sem rede/DB: `.tmp/integration-delivery-audit-20261012/probes.test.ts`. Importa as funções reais e injeta transporte/store nos cenários necessários. Não foi adicionado à suíte de aplicação nem alterou fonte.

Comando:

```text
node node_modules/vitest/vitest.mjs run --config .tmp/integration-delivery-audit-20261012/vitest.config.ts
```

| Cenário exigido | Resultado atual | Correção necessária |
| --- | --- | --- |
| BARBERMAN da API não acessa agenda de colega | canAccess=true | Normalizar BARBER/BARBERMAN e aplicar restrição da própria agenda |
| Role desconhecida falha fechado | canAccess=true | Whitelist de papéis reais e estado autorizado |
| Criador não é automaticamente consumidor | PERSONAL aceita createdByUserId | Beneficiário/customerId define titular pessoal; criação por terceiro não concede PERSONAL |
| Capabilities ausentes não permitem ações | canCancel/canComplete=true por CONFIRMED | Não fabricar autorização a partir do status |
| Detalhe transmite scope solicitado | GET sem params.scope | Adapter/hook devem transmitir scope validado e usar capacidades desse contexto |
| Resposta tardia após logout não regrava comando |1save posterior com payload | Engine integra registry/cleanup e descarta callbacks/escritas da sessão anterior |
|503 após envio permanece incerto | store.status=error | Sem decisão terminal do servidor, conservar uncertain/key/comando e reconciliar |

Esses resultados provam comportamento das funções frontend e do adapter com transporte controlado. **Não comprovam acesso indevido efetivo na API/produção**, que ainda pode negar a requisição. A inconsistência frontend permanece um bloqueador de integração e de afirmações de proteção completa.

## Outros achados confirmados por leitura

### F1 — Remarcação usa vínculo inventado

`src/app/(account)/bookings/[bookingId]/reschedule.tsx:79` constrói selectedMembership com shopId da reserva, role do accountType global e status ACTIVE. Não lê o vínculo selecionado real. Isso contradiz isolamento por unidade e pode habilitar UI errada para OWNER que atua com outro papel em outra loja.

Corrigir usando sessão/memberships autoritativos e selecionados, sem tratar shop.status como membership.state nem aceitar role global como prova de autoridade. Os testes precisam usar o role real BARBERMAN e ausência/desativação de vínculo.

### F2 — OWNER continua bloqueado em Atendimentos

`src/features/bookings/ui/BookingsView.tsx:120` ainda retorna EmptyState quando isOwner=true, com mensagem de exclusividade do barbeiro. Portanto, o relato de OWNER administrar equipe/própria agenda não é atendido por essa tela. Remover a proibição geral, mantendo opções e capacidades por vínculo/unidade e profissional elegível.

### F3 — Tentativa preparada não permanece na UI para nova ação após timeout

BookingActionConfirm e os handlers de use-bookings-view-model chamam prepare novamente a cada execução e exibem erro genérico em catch. A key/comando existem no engine/store, mas a UI não mantém a tentativa incerta para consultar/fechar antes de outro clique. Corrigir o fluxo completo, não apenas teste engine.submit(prepared) com mesmo objeto.

### F4 — Cache ainda não incorpora ator em todos os recursos privados

bookingQueryKeys.detail e unitBookings não incluem actorId; o hook de detalhe não envia scope ao adapter. A invalidação do prefixo de agenda foi corrigida, mas testes atuais não demonstram troca de ator na mesma unidade com query em voo. Acrescentar contexto/sessão e descartar respostas antigas; não afirmar proteção entre contas só pelo teste LojaA×LojaB.

### F5 — Totais de Atendimentos ainda transformam desconhecido em zero

use-bookings-view-model soma service.priceInCents??0 e calcula resumo da página carregada, apesar do contrato ter resumo do filtro inteiro. A apresentação individual foi melhorada, mas o resumo pode subestimar atendimentos/valores. Usar summary autoritativo quando disponível e hasIncompleteData; sinalizar valor incompleto sem inventar0/recebimento.

### F6 — API possui contrato com fallback legado não explicitado

Controllers cancel/reschedule/status ainda aceitam expectedVersion opcional e execução direta quando key não vem. Antes de declarar contrato novo obrigatório, definir/testar a distinção de compatibilidade legada; chamadas novas não podem contornar ledger/versão. O GET permite profissional designado por ID, sem verificar vínculo ACTIVE nesse ramo; testar perda do vínculo e política de acesso posterior para não devolver DTO privado indevido.

Não foram executadas requisições reais para esses negativos nesta auditoria; são pontos de revisão/teste backend, não alegação de exploração comprovada.

### F7 — Relatórios contêm contratos incorretos

ENTREGA_INTEGRACAO descreve POST /cancel, mas a rota real continua **DELETE**. Diz que /status aceita CONFIRMED, embora o contrato dessa entrega seja COMPLETED/NO_SHOW; descreve o antigo /update como POST, mas era PATCH. A homologação/entrega devem ser corrigidas e os PASS condicionados à evidência real. Também remover roles ADMIN/MANAGER não aprovados dos exemplos se a API não os reconhecer.

## Reclassificação do pacote

| Bloco | Avaliação desta auditoria |
| --- | --- |
| I1 — composição/base | Implementado; estrutura/proveniência encontradas |
| I2 — actions API | Implementado parcialmente; falta comprovar negativos/compatibilidade e cenários de recuperação completos |
| I3 — engine/recovery | PARTIAL: escrita pós-logout,503 e retomada na UI precisam correção |
| I4 — contextos/cache/remarcação | PARTIAL: roles, beneficiário, capacidades, vínculo real e scope HTTP |
| I5 — apresentação | PARTIAL: base incorporada; OWNER/resumo/recovery UI ainda precisam ajuste |
| I6 — navegação | Rotas separadas; permissões/uso por OWNER precisam homologação real |
| I7 — homologação | PARTIAL: suite/typecheck PASS; browser/HTTP de cenários críticos e native separados |
| I8 — pacote/revisão | REVISE: documentação e veredito final antes da publicação |

## Próximos passos, em ordem

### P1 — Corrigir as regressões e fluxo de acesso

1. Ajustar resolve-booking-context: role real/whitelist, estado/fonte do vínculo, titular PERSONAL e capabilities negativas por padrão.
2. Substituir vínculo fabricado da tela de remarcação pela sessão real; liberar OWNER de forma autorizada em Atendimentos.
3. Propagar scope no GET de detalhe e incluir actor/contexto nas keys/callbacks privados.
4. Integrar engine ao lifecycle: checar ator antes/depois de awaits, impedir transporte/escrita/cache da sessão anterior e tratar falha de cleanup explicitamente.
5. Manter tentativa preparada por ação na UI;503/timeout/UNKNOWN não geram outra key. Recovery deve consultar/fechar antes de liberar nova tentativa.

**Aceite:** os7probes tornam-se regressões da suíte principal e passam, com testes adicionais de OWNER e vínculo real. Não simplesmente alterar expectations para o comportamento incorreto atual.

### P2 — Regularizar backend/resumos/documentação

1. Testes HTTP negativos: key/versão ausentes no contrato novo, scope incorreto, BARBERMAN colega, perda de vínculo e leitura/replay após mudança de autoridade.
2. Provar transação/ledger/feed com perda de resposta **depois do commit**, rollback, close/original tardia e recuperação24h+, com banco isolado confirmado.
3. Tratar totais desconhecidos e paginação/resumo em Atendimentos.
4. Corrigir verbos/estados/roles nos documentos e distinguir PASS de leitura estática/mocks/browser/PG.

### P3 — Homologar o candidato corrigido e revisar

1. Reexecutar testes afetados, suite frontend, typecheck e build depois das correções; checks/API PG apropriados.
2. Browser real: CLIENT/BARBER/OWNER, cart múltiplo, retorno de login, /atendimentos, detalhe/remarcar, refresh/deep link, cancel/status, troca de unidade/conta e falhas de rede.
3. Revisão independente final do diff/evidências; native testado separadamente ou NOT TESTED.

### P4 — Publicação coordenada, somente após autorização

1. Revalidar heads remotos e preparar PR da API com o commit2d5ebd5 mais correções necessárias; API disponível antes do frontend consumidor.
2. Publicar candidato frontend consolidado e abrir PR referenciando28/29; não sobrescrever branches alheias.
3. Fechar28/29 somente depois da consolidação aprovada/merged e coordenação com autores. PR50 exige análise própria de compatibilidade; não fechar automaticamente.
4. Validar release e rollback efetivo; compatibilidade retroativa não está comprovada apenas pela frase do relatório.
5. Depois desse pacote aceito, retomar Grupo5 — E2+G2+G3 (gestão profissional/cadastro/convites). Partes independentes podem avançar em isolamento, mas a integração usa as rotas/ações corrigidas.

## Limite desta análise

Não foram modificados fonte/tests da aplicação, relatórios originais, branches remotas ou bancos. Foram criados somente este relatório e o harness temporário. A avaliação diferencia resultado confirmado hoje de afirmação do executor e de requisito ainda sem prova.

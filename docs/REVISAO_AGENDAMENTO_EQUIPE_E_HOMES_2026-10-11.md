# Revisão do desenho de agendamento, equipe e homes

Estado: APPROVED por arbitragem final e pacote aprovado pelo usuário. Depois de B1, o usuário atualizou o método para execuções agrupadas com revisão independente por grupo. A revisão técnica original não prova execução/runtime/publicação dessas entregas.

## Auto-revisão dos planos

Cobertura cruzada entre spec/planos; cinco Review Focus por pacote; arquivos existentes e novos separados; métodos/interfaces comparados. Corrigidos teste público que consultava status inexistente no DTO, preservação de serverTime da disponibilidade, grafia do scope e trechos de decisões já encerradas. Pastas seguem o padrão `docs/planos`. Nenhum runtime test foi inventado como resultado do plano.

## Revisão de riscos

Veredito inicial: REVISE. Objeções aceitas, sem mudança das decisões de produto:

| Objeção | Correção aplicada | Tarefa / prova prevista |
| --- | --- | --- |
| S01 — logout apaga referência incerta | Preservar referências opacas por ator/requestId, apagar payload e reconciliar após relogin; outra conta não vê | R1/R3: commit→response-loss→logout→contaB→contaA, também >24h |
| S02 — NOT_APPLIED não bloqueia original tardia | Estado terminal fenced; close sob a mesma autoridade do comando; resultado aplicado nunca é cancelado por close | B2/R3: original atrasada chega apósclose e não grava |
| S03 — vínculo não entrega version | version em DTO de equipe/lista/detalhe/resultado e conflito explícito | E1/G2: versão lida versus alteração concorrente |
| S04 — intenção sem entrega de notificação | Materializar feed real atomicamente com a reserva, deduplicado por evento/destinatário | B2/B4: restart apóscommit conserva um aviso; rollback zero |
| S05 — lookup sem prova de rate/redaction | Limiter PG por ator e ator+unidade, configurable30/min; redaction e no-store em todo resultado | B3: duas instâncias,31º→429/Retry-After, contador503, nenhum CPF/e-mail logado |
| S06 — legado null não bloqueia conflito/desligamento | Intervalo legado futuro/em andamento ocupa e bloqueia; estado desconhecido não inventa comparecimento | B1/B3/B4/E1: legado futuro impede sobreposição/inativação |

Nenhuma objeção foi descartada. Próximas revisões: restrições, experiência do usuário e arbitragem.

## Revisão de restrições

Veredito inicial: REVISE. C01–C05 aceitas, preservando produto:

| Objeção | Correção aplicada | Tarefa / prova |
| --- | --- | --- |
| C01 — tempo anterior ao lock | clock_timestamp PG fresco apóslocks; espera atravessa prazo e não grava | B4 teste de bloqueio antes/depois de2h/início |
| C02 — escritores de preço/jornada fora do protocolo | unidade→profissionais→vínculos→reserva em todos os escritores; editar serviço/jornada revalidado | B3 concorrência de writers; port E1 |
| C03 — mutations de equipe sem recuperação | shared operations/result discriminado e referência opaca; sem CPF/senha persistidos | B2/E1/E2/G2/G3 response-loss/relogin e close |
| C04 — resumo dependente de página/limites ausentes |20/máx100; índices e SQL agregado do filtro inteiro | B3/E1 mais de20itens, resumos iguais entre páginas |
| C05 — dependência circular | B1→E1port→B2→B3→B4/B5; E1 fecha integração ao final | Índice e Interfaces E1/B3 atualizados |

Nenhuma objeção foi rejeitada. Próximas etapas: experiência do usuário e arbitragem.

## Revisão de experiência

Veredito inicial: REVISE. U01–U03 aceitas, sem nova funcionalidade:

| Objeção | Correção aplicada | Tarefa / prova |
| --- | --- | --- |
| U01 — orçamento alterado sem dados para revisão | QUOTE_CHANGED com quote autoritativa/estado terminal da tentativa; comparação e nova confirmação | B5/R2 criação/remarcação, zero reenvio automático |
| U02 — close parece cancelamento | Copy explícita “Verificar operação anterior”; recurso aplicado preservado; UNKNOWN mantém incerteza | R3/G2/G3 tabela de estados/copy |
| U03 — indisponibilidade parece agenda vazia | erro/retry, dados anteriores marcados, sem zero/vazio confirmado | H2 dashboard503; R/G mutation sem sucesso falso |

S01–S06/C01–C05/U01–U03 foram aceitas e endereçadas no desenho/tarefas. Os artefatos atualizados seguiram para a arbitragem registrada abaixo.

## Arbitragem final — APPROVED

O avaliador final leu os oito artefatos atualizados, aceitou S01–S06/C01–C05/U01–U03 e declarou os bloqueios fechados no nível de plano. Nenhuma objeção rejeitada ou decisão D01–D16 reaberta. Lacunas bloqueadoras residuais: nenhuma nos artefatos avaliados.

Harmonizações editoriais sugeridas foram aplicadas: unitIds aparece na assinatura withLocks E1 e status na assinatura de agenda B3. Não houve novo requisito de produto.

Aceite técnico significa que o executor tem contratos, tarefas e testes previstos. Fechamento da entrega continua exigindo código/revisão, HTTP/PostgreSQL/concorrrência, browser/API real e evidência por plataforma. Não autoriza executar migrations, push/merge/deploy ou usar produção como banco de testes.

## Revisão final do usuário

Em 11/10/2026, o usuário aprovou o plano completo e selecionou execução por tarefas com revisão independente. Não há aprovação de desenho/método pendente. A escolha não iniciou implementação, conforme o enunciado da pergunta respondida; publicação/migração continuam sujeitas aos gates específicos do plano.

## Atualização da execução após B1

O usuário informou B1 concluída e pediu reunir tarefas relacionadas em execuções maiores. Código local confirmado em `c432b53` da API; não foi refeita homologação da B1 nesta organização. As 18 tarefas restantes aparecem uma vez cada em [execução agrupada](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md), com ownership/dependências e revisão por grupo. Não altera D01–D16 nem relaxa testes ou autorização de produção. Conferência documental de cobertura/ordem não é nova auditoria de runtime.

## Auditoria posterior de reutilização de rotas

A pedido do usuário, inventariadas62operações e comparado Swagger local/publicado29operações. [Relatório](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/AUDITORIA_ROTAS_SWAGGER_API_2026-10-11.md). Atualização técnica: POST /bookings existente passa a servir PERSONAL/UNIT, eliminando proposta de POST operacional paralelo; perfil/beneficiário/autorização/policies permanecem como aprovados. Rotas privadas team/operations são ausentes e continuam necessárias. Factories/serializers/cancel físicos precisam correção em handlers existentes; não foram implementados nesta auditoria nem reclassificados como homologados.

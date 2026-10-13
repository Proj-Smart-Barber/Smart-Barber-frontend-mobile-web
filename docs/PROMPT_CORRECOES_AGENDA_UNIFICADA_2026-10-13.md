# Prompt — concluir as correções da Agenda unificada

Copie o texto abaixo para o executor. Este documento prepara a execução; nenhuma correção foi aplicada ao código ao elaborá-lo.

---

Conclua integralmente as correções da entrega “Agenda Unificada e Criação Operacional UNIT” do Smart Barber. A implementação já existe, mas a revisão estática encontrou lacunas que impedem considerá-la completa. Preserve o que funciona e corrija os problemas, seguindo os contratos atuais e o plano aprovado. Não refaça planejamento de produto nem implemente funcionalidades fora do escopo.

## 1. Fontes e checkpoint obrigatório

Leia:

- AGENTS.md do frontend e do backend: nomenclatura neutra para branches, commits e PRs.
- D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_AGENDA_UNIFICADA_E_CRIACAO_2026-10-13.md.
- D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/REVISAO_AGENDA_UNIFICADA_2026-10-13.md, incluindo S01–S03, C01–C02 e U01–U03.
- D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/ANALISE_AGENDA_UNIFICADA_E_COBERTURA_API_2026-10-13.md.
- O código atual e os achados reproduzidos nas seções abaixo. A revisão aprovou o plano, não a implementação.

Na preparação deste prompt, frontend estava em feat/agenda-unificada-criacao, HEAD7fd864c, com alterações NÃO COMMITADAS e arquivos novos não rastreados. Essas alterações são a entrega a corrigir. Não fazer reset/clean/stash destrutivo, checkout que descarte trabalho ou partir de uma cópia limpa que ignore esses arquivos. Inspecione status/HEAD/diffs; preserve o estado ao criar isolamento/checkpoints. Caso use outro checkout, confirme que ele contém a implementação atual, inclusive arquivos novos essenciais. Não sobrescrever mudanças simultâneas de outros desenvolvedores.

Backend estava limpo em main4249abd, com PR51 integrado. Revalide a base e os contratos. Não usar checkout antigo2d5ebd5 como autoridade. O escopo é predominantemente frontend: não criar rotas duplicadas, alterar autenticação/negócio da API ou migrar banco sem uma lacuna impeditiva demonstrada.

Os370testes/typecheck/build declarados pelo executor anterior não foram reexecutados na revisão. Não usar esse número como prova de que o fluxo UNIT foi homologado. O arquivo unit-bookings-read-model.test.ts reproduz lógica local em vez de exercitar useUnitBookings; isso deve ser corrigido na cobertura.

## 2. Escopo preservado

- Agenda é a única tela de trabalho; Atendimentos sai dos menus e sua URL vira redirect seguro.
- BARBERMAN atua na própria agenda; OWNER consulta equipe e filtra profissional da unidade.
- Cliente cadastrado/verificado, vários serviços no mesmo agendamento, carrinho/revisão, disponibilidade real e POST/bookings existente.
- PERSONAL continua separado; UNIT volta à Agenda no contexto real da reserva.
- Cancelamento lógico, remarcação no mesmo ID, conclusão e falta por capabilities/prazos já aprovados. Conclusão não confirma pagamento.
- Engine/ledger/UUIDv7/storage/recuperação existentes preservados. Não criar outro motor ou outra fila de tentativas.
- Equipe/admin/descoberta/geolocalização, cadastro de cliente novo e encaixe fora de jornada continuam fora desta entrega.
- Manter design system obsidian/crimson/ivory, componentes, arquitetura e autoria das contribuições.

## 3. Correção A — retorno e contexto de navegação realmente aplicados

### Achados

- BookingResult envia date para Agenda, mas AgendaScreen/AgendaView/useAgendaViewModel não leem a URL; useUnitBookings é chamado sem initialFilter. Resultado: reserva futura volta para hoje.
- AgendaView envia somente date ao abrir /new-booking; perde o profissional escolhido no filtro OWNER.
- BookingFlowView recupera APPLIED UNIT com redirect genérico para Agenda, sem unidade/data definitivas.
- /atendimentos redireciona sem preservar parâmetros internos válidos.

### Correção obrigatória

Implementar um contrato único, tipado e validado de contexto de navegação para Agenda/criação/detalhe/remarcação: unidade, data civil, profissional e bookingId quando cabíveis. Não aceitar redirect arbitrário nem URL externa. Não enviar CPF/e-mail/cliente completo em parâmetros.

Agenda deve aplicar parâmetros iniciais e também mudanças legítimas de parâmetros numa rota já montada. Unidade precisa existir nos vínculos autorizados atuais; filtro OWNER pertence à unidade; BARBERMAN ignora filtro de colega. Não mudar unidade global silenciosamente por um parâmetro ou resposta antiga: navegar apenas no contexto já validado ou pedir seleção explícita quando necessária.

Novo agendamento herda a data e o profissional efetivamente selecionados. Sucesso CREATE/RESCHEDULE e recuperação APPLIED usam unidade/data/profissional do recurso definitivo autorizado. PERSONAL mantém o destino pessoal. Legado Atendimentos preserva somente os parâmetros internos seguros suportados.

Não conservar cliente/serviços/slot/quote de outra unidade. “Fazer outro” em UNIT volta à busca e inicia um atendimento limpo; revisar também o comportamento PERSONAL para não manter confirmação/slot anteriores.

### Aceite

Selecionar uma data futura e um profissional OWNER → criar reserva → retornar à mesma unidade/data/profissional. Remarcar mantém ID e abre o novo dia. Testar rota já montada, parâmetros inválidos/externos, colega passado ao BARBERMAN e perda de vínculo. Nenhum redirecionamento dispara POST.

## 4. Correção B — autorização estrita e ações por capabilities

### Achados

- operational-context.ts usa currentMembership.state ?? 'ACTIVE', apesar do requisito de negar state ausente.
- AgendaAppointmentCard usa capability.allowed !== false; capability ausente habilita ações.
- isUnitActive é calculado no novo read model, mas não governa a entrada de criação.

### Correção obrigatória

getOperationalContext deve exigir state ACTIVE explícito e papel autorizado. Normalização de resposta active-only comprovada permanece no adapter da API, não como fallback genérico de qualquer snapshot. Não usar accountType global para autoridade na unidade.

Ações exigem allowed === true, metadados necessários e contexto válido. Capabilities ausentes/unknown, versão ausente ou relógio inválido não habilitam execução. O backend continua autoridade final; UI e handlers devem evitar o envio indevido e oferecer atualização quando necessário.

Separar leitura/histórico de autorização para nova criação: unidade INACTIVE não libera novo agendamento, sem apagar reservas históricas autorizadas. Desabilitar/explicar o CTA e bloquear o handler/rota, não apenas mudar uma cor.

Revalidar condições ao confirmar: atravessar um deadline com modal aberto não pode usar uma validação temporal memoizada antiga. Aplicar fronteiras2h PERSONAL, antes do início UNIT, conclusão após início e NO_SHOW manual após15min. Não liberar capability antes negada só por cálculo local; buscar estado atual quando necessário.

### Aceite

Vínculo INACTIVE/ausente/sem state, papel desconhecido e unidade inativa não criam reservas. Capability ausente/false não oferece nem envia ação. Deadline cruzado durante modal bloqueia confirmação. Papel global divergente do vínculo funciona pela regra unitária. Não basta trocar apenas o texto dos botões.

## 5. Correção C — relógio autoritativo integrado ao lifecycle e às leituras

### Achados

- O lease existe no ServerClock, mas não há integração de clear no logout/troca de ator ou renovação após suspensão.
- Bootstrap e adapter podem sincronizar o singleton antes de conferir ator/contexto/geração da resposta.
- O novo hook não possui o polling previsto. clockStatus/unitTodayDate não avançam automaticamente com expiração/virada.
- Agenda usa hoje do dispositivo como fallback; lastUpdatedAtLabel usa Date.now e aparenta atualização sem nova leitura.

### Correção obrigatória

Usar somente o ServerClock existente. Lease máximo5min medido por fonte monotônica; invalidar no logout/troca de ator e exigir nova referência ao voltar de suspensão/background/visibility/AppState. Ligar isso pela composição/injeção adequada, sem dependência circular shared→feature e sem segundo clock.

Toda leitura que pode sincronizar tempo deve capturar contexto/geração/ordem vigentes antes do await e validar esses dados depois, ANTES de atualizar clock, cache ou UI. Revisar fetchUnitBookings/getBookingById/bootstrap/engine e seus consumidores; skipAutoSyncClock sozinho não resolve o problema. Não marcar valid quando sync rejeitou a amostra. clear também deve tornar rejeitável uma resposta antiga que chegue depois; uma amostra tardia não pode ressuscitar referência de sessão anterior.

Bootstrap usa GET autorizado de reservas sem date/limit1 para obter serverTime; a resposta não é agenda/resumo do dia. Uma resposta cached anterior ao lifecycle não deve satisfazer a necessidade de uma amostra nova. Enquanto tempo/fuso não estiverem válidos, apresentar sincronização/retry, não uma lista vazia ou hoje do aparelho.

Restaurar sincronização/polling60s conforme plano, com avisos de lentidão5s e dados desatualizados5min. A validade precisa se refletir no estado renderizado e nos handlers. Atualizar hoje/janela na virada da unidade; acompanhar Hoje somente se usuário estava seguindo Hoje, sem mover uma data escolhida explicitamente.

lastUpdatedAt deve vir da leitura efetivamente aceita, não do momento do render. Revisar datas/horários no fluxo, SlotPicker/Review/Agenda/home para não decidir prazo/dia por Date.now nem cortar UTC como se fosse hora civil da unidade. Não reconstruir instante legado fictício para autorizar operação.

### Aceite

Relógio do aparelho incorreto; bootstrap vazio/503; amostras fora de ordem; resposta após logout/ator diferente/clear; suspensão; lease vencido; virada de dia; prazo cruzado sem HTTP. Lease vencido bloqueia operação até sincronização, e UI mostra o estado real. Polling/refresh não fabrica “Atualizado agora”.

## 6. Correção D — paginação coerente, erros e metadados honestos

### Achados

- O efeito da página1 substitui apenas essa página no Map e conserva páginas2+ antigas.
- generation não resolve atualização por polling/invalidação; seu filtro também precisa considerar o ator.
- loadMore não registra erro para UI; erro pode virar promise rejeitada sem feedback.
- totalCount ?? items.length e isPartial = hasNext não representam todos os estados incompletos.

### Correção obrigatória

Uma única fonte paginada e keys por ator/unidade/papel/profissional/data/status/página. Atualizar o conjunto carregado em geração coerente, sem summary novo junto de páginas antigas. Preservar posição visual quando possível; diante de metadados incompatíveis/falha, marcar parcial ou reiniciar página1 explicitamente. Não depender de refetch manual para corrigir invalidações disparadas pelo detalhe/ações/outros consumidores.

Verificar geração/contexto em todos os awaits, inclusive loadMore/finally. Cancelar leituras quando possível, mas manter guard contra respostas tardias. Não permitir que uma chamada antiga limpe o loading ou publique dados da consulta nova.

Deduplicar por id, usar page/limit/hasNext/total reais e tratar diferenças de metadados/itens. Não fabricar total exato ou completude a partir da quantidade carregada. Listagem offset percorrida não equivale a snapshot SQL; explicitar última atualização e estado parcial. Não declarar nenhum próximo atendimento por página parcial ou clock indisponível.

Erro de página adicional deve ser visível e recuperável, preservando páginas válidas e sem falso vazio. Distinguir bootstrap, primeira página, profissionais e páginas adicionais nos estados de erro. Passar isPartial/estado indeterminado à UI, não só calcular no hook e ignorar no resumo/timeline.

### Aceite

Mais de100reservas; atualizar/remover/mudar status em página2 após carregar várias páginas; polling/invalidação e requisição atrasada; troca de ator/unidade/filtro; erro503 na página2; metadados incoerentes. Nenhuma mistura acionável de gerações, falso total ou “nenhum próximo” sem evidência.

## 7. Correção E — recuperação pós-logout, origem e APPLIED redigido

### Achados

- originScope não foi implementado em types/stores/engine. Depois do expurgo, CREATE_BOOKING/RESCHEDULE_BOOKING não dizem se a origem era PERSONAL ou UNIT.
- BookingRecovery/BookingFlowView continuam usando modo da tela atual e callback sem recurso definitivo para retorno.
- APPLIED pode ter accessChanged e nenhum resource.data; o fluxo atual não pode inferir unidade/data/destino nesse caso.

### Correção obrigatória

Adicionar originScope opcional PERSONAL/UNIT validado aos tipos/referências e às whitelists dos stores web/native, com compatibilidade de leitura de registros antigos. Origem é pista de navegação, nunca autorização nem fonte para fabricar/repetir payload. Propagar desde preparação e preservar em save/update/reconcile/close, expurgo e gravações tardias reduzidas à referência opaca.

Não preservar CPF/e-mail/nome/credenciais/snapshots/unidade/data sensíveis apenas para retorno. Unidade/data vêm do recurso definitivo autorizado ou releitura permitida. Store/logout continua removendo payloads sensíveis e conservando a referência incerta correta por ator.

Para referência antiga sem origem, mostrar resultado neutro; não inferir pelo accountType global. APPLIED sem dados/acesso exibe que a operação foi aplicada, mas detalhes estão indisponíveis. Não inventar recurso/local/data, mudar unidade global, mandar automaticamente para lista pessoal ou liberar repetição/criação substitutiva pelo recovery. Uma nova reserva independente só começa como nova intenção explícita fora da recuperação resolvida.

No estado incerto, mensagem adequada à ação e botão Verificar resultado ligado à MESMA referência. Consultar não prepara outro comando. Sem Fazer outro enquanto incerto; ao voltar, informar pendência e conservar referência. NOT_APPLIED só libera nova revisão conforme fence/close existente. Não alterar o protocolo de idempotência arbitrariamente.

### Aceite

UNIT→resposta perdida após commit→logout→login→consultaAPPLIED→retorno ao recurso autorizado. APPLIED redigido, referência antiga sem origem, troca de conta, cleanup/storage com erro, gravação tardia,404/503/UNKNOWN e close. Confirmar tanto web como native por testes de seus stores; teste de módulo não homologa dispositivo.

## 8. Correção F — lookup, mudança de contexto e erros do formulário

### Achados

- CustomerLookup mantém foundCustomer quando searchValue muda e não descarta resultado atrasado de busca anterior.
- useBookingFlow continua inicializando estados uma vez, sem reset completo por unidade/papel/ator.
- Queries de serviços/profissionais/availability ainda usam data??[] sem representar os erros.

### Correção obrigatória

Editar/rebuscar critério ou mudar unidade invalida resultado anterior, seleção e revisão relacionadas. Só resposta autorizada da busca vigente pode selecionar beneficiário. A→B ausente/não verificado/503, com resposta atrasadaA, não permite POST paraA. Query e CPF/e-mail continuam somente em memória; não vão para URL/queryKey/log/storage.

Ao trocar contexto, limpar cliente/carrinho/profissional incompatível/slot/quote/confirmação. Na mesma unidade, preservar somente seleções ainda válidas. Se há tentativa submetida/uncerta, conservar referência e resolução; não apagar a tentativa no reset nem criar chave nova como substituta. Resposta anterior não repopula a tela atual.

Erros específicos de serviço/profissional/disponibilidade têm mensagem/retry; não aparecem como ausência de serviços/horários. Profissional herdado deve pertencer à unidade e ser elegível; data/horário de parâmetros devem ser válidos no contexto. Nenhum POST antes de revisão explícita.

Revisão CREATE/RESCHEDULE mostra cliente, unidade, profissional, data/intervalo/fuso quando necessário, serviços, duração e preço realmente enviados. Dado essencial desconhecido bloqueia. Os builders exigem preço/duração esperados em CREATE/RESCHEDULE; CREATE não exige versão anterior, ações sobre reserva existente exigem expectedVersion. QUOTE_CHANGED mostra comparação e exige confirmação nova, sem reenvio automático.

### Aceite

Lookup modificado/demorado/inválido/429/503; troca de contexto com requisição em trânsito; dois serviços; quote alterada entre revisão/confirmação; novo atendimento limpo; parâmetros inválidos; falhas de cada query. Nenhum beneficiário antigo ou slot/quote incompatível reaproveitado.

## 9. Correção G — home na fonte canônica e dados fiéis

### Achados

- DashboardHttpAdapter ainda usa /bookings/barberman/schedule/details e o dia do dispositivo, sem a unidade selecionada.
- Ainda há fallback CONFIRMED para status ausente e zeros fabricados de indicadores.
- Preços/durações nulos ainda podem ser somados como valores completos; a Agenda também recalcula preço parcial.
- Remover DELETE e renomear indicadores não conclui a unificação da leitura.

### Correção obrigatória

Consumidores mínimos da home usam o mesmo contexto/read model canônico da Agenda, preservando OWNER equipe/filtro e BARBERMAN própria agenda. Migrar/aposentar o caminho legado quando sem consumidor; não deixar duas autoridades de reservas. Evitar duas leituras divergentes para métricas e destaque.

Status desconhecido/ausente é UNKNOWN, não CONFIRMED; duração/preço desconhecidos não viram30/0 nem total parcial apresentado como exato. Usar summary do backend com semântica explícita e hasIncompleteData. Aplicar também à projeção da Agenda e ao detalhe afetado, preservando nulidade/incompletude.

Não fabricar meta/comissão/ocupação/pagamento/conclusões. O rótulo corresponde ao valor disponível: valores de reservas no filtro, não receita recebida. Erro503/página parcial não mostra “agenda livre”, “nenhum atendimento” ou total zero como verdade. A home mantém CTA para Agenda/Novo agendamento e ações seguras; nunca reinstalar DELETE sem versão/key.

Melhorar o destino Gerenciar para abrir o atendimento/contexto real quando disponível, com dados autorizados; não depender do dia do dispositivo. Não redesenhar todas as homes nem adicionar novas métricas/pagamento.

### Aceite

OWNER em duas unidades, BARBER com accountType diferente do papel unitário, status/prices/duration desconhecidos, lista parcial e503. Home e Agenda devem representar o mesmo filtro/contexto e fonte; preços incompletos não viram total certo.

## 10. Ordem de execução e responsabilidade

Execute em uma sequência coerente, com checkpoints:

1. Contexto/permissões + clock/lifecycle + read model/paginação: B,C,D.
2. Navegação/retorno + origem/recuperação + formulário: A,E,F.
3. Consumo canônico da home + dados/UX afetados: G.
4. Testes integrados e revisão final independente de todos os achados.

Você é responsável por essas áreas do frontend. Se houver workers autorizados, atribua arquivos explícitos e avise que não estão sozinhos e não devem reverter alterações alheias. Não criar writers concorrentes para auth/sharedoperations/clock. Não considerar cada item fechado só porque compila; verificar seu critério de aceite.

## 11. Testes e homologação obrigatórios

Testes precisam importar/exercitar a IMPLEMENTAÇÃO REAL. Reescrever unit-bookings-read-model.test.ts para usar o hook/read model real e responses/controladores de tempo controlados. Funções reimplementadas dentro do teste e asserções sobre fixture literal não provam produção. Helpers puros devem ser testados importando o helper verdadeiro.

Renderizar rotas/componentes/hooks reais com providers apropriados, cobrindo navegação/contexto, lookup, geração, clock, páginas, recuperação e confirmação. Mockar transporte/tempo é permitido para controlar falhas; duplicar algoritmo sob teste não é permitido.

Homologar em navegador com API main atual e PostgreSQL local isolado: OWNER e BARBER entram pela Agenda; cliente cadastrado/verificado; dois serviços; slot; revisão; um POST UNIT com ator/beneficiário corretos; retorno futuro/filtro; remarcação mesmoID; cancelamento/status por prazo; avisos; recuperação depois de resposta perdida; preservação do fluxo PERSONAL.

Antes de iniciar app/teste/seed, verificar DATABASE_URL/schema/migrator. Usar banco exclusivo, fixtures sintéticas e endpoints existentes. Nenhuma mutation de teste em produção ou banco de desenvolvimento compartilhado. Não expor credenciais nas evidências.

Verificar web375/768/1024/1440px, temas, teclado/foco/erro anunciado e alvos44px. Os novos botões de cards com minHeight36 devem atender ao alvo interativo44px sem prejudicar o layout. Android/iOS precisam de prova própria; sem ambiente, declarar NOT TESTED e roteiro, sem apresentar Chrome mobile como native.

Rodar testes focados durante correção e, ao final, suíte apropriada/completa, npm run typecheck e npm run build/exportweb. Investigar falhas sem enfraquecer asserções, aumentar timeouts para escondê-las ou excluir cenários. Repetir checks quando uma mudança/falha justificar, não por ritual.

Não usar quantidade de testes como único aceite. Apresentar PASS/PARTIAL/FAIL/NOT TESTED por requisito e ambiente. Build/typecheck não equivalem a homologação HTTP/browser/produção.

## 12. Entrega final

Entregar:

- Matriz A–G: problema corrigido, arquivos e prova específica.
- Resolução de S01–S03/C01–C02/U01–U03 sem lacunas ou autoaprovação baseada na contagem de testes.
- Lista de arquivos e commits/checkpoints, mudanças de contrato necessárias e preservação das demais alterações.
- Resultados de suíte/typecheck/export, jornadas reais e limites web/native/produção.
- Parecer de revisão independente final, com achados corrigidos antes de declarar encerramento.
- Relatório e descrição concreta de PR preparados para revisão.

Não declarar “implementado por completo” enquanto critérios essenciais estiverem pendentes. Se uma prova ambiental não puder ser executada, identificar exatamente o limite e não transformá-la em PASS. Concluir todo o código/testes já autorizados antes de pedir qualquer ação externa adicional.

Não fazer merge/deploy/forcepush/migração ou seed remoto. Push/abertura de PR somente se autorizados nesta tarefa de execução. Não retornar ao usuário só com sugestões: aplique as correções, valide e entregue o resultado revisável dentro desse limite.

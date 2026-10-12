# Agendamento, equipe e homes — desenho consolidado

Data: 11/10/2026. Estado: D01–D16 confirmadas; revisão técnica APPROVED e pacote aprovado. B1 implementada segundo o usuário, código local confirmado. Método atualizado: tarefas relacionadas executadas juntas em grupos, com revisão independente por grupo. Este documento não afirma que as demais rotas foram entregues nem autoriza publicação/migração.

Base factual: [análise atual](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/ANALISE_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md). Evolução separada: [geolocalização](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/backlog/geolocalizacao-barbearias.md).

## Entendimento confirmado

Concluir carrinho/reserva para o cliente, criação rápida de atendimento por profissionais, gestão de equipe e homes próprias de cada perfil. Inclui os ajustes backend indispensáveis. Preservar identidade visual, arquitetura atual, web/mobile, isolamento por unidade e proteção contra duplicidades. Geolocalização permanece fora desta entrega.

## Registro de decisões

| ID | Decisão | Alternativas e motivo | Estado |
| --- | --- | --- | --- |
| D01 | Uma reserva: vários serviços únicos, mesma unidade, um profissional e intervalo contínuo | Vários POSTs não preservariam uma única reserva; manter decisão anterior | Confirmada anteriormente |
| D02 | Agendamento rápido somente para cliente com conta | Atendimento sem conta excluído por decisão do usuário nesta rodada | Confirmada |
| D03 | BARBER cria atendimento na própria agenda; OWNER escolhe profissional da unidade | Agenda de toda a equipe pelo barbeiro descartada | Confirmada |
| D04 | Compartilhar lógica de reserva; adaptar entrada e capacidades por perfil | Fluxos independentes duplicariam carrinho/validação/recuperação; adiar definição da equipe deixaria parte do objetivo aberta | Confirmada |
| D05 | Escopo e premissas de segurança, confiabilidade, paginação e arquitetura | Backend necessário faz parte do plano; sem nova identidade visual ou geolocalização nesta entrega | Confirmada |
| D06 | Cliente cancela os próprios; BARBER cancela sua agenda; OWNER cancela na unidade selecionada; preservar histórico | Cancelamento só pela equipe descartado; expandir a permissão no backend e substituir exclusão física | Confirmada |
| D07 | Cliente cancela até 2h antes; equipe até início, pelo horário da unidade | Regra única até início descartada pelo usuário | Confirmada |
| D08 | Reserva criada pela equipe confirma imediatamente e notifica cliente | Aceite posterior criaria pendência de confirmação e expiração; descartado | Confirmada |
| D09 | Busca de cliente por e-mail exato ou CPF completo, com conferência do nome | Somente e-mail descartado; não criar usuário fictício nem duplicar CPF | Confirmada |
| D10 | Desativar vínculo só após resolver reservas futuras/em andamento | Desativação imediata com reservas pendentes descartada | Confirmada |
| D11 | Incluir remarcação autorizada, transacional e com histórico | Cancelar/criar do zero como única opção descartado; manter reserva anterior quando novo horário não puder ser confirmado | Confirmada |
| D12 | Remarcação altera serviços/data/horário/profissional na mesma unidade; BARBER mantém agenda própria | Alterar somente data/hora descartado; OWNER pode redistribuir equipe e resolver desligamentos | Confirmada |
| D13 | Homes: descoberta/reserva pessoal; operação própria BARBER; operação/equipe por unidade OWNER | Manter três telas com ações básicas equivalentes não atenderia os usos confirmados | Confirmada |
| D14 | Equipe registra COMPLETED e NO_SHOW manualmente, sem declarar pagamento | Escopo só reserva/remarcação/cancelamento descartado | Confirmada |
| D15 | NO_SHOW após 15min do início, com confirmação manual | Registrar desde início ou só após término descartado | Confirmada |
| D16 | Retorno de profissional desativado exige novo convite/aceite | Reativação unilateral pelo proprietário descartada; preservar conta/CPF/histórico | Confirmada |

## Abordagem escolhida

Um núcleo compartilhado da feature bookings cuida de carrinho, seleção elegível de profissional, disponibilidade, revisão, envio e recuperação da tentativa. Telas de entrada oferecem o contexto adequado: consumo pessoal, atendimento próprio do profissional ou gestão de atendimento da unidade.

Isso não significa confiar numa flag de perfil enviada pelo navegador. O backend deriva ator da sessão e valida cliente beneficiário, vínculo, unidade, profissional, serviços e operação. Pode haver contratos distintos para reserva pessoal e operacional sem duplicar a lógica visual.

Alternativas consideradas:

- Fluxos separados cliente/equipe: permite independência inicial, mas replica componentes e políticas e aumenta risco de comportamentos divergentes.
- Cliente primeiro e equipe definida depois: reduz a primeira entrega, porém deixa um uso principal sem contrato. Execução incremental continua possível dentro da abordagem escolhida, com o escopo inteiro previamente definido.

## Reserva pessoal — proposta para revisão

Barbearia → serviços/carrinho → profissional elegível → data e horário → revisão → confirmação. Login e verificação de e-mail pausam a jornada e preservam o draft legítimo; voltar do login não confirma automaticamente.

Mostrar cada serviço, valores e durações, total previsto, profissional e horário no fuso da unidade. A disponibilidade usa todos os IDs selecionados e profissional específico. Confirmação solicita cálculo autoritativo e gravação atômica; preço/duração alterados exigem revisão explícita, e horário ocupado é tratado como conflito distinto.

Após sucesso real, mostrar identificador e resumo persistido; disponibilizar consulta pessoal. Timeout mantém tentativa incerta e evita novo POST/chave até reconciliação. A lista de serviços precisa continuar fiel após recarga, exigindo snapshots individuais no backend.

Os componentes atuais do catálogo/resumo serão reutilizados, mas o aviso “próxima atualização” será substituído somente quando o contrato real estiver validado.

## Criação rápida de atendimento — proposta para revisão

Entrar pelo início profissional ou pela agenda, com unidade/data previamente preenchidas quando houver contexto. Buscar cliente cadastrado, selecionar serviços, confirmar profissional e horário e revisar antes de criar.

BARBER usa sua própria identidade como profissional e não ganha seletor da equipe. OWNER escolhe entre membros elegíveis da unidade, incluindo a si quando atende. Reservar para si como consumidor é uma entrada separada, sem confundir cliente do atendimento com autor da operação.

O backend atual reserva para o usuário autenticado. A extensão deve identificar separadamente autor e cliente, validar permissão da unidade e impedir que um cliente se declare gestor pelo corpo da requisição. A busca de clientes usa o critério confirmado D09 e revela apenas dados necessários para conferência.

Reserva criada pela equipe entra imediatamente como confirmada e notifica o cliente, conforme decisão aprovada. A busca aceita e-mail exato ou CPF completo e apresenta identificação mínima para conferência do nome antes de reservar. Contratos de criação/notificação ainda precisam ser publicados e testados; uma notificação em lista não significa push ou mensagem externa.

## Política de cancelamento — permissões confirmadas

Decisão confirmada: cliente atua sobre suas reservas; barbeiro sobre seus atendimentos; OWNER sobre os atendimentos da unidade onde tem esse vínculo. Confirmar a ação e preservar reserva, itens/snapshots, autor e momento do cancelamento; liberar o intervalo somente após sucesso do servidor.

O backend existente apaga a reserva e restringe a operação ao profissional responsável. Logo, permissão e histórico são dependências reais. Prazo aprovado: cliente até 2 horas antes; equipe até o início. O servidor calcula o prazo com base no instante do atendimento e no fuso da unidade; relógio do aparelho não concede autorização. Depois do prazo, a UI explica a restrição e o backend rejeita a ação.

Detalhamento técnico da expressão “até”: consumidor pode agir quando `serverNow <= startsAt - 2h`; equipe quando `serverNow < startsAt`. No instante exato de início, cancelamento/remarcação pela equipe já estão bloqueados. Backend calcula capacidades e prazos; o frontend só antecipa/explica a restrição. Motivo é opcional nesta versão, com registro obrigatório de ator, operação e instante; não exigir um campo de motivo não aprovado pelo usuário.

## Remarcação — inclusão e campos confirmados

Cliente remarca reserva própria; BARBER remarca os atendimentos sob sua responsabilidade; OWNER atua na unidade selecionada. Aplicar os prazos de alteração aprovados na rodada. O servidor valida novo horário, elegibilidade, jornada, preço/duração e conflito e troca a reserva atomicamente, preservando o histórico e a reserva anterior quando a operação falhar.

Uma remarcação não é DELETE seguido de POST no navegador. Precisa de proteção contra repetição/resposta perdida e versão da reserva para evitar sobrescrever uma alteração concorrente. Notificar envolvidos somente depois da confirmação transacional. Campos aprovados: serviços, data, horário e profissional, sempre na mesma unidade; BARBER mantém profissional próprio, cliente atua na própria reserva e OWNER escolhe elegível da unidade. Mudanças de preço/duração exigem revisão explícita.

## Gestão de equipe — restrição de desligamento confirmada

Revogar convite pendente cancela a pendência; desativar vínculo encerra acesso profissional naquela unidade, sem apagar conta/CPF ou histórico. A conta permanece BARBER, conforme a decisão anterior sobre perfil profissional independente de emprego.

Desativação é bloqueada se houver reservas futuras ou em andamento. A verificação deve ser atômica com criação/remarcação: não permitir que uma reserva entre depois de verificar a agenda e antes de desativar o vínculo. A interface deve mostrar os atendimentos que precisam ser resolvidos, com ações realmente autorizadas. Futuro/em andamento deve ser calculado por estado/instante real, não por status fabricado no frontend.

A rota de revogar convites existente não desativa um profissional já vinculado. A API precisa de contrato para listar equipe, estado do vínculo e desativação, além do cadastro por CPF já aprovado anteriormente.

## Homes e navegação — prioridades confirmadas

**CLIENT:** cabeçalho/conta, busca de unidades por nome/localidade, CTA “Agendar serviço”, próximo agendamento e acesso a reservas/notificações. Cards públicos usam dados reais de unidade, endereço e catálogo. A listagem de unidades depende de nova API pública paginada. Distância/proximidade não constam desta entrega.

**BARBER com unidade ativa:** unidade selecionada, próximo atendimento, agenda do dia e CTA “Novo agendamento”. Indicadores da própria agenda: contagem agendada e valor dos serviços, com distinção entre agendados/concluídos. Menu oferece “Agendar para mim” e recursos da conta. Sem unidade ativa, a home profissional continua acessível e oferece convites pendentes/consumo pessoal, sem operações de equipe.

**OWNER:** seletor de unidade, resumo e agenda da equipe, CTA “Novo agendamento” e acesso a “Equipe”. Alternância “Equipe / Minha agenda” quando atende. A visão de equipe usa contrato próprio; os dados pessoais atuais não serão rotulados como totais da barbearia. Horários/serviços permanecem no fluxo existente, e o OWNER pode gerir jornadas de profissionais segundo o contrato vigente.

Menus e cards derivam capacidades do vínculo ativo selecionado, nunca de outro vínculo OWNER. Convites recebidos/notificações/reservas pessoais são recursos da conta, acessíveis sem unidade; links diretos válidos continuam funcionando. Preservar navbar/hamburger, modo claro/escuro e tokens atuais. Rotas de conta terão grupo próprio para não serem bloqueadas pelo guard operacional.

## Estados de atendimento e disponibilidade

Novos estados reais: `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`. Remarcação mantém a reserva ativa e incrementa sua versão, registrando evento anterior/novo. A equipe autorizada pode concluir após início ou registrar ausência quando `serverNow >= startsAt + 15min`; ações são manuais e confirmadas. CLIENT só consulta esses registros.

Transições partem de CONFIRMED; estados terminais não são sobrescritos por outra ação. Uma repetição da mesma operação deve recuperar o resultado, sem duplicar eventos/notificações. Mudança concorrente resulta em `BOOKING_VERSION_CONFLICT` e releitura. Não introduzir correção/estorno/pagamento como funcionalidade implícita desta entrega.

Uma reserva CONFIRMED em intervalo já iniciado bloqueia desligamento até terminar a janela ou receber registro terminal válido; horário decorrido não comprova atendimento realizado. A disponibilidade passa a aplicar o mesmo predicado de ocupação usado pela confirmação, liberando o intervalo após transição terminal efetivamente persistida. Itens/valores/duração planejados continuam históricos. Migração de dados legados não marca atendimentos antigos como concluídos/ausentes por inferência do relógio.

## Modelo e contratos comuns propostos

São interfaces de implementação a validar com o backend, não disponibilidade da main atual.

`BookingDto` conserva nomes públicos compatíveis (`barbermanId`, `barbershopId`, `date`, `startTime`, `endTime`) e acrescenta `startsAt/endsAt` ISO com offset/instante, `timezone`, `version`, `status`, `createdByUserId`, `customerId`, `clientRequestId`, totais em centavos/minutos e itens individuais `{serviceId,title,priceInCents,durationInMinutes,legacyAggregate}`. Em novos itens ID/preço/duração são válidos; campos desconhecidos de agregados históricos podem ser null, com legacyAggregate=true, sem tentar reconstruir IDs pelo título. Resposta autenticada traz customer/professional mínimos e capacidades `{allowed,reasonCode,deadlineAt}` para cancelar, remarcar, concluir e registrar ausência. Consultas trazem `serverTime` autoritativo. Status legado não comprovado pode permanecer null, sem ser fabricado como COMPLETED/NO_SHOW.

`BookingDraft` contém modo pessoal/operacional, shopId, beneficiário da reserva quando operacional, serviceIds únicos, profissional, data civil, hora local e `slotStartAt` retornado pela disponibilidade, além de totais/duração esperados. O instante do slot elimina ambiguidade de horário em mudanças de fuso; o servidor revalida sua equivalência à hora civil da unidade. O próprio cliente não envia outro beneficiário; o servidor determina a identidade da sessão.

Auditoria de reutilização posterior: criação pessoal e operacional usam o **POST /api/bookings existente**, com scope PERSONAL(default legado) ou UNIT. UNIT exige shopId/customerId e vínculo validado; shopId deve concordar com todos os serviços. PERSONAL não pode criar para terceiro nem ignorar silenciosamente customerId indevido. Controller compartilha as policies e seleciona use case por contexto autorizado, sem conceder papel pelo body. Não criar outro POST /barbershops/:shopId/bookings. [Auditoria de rotas](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/AUDITORIA_ROTAS_SWAGGER_API_2026-10-11.md).

`BookingAttempt` imutável contém requestId UUIDv7, operação, payload normalizado e referência temporal do servidor, estado reviewing/submitting/confirmed/uncertain/error e recurso confirmado. Hora/entropy segura são obrigatórias; corrigir o timestamp UUIDv7 atual e retirar fallback inseguro. Persistência de tentativa é separada do draft público, identificada por usuário e não guarda CPF, e-mail de busca, senha ou tokens.

Port `BookingAttemptStore.read(actorId,requestId)/save(actorId,attempt)/listReferences(actorId)/clearResolved(actorId)` separa persistência da lógica; chave por ator+requestId impede que duas tentativas/abas sobrescrevam uma à outra. Web usa localStorage para o payload mínimo não secreto da tentativa; native usa AsyncStorage, instalado pela versão compatível do Expo. Credenciais continuam no transporte/armazenamento de sessão autorizado. Não salvar DTO completo/CPF/e-mail/token. Falha de gravação bloqueia POST dependente de recuperação. [Referência oficial](https://docs.expo.dev/versions/latest/sdk/async-storage/).

Logout remove payloads e tentativas resolvidas, mas conserva referências opacas `{actorId,requestId,operation}` das incertas; nenhum dado de cliente/identificador de busca/hash de CPF entra nessa referência. Outra conta não exibe nem reconcilia a referência. Ao voltar à mesma conta, consultar antes de reconstrução semelhante. Se payload foi apagado, não inventar replay: mostrar resultado conhecido ou resolver referência por fechamento autoritativo. Depois24h, conservar só referência até APPLIED/NOT_APPLIED comprovado, sem guardar payload indefinidamente.

Scope de operação `PERSONAL|UNIT` seleciona a política, com validação da autoridade no servidor: lista pessoal entrega capacidades pessoais; agenda operacional entrega capacidades da unidade; nenhum scope concede papel por si. `customerId` e `barbershopId` da reserva não podem mudar na remarcação. Compatibilidade de DELETE legado, inclusive ausência de expectedVersion/resposta204, precisa de cutover explícito; novos comandos usam versão e representação autoritativa.

`QUOTE_CHANGED` retorna `{code,requestId,operationState:'NOT_APPLIED',quote:{serviceItems,totalPriceInCents,totalDurationInMinutes},serverTime}` calculado sob lock com serviços atuais da unidade. Itens têm os campos do snapshot novo; UI compara seleção anterior/nova, invalida slot quando necessário, reconsulta disponibilidade e pede confirmação explícita antes de nova tentativa. Mudança de preço ou duração não vira reenvio automático; em remarcação, o agendamento anterior continua válido. Serviço inativo/indisponível é erro distinto.

Idempotência vale para todas as mutations desta frente. Resultado perdido mantém tentativa/chave/payload. Consulta exata por requestId reconcilia operação aplicada/não aplicada/em andamento; ausência genérica/timeout não prova não aplicação. A validade de replay é 24h, preservando a decisão anterior; resultado durável da operação continua consultável após cleanup do ledger. Mudança de payload/chave só ocorre depois de resultado resolvido e nova revisão. Cancelamento/remarcação/transição incluem expectedVersion; HTTP 409 distingue horário ocupado, orçamento alterado, versão, vínculo e chave incompatível.

`NOT_APPLIED` é terminal e fenced: registro durável sob a mesma chave `(actorId,requestId)` impede qualquer comando tardio de aplicar aquela operação. Rejeição de negócio registrada ou POST `/api/operation-attempts/:requestId/close` podem produzir esse estado. Close não cancela reserva aplicada: se já commitou, devolve APPLIED; em execução aguarda/retorna PENDING; se não aplicado, sela a chave atomicamente. Original tardia é rejeitada. Chave vencida nunca volta a ser executável após cleanup; ausência não prova falha. Leitura/replay revalida acesso atual e pode retornar somente referência/APPLIED quando autorização mudou.

O mecanismo de tentativa é compartilhado com mutations autenticadas de equipe, não limitado a BookingDto. Resultado discriminado `OperationAttemptResult={state,operation,resource:{kind:'BOOKING'|'MEMBERSHIP'|'REGISTRATION'|'INVITATION',id,version?,data?},accessChanged,serverTime}`. Rotas canônicas GET/POSTclose em `/api/operation-attempts/:requestId`; aliases de bookings só se houver necessidade de compatibilidade. Registration/invitation com CPF/e-mail usam referência opaca, sem payload recuperável no storage; após perda de resposta, reconciliar/close antes de reabrir formulário/nova chave. Ativação pública e fluxos de autenticação continuam com consumo de token da spec anterior, sem ledger de senha/credencial. Lookup POST é leitura e não exige tentativa persistida.

## Handoff de rotas — proposta, sujeita ao contrato versionado

| Rota | Mudança prevista |
| --- | --- |
| POST /api/bookings | Ampliar a rota existente: PERSONAL beneficia a sessão; UNIT exige shopId/customerId e capacidades profissionais validadas. Ambos usam snapshots/validação/idempotência/instante/retorno rico; sem POST operacional paralelo |
| POST /api/barbershops/:shopId/customers/lookup | Nova busca autenticada por exatamente um e-mail/CPF no corpo, identificação mínima e no-store; não incluir CPF em query/URL/log |
| GET /api/bookings/me | Evoluir paginação/metadados, upcoming/past, filtros e servidor/ações; serve a consumidor de qualquer conta elegível |
| GET /api/bookings/:id | Detalhe pessoal/profissional e OWNER autorizado da unidade; falha fechada |
| GET /api/barbershops/:shopId/bookings | Nova agenda autorizada da unidade, date/profissional/estado/paginação; BARBER limitado a si; resumo representa esse escopo |
| GET /api/operation-attempts/:requestId | Nova reconciliação exata de operação do ator; resultado discriminado reserva/vínculo/cadastro/convite |
| POST /api/operation-attempts/:requestId/close | Novo fechamento autoritativo não aplicado, sem cancelar recurso já commitado; fence para comando tardio |
| DELETE /api/bookings/:id/cancel | Evoluir para cancelamento lógico com histórico e novas capacidades; manter compatibilidade da URL, retornar recurso/version/ações; corpo via request explícito se necessário |
| PATCH /api/bookings/:id/reschedule | Nova remarcação atômica, expectedVersion, slot e orçamento; sem trocar unidade |
| PATCH /api/bookings/:id/status | Nova ação COMPLETED/NO_SHOW com expectedVersion; somente equipe autorizada, limites temporais e confirmação |
| GET /api/barbershops/:shopId/team | Nova gestão OWNER: membros ativos/inativos e referências mínimas; convidar não equivale a listar membros ativos |
| PATCH /api/barbershops/:shopId/team/:membershipId/deactivation | Nova desativação com bloqueio atômico para reservas futuras/em andamento; sem apagar a conta |
| POST /api/barbershops/:shopId/barber-registrations | Concluir cadastro pendente por nome/CPF/e-mail e convite unificado da decisão D05 anterior |
| Rotas de ativação/aceite/revogação de cadastro e convites | Reutilizar as já publicadas quando compatíveis; entregar as extensões de CPF/ativação descritas na spec anterior; retorno de vínculo INACTIVE exige novo convite/aceite |
| GET /api/barbershops | Nova descoberta pública paginada de unidades ACTIVE por nome/localidade, com dados públicos mínimos |

Preservar GET de serviços/profissionais e disponibilidade, harmonizando elegibilidade/jornada/conflito/fuso. Preservar endpoints de convites por ID existentes e notificações de conta; completar o Swagger em vez de usar o screenshot como lista exaustiva. Rotas operacionais não podem conceder papel por body/header. Novas mutations usam Idempotency-Key, limites por ator/unidade e no-store.

## Consistência, privacidade e falhas

- Reserva, itens, tentativa e linhas reais de notificação são gravados atomicamente. Locks/constraints PostgreSQL protegem conflito do mesmo profissional, inclusive entre unidades. Criação e desativação compartilham a autoridade transacional sobre o vínculo; edição de serviço/preço/jornada e remarcação revalidam sob a mesma disciplina.
- Protocolo comum: tentativa `(ator,requestId)` quando aplicável → unidades em ordem de ID → locks transacionais globais de profissionais em ordem de ID → vínculos em ordem de ID → reserva/evento. Remarcação inclui profissional anterior/novo, sem mudar unidade. Editores de preço/ativação de serviço e jornada/exceção usam lock da unidade antes de escrever. Depois dos locks, reconsultar estado/versão e colher `clock_timestamp()` PG fresco para prazos/passado/ausência/expiração; timestamp de início de transação não autoriza uma ação atrasada.
- Listas de equipe/agenda:20 itens por padrão/máx100, ordenação estável (`joinedAt,id` equipe; `startsAt,id` agenda). SQL filtrado e indexado por unidade/estado/profissional/instante; resumo agregada o filtro autorizado inteiro sem LIMIT/OFFSET, não apenas itens carregados. Valores desconhecidos retornam total conhecido+indicador de incompletude, não zero.
- CPF único/canônico e regras de ativação existentes em D05 são preservados: CPF/e-mail devem apontar à mesma conta; OWNER não muda identidade/senha alheia; conta errada recebe orientação genérica. Reativação usa novo aceite e mantém histórico de períodos do vínculo.
- Busca de clientes retorna somente identificação necessária para confirmar, elegibilidade e ID. CPF/e-mail não entram em logs/URLs/analytics/draft. Limiter PostgreSQL compartilhado, contador por ator e ator+unidade, limite inicial configurável30/min para cada chave, conta também não encontrado/entrada inválida e devolve429/Retry-After; falha do contador resulta503. no-store vale para sucesso/erro. Isso é um parâmetro técnico de proteção, não uma meta de capacidade. Contas beneficiárias precisam do e-mail confirmado já aprovado.
- Notificações de reserva/remarcação/cancelamento/ausência são materializadas como linhas consultáveis do feed na mesma transação PostgreSQL, uma por evento+destinatário; não basta gravar uma intenção sem consumidor. Rollback deixa zero notificações e interrupção após commit mantém uma por destinatário, visível na retomada/replay. Destinatários são cliente e profissionais afetados; recurso atual requer autorização atual, e profissional removido da reserva abre aviso de conta com dados mínimos, sem detalhes novos de outro profissional. Sem promessa de push/mensagem externa nesta frente; e-mail de ativação profissional continua na integração específica anterior.
- Erros distinguem falha de rede/503, horário ocupado, preço/duração alterados, prazo encerrado, vínculo alterado e resultado incerto. Na alteração malsucedida, reserva anterior continua válida. Convite aceito atualiza a identidade/vínculos do engine autoritativo antes de redirecionar.
- Nenhum dado da produção será migrado/saneado automaticamente durante planejamento. Executor inspeciona snapshot/backfill, prova contagens/rollback e pede autorização específica para migração/publicação.

Legado com status null é conservadoramente ocupado quando tem intervalo futuro/em andamento, bloqueando conflito/desligamento tal como reserva ativa. Não fabricar comparecimento. Com intervalo válido e autoridade atual, ações manuais aplicam os mesmos prazos e registram transição a partir do legado; status/instante desconhecido não concede ação e exige tratamento explícito dos dados. Intervalo passado não ocupa futuro, mas não vira COMPLETED/NO_SHOW automaticamente.

## UX e homologação

Preservar vermelho/obsidian/ivory, Epilogue/Inter, componentes shared/ui e Expo Router. Carrinho editável mostra preço/duração por item e total; seleção alterada invalida slot/orçamento anterior. Não mesclar unidades. Fluxo móvel usa resumo/ação com safe area, campos acessíveis, alvos 44×44, foco/teclado e estado submitting bloqueado. Desktop reutiliza lógica com layout adaptativo. Testar 320/375/768/1024/1440 px, zoom e fonte ampliada, ambos os temas.

Recuperação de tentativa usa ação “Verificar operação anterior” com explicação: “Vamos verificar esta operação. Um agendamento já confirmado será preservado. Se a operação ainda não tiver sido aplicada, ela será encerrada antes de uma nova tentativa.” Para equipe, substituir “agendamento” pelo recurso apropriado. APPLIED mostra resultado existente; NOT_APPLIED fenced permite revisão; PENDING/UNKNOWN/503 conserva incerteza, sem sucesso/cancelamento/nova chave anunciados.

Home/agenda operacional em erro503/rede mostram indisponibilidade e retry, não lista vazia/contagem zero/valor zero. Dados anteriores, se mostrados, têm indicação de desatualização. Resposta perdida de uma mutation mantém tentativa em verificação e não remove atendimento/membro visualmente como concluído.

Homologar fixture e API real separadamente: consulta/cart/model isolados não provam reserva; HTTP sem browser não prova cookie/login/draft; memória não prova locks/rollback. PostgreSQL real: dois clientes/duas instâncias, mesmo profissional entre unidades, preço/jornada alterados, desativação concorrente, response-loss/cleanup, prazos exatos, remarcação com falha, convite CPF existente e retorno por aceite. Browser: iniciar pela home, autenticar/verificar, manter draft, criar/remarcar/cancelar, abrir notificações e operar unidade correta; Android/iOS possuem evidência própria, sem extrapolar teste web.

## Encerramento do planejamento

Os pontos de produto estão confirmados e a revisão técnica foi APPROVED, com S01–S06/C01–C05/U01–U03 aceitas e resolvidas. [Registro da revisão](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/REVISAO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md). O usuário aprovou o pacote e, após B1, solicitou [execução agrupada](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md). As demais interfaces são entregas futuras e não prova de runtime. Volume/SLO continuam não informados; critérios de produto/aceite foram preservados.

# Execução e retomada da otimização de dados

Data: 11/11/2026. **Implementação local concluída e checks automatizados aprovados. Validações manuais/visuais ficam com o responsável, conforme sua instrução.** Publicação e alterações em banco compartilhado não foram realizadas.

## Bases e estado dos repositórios

- Frontend: `D:/smart_barber/worktrees/frontend-otimizacao-dados`, branch `feat/otimizacao-dados-cache`, base `82f73edff9e07e6d8a5af9a3334959f2fd76481d`.
- API: `D:/smart_barber/worktrees/api-otimizacao-dados`, branch `feat/otimizacao-dados-cache`, base `35e9e806f549bab6577105637cd08ea90de6008f`.
- As referências remotas main foram reconferidas e continuam nesses SHAs.
- O trabalho interrompido estava no início do cache/PWA. Havia alterações de banco/API e benchmarks, mas o controle de execução ainda marcava tarefas já alteradas como não iniciadas. A retomada auditou o estado real, completou a integração e corrigiu falhas encontradas.
- Alterações preexistentes dos checkouts originais foram preservadas. Não houve commit, push, PR, merge ou deploy.
- Banco de prova: container exclusivo `smartbarber_opt_bench_pg`, PostgreSQL 16.15 em `127.0.0.1:55432`. Bancos de benchmark/testes são descartáveis e identificados explicitamente. Outros containers/bancos não foram usados.

## Resultado funcional

As leituras de reservas usam lotes em vez de consultas por item; o resumo é agregado em SQL e o bootstrap temporal não consulta reservas. Datas usam o fuso real da unidade e preservam o caminho legado. A disponibilidade busca regras/exceções por escopo e dia. Os locks, versões, idempotência e relógio pós-lock foram conservados.

O financeiro oferece resumo sem listas e seções com paginação SQL, mantendo regras de preço desconhecido, pagamento/vencimento e recebimentos. Notificações aplicam cursor composto e contagem SQL de não lidas. O Explorar hidrata janelas limitadas sem transportar toda a cauda do snapshot; candidatos removidos conservam cursor para continuar a busca. A limpeza de expirados saiu do caminho da primeira página.

No frontend, catálogo e reserva reaproveitam opções/chaves públicas. Persistência projetada, versionada e limitada usa IndexedDB/AsyncStorage, sem guardar dados privados. Falha comum de atualização conserva o último catálogo público; invalidação explícita por mutação continua removendo o snapshot conhecido como antigo. Um snapshot de falha exige revalidação online na próxima hidratação.

A troca de escopo oculta páginas acumuladas já no primeiro render; uma resposta/refresh/logout de sessão anterior não sobrescreve a sessão atual. Foco e conectividade controlam atualização; confirmação de reserva e operações financeiras continuam online. PWA guarda shell e assets públicos, com orçamento e ciclo de atualização que conserva abas antigas. Avaliações offline sem dados não são apresentadas como um resultado vazio confirmado.

## Matriz T00–T19

| Tarefa | Estado local e evidência | Área responsável |
|---|---|---|
| T00 | Baseline e comparação de 17 cenários HTTP; SQL/bytes/durações; massa sintética ampliada para índices. Infra real e p95 de dispositivo continuam externos. | API `observability`, cliente DB e scripts de benchmark; frontend `HttpClient` |
| T01 | Lotes para reservas, usuários/unidade/itens e legado. Páginas 1/20/100 com comandos constantes; testes reais PG. | Repositório de reservas e portas |
| T02 | Agregação SQL, bootstrap sem leitura de reservas, omissão explícita de resumo e marcador de total não exato. | Caso de uso/controller da unidade; `use-unit-bookings` |
| T03 | Ordem determinística, inclusão de histórico misto e limites civis no fuso da unidade. Offset pessoal foi conservado; cursor por cliente não foi promovido sem necessidade de volume comprovada. | Repositório/DTOs/controllers de reservas pessoais/unidade |
| T04 | Jornadas, documentos de escopo e exceções limitados ao dia/profissional; leituras independentes em paralelo. | Schedules/exceptions e cálculo de disponibilidade |
| T05 | Serviços em lote; locks, versões, ledger, snapshots, eventos e atomicidade mantidos. | Criação/reagendamento e unidade de trabalho |
| T06 | Consulta e polling por etapa ativa; foco, conectividade, jitter/backoff; retomada e reconciliação de operação incerta preservadas. | Hook de disponibilidade, lifecycle e transporte |
| T07 | Oito candidatos medidos; quatro aprovados e quatro retirados da migration. | Schema e migrator da API |
| T08 | Runner com lock transacional, ledger e preparação concorrente dos índices; expurgo de snapshots em lote. Agendamento de manutenção é etapa operacional externa. | Scripts de schema/índices/expurgo |
| T09 | Resumo agregado, views/páginas limitadas, teto de intervalo e snapshot com autoridade bloqueada. Compatibilidade antiga mantida e documentada. | Financeiro API e tela financeira |
| T10 | Cursor e desempate de notificações; contador no SQL; atualização por ator. | Repositório/use-case e hooks de notificações |
| T11 | Previews/destaques limitados por loja no SQL e enriquecimento paralelo. A leitura de avaliações preservou cálculo autoritativo até haver reconciliação dos agregados armazenados. | Descoberta e mídia |
| T12 | Janela de candidatos limitada, cursores/expiração preservados, continuação quando candidatos deixam de ser elegíveis; busca sem raio mantida. | Explorar, snapshots e tela |
| T13 | Janela de mídia existente conservada; poster/manual em economia de dados e fallback sem poster. Verificação de bytes/CDN real e visual fica externa. | Feed e política de economia |
| T14 | Matriz de invalidação ampliada, inclusive financeiro/serviços públicos/Explorar; proteção por contexto e cancelamento. Testes de primeiro render e sessões concorrentes. | Query keys, sessão e invalidadores |
| T15 | Persistência seletiva, validação/projeção na gravação e restauração, TTL, limite UTF-8, corrupção/quota e hidratação sem sobrescrever rede nova. | Cache público e adapters de storage |
| T16 | Shell/worker versionados, exclusão de APIs/tokens, proteção do bootstrap contra expulsão, atualização aguardando abas; lifecycle web/native. Manual/visual final com o responsável. | PWA, root e lifecycle |
| T17 | Transporte público sem credenciais, `no-store` privado, cache HTTP público opt-in. Cache distribuído não adotado: consultas locais não justificaram serviço adicional. | Transporte e adapter HTTP |
| T18 | Boot verifica schema compatível sem DDL por padrão; runner v3, rollback de falha, coordenação concorrente e ledger testados. Região/pool/cold start reais dependem de infraestrutura. | App, DB, migrator e runner |
| T19 | Flags, compatibilidade, ordem de release e rollback documentados. Deploy e acompanhamento pós-publicação aguardam autorização; não foram simulados como concluídos. | Documentos de contrato/cache e operação |

## Comparativo HTTP local

A baseline `benchmark-before.json` foi produzida na execução anterior e preservada. A retomada reproduziu a medição final no alvo descartável com o mesmo gerador da massa HTTP. Os experimentos de crescimento/índices foram separados e a massa de benchmark foi restaurada antes da comparação final.

A amostra típica tem 15 requests aquecidos por cenário de leitura; os cenários de escrita podem ter menos amostras. Percentis são descritivos dessa massa e ambiente. Não representam SLA, internet móvel, p95 de produção ou cold start serverless. A primeira chamada é warm-up do cenário.

| Cenário | SQL antes | SQL final | p95 antes (ms) | p95 final (ms) |
|---|---:|---:|---:|---:|
| Reservas da unidade — 20 | 105 | 8 | 266.228 | 27.316 |
| Reservas da unidade — 100 | 505 | 8 | 1283.682 | 28.575 |
| Reservas pessoais | 102 | 5 | 238.360 | 14.817 |
| Disponibilidade | 8 | 7 | 28.156 | 16.680 |
| Criar agendamento | 25 | 22 | 62.886 | 66.280 |
| Explorar — primeira página | 10 | 9 | 84.953 | 33.209 |

O bootstrap final usa **2 comandos**, sem leitura de reservas. O novo resumo financeiro devolveu **3,070 bytes**, frente a **164,216 bytes** da resposta completa que a tela anterior precisava consumir. Esse comparativo se refere a caminhos de resposta diferentes com resumo equivalente, não à retirada da compatibilidade antiga.

A escrita reduziu comandos, mas seu tempo não melhorou de forma geral nessa amostra. Esse resultado está exposto na tabela; não foi usado para prometer aceleração de toda operação. O modo financeiro legado ainda devolve listas completas sem limites explícitos e mantém seu custo de compatibilidade. O aplicativo novo usa as views limitadas.

A agenda agrega resumo e página em leituras separadas, como o contrato anterior. Mudanças concorrentes podem exigir refetch para reconciliar a página e a contagem. O financeiro usa uma transação curta para resumo/página. Operações de escrita continuam autoritativas e transacionais.

## Decisão sobre índices

Massa ampliada: cerca de 5 mil lojas adicionais, 35 mil jornadas, 50 mil exceções e 20 mil notificações de ruído, exclusivamente sintéticas. Os números exatos estimados e planos resumidos estão no JSON. Os cenários de cliente/profissional foram conferidos com resultados não vazios antes da decisão.

| Candidato | Buffers antes | Buffers depois | Decisão |
|---|---:|---:|---|
| `membership_user_state_shop_idx` | 2 | 2 | Não promovido |
| `barbershop_schedules_shop_day_barber_idx` | 539 | 7 | Incluído |
| `schedule_exceptions_shop_date_barber_idx` | 619 | 3 | Incluído |
| `notifications_user_created_id_idx` | 368 | 24 | Incluído |
| `notifications_user_unread_idx` | 368 | 11 | Incluído |
| `bookings_customer_starts_at_id_idx` | 71 | 71 | Não promovido |
| `shopping_carts_user_id_idx` | 71 | 71 | Não promovido |
| `bookings_shop_barber_starts_at_id_idx` | 6 | 6 | Não promovido |

Os quatro não promovidos não são removidos automaticamente de bancos existentes; simplesmente não entram no novo DDL/schema desta entrega. A preparação concorrente valida definição/validade e não apaga índices de outro ambiente. O experimento de índices modifica temporariamente apenas o banco descartável fixado no script.

## Checks automatizados

- Frontend: suíte final com **175 arquivos / 1.127 testes aprovados**.
- API: suíte principal com **126 arquivos / 744 testes aprovados** e 3 suítes opt-in inicialmente não selecionadas.
- Suítes opt-in: onboarding/rate limit somaram **21 testes aprovados**; promoção de proprietário somou **5 aprovados** após atualizar sua fixture para o schema atual. E-mails são fakes; não houve envio real.
- Readiness/atomicidade/leituras: **10 testes focados aprovados**, dos quais 7 já pertencem à suíte principal e 3 são os novos casos de readiness.
- Contrato adicional de omissão de resumo/total inferior: **1 teste aprovado**, acrescentado depois da suíte principal.
- Cobertura API por seleções complementares: **774 casos distintos aprovados**, sem contar novamente os 7 testes de leitura/atomicidade já executados na suíte principal.
- Typecheck frontend e API aprovados.
- Export web e export Android/Hermes aprovados. Não houve build assinado nem instalação em dispositivo.
- Biome nos arquivos backend alterados: sem erros; permanecem warnings medidos, principalmente `noExplicitAny`. Não foram enfraquecidas regras nem alterados arquivos em massa fora do escopo para zerar dívida.
- `git diff --check` e checagem de artefatos/links completam a entrega. Scripts frontend de lint/typed lint não existem no manifest desta base main; não foram inventados resultados de lint.

Durante a validação foram corrigidas fixtures com datas vencidas, intervalos de reserva incoerentes, dependência de credenciais privadas de seed e guard de porta que não criava um banco próprio. Testes antigos de localização foram alinhados ao contrato atual por fonte: cache Google indisponível não derruba coordenadas manuais elegíveis. As proteções de validade/heartbeat Google foram conservadas.

## Browser já exercitado e divisão das validações

A prova de Chrome em contexto isolado, feita antes da instrução de delegar as verificações manuais, abriu catálogo sintético online/offline e em retomada. Foram observados dois snapshots públicos, zero campos privados no disco e zero respostas de API em Cache Storage. Uma amostra de reload aquecido com preset Slow 4G exibiu o serviço em aproximadamente 488 ms, incluindo bootstrap. Não é p95 nem medição isolada do orçamento de 300 ms após contexto validado.

A revisão manual/visual final foi reservada ao responsável a seu pedido. A prova de browser ocorreu durante a implementação; os últimos ajustes de falha de atualização, reviews offline e escopo foram fechados por testes automatizados. Não foi declarada homologação visual do conjunto final.

## Revisão manual a cargo do responsável

1. Aparência, navegação e estados de loading/erro/conteúdo em cliente, profissional e proprietário, nas duas larguras.
2. Fluxo real de selecionar serviço/profissional/horário, confirmar, reagendar, cancelar e atualizar listas/resumos.
3. PWA instalado, reload offline e retomada; atualização com abas abertas e rascunho de reserva.
4. Logout/troca de conta/unidade e ausência de informação anterior durante a troca.
5. Financeiro por dia/semana/mês/intervalo e paginação de despesas/atendimentos.
6. Feed, galeria, vídeos, economia de dados, busca e proximidade sem raio.
7. Safari/iPhone e Android físicos, suspensão/retorno e conexão real limitada.

O preview público sintético não é uma API de autenticação ou agendamento. Os dados do benchmark também não são instruções de acesso às contas privadas do sistema. Os checkouts originais e o site publicado não receberam estas alterações.

## Release preparado, ainda não executado

Contratos específicos estão em `docs/otimizacao-respostas.md` no worktree da API e `docs/cache-pwa.md` no frontend.

Ordem proposta: conferir driver/TLS/região/orçamento de conexões; preparar os quatro índices concorrentes em janela autorizada; aplicar runner transacional e verificar marker `2026-11-11-data-opt-v3`; liberar API; publicar frontend com cache/PWA versionados; acompanhar métricas e consistência. Compatibilidade financeira `view=all` foi mantida para transição.

Rollback: flags independentes para hidratação de reservas, persistência pública, worker e cache HTTP público; demais mudanças SQL voltam por versão compatível da aplicação, preservando os acréscimos de schema. Optou-se por não manter uma segunda implementação financeira de produção que pudesse divergir nas regras de saldo/preço. Nunca reverter uma reserva confirmada para corrigir cache. Não executar remoção automática de índices ou histórico em ambiente compartilhado.

Continuam externos: PostgreSQL efetivo e índices instalados no provedor, pool/região/TLS reais, cold start serverless, métricas representativas de produção, agenda do job de limpeza, deploy/rollout e acompanhamento pós-publicação. As metas de 300 ms/2,5 s não foram apresentadas como aprovadas em dispositivo/rede real.

## Artefatos

- [Baseline anterior](evidencias/benchmark-before.json)
- [Medição final HTTP](evidencias/benchmark-final.json)
- [Experimentos dos oito índices](evidencias/index-assessment.json)
- [Definições usadas no experimento local](evidencias/index-candidate-definitions.json)
- [Checks de browser durante a execução](evidencias/browser-validation.json)
- [Integridade dos sources alterados](evidencias/source-manifest.json)

Logs completos permanecem locais e ignorados em `.tmp-*.log` nos worktrees. Não há credenciais reais nos artefatos de evidência selecionados.

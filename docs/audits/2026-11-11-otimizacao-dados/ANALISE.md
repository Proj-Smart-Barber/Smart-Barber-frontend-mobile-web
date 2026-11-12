# Análise de dados, latência e cache do Smart Barber

Data: 11/11/2026. Escopo: frontend universal/PWA, API, persistência PostgreSQL e entrega de mídia. Resultado: auditoria estática e proposta de execução; nenhuma otimização foi aplicada.

Plano executável: [PLANO.md](PLANO.md). Coleta futura de metadados: [diagnostico-postgresql.sql](diagnostico-postgresql.sql).

## 1. Conclusão

O maior problema estrutural encontrado é a multiplicação de consultas na leitura de reservas. A API busca IDs paginados e carrega cada reserva por várias consultas sequenciais. A mesma implementação atende agenda operacional e dashboard. Há também resumos calculados em memória, leituras excessivas de jornadas/exceções, consultas financeiras sem paginação e custo crescente da descoberta.

Criar índices isoladamente não resolve essas causas. A ordem recomendada é medir o caminho completo, eliminar consultas por item e leituras sem limite, alinhar filtros aos índices e, então, introduzir cache seletivo e persistência local. Cache de catálogo e mídia pode ser mais duradouro. Horários e confirmação de reserva exigem atualização e validação autoritativas.

O sistema já possui estruturas úteis: TanStack Query, leitura compartilhada de reservas da unidade, chaves com ator/unidade/papel em fluxos críticos, snapshots do Explorar, índices de reservas e financeiro, snapshots de preço dos serviços, idempotência, versões e locks. Preservar e completar essas estruturas é preferível a introduzir outra arquitetura de dados.

Não há medição nesta auditoria que permita afirmar qual consulta é a mais lenta em produção, quanto cada alteração economizará ou se o banco é o principal responsável pela demora percebida.

## 2. Base examinada e limites

Os checkouts inicialmente abertos não representam o código integrado mais recente:

| Fonte | Revisão/estado observado |
|---|---|
| Frontend aberto | `feat/brand-system-v3`, HEAD `19a3f1c`; alterações locais preexistentes |
| API aberta em `../api` | `feat/cliente-cadastro-confirmacao`, HEAD `4249abd`; alterações locais preexistentes |
| Frontend integrado, após consulta ao remoto | `82f73edff9e07e6d8a5af9a3334959f2fd76481d`, main em 11/11/2026, PR #94 |
| API integrada, após consulta ao remoto | `35e9e806f549bab6577105637cd08ea90de6008f`, main em 11/11/2026, PR #79 |

Foi feito `git fetch origin main` nos dois repositórios. A análise principal usa os SHAs acima, sem mudar branches ou arquivos de aplicação. Cópias locais dos fontes relevantes estão em `.tmp/otimizacao-dados-2026-11-11/{frontend,api}`. São evidências locais descartáveis, não novos checkouts de execução. Os links de fonte abaixo fixam os commits.

Versões resolvidas nos lockfiles da main: Expo **58.0.22**, Expo Router **58.0.29**, React **19.3.0**, React Native **0.88.1**, TanStack Query **5.102.8**, Express **5.2.1**, Drizzle **1.0.0-rc.4**, Neon serverless **1.1.0** e pg **8.23.0**. O checkout aberto ainda declara Expo 57; não foi feita atualização de SDK. A versão do PostgreSQL em execução não foi consultada.

Inspeção: rotas, chamadores ativos, hooks, adapters HTTP, casos de uso, repositórios SQL, schema, migrator, configuração de entrega e lockfiles. Os 926 arquivos copiados são o universo de fontes disponível para busca, não uma alegação de revisão individual de todas as linhas.

Não houve conexão a PostgreSQL, leitura de `.env`, execução de API, benchmark, chamada de negócio, consulta à produção, migration, seed, instalação, commit, push ou deploy. Não foram executadas suítes de produto: esta entrega altera somente documentação. A revisão não comprova índices instalados, plano SQL real, região do banco, pooling do provedor, compressão da hospedagem ou versão publicada. Main integrada não equivale a deploy verificado.

## 3. Fluxos e caminho dos dados

| Fluxo | Frontend e chamadas principais | API/PostgreSQL | Diagnóstico e destino recomendado |
|---|---|---|---|
| Entrada, login e restauração | `SessionEngine`: sessão, identidade, vínculos; depois unidade e tela | JWT, consulta do usuário, identidade e memberships | Reduzir etapas sequenciais independentes; não persistir autorização como verdade |
| Explorar | `useExploreFeed`, páginas por cursor, itens com mídia e serviços | ranking, snapshot de IDs, reidratação elegível, avaliações e mídia | Reduzir trabalho de primeira página e hidratar apenas janela limitada |
| Perto de você e pesquisa | `useDiscovery/useNearbyDiscovery`, páginas de 20, busca com debounce | localização elegível, Haversine, contagem, ordenação, previews | Evitar contagem global repetida; preservar busca sem raio e ordem por proximidade |
| Catálogo da unidade | unidade, serviços, galeria e avaliações | catálogo paginado, anexos e métricas públicas | Reutilizar DTOs/chaves; separar conteúdo inicial e seções sob demanda |
| Preparação de agendamento | `useBookingFlow`: serviços, profissionais e unidade; depois disponibilidade | serviços ativos, jornada geral/individual, exceções e ocupação | Cache de metadados; consulta de horários limitada a profissional/dia |
| Confirmar reserva | relógio válido, cotação, request ID, recuperação de estado incerto | autorização, idempotência, locks, conflito, gravação de itens/eventos/notificações | Reduzir I/O mantendo transação, relógio e proteção contra dupla reserva |
| Agenda pessoal e próximo horário | `useMyBookings`, `/bookings/me`; consulta própria de próximo atendimento | busca por cliente, detalhes por ID, compatibilidade com carrinho legado | Paginação determinística; SQL em lote; filtros futuros/passados no servidor |
| Agenda operacional e dashboard | ambos usam `useUnitBookings`; bootstrap temporal e página de 20; polling 60 s | `/barbershops/:shopId/bookings`, vínculo ativo, resumo e detalhes | Primeiro alvo de otimização: agregação SQL e detalhes em lote |
| Cancelar, reagendar e status | operação versionada; invalidação de reservas/horários | validações de papel, preço e jornada, lock e evento | Reusar resposta autoritativa; invalidar consumidores exatos, inclusive financeiro |
| Financeiro do proprietário | consulta por mês ou intervalo; seções de resumo/despesas/atendimentos | lançamentos e reservas do período; projeção em JavaScript | Resumo separado de listas paginadas; limites de período e predicados indexáveis |
| Jornada e exceções | documento de escopo, jornada semanal e exceções; mutations invalidam consumidores | herança/estado de escopo, agendas e reservas futuras | Buscar apenas escopo/dia necessário; preservar geral e individual |
| Equipe, convites e cadastro profissional | listas, detalhes, criação e resposta; contexto por unidade | memberships, usuários, convites e entregas | Projeções mínimas; índice de vínculo por usuário se medido; não cachear revogação |
| Notificações | feed por ator, cursor e marcação de leitura | lista por usuário; contador de não lidas | Cursor real e contagem SQL; índice composto e parcial candidatos |
| Perfil, aparência e mídia | upload direto, confirmação, associação e galeria | intenções, quota, imagens, fila de vídeo e storage | Separar latência de JSON e bytes; variantes leves; cache por versão |
| Avaliações e moderação | consultas e mutações de avaliações | avaliação única por reserva, agregados e moderação | Reusar agregados já mantidos e invalidar catálogo/Explorar após mudanças |

### Caminho crítico do agendamento

1. Exibir unidade/serviços/profissionais reutilizando metadados válidos.
2. Consultar disponibilidade depois de serviço, profissional e data estarem definidos.
3. Atualizar horários enquanto o usuário escolhe; descartar horários vencidos pelo relógio do servidor.
4. Confirmar online com cotação, request ID e controle de concorrência existentes.
5. Renderizar o resultado autoritativo e atualizar agenda pessoal, unidade, próximo horário e resumos afetados.
6. Em timeout ambíguo, reconciliar a tentativa original; nunca criar outra reserva apenas para repetir a chamada.

## 4. Achados comprovados no código

Prioridade P1: alto impacto provável ou requisito de consistência. P2: melhoria importante após as primeiras correções. Impacto em milissegundos permanece por medir.

### A01 — Reservas têm consultas por item: P1

`findUnitBookings` faz consulta de resumo, consulta dos IDs da página e um loop com `await getDetails(id)`. `getDetails` busca reserva, cliente, unidade/telefone, profissional e itens; há buscas adicionais para legado. `findManyByCustomerId` e a agenda detalhada do profissional também repetem `getDetails` por item.

No caminho moderno típico, são aproximadamente **2 + 5 × N consultas no repositório** da listagem operacional. Para 20 reservas, cerca de 102 consultas, além de autenticação e vínculo. É uma contagem estrutural ilustrativa, não um trace executado. A quantidade varia conforme presença de cliente, unidade e legado.

Proposta: buscar página e relações em número constante de consultas, com joins para relações unitárias e lote de itens por IDs. Preservar DTO, campos sensíveis por papel e snapshots históricos. Não substituir o loop por 100 consultas paralelas: isso mantém o problema e pode esgotar o pool.

Fontes: [detalhes e listas][api-bookings], [listagem da unidade][api-unit-list].

### A02 — Resumo da unidade lê todas as reservas do filtro: P1

Antes de paginar, a API carrega `id`, preço e status de **todas** as reservas correspondentes e agrega em JavaScript. O bootstrap sem data, usado apenas para obter `serverTime`, também passa por essa implementação. `limit=1` reduz a página, mas não limita o trabalho de resumo.

Proposta: agregados SQL `COUNT`, `SUM`, contagem de preços desconhecidos e grupos por status; resumo opcional nas próximas páginas. Resolver a data padrão da unidade no servidor ou oferecer resposta de contexto temporal leve. Não usar resumo da primeira página como total global.

Fontes: [summaryRows][api-summary], [bootstrap frontend][front-unit-bootstrap].

### A03 — Disponibilidade carrega dados além do dia/escopo: P1

O caso de uso busca jornadas da unidade inteira, documentos de escopo geral/individual e todas as exceções da unidade. Só depois filtra dia, profissional e exceções em memória. As consultas são majoritariamente sequenciais. Há validação de serviços, leitura de ocupação e geração dos slots em cada chamada.

Proposta: portas de leitura por unidade/escopo/dia e exceções por data, incluindo gerais e individuais. Buscar os documentos de escopo em lote; paralelizar somente leituras independentes. Cachear regras semanais versionadas é diferente de cachear ocupação. Manter `no-store` do endpoint de horários.

Fontes: [cálculo de disponibilidade][api-availability], [schema de jornadas/exceções][api-schedules-schema].

### A04 — Expressões temporais e legado dificultam uso dos índices: P1

A ocupação usa `coalesce(starts_at, conversão de date/start_time/timezone)` e equivalente para término. A listagem operacional combina intervalos de `starts_at` e `date` com OR. O financeiro aplica `AT TIME ZONE`, cast de data e `COALESCE` sobre as colunas filtradas.

Existem índices em `starts_at`; sua existência não prova uso eficiente por essas expressões. Proposta: medir os planos, separar caminho moderno e legado quando semanticamente equivalente e calcular limites UTC da data civil no servidor. Tratar meia-noite, fusos e registros legados antes de normalizar ou migrar dados. Não remover a proteção global contra conflitos do profissional entre unidades.

Fontes: [expressões de bloqueio][api-blocking], [financeiro][api-finance].

### A05 — Escrita consulta cada serviço separadamente: P2

`create-booking` percorre serviços e chama `findById` em sequência. Há método de lote no repositório. Proposta: usar lote preservando validação de duplicatas, unidade, atividade, preço e duração; manter as revalidações exigidas pela transação e política atuais.

Fonte: [criação de reserva][api-create].

### A06 — Locks são amplos e precisam ser medidos: P1 para diagnóstico

A unidade de trabalho bloqueia unidades, profissionais globais, vínculos e reservas em ordem determinística. O lock de unidade pode serializar operações de profissionais diferentes da mesma loja. A referência de tempo é consultada **depois** dos locks, comportamento importante para consistência.

Medir espera por lock e tempo da transação. Reduzir consultas dentro da região crítica primeiro. Qualquer alteração de granularidade exige provar concorrência entre agendamento, desativação, alteração de jornada, serviço e reserva em outras unidades. Locks não são dívida descartável.

Fonte: [unidade de trabalho][api-locks].

### A07 — Financeiro retorna todas as listas e calcula resumo na aplicação: P1

O endpoint retorna lançamentos e reservas completos do intervalo, inclusive quando a tela mostra apenas a visão geral. A projeção recebe os arrays inteiros. Reservas têm subconsultas de preço e títulos dos itens. `resolveFinancePeriod` valida datas, mas não define teto de duração do intervalo.

Proposta: resumo agregado por dia e listas paginadas carregadas pela seção aberta. Definir limite de período para consultas interativas e processamento separado para relatórios extensos. Preservar recebimentos versus previsão, datas de pagamento/vencimento, valores desconhecidos e controle de versão. Existem índices de vencimento, pagamento e unicidade do recebimento: não recriá-los.

Fontes: [leitura financeira][api-finance], [período e projeção][api-finance-project], [tela e chave por ator/unidade/período][front-finance].

### A08 — Invalidação incompleta entre domínios: P1

`invalidateBookingQueries` cobre reservas, disponibilidade, agenda, dashboard e notificações; não contém `finance`. Alterar reserva pode deixar o financeiro em memória sem atualização imediata. A gestão de serviços invalida `['services', shopId]`, enquanto o catálogo/reserva públicos usam `['services', 'public', shopId]`. Esses prefixos não se correspondem. Mutações de avaliações invalidam descoberta, mas não explicitamente `explore-feed`.

Proposta: contrato de eventos e matriz de consumidores, chaves centralizadas e testes de correspondência. Aumentar TTL antes de corrigir isso prolongaria dados desatualizados. Cache no servidor também precisará dos mesmos eventos, com entrega confiável após commit.

Fontes: [invalidação de reservas][front-invalidation], [gestão de serviços][front-service-management], [fluxo de reserva][front-booking-flow], [avaliações][front-reviews].

### A09 — Cache de queries não sobrevive ao reinício: P1 para experiência

O root cria `QueryClient` em memória. Não foi localizada integração de persistência de queries, hidratação, `onlineManager` ou `focusManager` nos fontes examinados. Existe persistência de sessão, operações e localização; ela não equivale a persistência de dados de tela.

Proposta: começar por catálogo público em armazenamento local limitado, versionado e com validade. Dados pessoais exigem allowlist, isolamento por ator e política explícita de privacidade. Nunca persistir todo o QueryClient indiscriminadamente. Finanças e informações pessoais de terceiros ficam fora do primeiro lote.

Fontes: [root e provider][front-root], [sessão][front-session].

### A10 — Instalação PWA não oferece shell offline implementado nos fontes: P1 para experiência

Há manifest e ícones, mas não foi localizado service worker ou registro nos fontes rastreados. A configuração Vercel define revalidação do manifest; não estabelece política completa do shell ou APIs. A hospedagem ainda pode aplicar cache/compressão próprios; cabeçalhos efetivos não foram medidos.

Proposta: shell offline versionado, fallback de navegação e cache limitado de assets públicos. Nunca interceptar genericamente `/api`, auth, operações ou respostas privadas. Testar atualização, rollback, várias abas e limpeza de versões antigas. Native precisa de sua própria persistência; service worker só atende web.

Fontes: [manifest][front-manifest], [entrega web][front-vercel].

### A11 — Disponibilidade já exige atualização frequente; polling tem custo: P2

`useBookingAvailability` usa `staleTime=0`, refetch em montagem/foco/reconexão e polling de 15 s nos passos ativos. Agenda/unidade faz polling de 60 s. O parâmetro `active` desliga o polling dos horários, mas não integra a condição `enabled`; com seleção completa ainda pode ocorrer leitura fora desses passos.

Proposta: medir chamadas por sessão e manter atualizações apenas com tela/etapa relevante, conectividade e app em primeiro plano. Usar jitter e retorno progressivo em falhas. Preservar revalidação antes da confirmação e retomada. Push/SSE é opção posterior, condicionada à hospedagem e ao custo; não requisito inicial.

Fontes: [hook de horários][front-availability], [read model operacional][front-unit-page].

### A12 — Cancelamento HTTP existe, mas nem todos os hooks encaminham o sinal: P2

O `HttpClient` atual combina sinal do chamador e timeout. Explorar, disponibilidade e financeiro já encaminham sinais. Descoberta e leitura operacional ainda têm query functions sem consumo do `signal`. Ignorar resposta obsoleta por geração preserva estado, mas não cancela o trabalho de rede/servidor iniciado.

Proposta: propagar cancelamento de leituras até adapters; distinguir cancelamento voluntário de timeout na UX. Não transformar cancelamento de mutation em prova de rollback do servidor.

Fontes: [HTTP atual][front-http], [descoberta][front-discovery], [unidade][front-unit-page].

### A13 — Notificações: cursor recebido não é aplicado e contador transfere todas as linhas: P1

O repositório aceita `cursor`, mas a consulta filtra apenas usuário, ordena por `created_at DESC` e limita. O contador busca todas as notificações do usuário e filtra `read_at` em JavaScript.

Proposta: cursor composto `(created_at,id)` com desempate estável; `COUNT` SQL onde `read_at IS NULL`; índices adequados ao usuário e ordenação. Corrigir comportamento de paginação antes de cachear resultados.

Fonte: [repositório de notificações][api-notifications].

### A14 — Agenda pessoal tem paginação sem ordenação explícita: P1

O caminho comum de `findManyByCustomerId` usa limit/offset sem `orderBy`. A busca legada por carrinho só ocorre quando a página moderna fica vazia. Isso exige testes com histórico misto antes de mudanças de paginação. O frontend classifica futuros/passados apenas entre as páginas carregadas.

Proposta: ordem total explícita, união correta do legado sem duplicatas e filtros futuros/passados no servidor. Migrar para cursor quando o volume justificar, preservando compatibilidade da API existente até a transição.

Fontes: [busca pessoal][api-personal], [classificação frontend][front-my-bookings].

### A15 — Descoberta repete contagem, agregados e enriquecimento: P1/P2

As buscas executam contagem e listagem. Avaliações são agregadas novamente por loja, embora escrita de avaliação já mantenha `rating/reviewCount` em `barbershops`. Previews e serviços destacados são carregados em duas etapas sequenciais. A limitação de seis elementos por loja ocorre em JavaScript depois de ler as linhas candidatas.

Proposta: verificar consistência dos agregados existentes, reusá-los quando equivalentes, limitar anexos por loja no SQL e buscar apenas os campos da tela. Paralelizar os dois lotes independentes. Contagem exata deve ser opcional quando basta `hasNext`.

Fonte: [repositório de descoberta][api-discovery], [agregados de avaliações][api-reviews].

### A16 — Explorar já tem snapshot, mas primeira página ainda ranqueia todos os IDs: P1/P2

`rankExploreIds` calcula ranking de todos os candidatos, sem limite, incluindo agregação lateral de avaliações. O snapshot salva a lista completa em JSONB. A cada save há também exclusão de snapshots expirados no caminho da requisição. Na hidratação, `snapshot.ids.slice(offset)` envia todo o restante dos IDs para uma busca que devolve até 50 candidatos, antes de entregar normalmente 10 itens.

Proposta: manter a estabilidade do cursor, mas hidratar janelas pequenas e limitadas, repondo candidatos removidos com um orçamento de trabalho. Evitar transportar a cauda inteira. Mover limpeza para manutenção em lotes. Avaliar reuso de ranking por filtros públicos equivalentes somente após prova de elegibilidade e privacidade. Testar `hasNext`, remoções e expiração; o snapshot de IDs não substitui revalidação da publicação atual.

Fontes: [caso de uso Explorar][api-explore], [ranking SQL][api-discovery], [snapshot persistido][api-snapshot].

### A17 — Busca textual e proximidade sem raio merecem caminhos distintos: P2

A busca aplica normalização a colunas e `LIKE '%termo%'`. Índice B-tree simples do nome não resolve diretamente esse padrão. Na proximidade com raio há bounding box; sem raio ela é omitida e as lojas elegíveis são ordenadas pela distância calculada.

Proposta: medir cardinalidade e planos; avaliar texto normalizado com trigramas e índice espacial apenas quando necessários. Proximidade sem raio não pode ganhar um corte oculto para melhorar desempenho. Quantização geográfica só é aceitável com tolerância de ordenação documentada; não compartilhar resultado de coordenadas diferentes como se a distância fosse exata.

Fonte: [normalização e busca geográfica][api-discovery].

### A18 — Migração no boot faz parte da latência e disponibilidade: P1

`app.ts` cria `schemaReady` e bloqueia requisições até o migrator terminar. `hasMigrated` é memória do processo; instâncias novas podem repetir inspeções DDL e backfills. Em serverless isso é hipótese relevante de cold start e contenção, sem duração medida aqui.

Proposta: migrations versionadas em etapa de release, compatibilidade expand/contract e readiness leve. Antes de retirar o comportamento atual, provar que o deploy aplica o schema necessário e conserva recuperação de falha. Não executar índice pesado ou backfill no primeiro acesso do usuário.

Fontes: [gate de boot][api-app], [migrator][api-migrator].

### A19 — Pool, regiões e observabilidade não têm orçamento explícito nos fontes: P1 para diagnóstico

O cliente de produção usa um Pool Neon de módulo, sem parâmetros explícitos de capacidade/timeout no ponto de criação. Não foram localizados instrumentos de `Server-Timing`, contagem SQL por rota ou integração com `pg_stat_statements` nos fontes. Isso não prova ausência de métricas da plataforma.

Proposta: medir aquisição de conexão, conexão fria, duração SQL, serialização, região da função/banco, espera por lock e concorrência por instância. Definir limite global considerando número de instâncias. Não aumentar pool ou memória PostgreSQL sem conhecer o plano contratado e a concorrência.

Fonte: [cliente PostgreSQL][api-db].

### A20 — Mídia e payload também determinam a espera percebida: P2

O sistema já tem upload direto, variantes, posters e vídeo com pausa fora da atividade. Isso deve ser preservado. Ainda é preciso medir bytes efetivamente carregados: JSON rápido não compensa imagem original pesada ou vários players preparados simultaneamente. Pausar vídeo não prova ausência de download.

Proposta: thumbnail adequada à área visível, prioridade para conteúdo inicial, carregamento sob demanda, poster em conexão limitada e cache imutável de mídia pública por versão. Não cachear URLs de upload ou outras URLs assinadas; não usar localStorage para blobs. Medir também decodificação e renderização.

Fontes: [upload][front-media], [vídeo][front-video], [catálogo][front-public-catalog].

### A21 — Restauração tem etapas independentes sequenciais: P2

Login/restauração carregam identidade e depois memberships. `refreshIdentity` já usa `Promise.all`. Proposta: avaliar paralelismo também nos primeiros caminhos, preservando geração de sessão, falha de autorização e destino correto. Um endpoint de bootstrap unificado só se justifica se reduzir custo medido sem misturar domínios desnecessariamente.

Fonte: [motor de sessão][front-engine].

## 5. O que já está resolvido e não deve virar trabalho duplicado

- **Dashboard ativo:** `useDashboardViewModel` usa `useUnitBookings`. O adapter antigo ainda contém leitura duplicada para métricas/lista, mas não é o caminho da tela atual. Não usar esse código legado como prova de duplicação ativa.
- **Cancelamento HTTP:** a main já combina AbortSignal e timeout; o problema remanescente é adoção nos chamadores.
- **Disponibilidade:** já devolve relógio/fuso, elimina horários passados e usa `Cache-Control: no-store`.
- **Concorrência:** idempotência, operação incerta, controle de versão e ordem de locks existem. Nenhum cache pode substituí-los.
- **Banco:** já há índices de reservas, itens, serviços, memberships, localização, mídia, avaliações e financeiro. Novos índices precisam demonstrar utilidade adicional.
- **Explorar:** snapshot persistente de IDs e cursor existem. Não propor uma segunda implementação paralela.
- **Mídia:** upload direto e processamento/variantes existem. A tarefa é medir e usar as saídas adequadas.

## 6. Índices: inventário e candidatos

Estado abaixo significa **declarado no código**, não confirmado no catálogo de um banco em execução.

| Área | Estruturas já encontradas | Avaliação proposta |
|---|---|---|
| Reservas da unidade | `(barbershop_id, starts_at, id)` | Reutilizar após alinhar predicados; avaliar `(barbershop_id, barberman_id, starts_at, id)` somente para filtro frequente de profissional |
| Ocupação global do profissional | `(barberman_id, starts_at, ends_at)` | Medir expressões de legado; não assumir que o composto resolve qualquer intervalo de sobreposição |
| Cliente | índice simples `customer_id` | Candidato `(customer_id, starts_at, id)` conforme ordem/filtro finais; parcial de ativos apenas se o predicado da consulta for compatível |
| Itens/eventos | índices por booking; eventos `(booking_id, created_at)` | Usar no lote; não duplicar índices apenas para corrigir N+1 |
| Jornada | tabela semanal sem índice secundário declarado no schema examinado | Candidato `(barbershop_id, barberman_id, day_of_week)` após restringir consulta |
| Exceções | sem índice secundário declarado no schema examinado | Candidato `(barbershop_id, date, barberman_id)` para gerais e individuais no dia; comparar ordem alternativa conforme filtros |
| Escopos de jornada | unicidade e índice de lookup da unidade/profissional | Reutilizar os existentes |
| Notificações | índice simples `user_id` | Candidato `(user_id, created_at DESC, id DESC)`; parcial `(user_id) WHERE read_at IS NULL` para contador, se carga justificar |
| Memberships | unique `(barbershop_id,user_id)` e composto para equipe | Acesso por unidade já tem suporte; considerar índice iniciando por `user_id` para memberships da sessão |
| Serviços | `(barbershop_id,is_active,title,id)` | Preservar; seleção por IDs usa PK; novo índice de destaque só após medir |
| Avaliações | `(barbershop_id,status)`, cliente e unicidade da reserva | Avaliar acrescentar ordenação por criação/ID para feed; reutilizar agregados evita custo melhor que indexar repetidamente a mesma soma |
| Financeiro | unidade/vencimento, unidade/pagamento; request/cópia/recebimento únicos | Reutilizar; primeiro corrigir consulta das reservas e volume de resposta |
| Descoberta textual | normalização e substring nas consultas | Candidato GIN/trigramas de expressão/coluna normalizada equivalente; requer suporte à extensão e análise do custo de escrita |
| Descoberta espacial | índices de status/validade; sem GiST espacial encontrado | Avaliar PostGIS/GiST/KNN ou outra estratégia após volumetria e disponibilidade no provedor; projeto separado, sem mudança implícita de dependências |
| Snapshot do feed | PK e índice de expiração | Preservar; limpeza em lotes fora da requisição |

Índices parciais não devem usar `NOW()` como condição de futuro. O predicado precisa ser estável e compatível com o SQL real, inclusive valores nulos/status legados e consultas parametrizadas. Não trocar o predicado de bloqueio por outro conjunto de status apenas para encaixar um índice.

Não recomendar `shared_buffers`, `work_mem`, `effective_cache_size`, autovacuum, BRIN ou particionamento com valores arbitrários. Primeiro obter versão, memória/plano do serviço, tamanho das tabelas, distribuição, concorrência, WAL e estatísticas. Alta taxa de cache do PostgreSQL não elimina latência de N+1.

## 7. Política proposta de cache

Valores são hipóteses iniciais para experimento, não configuração aplicada ou garantia de atualização.

| Dado | Cache de memória no cliente | Persistência local inicial | API/compartilhado | Autoridade e invalidação |
|---|---|---|---|---|
| Shell, fontes, JS/CSS com hash | conforme navegador | service worker web versionado | CDN para assets imutáveis | Release/versão; HTML/SW com revalidação |
| Nome, serviços e profissionais públicos | 2–5 min | allowlist pública, validade máxima inicial de 24 h | 30–120 s se DTO comprovadamente público | Mudança de catálogo, equipe ou unidade; preço final sempre revalidado |
| Galeria e avaliações públicas | 1–5 min | metadados públicos limitados | TTL curto, com invalidação | Publicação, remoção, moderação e mídia READY |
| Arquivos públicos de mídia por versão | conforme arquivo e espaço | cache com quota/LRU, thumbnail primeiro | prazo longo somente com URL imutável | Nova versão/remoção; sem URLs assinadas |
| Explorar | manter ajuste atual de 5 min e medir | primeira janela pública apenas após definir validade | ranking/snapshot com limites, sem segunda fonte de verdade | Elegibilidade atual e expiração do cursor |
| Proximidade | 30–60 s como experimento | não persistir resultados associados a GPS no primeiro lote | sem CDN genérico para POST/localização | Permissão, geração, coordenadas e validade da fonte |
| Disponibilidade | atualização curta na etapa ativa | não persistir slots ofertados | manter `no-store`; regras internas versionadas podem ter cache | Booking/jornada/exceção/preço/equipe; confirmação online |
| Minhas reservas e próximo horário | 15–30 s, revalidação por evento/foco | fase posterior: resumo mínimo por ator, opcional | privado, sem cache compartilhado | Mutação, login/logout/troca de ator; indicar desatualização |
| Agenda da unidade/dashboard | 15–60 s conforme necessidade | fora da primeira fase por conter dados de terceiros | privado; resumo curto opcional após autorização | Unidade/papel/data/profissional e versão |
| Financeiro | 15–30 s | não persistir no primeiro lote | privado, sem CDN compartilhado | Booking, recebimento, despesa, pagamento e cancelamento |
| Sessão, tokens, lookup de cliente e tentativas | comportamento seguro existente | não incluir na persistência de queries | `no-store` explícito | Revogação e autenticação atuais |
| Notificações e contadores | 15–30 s ou eventos | fora da primeira fase | privado | Novo evento e leitura |

### Contratos obrigatórios

1. Chaves privadas incluem ator, unidade, papel, filtros e versão de schema. Consultas públicas e administrativas nunca compartilham a mesma chave por conveniência.
2. `staleTime` controla atualização; `gcTime` controla retenção em memória; validade persistida é outra decisão. Na persistência TanStack, alinhar `gcTime` ao `maxAge`, usar `buster` e seleção explícita de queries.
3. Dados visíveis podem aparecer imediatamente com “atualizando”, horário da última atualização e retry local. Erro de revalidação não deve apagar catálogo já exibido. Não exibir indiscriminadamente `placeholderData` de outro ator/unidade/filtro.
4. Cache não é autenticação. Hint de sessão restaurada não libera dado privado offline. Definir como verificar o ator antes de hidratar qualquer conteúdo privado; enquanto isso, offline inicial é público.
5. Logout, troca de ator, expiração/revogação e mudança de permissão cancelam leituras e eliminam snapshots privados da memória e do armazenamento persistente, inclusive entre abas. O logout atual limpa memória; persistência futura exigirá limpeza adicional.
6. Endpoints públicos cacheáveis precisam ter DTO e transporte explicitamente públicos. Hoje o cliente HTTP pode anexar bearer automaticamente. Não marcar toda resposta como `public` mantendo mistura de cookies, autorização ou contexto.
7. Cache público de localização não pode prolongar `valid_until` nem contornar o heartbeat de elegibilidade Google. Não armazenar coordenadas precisas em logs ou chaves expostas. A política definitiva precisa preservar as condições atuais de falha fechada.
8. Após uma escrita, atualizar/incrementar versão somente depois de commit. Para cache compartilhado, usar outbox ou mecanismo equivalente contra perda de invalidação; TTL curto limita risco residual. Uma falha de invalidação não pode desfazer uma reserva já confirmada.
9. Não criar fila genérica de reservas ou recebimentos offline. Rascunho local pode existir, mas confirmação exige rede e nova cotação/horário válidos.

## 8. Validação ainda necessária

- PostgreSQL real: versão, catálogo de índices, tamanho, distribuição, estatísticas, planos de execução e locks.
- API: p50/p95/p99, quantidade SQL por rota, bytes de JSON, tempo de conexão, serialização, instância fria/quente e concorrência.
- Cliente: tempo até primeiro conteúdo útil, dados reaproveitados ao voltar à tela, bytes de mídia, cancelamentos, falhas e renderização.
- Redes: perfil bom; rede limitada a 1,6 Mbit/s e 150 ms RTT; perfil mais restrito; perda/reconexão e offline após visita.
- Plataformas: Chrome, Safari/PWA instalado, Android e iPhone físico. Cache web não comprova comportamento native.
- Consistência: duas pessoas disputando o mesmo slot; profissional em duas unidades; alteração de serviço/jornada durante confirmação; replay; timeout ambíguo; virada de dia; preços desconhecidos; revogação e troca de ator.

## 9. Referências técnicas consultadas

Context7 foi consultado para PostgreSQL (`/websites/postgresql`), TanStack Query (`/tanstack/query`) e Drizzle (`/drizzle-team/drizzle-orm-docs`). As consultas não incluíram código privado, credenciais ou dados pessoais. Os catálogos não forneciam uma documentação fixada exatamente em TanStack 5.102.8 ou Drizzle 1.0.0-rc.4; exemplos específicos deverão ser conferidos contra os tipos instalados antes da implementação. A versão PostgreSQL do ambiente continua desconhecida.

- [PostgreSQL: EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html): `ANALYZE` executa a consulta; usar apenas SELECTs inspecionados e ambiente autorizado para a medição.
- [PostgreSQL: índices compostos](https://www.postgresql.org/docs/current/indexes-multicolumn.html) e [parciais](https://www.postgresql.org/docs/current/indexes-partial.html): ordem e predicado devem corresponder à consulta real.
- [PostgreSQL: CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html): construção concorrente tem regras próprias e não pertence ao boot da aplicação.
- [PostgreSQL: pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html): estatísticas de chamadas e execução dependem de instalação/configuração do servidor.
- [TanStack Query v5: persistQueryClient](https://tanstack.com/query/v5/docs/framework/react/plugins/persistQueryClient): validade persistida, descarte por versão e relação entre `gcTime` e `maxAge`.
- [Drizzle: paginação por cursor](https://orm.drizzle.team/docs/guides/cursor-based-pagination): ordenação composta determinística para campos não únicos e UUIDs.

## 10. Fontes do produto fixadas por revisão

Os links associados a cada achado apontam para arquivos e linhas dos commits examinados. Para navegar pela base completa, use as árvores fixadas do [frontend](https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/tree/82f73edff9e07e6d8a5af9a3334959f2fd76481d) e da [API](https://github.com/Proj-Smart-Barber/api/tree/35e9e806f549bab6577105637cd08ea90de6008f). As 38 referências de arquivos foram conferidas contra as cópias locais dessas revisões; essa conferência não exige acesso às páginas GitHub pelo navegador.

[api-bookings]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/repositories/drizzle-bookings-repository.ts#L329
[api-unit-list]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/repositories/drizzle-bookings-repository.ts#L760
[api-summary]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/repositories/drizzle-bookings-repository.ts#L802
[api-availability]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/domain/application/use-cases/schedule/calculate-availability/calculate-availability.ts#L118
[api-schedules-schema]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/schema.ts#L289
[api-blocking]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/repositories/drizzle-bookings-repository.ts#L48
[api-finance]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/http/controllers/finance/finance-repository.ts#L71
[api-finance-project]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/domain/application/services/finance/finance.ts#L95
[api-create]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/domain/application/use-cases/booking/create-booking/create-booking.ts#L187
[api-locks]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/services/drizzle-professional-membership-unit-of-work.ts#L13
[api-personal]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/repositories/drizzle-bookings-repository.ts#L578
[api-notifications]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/repositories/drizzle-notifications-repository.ts#L83
[api-discovery]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/repositories/drizzle-discovery-repository.ts#L198
[api-reviews]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/repositories/drizzle-reviews-repository.ts#L29
[api-explore]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/domain/application/use-cases/barbershop/get-explore-feed/get-explore-feed.ts#L92
[api-snapshot]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/repositories/drizzle-explore-snapshot-repository.ts#L10
[api-app]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/app.ts#L15
[api-migrator]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/migrator.ts#L10
[api-db]: https://github.com/Proj-Smart-Barber/api/blob/35e9e806f549bab6577105637cd08ea90de6008f/src/infra/drizzle/index.ts#L10
[front-unit-bootstrap]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/bookings/model/use-unit-bookings.ts#L76
[front-unit-page]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/bookings/model/use-unit-bookings.ts#L184
[front-invalidation]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/bookings/model/booking-query-keys.ts#L46
[front-service-management]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/services/model/use-services-management.ts#L55
[front-booking-flow]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/bookings/model/use-booking-flow.ts#L76
[front-reviews]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/reviews/model/use-reviews.ts
[front-root]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/app/_layout.tsx
[front-session]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/auth/model/use-session.tsx#L134
[front-manifest]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/public/manifest.json
[front-vercel]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/vercel.json
[front-availability]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/bookings/model/use-booking-availability.ts#L9
[front-http]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/shared/api/http-client.ts#L61
[front-discovery]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/discovery/model/use-discovery.ts#L140
[front-finance]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/finance/ui/FinanceScreen.tsx#L98
[front-my-bookings]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/bookings/model/use-my-bookings.ts
[front-media]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/media/api/media.api.ts
[front-video]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/discovery/ui/ExploreVideo.tsx
[front-public-catalog]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/services/ui/PublicCatalogView.tsx
[front-engine]: https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/blob/82f73edff9e07e6d8a5af9a3334959f2fd76481d/src/features/auth/model/session-engine.ts#L141

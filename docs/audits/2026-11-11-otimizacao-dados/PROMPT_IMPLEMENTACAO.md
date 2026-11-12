# Prompt para implementação completa da otimização

Implemente o plano de otimização do Smart Barber nos dois repositórios, do início à validação final possível no ambiente autorizado. Quero alterações reais, integradas e testadas. Não encerre com uma nova proposta de plano, correções parciais ou afirmações de conclusão sem evidências.

## 1. Repositórios e documentos obrigatórios

Frontend:
`D:\smart_barber\Smart-Barber-frontend-mobile-web`

Backend:
`D:\smart_barber\api`

Leia integralmente, antes de editar:

1. `AGENTS.md` aplicáveis aos dois repositórios e às pastas alteradas, incluindo referências às instruções globais.
2. `D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\audits\2026-11-11-otimizacao-dados\ANALISE.md`
3. `D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\audits\2026-11-11-otimizacao-dados\PLANO.md`
4. `D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\audits\2026-11-11-otimizacao-dados\diagnostico-postgresql.sql`
5. README, arquitetura, onboarding, qualidade e contratos específicos dos fluxos modificados. Preserve DESIGN.md, tokens, componentes e identidade visual.

Use `postgresql-optimization` e `context7`. Em tarefas Expo, carregue `expo-overview` e apenas as skills pertinentes. Consulte documentação compatível com as versões efetivamente resolvidas, sem enviar código privado, segredos ou dados pessoais aos serviços externos.

A análise é uma fotografia estática, não um benchmark ou prova de produção. Ela examinou:

- Frontend main: `82f73edff9e07e6d8a5af9a3334959f2fd76481d`.
- API main: `35e9e806f549bab6577105637cd08ea90de6008f`.

Confira a main atual, as diferenças posteriores e os chamadores ativos. Corrija o entendimento se o código mudou. Não implemente uma correção já integrada. A contagem ilustrativa de consultas da auditoria não substitui a baseline real.

## 2. Autonomia e limites

Execute diretamente, sem delegação automática. Prossiga entre fases sem pedir aprovação para decisões técnicas rotineiras dentro do escopo.

Antes de editar, confira status, branches, worktrees e alterações pendentes nos dois repositórios. Preserve todo trabalho preexistente. Use worktrees isolados e branches neutras a partir da base integrada adequada, sem trocar ou limpar as árvores sujas. Não inclua nomes de agentes ou ferramentas de IA em branches, commits ou artefatos de código.

Esta execução contempla implementação e validação local. Pode criar ambiente PostgreSQL novo, descartável e exclusivo para a tarefa, aplicar nele as migrations e gerar dados sintéticos necessários aos testes. Antes de cada operação de banco, comprove o destino e bloqueie qualquer fallback para banco compartilhado ou publicado. Não use dados pessoais reais. Essa autorização local não se estende a bancos existentes.

Não execute migrations, seeds, carga ou alterações de configuração em produção ou banco compartilhado. Não faça deploy, commit, push, merge ou PR sem autorização específica. Prepare código, migrations, evidências e instruções de release para revisão antes de solicitar qualquer uma dessas ações.

Não leia nem exponha arquivos de segredos, credenciais, tokens, cookies, URLs assinadas ou coordenadas pessoais. Configure o ambiente descartável explicitamente, sem reutilizar `.env` de ambiente existente. Não reinstale dependências saudáveis. Instale apenas dependências novas estritamente necessárias, com versões compatíveis e lockfile preservado.

Se faltar dispositivo, acesso de infraestrutura ou autorização para uma etapa externa, registre a dependência e continue todo trabalho independente. Não transforme ausência de medição em sucesso. Não declare o programa completamente validado enquanto houver aceite obrigatório pendente.

## 3. Controle da execução

Crie um documento de execução persistente, com nomenclatura neutra, contendo:

- Bases e worktrees usados, escopo e alterações preexistentes relevantes.
- Checklist de **T00 a T19**, associado aos achados A01 a A21.
- Para cada tarefa: estado, arquivos alterados, decisão técnica, comando executado, resultado e evidência.
- Matriz de contratos, eventos de invalidação, índices candidatos e decisões de adotar ou rejeitar cada otimização condicional.
- Pendências externas, riscos e procedimentos de rollback.

Estados mínimos: não iniciada, em andamento, implementada, validada, pendente externa ou não aplicável com justificativa. Não marque tarefa como validada apenas porque o arquivo foi criado.

Siga dependências e entregas do PLANO.md. Pode ajustar a sequência quando houver evidência melhor, registrando a razão. Preserve todos os objetivos e critérios. Redis, PostGIS, novas projeções e mudanças de locks são condicionais; avaliar e rejeitar com evidência também é uma decisão válida. Não adicione infraestrutura só para preencher um checklist.

## 4. Implementação integral

### T00 — Baseline e observabilidade

Prepare ambiente isolado e dados sintéticos representativos. Meça os fluxos antes das alterações: chamadas HTTP, quantidade e duração SQL, conexão, locks, bytes, tempo até conteúdo útil e comportamento de cache. Separe execução fria/quente, volume de dados, concorrência e perfil de rede.

Instrumente com custo controlado, correlação e logs sanitizados. Não registre payloads ou argumentos sensíveis. Versione cenários e comandos para comparação reproduzível. Aumente a massa progressivamente dentro da capacidade local; documente as escalas realmente testadas.

### T01–T03 — Reservas, agenda e dashboard

Elimine consultas por item nas listagens operacionais e pessoais. Pagine reservas antes de carregar relações 1:N. Busque relações e itens em lote, incluindo legado, sem substituir N+1 por uma rajada de consultas paralelas.

Transfira resumos para agregação SQL. O bootstrap temporal não deve ler o histórico nem calcular resumo completo. Preserve os valores desconhecidos e a distinção entre valor reservado e receita recebida.

Corrija ordenação e paginação pessoal, histórico misto e filtros futuros/passados. Alinhe datas civis e limites de intervalo aos fusos e índices. Mantenha DTOs, autorização e compatibilidade durante a transição.

### T04–T06 — Disponibilidade e escrita

Restrinja jornadas, escopos, exceções e ocupação ao contexto necessário. Preserve herança geral/individual e conflitos do profissional entre unidades. Faça consultas em lote e paralelismo apenas quando as leituras forem independentes.

Reduza consultas de serviços e trabalho dentro das transações. Preserve idempotência, fingerprint, request ID, versão, relógio pós-lock e atomicidade dos registros associados. Mudança de granularidade de lock exige evidência e testes específicos; não remova proteções para atingir uma meta de tempo.

Controle polling por etapa, foco, conectividade e primeiro plano. Preserve revalidação na retomada e antes de confirmar. Timeout de escrita continua exigindo reconciliação da tentativa original.

### T07–T08 — PostgreSQL e índices

Confirme a versão e o catálogo do banco descartável. Depois de estabilizar as consultas, compare planos reais com `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` em SELECTs inspecionados. Meça custo de leitura, escrita, tamanho e contenção antes de aprovar um índice.

Reutilize índices existentes. Implemente somente candidatos justificados. Mantenha schema e migrations da API coerentes. Prepare estratégia para construção concorrente e recuperação de índices inválidos quando aplicável; não coloque DDL pesado no boot.

Avalie manutenção, retenção e estatísticas sem alterar parâmetros por fórmulas genéricas. Não remova índices antigos sem verificar uso, constraints e dependências.

### T09–T10 — Financeiro e notificações

Separe resumo financeiro agregado de listas paginadas, carregadas conforme a seção aberta. Defina limites de intervalo e preserve datas de vencimento/pagamento, valores desconhecidos, status, unicidade, autorização e versão.

Implemente cursor real e ordenação composta em notificações. Faça a contagem de não lidas no SQL. Atualize feeds, itens e contadores de forma coerente.

### T11–T13 — Descoberta, Explorar e mídia

Reduza contagens desnecessárias, agregações repetidas e enriquecimento excessivo. Limite anexos por loja no SQL. Reutilize agregados existentes somente após comprovar atualização correta nas operações e na moderação.

Preserve o snapshot/cursor do Explorar. Hidrate janelas limitadas, trate candidatos removidos e expiração e retire limpeza global do caminho da requisição. Teste catálogo com mais de 50 candidatos e múltiplas páginas.

Preserve proximidade sem raio por padrão e ordenação correta. Não esconda raio máximo ou corte arbitrário para acelerar a consulta. Avalie índices textuais/espaciais conforme volume e evidência.

Use variantes leves de imagens, posters e carregamento conforme visibilidade. Meça bytes e downloads de vídeo, além do JSON. Preserve upload direto e nunca cacheie URLs assinadas ou de upload.

### T14–T17 — Cache, PWA e rede limitada

Implemente o contrato de chaves e a matriz completa de invalidação do plano, incluindo financeiro, serviços públicos, avaliações, Explorar e datas/profissionais antigos e novos após reagendamento.

Propague AbortSignal nas leituras e impeça respostas obsoletas de repopular dados de outro ator. Prefetch deve ser limitado à próxima ação provável.

Adicione persistência seletiva de queries públicas, com allowlist, hidratação sem corrida, versão/buster, maxAge, gcTime, quotas e expurgo. Não persista todo o QueryClient, mutations, tokens, financeiro ou dados pessoais de terceiros.

Implemente shell PWA offline e ciclo de atualização/rollback do service worker. Não intercepte genericamente `/api` nem cacheie auth, operações e respostas privadas. Trate múltiplas abas, troca de ator, storage cheio/corrompido e primeira visita offline.

Mantenha disponibilidade e confirmação online. Não crie fila genérica de reservas ou recebimentos offline. Hint de sessão não autoriza conteúdo privado.

Defina políticas HTTP por recurso e transporte público sem credenciais automáticas quando apropriado. Cache de servidor deve ter limites, invalidação pós-commit, proteção contra stampede e fallback. Introduza serviço externo somente com necessidade medida e autorização correspondente.

### T18–T19 — Release e acompanhamento

Prepare runner versionado de migrations, exclusão mútua, evolução compatível do schema, readiness e rollback. Só retire o gate atual de migrations do boot quando o novo mecanismo estiver provado. Teste instância nova, schema compatível e falha de migration no ambiente isolado.

Prepare flags independentes e procedimento de rollout. Meça o que for possível localmente e registre como pendentes a confirmação da infraestrutura publicada, deploy e acompanhamento de produção. Não invente essas evidências.

## 5. Validação obrigatória

Defina critérios antes de cada alteração. Execute testes pertinentes primeiro e depois os checks exigidos nos dois repositórios. A suíte backend completa só pode rodar depois de comprovar o isolamento de todas as dependências e da configuração.

Cubra, no mínimo:

- Quantidade SQL constante em páginas de 1, 20 e 100 reservas. Meta inicial: até 8 comandos para 20 reservas, incluindo autenticação e vínculo.
- Equivalência de resumos SQL, projeções financeiras, histórico legado, preços desconhecidos e relações 1:N.
- Paginação com desempate, filtros, registros removidos e alterações concorrentes segundo contrato explícito.
- Duas tentativas simultâneas para o mesmo slot, profissional em unidades diferentes, replay e timeout após commit.
- Mudança concorrente de preço, jornada, vínculo e status; virada de dia e fusos.
- Isolamento por ator/unidade/papel, revogação, logout, múltiplas abas e respostas atrasadas.
- Atualização de todos os consumidores após cada mutation da matriz de invalidação.
- Retorno à tela, rede limitada, offline, reconexão, atualização do SW e falhas de armazenamento.
- Compatibilidade entre versões do frontend, API e schema durante a transição.

Use as metas de latência e rede do PLANO.md como objetivos experimentais, não resultados presumidos. Compare antes/depois com a mesma massa, carga e rede. Registre quantidade de amostras e limites da medição. Não enfraqueça metas ou remova testes silenciosamente para obter aprovação.

Valide navegador e dispositivos disponíveis. Se Safari/PWA instalado, Android ou iPhone físico não estiverem disponíveis, prepare os cenários e registre esses aceites como pendentes. Emulação e mocks não substituem essas provas.

## 6. Critério de conclusão e entrega

Continue até concluir toda implementação autorizada e suas verificações executáveis. Não pare no primeiro fluxo otimizado, na criação das migrations ou no build.

Ao final, entregue:

1. Resumo do comportamento alterado por fluxo e por repositório.
2. Matriz T00–T19 com estado, evidência e pendências explícitas.
3. Comparação antes/depois: consultas, p50/p95/p99, bytes e tempo até conteúdo útil, somente onde medidos.
4. Índices implementados/rejeitados com justificativa e planos SQL correspondentes.
5. Políticas finais de cache, validade, invalidação, persistência e limpeza entre usuários.
6. Comandos e resultados de testes/checks/build, separando falhas novas de problemas preexistentes.
7. Migrations, flags, ordem de publicação, compatibilidade, riscos e rollback preparados para revisão.
8. Lista objetiva do que exige autorização, infraestrutura ou dispositivo externo para encerrar a validação.

Não use “implementado e validado por completo” enquanto existirem critérios obrigatórios sem prova. Distinga implementação local concluída, integração comprovada, validação em dispositivo e publicação. Solicite autorização externa somente quando a ação estiver concreta e revisável e todo trabalho independente estiver concluído.

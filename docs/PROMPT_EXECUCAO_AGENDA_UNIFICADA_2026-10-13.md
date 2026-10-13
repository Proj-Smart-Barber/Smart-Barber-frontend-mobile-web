# Prompt de execução — Agenda unificada e criação operacional

**Estado: pronto para o executor.** Plano revisado com parecer final APPROVED, escopo/abordagem/desenho principal aprovados pelo usuário. Este arquivo é um handoff futuro; implementação e testes não foram realizados nesta etapa. Ao encaminhar o prompt, o usuário solicita a execução definida abaixo.

---

Implemente por completo a entrega de Agenda unificada e criação operacional do Smart Barber, seguindo o plano aprovado. Trabalhe em português, com checkpoints e evidência real. Você é responsável pelo frontend; backend de negócio só deve ser alterado se surgir uma lacuna contratual impeditiva demonstrada. Não implementar equipe, administração, descoberta/geolocalização ou outros itens fora do escopo.

## Leia primeiro

1. AGENTS.md do checkout/frontend e do backend, preservando nomenclatura neutra.
2. D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_AGENDA_UNIFICADA_E_CRIACAO_2026-10-13.md — autoridade do escopo, desenho, decisões, grupos e aceite.
3. D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/ANALISE_AGENDA_UNIFICADA_E_COBERTURA_API_2026-10-13.md — inventário completo de endpoints/consumidores e limitações.
4. D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/REVISAO_AGENDA_UNIFICADA_2026-10-13.md — objeções/resoluções e parecer do árbitro, quando aprovado.
5. Código real das rotas de API atuais e seus DTOs. Não usar o Swagger isoladamente: há17operações canônicas existentes não documentadas. Não recriar rotas porque faltam na documentação.

Não executar brainstorming/grill-me novamente: o usuário já aprovou escopo, abordagem e desenho principal. Dúvidas técnicas rotineiras são resolvidas por código/contrato e decisões do plano; questões de produto realmente novas devem ser identificadas com impacto, sem reabrir o que foi aprovado.

## Checkpoint de base

Inspecione git status/branch/HEAD/remotes dos dois repositórios, worktrees e mudanças existentes. Não apagar, sobrescrever nem resetar trabalho alheio. A branch frontend anterior já foi mergeada: criar uma branch neutra, ex. feat/agenda-unificada-criacao, a partir da main atual em checkout/worktree apropriado. Reutilize isolamento gerenciado quando disponível.

Na auditoria, frontend main7fd864c era equivalente a28024c4 em src; API main4249abd era equivalente a1e2d880 após PR51. Esses hashes são referências históricas: revalidar antes de executar. O checkout antigo D:/smart_barber/api em2d5ebd5 não inclui a consolidação e não deve definir contratos atuais. Use main atual ou cópia comprovadamente equivalente. Nunca confundir diretório agregador com repositório Git.

Não iniciar servidor/teste que importe o app sem verificar DATABASE_URL e comportamento de migrator. Homologação deve usar PostgreSQL local temporário/exclusivo, contas fictícias verificadas e alvos checados. Nunca migrar/seedar produção ou banco de desenvolvimento compartilhado para fazer testes. Não registrar senhas/tokens/CPF/e-mail real em evidências.

## Resultado obrigatório

- Uma única Agenda de trabalho, conservando calendário/timeline e incorporando as ações úteis de Atendimentos.
- BARBERMAN consulta/agenda na própria agenda; OWNER consulta equipe e filtra profissional da unidade selecionada. Autoridade pelo vínculo ACTIVE, não accountType global.
- Cards abrem detalhe UNIT; remarcação, cancelamento, conclusão e falta usam capacidades e comandos existentes.
- Novo agendamento visível na Agenda e na home abre /new-booking já existente, para cliente cadastrado e verificado, vários serviços em uma reserva e disponibilidade real.
- Sucesso e recuperação UNIT retornam à unidade/data corretas. PERSONAL continua em Meus Agendamentos. “Fazer outro” reinicia o atendimento, sem reutilizar cliente/slot/quote anteriores.
- Atendimentos removido da navegação; URL antiga redireciona com contexto interno validado, sem segunda query ou efeito.
- Erros, paginação, dados incompletos, fuso, preço desconhecido e resultado incerto apresentados honestamente.
- Não deixar home com DELETE sem key/version ou aviso falso de que a rota de reserva não existe.

## Execução em uma sequência coerente

Execute A→B→C→D do plano na mesma branch, com checkpoints por grupo; não delegue writers concorrentes para os mesmos arquivos. Se usar workers autorizados, atribua ownership explícito e avise que não estão sozinhos e não devem reverter trabalho alheio.

### A — contexto e read model

Reproduza regressões relevantes antes da correção. Torne contexto operacional estrito; status da unidade e state do vínculo são campos diferentes. Mantenha a normalização active-only verificada da API.

Centralize leitura de reservas em features/bookings com a resposta completa/paginada, reutilizando fetchUnitBookings e BookingDto. Keys isoladas por ator/unidade/papel/profissional/data/status/página. Preserve version/instantes/timezone/capabilities/serverTime. Use total/hasNext/summary reais, sem truncar o produto na página de100itens. Deduplicar por id e informar lista parcial.

Agenda e consumers mínimos da home devem usar essa fonte. Tempo da unidade e próximo atendimento usam o relógio autoritativo; não hora do dispositivo ou reconstrução fictícia. Não declarar ausência/próximo/ocupação a partir de página incompleta. Evite ciclo de imports entre barrels agenda/bookings; extrair somente helpers puros necessários para camada compartilhada.

Bootstrap: leitura autorizada existente de unit bookings sem date/limit1 para obter serverTime; essa leitura não é agenda/resumo do dia. Sincronizar clock e só então calcular hoje/janela e buscar o dia. Falha não usa relógio local. Avanço monotônico desabilita deadlines expirados mesmo antes do polling; não autoriza capability antes negada por cálculo local.

Clock existente: lease máximo5min por tempo monotônico; logout/troca de ator/retorno de suspensão exigem nova referência. Não sincronizar o singleton no adapter antes de validar geração/contexto; resposta atrasada/fora de ordem não recalibra clock/cache atual. Sem referência válida, bloquear ações temporais até refazer leitura autorizada.

Polling/invalidação devem atualizar o conjunto paginado em geração coerente, sem itens/summary de gerações diferentes. Preservar posição quando possível; se metadados incompatíveis/falha, marcar parcial ou reiniciar página1 explicitamente. Percorrer todas as páginas offset não equivale a snapshot transacional do servidor. Não anunciar ausência/próximo/ocupação com essa precisão inventada.

### B — Agenda e ações

Conservar visual atual obsidian/crimson/ivory, calendário/timeline/resumo adaptativos. Acrescentar filtro OWNER, contexto, CTA e detalhe/ações por capabilities. Atendimentos deixa sidebar/drawer/cápsula, mas sua URL vira redirect seguro. Reutilize a contribuição do Pedro e os componentes úteis, sem manter fonte de dados paralela.

Cancelamento é lógico; não dizer exclusão física. Conclusão não representa pagamento. NO_SHOW é manual após15min. Remarcação usa PATCH/reschedule, mesmo ID e nova revisão se preço/duração mudarem. Reutilizar BookingDetailView, BookingActionConfirm, BookingRecovery e bookingOperationEngine.

Só remover BookingsView/useBookingsViewModel, modais/adapters antigos quando todos os consumidores forem migrados. Não remover o módulo bookings ou a jornada pessoal. Não introduzir outra política de prazos/engine/storage/ledger.

### C — criação UNIT

Conectar Agenda/home à rota existente. Cliente por busca exata de e-mail/CPF, mantido em memória. Serviços múltiplos, profissional conforme vínculo, disponibilidade por services/profissional/data, revisão e POST único UNIT com beneficiary/customerId, shopId e key.

Revisão CREATE/RESCHEDULE exibe cliente, unidade, profissional, data/horário da unidade, serviços, total/duração e condições efetivamente enviados. Mostrar fuso se necessário; dados essenciais desconhecidos bloqueiam confirmação. Remarcação identifica reserva atual e novo contexto.

Alterar/rebuscar cliente invalida resultado/seleção/revisão anteriores. Só resposta autorizada da busca vigente habilita confirmação; ausente/não verificado/503 ou resposta atrasada de A após buscaB não enviam POST para A. Manter só seleções ainda válidas no mesmo contexto.

Propagar erros de serviços/profissionais/availability; erro não é lista vazia. Não oferecer gaps da timeline como slots reais antes de escolher carrinho e consultar disponibilidade. Sem encaixe fora de jornada e sem cadastro de cliente novo nesta entrega.

Return context validado: UNIT vai à Agenda na unidade/data real; PERSONAL mantém lista pessoal. Aplicar tanto ao resultado normal como APPLIED na recuperação. Invalidar corretamente consultas de disponibilidade/reservas/detalhe/home/notificações.

Limpar cliente/slot/quote quando contexto muda ou começa outro atendimento. Requisição tardia não restaura dados de contexto anterior. Tentativa incerta não é apagada no reset nem recriada com outra chave: manter referência e recuperação sob o ator correto. Não mudar unidade global silenciosamente para exibir resposta antiga.

Preservar originScope PERSONAL/UNIT na referência opaca após expurgo, como pista validada de navegação, não autorização. Não conservar unidade/data/CPF/e-mail por esse motivo. Recuperar unidade/data de recurso definitivo autorizado. APPLIED redigido por perda de acesso mostra aplicação sem detalhes, não inventa resultado/destino nem oferece repetir. Legado sem origem usa resultado neutro, sem inferência pelo accountType.

### D — consumidores afetados e homologação

Corrigir action rápida da home e caminho de cancelamento legado. Usar contexto/DTO/ações comuns; remover status CONFIRMED/valores zero/duração30 fabricados desse caminho. Não redesenhar todas as homes nem implementar métricas/planos/pagamento novos. Rotular os valores fornecidos como valores das reservas no filtro, conforme contrato.

Concluir testes reais e revisar o diff inteiro, incluindo navegação, guards, cache, recuperação, tempo e PII. Mapear qualquer documentação Swagger necessária sem criar rota duplicada. Outras lacunas permanecem no backlog da análise.

## Regras de segurança e confiabilidade

- CREATE exige ator/contexto/clock/storage, slot e preço/duração revisados, com Idempotency-Key; não exige versão de reserva inexistente. Ações em reserva existente exigem também expectedVersion/capability; RESCHEDULE leva preço/duração esperados. QUOTE_CHANGED exige comparação e nova revisão, sem reenvio automático.
- Resultado UNKNOWN/timeout/503/404 não autoriza chave nova automaticamente; seguir o engine/fence existente. Não alterar shared operations arbitrariamente.
- Estado incerto informa: “Ainda não conseguimos confirmar o resultado. Verifique o resultado antes de repetir esta ação.” A ação existente chama-se Verificar resultado e usa a mesma referência, sem preparar/repetir comando. Não mostrar Fazer outro; ao voltar, avisar que a verificação continua pendente e preservar referência. Usar texto conforme criação/remarcação/cancelamento.
- Mudança de conta/logout e respostas tardias não repopulam payloads sensíveis. CPF/e-mail do lookup não vão para URL, queryKey, storage, logs ou relatório.
- Nenhum autoPOST após login, redirecionamento, reset, seleção de slot ou recuperação. Confirmação explícita do usuário.
- BARBERMAN não lê/transfere atendimento de colega; OWNER somente unidade selecionada e vínculos elegíveis. PERSONAL só beneficiário.
- Capabilities ausentes/unknown, versão ausente e relógio sem referência falham fechado. Backend permanece fonte final da autorização/concorrência.

## Verificação e evidência

Cumprir integralmente a matriz da seção7 do plano. Testes devem incluir renderização/hook/rota reais da jornada UNIT, não apenas chamadas de adapters mockadas.

Homologar: Agenda→cliente→dois serviços→slot→revisão→POST→retorno; OWNER equipe e BARBER próprio; detalhe UNIT; remarcação mantendo ID; cancelamento/conclusão/falta por prazo; mudança de contexto; >100reservas; timezoneUTC vs São Paulo; retry/response-loss/storage; links antigos; home segura; feed atualizado; preservação PERSONAL.

Rodar checks adequados e finais do repositório: suíte, TypeScript e export web. Revisão independente final por risco. Corrigir achados e repetir checks afetados quando houver mudança/falha. Não repetir suítes/builds sem motivo.

Web375/768/1024/1440, claro/escuro, teclado/leitor/44px e conteúdo sem navbar encobrindo CTA. Android/iOS exigem evidência native própria: sem dispositivo/emulador, declarar NOT TESTED e fornecer roteiro; viewport mobile no Chrome não prova native.

## Entrega e limites

Entregar relatório por grupos, commits/diff, provas PASS/PARTIAL/FAIL/NOT TESTED por ambiente, limitações e instruções de teste manual. Não promover testes locais a homologação de produção. Preparar descrição de PR com comportamento final e validação, preservando autoria/histórico.

Não fazer merge, deploy, migration/seed remoto ou force push. Push/abertura de PR somente se autorizados na tarefa de implementação. Concluir todo o código e validação já autorizados antes de solicitar alguma ação externa adicional. Não pausar por decisões técnicas rotineiras já resolvidas no plano.

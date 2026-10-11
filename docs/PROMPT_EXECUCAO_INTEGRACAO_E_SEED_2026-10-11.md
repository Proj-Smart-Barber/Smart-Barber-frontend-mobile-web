# Prompt para execução integral da integração e seedDB

Copie o texto abaixo para o agente de implementação. Ele referencia os documentos locais do mesmo workspace. Para outra máquina, disponibilize os documentos correspondentes e ajuste somente os caminhos, mantendo contratos/escopo.

```text
Execute integralmente os planos de integração do Smart Barber, incluindo a atualização do seedDB. A etapa agora é implementação e validação, não reabrir o brainstorming nem apenas produzir outro plano.

Frontend: D:\smart_barber\Smart-Barber-frontend-mobile-web
Backend: repositório Proj-Smart-Barber/api. Localize o checkout de trabalho correspondente (historicamente D:\smart_barber\api); se indisponível, prepare checkout limpo autorizado em D:. Não implemente na snapshot de evidência dentro de .tmp.

Leia antes de editar:
1. AGENTS.md de ambos os repositórios e as instruções humanas desta conversa.
2. D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\DESENHO_INTEGRACAO_E_DECISOES_2026-10-11.md
3. D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\ANALISE_INTEGRACAO_BACKEND_2026-10-11.md
4. D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\ANALISE_SEEDDB_AUTENTICACAO_2026-10-11.md
5. D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\planos\2026-10-11-integracao-autenticacao.md
6. D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\planos\2026-10-11-integracao-convites.md
7. D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\planos\2026-10-11-integracao-notificacoes.md
8. D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\planos\2026-10-11-integracao-reservas-agenda.md
9. D:\smart_barber\Smart-Barber-frontend-mobile-web\docs\planos\2026-10-11-seeddb-autenticacao.md

O desenho D01–D13 foi aprovado por revisão sequencial; D14 incorpora a exigência explícita de seed fictício verificado. Respeite decisões e contratos projetados. Use as skills de execução previstas nos planos e Context7 para APIs de bibliotecas; se a ferramenta não estiver disponível, consulte documentação oficial e informe a limitação. Não instale/reconfigure ferramentas globalmente sem necessidade/autorização.

Preparação:
- Confira versões, branch, commits, PRs e trabalho em andamento antes de editar. Referência da análise: API23fca4f; frontend main991aff2 e branch localbf65040. São referências históricas, não permissão para resetar ou ignorar atualizações posteriores.
- PR36 foi fechado sem merge. A base entregue usa JWT e refresh rotativo; não implemente o antigo contrato Better Auth.
- Preserve alterações não relacionadas, seeds/dados existentes e trabalho do Álvaro. Use branches convencionais feat/... ou fix/..., sem nomes de ferramentas/agentes. Não descarte arquivos nem sobrescreva checkout sujo.
- As atribuições antigas “backend Álvaro / frontend Wellington” indicam colaboração/revisão. Esta execução integral precisa consumir o que já foi entregue e completar os pré-requisitos planejados necessários nos dois repositórios; não use dependência ausente como motivo para concluir com mocks ou UI falsa. Trabalhe em mudanças isoladas/revisáveis e não edite componentes compartilhados com dois executores ao mesmo tempo.

Execute por dependência:
1. Base backend de identidade/sessão/links/política e adaptação frontend de DTO/HTTP, engine, storage, gates e regressão OWNER.
2. Cadastro profissional por CPF/ativação e transição canônica de convites ID/token, com UI correspondente.
3. Feed, detalhe autenticado, leitura persistida e paginação; integrar resposta por ID sem duplicar regras.
4. Reserva múltipla/idempotência/profissionais/consultas e agenda por unidade; concluir jornada real do catálogo.
5. SeedDB compatível com o schema final, contas fictícias verificadas e auditoria/smoke completo. Planejamento read-only do seed pode ser antecipado; aplicação/HTTP aguardam contratos/schema do ambiente isolado.

Requisitos obrigatórios:
- Login único automático; CLIENT/BARBER/OWNER/PLATFORM_ADMIN autoritativos; permissões por unidade. Um CPF identifica uma conta. Não deduzir papel de localStorage, alias de rota, conta sem unidade ou atributo enviado pelo cliente.
- OWNER inicia cadastro profissional. CLIENT existente evolui na mesma conta; preserve ID/senha/CPF/histórico. Barbeiro permanece BARBER sem unidade e também pode consumir serviços. Proprietário pode administrar e atender.
- Confirmação de e-mail antes do login. Sessão web com cookie protegido e API de mesma origem; native SecureStore. Prazos e revogação/concorrência conforme spec; nenhum retry cego do refresh consumido ou restauração após logout.
- Aceitar/recusar convite pelo ID no aplicativo, validando titular/prazo/estado no servidor. Manter fluxo por token do e-mail. Abrir detalhe marca leitura, sem responder convite automaticamente.
- Reserva de vários serviços em uma operação/transação, com preço/duração/fim calculados pelo backend. Idempotência e consulta de tentativa incerta antes de nova reserva. Não simular combo por vários POSTs nem preencher status/receita fictícios.
- Preservar design system, navegação responsiva e telas OWNER. Não implementar planos/pagamentos, métricas de plataforma, Google/Apple, MFA, push ou recrutamento.

SeedDB — atenção especial:
- INSERTs básicos/demo já possuem emailVerifiedAt; mantenha-os. A lacuna é a reutilização de registros antigos sem reparar NULL.
- Confirme somente contas fictícias comprovadamente gerenciadas: fixtures/namespace/logicalKey/ID/e-mail/CPF/provenance. Não confirmar todos os usuários, todos os NULLs ou todos os e-mails de um domínio. Conflito/unmanaged não é adotado automaticamente.
- Preencha somente confirmação nula, preserve timestamp existente, identidade, senha e vínculos. Nunca usar defaultNow global, flag de ambiente ou bypass no login para dispensar verificação de usuários reais.
- Antes de apply, implemente inspeção/dry-run realmente sem DDL, escrita de arquivos, gerador de credenciais, manifesto ou rollback. O caminho atual e o verificador antigo têm efeitos colaterais.
- Corrija CPFs das fixtures fictícias que falham validação, mantendo logicalKeys e mapa de placeholders antigos. Em registros existentes, só reparar demo com provenance/colisões resolvidas; nunca trocar CPF real nem apagar/recriar contas para contornar identidade.
- O seed básico apaga tabelas globalmente: só execute em banco descartável criado especificamente para esta tarefa. Não use esse comando para atualizar banco existente.
- Todos os usuários seed devem conseguir login com credenciais corretas sem SMTP real. Cobrir clientes, profissionais, proprietário e gestor fictício provisionado de forma restrita quando incluído. Mantenha caso não-seed/unverified retornando403.
- Não exponha senhas/hashes/tokens/DSNs em logs, commits ou relatório. Não envie e-mails para endereços fictícios. Fixtures negativas de testes de confirmação não devem ser verificadas indiscriminadamente.

Verificação:
- Em cada tarefa, escreva cenários úteis, execute-os, implemente e repita; exercite engine/provider/adapters reais, não testes que imitem manualmente a implementação.
- Frontend: testes Vitest pertinentes, npm run typecheck e npm run build.
- Backend: testes pertinentes, npx --no-install tsc --noEmit e Biome. API/imports/scripts podem disparar migrações: imponha env/DB de teste antes de importar app.
- Crie PostgreSQL isolado descartável para SQL/HTTP. Reproduza CPF/e-mail divergentes, refresh/logout/reset/login concorrentes, convites ID/token/revoke concorrentes, reserva simultânea entre unidades, rollback/idempotência/clock e seed idempotente/read-only.
- Verifique browser real: cookie/proxy/Origin/cache, reload, duas abas, resposta tardia e links. Valide Android/iOS quando houver dispositivo/runtime; indisponibilidade deve ficar NOT TESTED, não aprovada por mock.
- Separe testes de e-mail via fake/inbox local de entrega real. Nenhuma conta fictícia requer caixa real; teste de provedor/endereço real depende de ambiente e autorização próprios.
- Atualize checkboxes e evidências nos planos. Se uma biblioteca/contrato atual exigir adaptação, documente-a mantendo o comportamento aprovado; não invente endpoint nem esconda lacuna com fallback.

Conclua o trabalho autorizado de código e testes isolados sem parar em etapas intermediárias. Se houver impedimento real de acesso/ambiente, conclua o trabalho independente e reporte o ponto exato, suas evidências e o necessário para desbloquear.

Não aplicar seed/backfill/migrações em banco existente/remoto, não fazer reset global, push, merge, deploy ou encerrar issues automaticamente. Para aplicação em ambiente existente, prepare primeiro diff/auditoria sanitizados e solicite aprovação do alvo concreto. Esta restrição não impede implementação e testes no banco descartável.

Entrega final: resumo por domínio, alterações/contratos, evidências PASS/PARTIAL/FAIL/NOT TESTED, testes executados, limitações materiais e arquivos/branches para revisão. Não declarar concluído por completo um bloco cujo backend está ausente, que usa mocks no lugar da integração, ou cuja camada necessária não foi verificada.
```

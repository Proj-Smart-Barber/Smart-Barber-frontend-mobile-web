# Prompt — Grupo 1: base transacional e operações recuperáveis

Execute **o Grupo 1 inteiro (E1 + B2)** do Smart Barber, numa única execução com checkpoints internos e uma revisão independente ao final. Não inicie grupos2/3/5 nem reimplemente B1.

Este pedido é um prompt para o executor; não representa implementação já realizada nem revisão independente de toda a versão atualizada do plano. O APPROVED histórico antecede a consolidação mais recente das rotas. Antes de editar, confira a consistência do recorte E1+B2 com a auditoria atual e registre divergências concretas; a revisão independente da implementação deste grupo permanece obrigatória. Não solicitar nova aprovação das decisões de negócio já confirmadas.

## Base e leituras

Repositório: `D:/smart_barber/api`. B1 está no commit local `c432b53`; confirme que a base escolhida contém esse commit ou equivalente integrado. Preserve outros trabalhos e siga AGENTS.md aplicáveis. Não partir de uma main que ainda não contém a B1.

Leia integralmente:

1. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md` — Grupo1, dependências e método mais recente.
2. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/planos/2026-10-11-equipe-descoberta-backend.md` — E1.
3. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/planos/2026-10-11-reservas-backend.md` — B2 e constraints globais.
4. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md`.
5. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/REVISAO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` e gates do plano integrado.
6. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/AUDITORIA_ROTAS_SWAGGER_API_2026-10-11.md` e `INVENTARIO_ENDPOINTS_API_2026-10-11.csv` — comparação de todas as rotas registradas com Swagger local/publicado.

Na baseline auditada, GETteam/PATCHdeactivation e GEToperation-attempt/POSTclose não existem. Portanto, esses quatro endpoints do Grupo1 são necessários. Reutilizar repositories de membership/profissionais e GET /users/me/barbershops; não recriar convites/aceite/recusa/readnotification ou usuários/staffs. A rota pública professionals não pode expor os campos privados do TeamMemberDto. Confirme novamente se houve nova entrega desde c432b53 antes de gerar routes/controllers.

Endpoints deste grupo: `GET /api/barbershops/:shopId/team`, `PATCH /api/barbershops/:shopId/team/:membershipId/deactivation`, `GET /api/operation-attempts/:requestId` e `POST /api/operation-attempts/:requestId/close`. Todos exigem autenticação; team/desativação exigem OWNER com vínculo ACTIVE na unidade; consulta/close derivam actorId da sessão. Um requestId não concede acesso a uma tentativa de outro ator. Documente os quatro contratos no Swagger existente e teste a montagem na aplicação; a correção geral de Swagger/docs-json pertence ao grupo2.

O usuário autorizou agrupar tarefas relacionadas. Use um executor para o grupo inteiro; TDD/checkpoints internos continuam. Um revisor diferente verifica o diff e a evidência ao final. Não trocar executor a cada pequena tarefa nem pedir novamente aprovação das decisões já confirmadas. Você não está sozinho no codebase: preserve mudanças de terceiros.

## Ordem obrigatória dentro da execução

### 1. Conferir interfaces/ambiente da B1

Audite somente o necessário para consumir a entrega: `BookingsRepository.createWithItems/getDetails`, schema de itens/eventos/status/versão/instantes e migrations existentes. Confira evidências e rode regressões pertinentes em PostgreSQL isolado verificado. Caso encontre incompatibilidade real, corrija o mínimo para o grupo ou relate um bloqueio concreto; não reinicie a arquitetura da B1.

Nunca execute teste/servidor/migration com conexão desconhecida. O teste B1 importa db e escreve fixtures; o app integra migrator no boot. Verifique host/database/ambiente sem imprimir DATABASE_URL, senha ou token. Produção não é o alvo desta execução.

### 2. Entregar E1 estrutural e autoridade transacional

- Membership ACTIVE/INACTIVE/version e histórico por unidade; TeamMemberDto com version na listagem/detalhe/resultado.
- Listagem autorizada OWNER da unidade, paginada20/máx100, campos mínimos, ordenação estável e índices.
- Port `professional-membership-unit-of-work` com `withLocks({unitIds,professionalIds,membershipIds}, work)` e implementação PG única para as próximas tarefas.
- Protocolo: tentativa quando aplicável→unidades→profissionais globais→vínculos→reserva/evento, com IDs em ordem determinística. Reconsultar estado/versão e clock_timestamp depois dos locks.
- Desativação bloqueada por reservas futuras/em andamento e legado ocupado; owner de outra unidade negado. Não apagar usuário/histórico nem vínculos de outras lojas; não permitir transferência/remoção de ownership como atalho.
- Profissionais/identity/memberships/capabilities passam a considerar estado ACTIVE.

Não confundir status da barbearia com estado do vínculo, nem userId do profissional com membershipId. Consumidores e recursos pessoais continuam acessíveis sem vínculo profissional ativo. Preserve os aliases existentes de usuários/staffs; não criar outra identidade ou autenticação para barbeiros.

### 3. Entregar B2 usando a autoridade comum

- Ledger genérico único por `(actorId,requestId)`, hash canônico e resultados discriminados BOOKING/MEMBERSHIP/REGISTRATION/INVITATION.
- `executeOnce`, `getOwnAttempt`, `closeOwnAttempt`, GET `/api/operation-attempts/:requestId` e POST `.../close`.
- UUIDv7/timestamp corretos; replay24h/limites temporais conforme spec; resultado durável após cleanup.
- Mesmo requestId/payload retorna mesmo efeito; payload incompatível dá conflito. UNKNOWN/ausência não significam NOT_APPLIED.
- NOT_APPLIED é terminal com fence. Close depois do commit retorna APPLIED sem cancelar recurso; close antes de aplicação impede original tardia; em execução aguarda/retorna PENDING.
- Leitura/replay revalida autoridade atual: referência de operação aplicada não dá acesso ao DTO privado após perda do vínculo.
- Atomicidade de comando/registro/notificação consultável, sem usar rede/e-mail dentro do lock ou duplicar feed por replay. Demonstrar com comando controlado nesta etapa; hooks reais de reserva serão fechados no grupo2.

Defina normalização/hash em um único ponto e publique exemplos para os próximos grupos: ação, recurso, unidade, beneficiário, serviços, slot e versão participam quando aplicáveis; não armazenar o payload completo nem credenciais/CPF/e-mail como resultado recuperável. O contrato futuro de criação pessoal/operacional usará o POST /api/bookings existente, com scope PERSONAL/UNIT; não montar outro POST de reservas por unidade neste grupo. GET e close devem usar Cache-Control: no-store e respostas/erros sem dados de outro ator ou unidade.

### 4. Fechar E1 com recuperação idempotente

Ligar desativação ao mecanismo B2 com expectedVersion e recurso MEMBERSHIP; timeout/retomada consulta/close sem repetir inativação/evento. Atualizar exemplos/contratos do core para grupos2/3/5.

## Testes de aceite

- Vínculo sem blockers pode ser inativado; futuro/em andamento/legado ocupado bloqueia.
- Versão antiga e OWNER de outra unidade são rejeitados sem efeitos.
- Comando de reserva controlado versus desativação não produz vínculo inativo com nova reserva futura; locks funcionam com duas conexões/instâncias.
- Mesmo requestId concorrente grava um efeito e uma notificação por destinatário.
- Payload incompatível não aplica; rollback não confirma operação/feed.
- Resposta perdida/restart/replay e cleanup>24h recuperam resultado durável.
- Close impede original atrasada; APPLIED não é convertido em cancelamento.
- Estado de autoridade alterado não vaza dados pessoais do resultado.
- Clock/prazos são verificados após espera por locks, não no início da transação.
- B1 permanece compatível e seus snapshots/histórico não são regressados.

Conserve testes/checklists E1/B2 dos planos. O teste concorrente com POST real de B3 é dependência futura do grupo2; não afirme tê-lo homologado aqui. Não marcar E2/B3/B4/B5 como concluídos por haver estrutura compatível.

## Validação, revisão e entrega

Siga TDD: demonstrar falhas pertinentes antes da implementação, implementar e passar testes focados. Ao fim do grupo, rodar suíte do backend, TypeScript e checks aplicáveis; PostgreSQL real isolado para locks/rollback/migration/ledger. Informe falhas pré-existentes por nome e evidência, sem corrigir escopo não solicitado.

O revisor independente confere modelo/SQL/migrations/ports, ordem de locks, clock fresco, atomicidade/fence, privacidade, DTO/version/paginação, compatibilidade B1 e testes reais. Corrija achados e repita somente checks afetados antes da conclusão.

Entregue commit/base, arquivos alterados, contratos/exemplos, comandos/resultados, revisão/correções e PASS/PARTIAL/FAIL/NOT TESTED. Marque o checklist conforme evidência. Checkpoints/commit local neutros são permitidos; não incluir nomes de ferramentas/agentes em branch/commit. Não faça push, PR, merge, deploy ou migration de produção automaticamente.

Se uma dependência indispensável impedir um critério, termine o trabalho independente possível e descreva o bloqueio, o teste não executado e o requisito para retomada. Não declarar Grupo1 concluído ou liberar dependentes enquanto houver achado bloqueador ou aceite obrigatório sem evidência; revisão independente e PostgreSQL real não podem ser substituídos por uma afirmação do executor.

Pare após a revisão do Grupo1. Informe que Grupo2(API) e Grupo3(frontend) podem iniciar em paralelo, com as interfaces e limitações entregues. Não os execute neste pedido.

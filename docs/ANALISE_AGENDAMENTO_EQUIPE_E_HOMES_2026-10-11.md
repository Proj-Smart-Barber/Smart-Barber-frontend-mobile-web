# Agendamento, gestão de equipe e homes por perfil — análise atual

Data: 11/10/2026. Estado: análise concluída; decisões/premissas confirmadas e plano consolidado com revisão técnica APPROVED. Este documento registra a baseline auditada, não implementação ou homologação da nova frente.

## Base verificada

- Frontend local: branch `fix/login-sessao-producao`, commit `8e0f324`; main remoto `3df9c99`, correspondente ao merge do mesmo patch. O dossiê de recuperação do login tem alterações locais posteriores, preservadas.
- API main remoto: `a1ba2dae035b10b10fb4d3a56bb6126ae3994cae`. A auditoria comparou os hashes de 24 arquivos relevantes locais com a árvore remota; os conteúdos coincidem. Não se assumiu que o HEAD local do backend fosse o main.
- Foram lidas as cinco imagens fornecidas, o plano de reservas/agenda de 11/10 e as decisões anteriores. O Swagger das imagens não mostra todas as rotas encontradas no código.
- Inspeção somente leitura de produto/backend. Executados 19 testes existentes de bookings e seleção de serviços; todos passaram. Isso prova casos isolados, não a jornada do usuário nem idempotência no banco.
- Nenhuma reserva, convite, migração, seed, envio de mensagem ou alteração de produção foi realizada nesta frente.

## Decisões preservadas e confirmadas

| Decisão | Estado / motivo |
| --- | --- |
| Vários serviços únicos, mesma unidade, um profissional, intervalo contínuo | Já aprovada no planejamento anterior; não simular uma reserva com vários POSTs |
| Proprietário pode administrar e atender | Já aprovada; OWNER deve poder constar entre profissionais elegíveis |
| Uma conta/CPF; CLIENT pode virar BARBER e continuar consumindo serviços | Já aprovada; conversão não cria conta duplicada |
| Profissional pode ter vínculos separados em mais de uma unidade | Já aprovada; contexto e conflitos precisam considerar isso |
| Cliente deve ter conta e e-mail confirmado para reservar | Já aprovada; não pedir novamente como se fosse decisão nova |
| Agendamento rápido somente para cliente com conta | Confirmada nesta rodada; não criar usuário fictício ou atendimento sem conta |
| Barbeiro agenda atendimentos na própria agenda; proprietário escolhe profissional da unidade | Confirmada nesta rodada; distinta de reservar para si como consumidor |
| Geolocalização para encontrar unidades próximas | Requisito registrado para evolução futura; não implementado nesta frente |
| Escopo e premissas desta frente | Confirmados pelo usuário após leitura do resumo; inclui ajustes backend necessários |
| Fluxo de agendamento compartilhado, com entradas por perfil | Confirmado; reutiliza lógica de carrinho/disponibilidade/confirmação, mantendo permissões distintas |
| Cancelamento pessoal/profissional/unidade e histórico preservado | Confirmado; cliente até 2h antes/equipe até início; exige extensão das permissões e mudança da exclusão física na API |
| Reserva da equipe confirmada imediatamente, com notificação | Confirmado; cliente identificado por e-mail exato ou CPF completo |
| Desativar vínculo somente após resolver atendimentos futuros/em andamento | Confirmado; bloquear corrida entre desativação e nova reserva |
| Remarcação nesta entrega | Confirmado; operação transacional preserva horário anterior quando houver conflito |

Registro específico: [geolocalização](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/backlog/geolocalizacao-barbearias.md).

## O que está pronto e o que falta

| Frente | Situação encontrada | Lacuna concreta |
| --- | --- | --- |
| Catálogo e seleção | Seleção múltipla, soma de preço/duração e resumo existem | Botão abre somente um aviso; não escolhe profissional/data/horário nem confirma reserva |
| Engine de reserva | Existe classe com estados de envio, confirmação e incerteza | Só é instanciada nos testes; não está conectada ao catálogo ou a uma rota de checkout |
| POST múltiplo | API aceita serviceIds e calcula totais | Persiste um único item agregado, referenciando o primeiro serviço; perde a lista fiel dos IDs escolhidos |
| Disponibilidade | API recebe todos os serviços e profissional | Falta jornada de seleção; validações/fuso de criação não são iguais às da disponibilidade |
| Profissionais elegíveis | GET público retorna id/nome/role, incluindo OWNER | Adapter existe no front, sem uso na jornada; não inventar avatar/especialidades ausentes |
| Agendamento rápido | Componente “Novo Encaixe” tem aviso “em breve” e nem é montado | Não há formulário; API sempre usa usuário autenticado como cliente, sem reserva em nome de terceiro |
| Meus agendamentos | Tela e GET /me existem | Front não envia página; API entrega 20 por página; falta consulta por tentativa e acesso fácil para BARBER/OWNER como consumidores |
| Cancelamento | Profissional responsável pode cancelar | Cliente e proprietário da unidade não possuem essas permissões; API remove a reserva fisicamente, sem histórico de cancelamento |
| Agenda OWNER | Usa a mesma consulta da agenda pessoal do profissional | Não representa agenda da equipe; falta filtro por unidade, profissional e contrato de consulta da equipe |
| Gestão de equipe | API envia/lista/revoga convites por e-mail | Front trata somente convites recebidos; não há tela de equipe, nem remoção/inativação de vínculo na API |
| Cadastro profissional por CPF | Tabela prevista existe no backend | Não há rota/controller/caso de uso correspondente; convite por e-mail não conclui esse requisito anterior |
| Homes | CLIENT é tela básica; BARBER ativo usa painel operacional | Cliente não tem descoberta/CTA de reserva; painel profissional não oferece criação rápida; proprietário não tem visão comprovada da equipe |
| Descoberta de barbearias | Há leitura de uma unidade por ID | Não há catálogo público de unidades; descoberta sem geolocalização também depende de uma consulta de listagem |

## Evidências frontend

- [PublicCatalogView](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/services/ui/PublicCatalogView.tsx:187) liga o resumo ao modal, não ao engine de reserva.
- [Resumo selecionado](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/services/ui/SelectedServicesSummary.tsx:260) informa que data/horário/barbeiro virão numa próxima atualização.
- [API de bookings](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/bookings/api/bookings.api.ts:10) envia Idempotency-Key, mas isso não implica que a API o processe.
- [BookingFlowEngine](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/bookings/model/booking-draft.ts:91) confirma qualquer resposta resolvida sem validar a estrutura autoritativa; classifica todos os 409 como alteração de preço/duração e mantém tentativa somente em memória.
- [UUID da tentativa](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/bookings/lib/attempt-id.ts:17) codifica os seis bytes do timestamp com um deslocamento incorreto. Reprodução direta do código: entrada `1775900000000` (11/04/2026) resulta em timestamp decodificado `6937109375` (22/03/1970), fator 256. O teste atual confere apenas o formato textual. Também aceita ausência da hora do servidor e possui fallback Math.random, apesar das restrições do plano anterior.
- [Consulta pessoal](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/bookings/model/use-my-bookings.ts:5) usa chave genérica sem identidade/unidade e não trata paginação.
- [Home CLIENT](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/app/(client)/index.tsx:13) possui apenas agendamentos, notificações e saída.
- [Novo Encaixe](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/dashboard/ui/QuickActionsBar.tsx:26) é placeholder. [DashboardView](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/dashboard/ui/DashboardView.tsx:79) não o monta.
- [Navegação](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/shared/navigation/LeftDrawer.tsx:294) não oferece equipe, convites, notificações, reservas pessoais ou seletor de unidade.

## Problemas transversais a incluir no escopo

1. **Contexto de permissão:** `useSession().isOwner` usa tipo global ou qualquer vínculo OWNER; a capacidade operacional deve ser avaliada pelo vínculo da unidade selecionada. Chaves e filtros de agenda/dashboard precisam isolar usuário/unidade/fuso. O backend deve restringir o escopo, não depender apenas do filtro visual.
2. **Recursos da conta:** CLIENT sem unidade é redirecionado ao tentar abrir notificações/convites sob `(app)`. Isso afeta inclusive aceitar convite para CLIENT→BARBER. Esses recursos não podem exigir uma barbearia prévia.
3. **Atualização após convite:** invalidar queries `user-me`/`user-barbershops` não atualiza automaticamente a identidade do SessionEngine. Atualizar identidade/vínculos autoritativos e só então decidir o destino; não confundir refresh de dados com reinício de login.
4. **Dados exibidos:** dashboard e agenda deixam nome do profissional vazio e fabricam CONFIRMED; não rotular soma de agenda pessoal como receita de toda a unidade. O próximo atendimento também deve considerar hora atual/fuso, não só o primeiro item do dia.
5. **Reserva incerta:** o header atual não tem garantia de idempotência no backend. Reenviar após timeout pode duplicar a reserva. A UI final depende de tentativa durável, consulta exata e contrato para resposta perdida.

Evidências: [guard](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/app/_layout.tsx:53), [convites recebidos](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/invitations/model/use-invitation-response.ts:52), [isOwner](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/auth/model/use-session.tsx:204), [dashboard HTTP](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/dashboard/api/dashboard.http.ts:57), [agenda HTTP](D:/smart_barber/Smart-Barber-frontend-mobile-web/src/features/agenda/api/agenda.http.ts:51).

## Contratos de API confirmados no main

| Rota real | Uso e limites |
| --- | --- |
| POST /api/bookings | Múltiplos serviços; cliente sempre é a conta autenticada; 201 booking |
| GET /api/bookings/me?page=1 | Reservas pessoais; páginas de 20, sem metadados de paginação/filtro temporal |
| GET /api/bookings/:bookingId | Detalhe permitido ao cliente ou profissional da reserva; OWNER não ganha acesso à equipe por essa rota |
| GET /api/bookings/barberman/schedule/details?date= | Agenda do profissional autenticado, sem filtro de unidade |
| DELETE /api/bookings/:bookingId/cancel | Somente profissional responsável; exclusão física |
| GET /api/barbershops/:shopId/professionals | Lista pública mínima de profissionais elegíveis |
| GET /api/barbershops/:shopId/availability | date + serviceIds + barbermanId; slots ISO com offset |
| POST/GET /api/barbershops/:shopId/invitations | Criar/listar convites de e-mail, somente proprietário |
| DELETE /api/barbershops/:shopId/invitations/:invitationId | Revogar pendência; não desativar vínculo já aceito |
| Rotas de resposta de /api/invitations | Token e ID existem; screenshots Swagger mostram apenas parte dos contratos |

### Ajustes backend necessários para a jornada pedida

- Criar em nome de cliente cadastrado com autorização por unidade, profissional e autor da operação; consultar cliente com exposição mínima de dados. Não trocar simplesmente o usuário autenticado pelo ID enviado no corpo.
- Persistir cada serviço com seus IDs e snapshots individualizados, preservando preço/duração usados ao confirmar.
- Implementar idempotência/reconciliação, validações uniformes entre disponibilidade e confirmação, conflito atômico inclusive entre unidades e referência temporal consistente.
- Fornecer consulta de agenda da unidade/equipe e filtros autorizados; não transformar agenda pessoal em agenda de equipe no frontend.
- Definir cancelamento/alteração, estado histórico e notificações segundo as decisões de produto que ainda serão confirmadas.
- Concluir cadastro profissional iniciado pelo OWNER com CPF e ativação/conversão da conta existente, se mantido o requisito anterior.
- Definir desligamento/inativação de vínculo e destino de reservas futuras; a rota de revogar convite não atende isso.
- Listar unidades públicas para descoberta na home do cliente. Coordenadas/proximidade ficam na evolução geográfica registrada separadamente.

Arquivos backend: [create controller](D:/smart_barber/api/src/infra/http/controllers/create-booking-controller.ts:44), [create use case](D:/smart_barber/api/src/domain/application/use-cases/booking/create-booking/create-booking.ts:136), [mapper de itens](D:/smart_barber/api/src/domain/enterprise/mappers/booking-details-mapper.ts:46), [cancelamento](D:/smart_barber/api/src/domain/application/use-cases/booking/cancel-booking/cancel-booking.ts:26), [rotas de reservas](D:/smart_barber/api/src/infra/http/routes/booking.routes.ts:14), [adapter](D:/smart_barber/api/src/core/infra/adapters/express-route-adapter.ts:7), [schema](D:/smart_barber/api/src/infra/drizzle/schema.ts:251).

## Leitura das imagens e critérios para o desenho

- Home CLIENT tem grande área vazia e não apresenta ação para iniciar reserva. Isso corresponde à implementação básica encontrada.
- Homes OWNER/BARBER mostram “Barbeiro:” vazio. A causa frontend é atribuir string vazia ao nome; não completar com nome inventado.
- Os dashboards são visualmente semelhantes, apesar de tarefas e escopos diferentes. A hierarquia e as ações de cada perfil precisam ser desenhadas após confirmar o escopo.
- A imagem do proprietário sugere conteúdo sob a barra flutuante; verificar com rolagem e safe area em dimensões reais antes de afirmar falha de layout.
- Preservar os tokens existentes (vermelho/obsidian/ivory, Epilogue/Inter), os componentes compartilhados e Expo Router. A consulta de referência UI/UX retornou uma proposta genérica de landing/paleta diferente, inadequada para substituir a identidade existente.
- Critérios de referência aplicáveis: toque mínimo 44×44, foco/teclado, mensagens acessíveis de erro, resumo legível de duração/preço, loading sem salto de layout, ação de confirmar protegida contra repetição, espaço para barra inferior e tema claro/escuro. Não há alegação de conformidade WCAG medida nesta auditoria.

## Premissas não funcionais propostas, ainda a validar

- Performance: consultas paginadas, ausência de polling contínuo desnecessário e estado visual imediato para ações; metas numéricas serão definidas com ambiente/volume conhecidos.
- Escala: projetar paginação e isolamento por unidade desde o início; volume simultâneo e SLO não foram informados e não serão inventados.
- Segurança/privacidade: autorização no servidor, CPF único, dados mínimos na busca de clientes, nenhum papel inferido por ID ou segredo colocado no draft.
- Confiabilidade: confirmação só com resposta autoritativa; resposta perdida continua incerta até reconciliação; não duplicar POSTs ou alterar a chave silenciosamente.
- Manutenção: seguir features/api/model/ui e componentes/tema atuais; identificar responsabilidades frontend/backend sem tratar endpoints propostos como já publicados.

## Encaminhamento da análise

Escopo, premissas e abordagem compartilhada foram confirmados. As rodadas posteriores fecharam cancelamento (cliente2h/equipeaté início), remarcação na mesma unidade, busca e-mail/CPF, reserva da equipe confirmada/notificada, ausência manual15min, conclusão manual, homes e desligamento/retorno por convite. O registro completo D01–D16 e as interfaces propostas estão no desenho consolidado.

1. Detalhar o fluxo compartilhado já escolhido e validar as seções do desenho.
2. Confirmar identificação/busca do cliente cadastrado e necessidade de confirmação desse cliente para reserva feita pela equipe.
3. Definir permissões/prazos de cancelamento e se remarcação/conclusão do atendimento entram nesta entrega.
4. Definir gestão de equipe: dados do cadastro profissional, jornadas, desligamento e reservas futuras.
5. Definir prioridades e dados das homes, acesso do profissional ao modo consumidor e descoberta sem geolocalização.
6. Consolidar contratos backend necessários, telas/componentes, estados de erro, critérios de aceitação, dependências e sequência de execução.

Este registro documenta fatos da baseline e lacunas que geraram tarefas. [Plano consolidado](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/PLANO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md) e [revisão técnica APPROVED](D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/REVISAO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md) foram aprovados pelo usuário, com execução por tarefas e revisão independente. Planejamento encerrado; aguarda solicitação de início da implementação. Publicação/migração não são automaticamente autorizadas.

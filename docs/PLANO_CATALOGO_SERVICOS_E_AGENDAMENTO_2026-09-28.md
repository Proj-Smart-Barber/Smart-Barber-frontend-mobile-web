# Auditoria e plano: catálogo de serviços e preparação do agendamento

**Análise do código:** 28/09/2026. **Frontend:** branch `feature/api-full-integration`, commit `481d2ca68d83cfb02fa07d9bf03fdf385d86f98f`. **API:** `main`, commit `2fb8f99a2668a6f32640ef865c1d47f29738c860`. Os checkouts estavam limpos.  
**Natureza:** auditoria de código e plano validado com o solicitante; não houve implementação, migração nem prova de execução com API/banco vivos.  
**Escopo aprovado:** catálogo completo por barbearia (banco, API, gestão pelo proprietário e consulta pública), com contrato e critérios de entrega para a equipe que implementará o agendamento com vários serviços. Confirmação de reserva, pagamento e marketplace ficam para a próxima frente.

## Resposta à dúvida principal

Existe **estrutura parcial de serviço**, mas não existe **cadastro utilizável de serviços por barbearia**. O domínio `api/src/domain/enterprise/entities/service.ts` e a tabela `services` em `api/src/infra/drizzle/schema.ts` já guardam `title`, `description` opcional, `priceInCents` e `durationInMinutes`. O seed insere um “Corte de cabelo” diretamente no banco. Não há `barbershopId` na tabela, CRUD/listagem HTTP, autorização de proprietário para serviços nem tela de catálogo ou formulário no frontend. O repositório só busca por ID(s) para o cálculo de disponibilidade.

O frontend atual já consulta reservas do barbeiro por HTTP e cancela reservas próprias na branch analisada. Isso não cria novos agendamentos: a API não expõe rota de criação de reserva ou autenticação de cliente, e o botão “Novo Encaixe” apenas mostra um aviso. O texto em `docs/PLANO_INTEGRACAO_FRONTEND_API_ATUAL_2026-09-27.md` descreve uma baseline anterior para agenda/painel; usar o código e este documento como referência para esta frente.

## Inventário factual

| Camada | O que existe | Gap comprovado / efeito |
|---|---|---|
| Banco | `services(id,title,description,price_in_cents,duration_in_minutes,created_at)`; `barbershops` e `membership` separados. | Serviço é global: falta vínculo com barbearia, estado ativo, data de edição e índice por unidade. Qualquer ID válido pode ser enviado ao cálculo de duração de qualquer loja. |
| Domínio/repositório | `Service` e `ServicesRepository.findById/findManyByIds` em `api/src/domain/`; Drizzle implementa ambas as leituras. | Não há criação, edição, listagem filtrada, desativação nem verificação de unidade. |
| HTTP | `api/src/infra/http/routes/index.ts` monta funcionários, barbearias, reservas e horários; `barbershop.routes.ts` só cria/lê barbearia. | Nenhuma rota `/services` ou criação de reserva. A ausência foi conferida nos routers/factories, não inferida da UI. |
| Disponibilidade | `GET /api/barbershops/:shopId/availability` aceita `serviceIds` e soma duração dos serviços. | `CalculateAvailabilityUseCase` busca por IDs globais; a factory usa `InMemoryBookingsRepository`, e, sem `barbermanId`, não lê reservas. Slots não comprovam disponibilidade real. |
| Histórico de reservas | `bookings -> shopping_carts -> service_items -> services`; agenda detalhada lê preço/duração da tabela `services`. | O carrinho atual aponta para **um** `service_item_id`; editar preço/duração do serviço altera retrospectivamente o valor exibido em reservas antigas. Não há snapshot por item. |
| Cliente | Há tabela `customers`, mas `staff.routes.ts` autentica apenas staff. | Sem cadastro/login de cliente, identidade para criar reserva e consulta de “meus agendamentos”. |
| Frontend atual | `src/app/(app)` contém dashboard, agenda, disponibilidade e configuração da unidade. Agenda/painel têm adaptadores HTTP. | Não há rota, feature, formulário ou API de serviços; `QuickActionsBar.tsx` não agenda e compartilha um endereço fixo sem fluxo de reserva comprovado. |

**Prova importante:** `DrizzleBookingsRepository.findManyWithDetailsByBarbermanAndDate` faz join com `services` e `BookingDetailsMapper` usa os valores atuais. `ShoppingCart` e `shopping_carts` modelam um serviço por carrinho. Para múltiplos serviços, o contrato e o armazenamento de itens de reserva precisam mudar; a lista `services[]` do DTO detalhado não significa suporte real a vários itens.

## Entendimento confirmado, pressupostos e limites

- A barbearia cadastra serviços próprios como corte, degradê e barba. Cada serviço tem nome, descrição breve, preço em BRL/centavos, duração em minutos e estado ativo.
- O proprietário administra o catálogo; qualquer cliente pode consultar serviços ativos da unidade sem login de funcionário. O mesmo frontend Expo pode publicar a visão pública, desde que o guard de rotas aceite acesso anônimo.
- Uma reserva futura poderá conter vários serviços e terá tempo total e preço calculados no servidor.
- Esta entrega termina no catálogo operacional e no contrato para a próxima equipe. Não haverá confirmação de reserva nem promessa de horário disponível até seus bloqueios serem resolvidos.
- Pressupostos funcionais: título obrigatório, descrição editável (opcional, até 500 caracteres), preço positivo em centavos, duração positiva em minutos, sem exclusão física de serviço referenciado. Limites concretos de comprimento/preço/duração devem ser alinhados entre formulário, Zod e constraints SQL antes do merge.
- Pressupostos não funcionais: paginação padrão de 20 itens e limite de 100 por página; índice por unidade/estado; transações nas migrações e alterações relacionadas; autorização de OWNER no servidor; dados públicos sem CPF, telefone ou e-mail; erros legíveis e isolamento entre unidades. Metas de latência, tráfego, SLA e volume histórico ainda não foram fornecidas e precisam ser medidas/definidas antes de produção.
- Responsabilidades propostas: equipe backend responde por schema/migração/domínio/HTTP/segurança; frontend responde por telas, adaptação de rotas e integração; equipe de agendamento assume o contrato futuro e os bloqueios de reserva. Nenhum dado ou permissão é inferido a partir do cliente.

## Abordagens e decisões

| Alternativa | Vantagem | Custo/risco | Decisão |
|---|---|---|---|
| Evoluir `services` com `barbershop_id` e `is_active` | Aproveita domínio, repositório e cálculo existentes; menos tabelas para o catálogo. | Exige backfill seguro dos serviços globais legados. | **Aprovada.** |
| Manter serviços globais e adicionar relação loja-serviço | Pode compartilhar definições. | Preço, duração e edição por unidade tornam-se ambíguos; risco de vazamento entre lojas. | Descartada. |
| Criar tabela independente de ofertas por unidade | Isola catálogo novo. | Duplica mapeamento, exige migração de referências e aumenta manutenção agora. | Descartada. |

**Log de decisões:** D1 = evoluir `services` por barbearia; D2 = desativar no lugar de apagar; D3 = leitura pública apenas de serviços ativos e mutações com OWNER validado pelo backend; D4 = vários serviços por futura reserva, com snapshots de preço/duração; D5 = catálogo completo agora e confirmação de reserva na frente seguinte; D6 = nenhum slot exibido como reservável enquanto a disponibilidade não considerar reservas persistidas e concorrência.

## Contrato de dados do catálogo

### Banco e migração, sem perda de histórico

1. **Auditoria de dados antes da migração.** Em cópia controlada do banco, contar serviços sem referência; para cada serviço, levantar as barbearias dedutíveis pelo join `services -> service_items -> shopping_carts -> bookings`. Registrar IDs que aparecem em mais de uma barbearia, itens compartilhados entre carrinhos e reservas sem relação suficiente. Não presumir que o serviço do seed pertence a toda barbearia.
2. **Expandir schema:** adicionar `services.barbershop_id` inicialmente anulável com FK; `is_active boolean default true`; `updated_at`. Criar índice para (`barbershop_id`, `is_active`, `title`, `id`). Adicionar checks SQL para preço e duração positivos. Atualizar entidade e mappers. Não executar `db:push` como substituto de migração versionada em ambiente com dados.
3. **Backfill verificável:** associar automaticamente apenas registros que apontam inequivocamente para uma loja. Se um serviço foi usado por várias lojas, copiar o serviço por loja e remapear referências com transação, mantendo o serviço original enquanto houver referência. Se um `service_item` for compartilhado entre carrinhos de lojas distintas, duplicar também o item antes de remapear o carrinho. Órfãos e casos ambíguos ficam em relatório para decisão humana. Não atribuir por padrão à primeira loja nem apagar dados.
4. **Proteger histórico antes de permitir edição:** introduzir snapshots de título, preço e duração no vínculo usado pelas reservas atuais (ou estrutura equivalente aprovada pela equipe backend), backfill com os valores disponíveis, e fazer a leitura detalhada usar esses snapshots. Como não há histórico de preço anterior no schema, o backfill só recupera o valor **atual no momento da migração**; não alegar reconstrução retroativa exata. Sem essa proteção, bloquear edição de preço/duração de serviço já referenciado até a migração estar validada.
5. Após zerar e revisar todas as linhas sem dono, impor `barbershop_id NOT NULL` e validar FKs/checks. Atualizar seed para criar serviço vinculado explicitamente à unidade. Ter backup, plano de rollback e contagens antes/depois para serviço, item, carrinho e reserva.

### Modelo, segurança e API proposta

**Recurso público:** `GET /api/barbershops/:shopId/services?page=1&limit=20` lista serviços ativos de barbearia ACTIVE; `GET /api/barbershops/:shopId/services/:serviceId` lê um ativo. Resposta proposta: `{items:[{id,barbershopId,title,description,priceInCents,durationInMinutes}],page,limit,total}`. Paginação e ordenação estável por título/ID. IDs de outra unidade ou itens inativos recebem 404 na visão pública. Não incluir dados de proprietário/cliente.

**Gestão:** `GET /api/barbershops/:shopId/services?includeInactive=true` para OWNER; `POST /api/barbershops/:shopId/services`, `PATCH /api/barbershops/:shopId/services/:serviceId` e `PATCH /api/barbershops/:shopId/services/:serviceId/activation` para ativar/desativar. Resposta de item: `{service:{id,barbershopId,title,description,priceInCents,durationInMinutes,isActive,createdAt,updatedAt}}`. Payload de criação/edição usa somente `title,description,priceInCents,durationInMinutes`; `barbershopId` vem da rota e OWNER do JWT. A rota de ativação usa `{isActive:boolean}`. Não oferecer DELETE físico.

**Validação:** UUIDs válidos, corpo estrito, strings aparadas, centavos inteiros positivos, duração inteira positiva, descrição curta, paginação limitada. O backend verifica existência/status da barbearia e `ownerId` (ou membership OWNER equivalente) para **cada** leitura administrativa e mutação; a flag `isOwner` do frontend só controla apresentação. Respostas esperadas: 400 entrada inválida, 401 sem autenticação, 403 sem permissão, 404 loja/serviço fora do escopo, 409 conflito de regra, 201 criação e 200 leitura/edição. Documentar envelopes conforme convenção HTTP real da API.

**Descoberta da unidade para gestão:** o frontend hoje restaura barbearia por ID local/manual; `/staffs/me` não traz vínculos. Para acesso completo em novo aparelho, acrescentar consulta autenticada de barbearias do staff, por exemplo `GET /api/staffs/me/barbershops` com `id,name,role,status`, e seleção no frontend. Esta rota é dependência de experiência, não deve devolver dados de outros usuários.

**Adaptação da disponibilidade ao catálogo:** substituir `findManyByIds` global no cálculo por leitura que exige `barbershopId` e `isActive=true`; rejeitar IDs repetidos/inexistentes/de outra loja e garantir soma sem duplicação. Mesmo com isso, o endpoint de slots permanece **não confiável** até trocar a factory em memória por reservas persistidas, corrigir recorte de dia/fuso e validar profissional/exceções. Esses itens são bloqueios explícitos da próxima frente.

## Fluxos de frontend

### Proprietário: gestão de serviços

- Adicionar `src/features/services/` com contratos DTO, adaptador HTTP, schema de formulário, queries/mutations e UI. Adicionar rota `src/app/(app)/services.tsx` e entrada de navegação para OWNER com unidade verificada. Usar `barbershopId` da sessão/seleção; nenhuma chamada com ID seed.
- Lista com estado vazio, carregamento, erro/retry, busca local sobre a página atual ou busca de servidor explícita, preço/duração, ativo/inativo e ações criar/editar/desativar/reativar. Se houver várias páginas, não chamar busca local de “busca global”.
- Formulário: título, descrição breve, preço em BRL convertido para centavos sem `float` como fonte de verdade, duração em minutos; máscara e acessibilidade em web/native. Mostrar validação da API, desabilitar envio repetido, fazer refetch após sucesso e manter dados ao ocorrer erro.
- OWNER sem ID recuperável recebe seleção/recuperação de unidade. Uma conta vinculada manualmente a loja de terceiro não ganha gestão; o servidor rejeita a mutação.

### Cliente: catálogo público

- Criar rota pública de leitura em Expo Router, por exemplo `src/app/(public)/barbershops/[shopId]/services.tsx`, e ajustar `src/app/_layout.tsx` para permitir anônimo nessa rota sem redirecionar ao login de funcionário. Consumir somente GETs públicos; exibir nome da barbearia, catálogo ativo, descrição, duração, preço e estados vazio/erro. Não incluir formulário de reserva funcional.
- Preparar componente de seleção de múltiplos serviços e resumo de preço/duração para reuso futuro, mantendo-o fora do fluxo publicado até existir criação de reserva. Não mostrar “Agendar” como ação concluída. Se houver link compartilhável, ele aponta ao catálogo real com URL de implantação validada, identificado como “Ver serviços”; remover a promessa de agendamento do link fixo atual.
- O catálogo público não fornece identidade de cliente nem disponibilidade confiável. A equipe seguinte acrescentará autenticação/identificação de cliente e reserva sem precisar redesenhar serviço, preço ou duração.

## Contrato de handoff para a equipe de agendamento

**Pré-condições de produto:** definir se o cliente precisará de conta ou poderá reservar como convidado, política de cancelamento/reagendamento, antecedência mínima, escolha obrigatória/opcional de profissional e publicação da URL. Hoje essas decisões e rotas não existem. Até serem decididas, não publicar criação de reservas.

**Fluxo proposto:** barbearia conhecida → GET catálogo ativo → cliente escolhe IDs distintos (um ou mais) → escolhe profissional membro da unidade, data e horário → disponibilidade consultada para a soma das durações → POST de reserva com identidade do cliente → servidor revalida serviços/preço/duração/horário e responde com reserva e snapshots. Contrato candidato: `POST /api/barbershops/:shopId/bookings` com `{serviceIds:[uuid,...],barbermanId:uuid,date:"YYYY-MM-DD",startTime:"HH:mm",idempotencyKey:string}`; `customerId` vem da autenticação, não do corpo. O formato final de autenticação/retorno depende da equipe responsável e deve ser versionado antes da integração.

**Mudanças necessárias na próxima frente:** substituir a relação de um item por carrinho por itens múltiplos da reserva/carrinho, cada um com `serviceId,titleSnapshot,priceInCentsSnapshot,durationInMinutesSnapshot`; migrar consultas e agenda detalhada; gravar reserva e itens numa transação; calcular `endTime` no servidor; validar membro/profissional da mesma barbearia, loja ativa, serviços ativos e jornada/exceções; usar reservas persistidas no cálculo; garantir que duas confirmações concorrentes não ocupem o mesmo intervalo (transação/lock ou constraint equivalente), com 409 para conflito e idempotência para retry. Checar timezone e intervalos que cruzam a virada do dia. A consulta atual `findOverlapping` usa relógio UTC extraído de `Date` contra `startTime/endTime` textuais; não reutilizá-la sem prova de fuso correta.

**Handoff aceito somente quando** houver contrato OpenAPI ou exemplos versionados para listagem, disponibilidade e criação; fixtures de um e vários serviços; comportamento de preço alterado após seleção; testes de dois clientes concorrentes, serviço inativo/de outra loja, profissional inválido, cancelamento e mudança de fuso; e fluxo manual ponta a ponta contra PostgreSQL. Uma lista de slots isolada ou teste com repositório em memória não fecha esses critérios.

## Plano de trabalho em ordem de dependência

| Fase / responsável | Entregas verificáveis | Critério de aceite |
|---|---|---|
| C0 — Backend + dados | Auditoria de serviços legados e relações; relatório de órfãos/ambiguidade; estratégia de backfill aprovada. | Nenhuma atribuição de loja é presumida; contagens e caminhos de rollback registrados. |
| C1 — Backend + banco | Migração versionada expand/backfill/constraint; entidade, mappers, repository e seed atualizados; snapshots históricos antes de liberar edição. | Serviços têm dono, checks/FKs passam, reservas antigas continuam legíveis e não mudam de valor após edição. |
| C2 — Backend + API | Use cases e controllers de lista/detalhe/criar/editar/ativar; autenticação/autorização; endpoint de descoberta das unidades do staff. | OWNER da loja A não altera B; público só lê ativos; novo dispositivo recupera unidade própria. |
| C3 — Backend + disponibilidade | Consulta de serviços limitada à loja e ativos, validação de IDs/duplicatas. | Serviço de outra loja/inativo não gera slot; duração composta resulta da soma correta, sem anunciar slot reservável ainda. |
| C4 — Frontend gestão | Feature e rota de serviços, navegação, formulário, estado ativo e integração HTTP. | Criar/editar/desativar/reativar persiste após recarga em web e mobile; sem mock no fluxo real. |
| C5 — Frontend público | Rota anônima do catálogo e link real de “Ver serviços”; componentes preparados para futura seleção múltipla. | Cliente anônimo vê apenas ativos e preços/tempos reais, sem CTA de reserva enganoso. |
| C6 — Integração/QA | Testes de contrato, migração, isolamento multi-tenant e execução real; handoff de booking revisado. | Evidência separa teste unitário, banco de teste e API/web/mobile reais; bloqueios restantes têm dono. |

**Sequência:** C0 → C1 → C2/C3 → C4/C5 → C6. A equipe de agendamento pode detalhar autenticação do cliente e concorrência em paralelo, mas só integra confirmação depois de C2/C3 e dos bloqueios de disponibilidade.

## Matriz mínima de verificação

| Caso | Prova necessária |
|---|---|
| Criar e editar serviço | POST/PATCH HTTP + leitura nova do PostgreSQL; preço em centavos e duração preservados. |
| Isolamento de unidade | Tokens OWNER A/B; A não modifica nem lista inativos de B; público não vê inativos. |
| Desativação e histórico | Item sai do catálogo público e da disponibilidade; reserva antiga conserva título/preço/duração no snapshot. |
| Migração | Serviço com uma loja, sem loja e ligado a várias lojas; contagens antes/depois e nenhuma referência órfã. |
| Disponibilidade composta | Dois serviços da mesma loja somam duração; duplicata/inativo/ID de outra loja são rejeitados. |
| UX | Sem login público, gestão OWNER em web/mobile, estados de erro e recarga, formulário com moeda/tempo acessível. |
| Agendamento futuro | Duas confirmações simultâneas do mesmo profissional/horário geram no máximo uma reserva; retry idempotente; fuso local coerente. |

Executar `npm test`, `npm run check` e migração em PostgreSQL de teste no backend; `npm run typecheck`, `npm test` e `npm run build` no frontend. Esses comandos são **gates planejados**, não resultados desta auditoria. Verificação com serviço real, banco e dispositivo deve ser reportada separadamente.

## Questões remanescentes e risco de coordenação

1. Decidir autenticação/identidade do cliente e política de reserva; há tabela `customers`, mas nenhum fluxo HTTP correspondente. O contrato candidato de POST não deve virar API pública antes disso.
2. Determinar como tratar registros legados sem loja inequívoca e o limite real de volume para planejar backfill/paginação. A migração não deve forçar `NOT NULL` enquanto existirem ambiguidades.
3. Confirmar limites comerciais de preço, duração e descrição. Os pressupostos acima permitem especificar a UI, mas a equipe deve aprovar os valores antes de codificar constraints.
4. Validar snapshots históricos: dados anteriores à migração não têm preço original armazenado; só é possível congelar o valor encontrado no momento da migração.
5. Definir dono e prazo da correção da disponibilidade persistida, do tratamento de fuso e da proteção contra corrida. Sem esses itens, catálogo pronto não equivale a agendamento pronto.

## Definição de concluído desta frente

O catálogo está concluído quando cada serviço pertence a uma barbearia, o proprietário consegue gerenciá-lo via API/frontend, o cliente consegue consultar ativos sem login de staff, alterações não corrompem o histórico existente, testes de isolamento/migração passam e existe documentação versionada para a equipe de agendamento. O agendamento estará concluído somente em trabalho posterior, após autenticação do cliente, reserva com múltiplos itens, disponibilidade persistida e prevenção de conflito concorrente.

# Plano de integração do frontend com a API atual

**Data da análise:** 27/09/2026  
**Escopo de execução:** somente `D:\smart_barber\Smart-Barber-frontend-mobile-web`. O backend em `D:\smart_barber\api` é fonte de contrato, sem alterações previstas.  
**Base examinada:** frontend `0acd299a49f1b566882752643236ad4d92640e59`; backend `2fb8f99a2668a6f32640ef865c1d47f29738c860` (ambos em `main`, limpos na análise).  
**Estado:** plano concluído; nenhuma etapa de implementação foi executada.

## Objetivo e limite de entrega

Integrar ao aplicativo web/mobile as operações que a API já oferece, retirar dados fictícios dos fluxos operacionais e mostrar estados honestos quando faltarem dados ou permissões. Uma tela só será considerada integrada após resposta HTTP real, atualização persistida e validação manual do fluxo.

O plano cobre autenticação, cadastro e identificação de barbearia, jornada e exceções de horário, agenda individual, cancelamento e a parte verificável do painel. Não promete cadastro de serviços/clientes, criação de reservas, agenda da barbearia inteira, indicadores financeiros, mudança de status ou slots confiáveis: a API atual não fornece contratos suficientes para essas experiências.

## Diagnóstico que determina a ordem

1. `GET /api/staffs/me` retorna `{ staff }`, sem `role` ou `barbershop` (`api/src/infra/http/controllers/get-staff-profile-controller.ts`). O frontend exige barbearia no DTO e interpreta papel ausente como `BARBER` (`src/features/auth/api/auth.dto.ts`, `src/entities/staff/model/role.mapper.ts`). O comentário de `docs/INTEGRACAO_AVAILABILITY_BACKEND_ATUAL.md` descreve um contrato antigo; não deve orientar esta execução.
2. `POST /api/barbershops` cria a unidade e o vínculo OWNER e devolve `barbershopId`; `GET /api/barbershops/:shopId` fornece `ownerId`. A API não lista unidades nem consulta vínculos por usuário. Para conta existente, o frontend não consegue descobrir automaticamente sua unidade ou provar papel BARBERMAN.
3. Disponibilidade tem adaptador HTTP, mas usa mock por padrão e a tela chama só a leitura/gravação da jornada. Exceções e cálculo de slots têm métodos sem percurso completo de UI (`src/features/availability/api/availability.api.ts`, `src/features/availability/model/use-availability-view-model.ts`).
4. Agenda e painel usam mocks de forma incondicional (`src/features/agenda/api/agenda.api.ts`, `src/features/dashboard/api/dashboard.api.ts`). O adaptador HTTP da agenda ainda lança erro; seu cancelamento aponta para `/api/booking/:id/cancel` sem Bearer, enquanto a API exige `DELETE /api/bookings/:bookingId/cancel`.
5. A consulta de slots usa repositório de reservas em memória na factory atual (`api/src/infra/http/factories/make-calculate-availability-controller.ts`). Reservas persistidas podem não bloquear horários. Também não há endpoint HTTP para listar serviços e formar `serviceIds`. Slots não podem ser oferecidos como horários reserváveis com segurança.

## Abordagens consideradas e decisão

| Abordagem | Consequência | Decisão |
|---|---|---|
| Adaptar as telas atuais inteiras aos poucos | Preserva componentes, mas seus contratos exigem status, métricas, bloqueios e ocupação que a API não entrega; pode perpetuar dados fictícios. | Rejeitada como desenho principal. |
| Criar visões reais e enxutas para agenda/painel, reutilizando componentes compatíveis | Exibe somente campos confirmados e mantém jornada/exceções funcionais; parte da UI será simplificada. | **Escolhida.** |
| Manter alternância entre mock e HTTP em produção | Facilita demonstração, mas cria risco de uma tela parecer operacional com dados fictícios. | Mock restrito a desenvolvimento/testes explícitos; HTTP obrigatório no fluxo real. |

**Regra de produto:** se uma ação não possui endpoint, removê-la/ocultá-la do fluxo operacional ou apresentar uma indisponibilidade clara. Não inferir papel, receita, status ou disponibilidade a partir de dados incompletos.

## Contratos disponíveis e destino no frontend

| API atual | Uso planejado | Critério de cobertura |
|---|---|---|
| `POST /api/staffs` | Cadastro existente | Cadastro real, erros validados, sem afirmar que cria OWNER antes da unidade. |
| `POST /api/staffs/sessions/auth` | Login existente | Token recebido, sessão restaurada e encerrada corretamente. |
| `GET /api/staffs/me` | Identidade | DTO compatível com `{staff}`; papel/unidade permanecem desconhecidos até evidência independente. |
| `POST /api/barbershops` | Onboarding de proprietário | Enviar dados aceitos pela API; guardar o ID retornado por conta. |
| `GET /api/barbershops/:shopId` | Verificar unidade informada/guardada | Comparar `ownerId` com `staff.id` antes de liberar funções de proprietário. |
| `GET /api/barbershops/:shopId/schedules` | Jornada | Renderizar dados reais da unidade/escopo selecionado. |
| `PUT /api/barbershops/:shopId/schedules` | Salvar jornada | Enviar batch `schedules[]`, confirmar com nova leitura, inclusive batch vazio. |
| `GET /api/barbershops/:shopId/schedule-exceptions` | Listar exceções | UI com carregamento, vazio e erro reais. |
| `POST /api/barbershops/:shopId/schedule-exceptions` | Criar bloqueio/exceção | Formulário validado, atualização da lista após sucesso. |
| `PATCH /api/barbershops/:shopId/schedule-exceptions/:exceptionId` | Editar exceção | Atualização persistida e refetch. |
| `DELETE /api/barbershops/:shopId/schedule-exceptions/:exceptionId` | Excluir exceção | Confirmação, atualização e erro visível. |
| `GET /api/barbershops/:shopId/availability` | Contrato técnico, sem horários reserváveis | Testar parsing de `date`/`serviceIds`/`slots`; não ativar CTA de reserva. |
| `GET /api/bookings/barberman/schedule` | Consulta simples opcional | Adaptador/teste de contrato; a tela usa a versão detalhada para evitar duas chamadas sem benefício. |
| `GET /api/bookings/barberman/schedule/details` | Minha agenda/painel individual | Consultar por `date` com JWT; exibir somente cliente, serviços e horários fornecidos. |
| `DELETE /api/bookings/:bookingId/cancel` | Cancelar reserva própria | Bearer, rota plural, confirmação, refetch; item some da agenda porque o backend o exclui. |

## Plano de execução

### Fase 0 — Congelar o contrato e preparar verificação

- Registrar exemplos sanitizados das respostas reais de `/staffs/me`, criação/leitura de unidade, jornada, exceções e agenda detalhada em ambiente local autorizado. Usar o código da API como referência se o serviço não estiver disponível; não tratar teste de mock como prova de integração.
- Identificar contas de teste: conta nova, OWNER com ID de unidade conhecido, profissional com reserva própria e conta sem vínculo conhecido. Não colocar tokens, CPF ou dados de clientes em fixtures versionadas.
- Fixar comportamento de erros HTTP, formato de data e fuso da unidade. Comparar horários perto da virada do dia, pois a consulta de reservas usa recorte de dia UTC no repositório atual.
- **Saída:** matriz de contrato/fixtures revisada; qualquer divergência real da API atualizada no plano antes de alterar UI.

### Fase 1 — Identidade, sessão e contexto de unidade

**Arquivos-alvo:** `src/features/auth/api/*`, `src/features/auth/model/*`, `src/entities/staff/*`, `src/shared/storage/*`, `src/app/_layout.tsx`.

- Corrigir `MeResponseDto` e mapper para os campos efetivamente retornados. Modelar papel como desconhecido quando a API não o fornece; eliminar fallback automático para BARBER.
- Separar estados: sessão autenticada, contexto de unidade não resolvido e proprietário verificado. Agenda individual pode ser acessada pela identidade do token; ações de unidade exigem OWNER verificado. Uma conta sem evidência de papel não ganha permissões por conveniência.
- Guardar `barbershopId` por `staff.id` no armazenamento adequado à plataforma, sem confundi-lo com autorização. Ao restaurar/login, consultar `GET /barbershops/:id` e comparar `ownerId`. Em resposta inválida/sem acesso, limpar apenas esse contexto e oferecer recuperação; preservar o token se o problema não for autenticação.
- Ao trocar de conta/sair, invalidar queries e não reutilizar a unidade da conta anterior. Não gravar perfil sensível em chave global compartilhada. Tratar expiração local do JWT e erros temporários separadamente.
- **Aceite:** login/cadastro e restauração não inventam papel/unidade; OWNER verificado acessa funções de unidade; conta sem contexto vê um caminho claro; logout não vaza dados anteriores.

### Fase 2 — Onboarding de barbearia e recuperação de contexto

**Arquivos-alvo:** nova rota em `src/app/(app)/`, nova feature de barbearia, guarda de navegação e formulários.

- Após cadastro/login, mostrar configuração da unidade apenas quando não houver contexto verificado. Coletar nome, CNPJ de 14 dígitos, localização e fuso; enviar `POST /api/barbershops` autenticado, sem `userId` no corpo (o servidor usa o JWT).
- Ler `barbershopId` retornado, buscar a unidade e confirmar `ownerId == staff.id` antes de ativar jornada/exceções. Guardar ID por conta somente depois da confirmação.
- Oferecer vínculo de **unidade já conhecida** por UUID informado pelo usuário e verificado com GET/`ownerId`. Não alegar descoberta automática. Se o POST terminar sem resposta conclusiva, orientar recuperação pelo ID conhecido antes de tentar criar outra unidade, para evitar duplicação.
- Conta que só precisa da própria agenda segue para essa visão; funções de proprietário permanecem bloqueadas até verificação. Não presumir que cadastro de staff cria unidade.
- **Aceite:** nova unidade criada e reutilizada após reiniciar; ID de outra conta não concede acesso; recuperação funciona apenas com ID correto; falha de rede não dispara criação repetida automaticamente.

### Fase 3 — Jornada e exceções reais

**Arquivos-alvo:** `src/shared/config/env.ts`, `src/features/availability/api/*`, `src/features/availability/model/*`, `src/features/availability/ui/*`.

- Selecionar HTTP explicitamente para o fluxo real em web/mobile; manter mock apenas em ambiente de desenvolvimento/testes marcado. Remover dependência operacional de ID seed.
- Reutilizar GET/PUT da jornada com `shopId` verificado, batch único e `barbermanId` na query somente quando houver ID validado. Após escrita, recarregar resposta do servidor; manter mensagens de conflito/validação.
- Ligar na tela os métodos existentes de GET/POST/PATCH/DELETE de exceções; permitir criar, editar e remover bloqueios com confirmação e refetch. O atalho “Bloquear Horário” pode abrir este formulário para OWNER verificado.
- Desabilitar ações durante mutação, impedir duplicidade por toque repetido e não atualizar visualmente como sucesso antes de confirmação do servidor.
- **Aceite:** jornada e exceções persistem após recarregar; usuário sem unidade verificada não dispara requisições com ID vazio; erros da API aparecem sem substituir dados por mock.

### Fase 4 — Agenda individual e cancelamento

**Arquivos-alvo:** `src/features/agenda/api/*`, `src/features/agenda/model/*`, `src/features/agenda/ui/*`.

- Implementar adaptador HTTP para `GET /api/bookings/barberman/schedule/details?date=...`. O servidor identifica o profissional pelo token; não enviar `barbermanId` arbitrário. Validar envelope `{bookings}` e mapear ID, cliente, serviços, data, início/fim e preço unitário para um contrato de **reservas observadas**, sem status inventado.
- Usar a rota detalhada como fonte da agenda real. A rota simples pode ter teste de contrato/fallback técnico, sem chamada duplicada por dia. Ajustar tela para lista de reservas próprias, data selecionada, estados vazio/erro/carregamento e atualização ao retomar foco.
- Corrigir cancelamento para `httpClient.delete('/api/bookings/:id/cancel')`, com Bearer e payload de resposta `{booking}`. Exibir confirmação e invalidar agenda e painel somente após sucesso. O backend faz exclusão física; não mostrar status CANCELLED.
- Mostrar botão de cancelar apenas em reserva exibida como própria; ainda assim a autorização final vem da API. Tratar 401/403/404 e falha de rede sem remover item localmente.
- **Aceite:** reserva criada previamente no backend aparece com os detalhes reais; cancelamento autorizado a remove após refetch; usuário diferente não consegue cancelá-la; mudança de data consulta o dia correto.

### Fase 5 — Painel fiel aos dados e revisão das ações

**Arquivos-alvo:** `src/features/dashboard/api/*`, `src/features/dashboard/model/*`, `src/features/dashboard/ui/*`, `src/app/(app)/index.tsx`.

- Substituir `DashboardMockAdapter` no percurso operacional por derivação da agenda detalhada do próprio usuário. Exibir próximos atendimentos e, se útil, contagem de reservas observadas do dia com rótulo preciso.
- Remover/ocultar receita, comissão, meta, taxa de ocupação, número de concluídos e mudanças de status, pois não há endpoint/estado confiável correspondente. OWNER vê seus próprios atendimentos, não a agenda da equipe.
- Converter “Bloquear Horário” em navegação para exceções somente quando o contexto OWNER estiver confirmado. Desabilitar “Novo Encaixe” e link de agendamento público até existir contrato/URL real; não apresentar alerta ou link fixo como função concluída.
- **Aceite:** painel mostra somente dados obtidos da API; agenda e painel concordam após cancelamento; nenhuma ação visível promete operação inexistente.

### Fase 6 — Validação de ponta a ponta e fechamento

- Testes de contrato com transporte HTTP simulado para DTO de perfil sem papel/unidade, criação/verificação de unidade, GET/PUT de jornada, CRUD de exceções, agenda detalhada e cancelamento autenticado. Revisar testes que hoje legitimam a rota singular incorreta.
- Testes de estado para restauração/troca de conta, ausência de contexto, erro temporário, operações de OWNER e invalidação de queries após escrita. Manter mocks em testes isolados, fora da configuração operacional.
- Executar `npm run typecheck`, `npm test` e `npm run build`; depois testar web e dispositivo/Expo contra API local ou homologação autorizada, com registros reais. Cobrir erro de rede, 401/403/404, toque duplo, recarga, fuso e dia limítrofe.
- Conferir que nenhuma alteração ocorreu em `D:\smart_barber\api` e documentar evidência de HTTP, telas e limites conhecidos. A validação externa depende de serviço/credenciais de teste disponíveis; falha dessa etapa deve ser reportada, não convertida em “integração validada”.
- **Aceite global:** fluxos suportados funcionam sem mock em ambiente real; rotas ausentes não geram CTAs enganosos; provas de contrato, testes estáticos e execução real são reportadas separadamente.

## Dependências e limites que permanecem fora do frontend

| Lacuna da API atual | Comportamento exigido no frontend |
|---|---|
| `/staffs/me` não traz membership, papel ou unidade; não existe busca de unidades por usuário. | Papel desconhecido por padrão; onboarding novo ou ID de unidade conhecido com verificação de OWNER. Contas existentes sem ID não têm recuperação automática; papel BARBERMAN não pode ser certificado pelo perfil. |
| Não existem rotas HTTP para criar reserva, listar serviços/clientes ou divulgar URL de agendamento. | Sem “Novo Encaixe”, seleção geral de serviços ou link público fictício. |
| Agenda HTTP consulta somente reservas do profissional autenticado. | “Minha agenda” e painel individual; sem visão consolidada da barbearia para OWNER. |
| Reservas não têm status e não há atualização de status/métricas no HTTP. | Sem concluído/check-in, receita, comissão, meta ou ocupação calculados como se fossem dados oficiais. |
| Cálculo de slots recebe reservas em memória e precisa de `serviceIds` sem API de catálogo. | Manter GET de slots apenas como contrato técnico; não apresentar horários como reserváveis. |
| GET de reservas recorta o dia em UTC no repositório atual. | Validar comportamento com fuso da unidade; registrar qualquer divergência na virada de dia como bloqueio de fidelidade, sem mascará-la com ajuste especulativo. |
| ID de unidade recuperado localmente não sincroniza entre aparelhos/reinstalações. | Explicar necessidade de informar ID conhecido em novo dispositivo; não prometer restauração automática. |

## Decisões e pressupostos para a implementação

- **D1:** backend permanece intacto; divergências encontradas na execução entram como limites/impedimentos documentados.
- **D2:** a autorização visual de OWNER só decorre da comparação `ownerId` da unidade consultada com `staff.id`; a API continua sendo autoridade final para cada mutação.
- **D3:** agenda detalhada é a fonte principal das reservas; o painel deriva do mesmo dado e cache, evitando números conflitantes.
- **D4:** produção usa HTTP; mock exige seleção deliberada e marcação visível em desenvolvimento.
- **D5:** requisitos não funcionais: não guardar token em logs/fixtures; isolar cache e ID por conta; indicar erros/retry; evitar requisições duplicadas; preservar acessibilidade dos formulários e estados vazios.
- **Pendente de validação, sem bloquear o plano:** ambiente/contas de teste disponíveis, textos finais para capacidades ausentes e comportamento preciso de datas em cada fuso. Essas escolhas não autorizam preencher dados inexistentes.

## Definição de concluído

O trabalho estará concluído quando as fases 1–5 estiverem implementadas no frontend, os testes da fase 6 passarem, houver prova manual com API real para criação/verificação de unidade, jornada, exceções, agenda e cancelamento, e todos os limites da tabela acima estiverem refletidos na UI e no relatório final. Isso **não** equivale a paridade com telas hoje baseadas em mock: essa paridade depende de contratos que a API atual ainda não oferece.

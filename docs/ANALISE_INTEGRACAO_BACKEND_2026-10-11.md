# Integração das atualizações do backend ao frontend

Consulta: 11/10/2026. Horários abaixo em America/Sao_Paulo (UTC−3).

**Estado:** análise de código e GitHub concluída; mapa de integração e dependências para revisão. Este documento não é autorização de implementação nem um plano executivo aprovado. Não houve teste HTTP, execução da API, migração, mudança de banco, implementação, merge ou publicação nesta etapa.

**Consolidação posterior em 11/10:** o usuário delegou as decisões técnicas restantes à revisão multi-agent-brainstorming. O [desenho e registro de decisões](DESENHO_INTEGRACAO_E_DECISOES_2026-10-11.md) recebeu veredito **APPROVED** após revisão cética, de restrições, de experiência e arbitragem. Ele prevalece para decisões/contratos futuros; as tabelas de contrato real abaixo continuam descrevendo a baseline entregue. Aprovação de desenho não altera o backend nem comprova integração.

## 1. Resultado e versões de referência

O backend entregou autenticação com JWT e refresh token rotativo, confirmação de e-mail, recuperação de senha, convites de profissionais por e-mail, feed de notificações de convite e criação de reserva em uma chamada. Acrescentou correções de e-mail, CPF e relacionamentos do banco.

Isso permite avançar na integração, mas **não completa os contratos das issues #32–#35 nem todos os fluxos de reservas e notificações**. As principais diferenças são identidade sem tipo global, convite por e-mail em vez de cadastro profissional por CPF, feed sem ações por ID/leitura e reserva de um único serviço.

| Referência | Versão verificada |
| --- | --- |
| Backend `main` | `23fca4f859654ef2a862f2cad28df02486208e69` |
| Base anterior do backend | `5564d5bf0df757389ef6f4b508f748fe7cc0035a` |
| Comparação | 20 commits e 193 arquivos; inclui testes, migrações, snapshots, lockfile e documentação |
| Cópia isolada lida | `.tmp/api-main-20261011-23fca4f` dentro deste frontend |
| Frontend local | `fix/auth-users-endpoint-compatibility@bf650406967f67c21337567544774578b3b5df99` |
| Frontend `main` remoto | `991aff2a4cdab9253f0b597f6f8bc526a54bb4de` |

A branch local e a `main` do frontend divergiram: a comparação remota indica cinco commits à frente na `main` e um na branch local. A `main` inclui os PRs #19–#23, de PWA e acabamento visual. Antes da implementação, preparar a base atual e preservar a correção local de compatibilidade e os arquivos não commitados. A análise não trocou a branch nem sobrescreveu esse trabalho.

O último commit do Álvaro foi em **10/10 às 16h13m19s**, alterando somente `AGENTS.md`. As mudanças funcionais estão nos merges anteriores. Não atribuir todas as funcionalidades ao último commit documental.

Fontes: [histórico do backend](https://github.com/Proj-Smart-Barber/api/commits/main/), [comparação fixada do backend](https://github.com/Proj-Smart-Barber/api/compare/5564d5bf0df757389ef6f4b508f748fe7cc0035a...23fca4f859654ef2a862f2cad28df02486208e69), [inventário dos 193 arquivos](ARQUIVOS_BACKEND_2026-10-11.csv), [comparação do frontend](https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/compare/bf650406967f67c21337567544774578b3b5df99...991aff2a4cdab9253f0b597f6f8bc526a54bb4de).

### O planejamento baseado no PR #36 ficou histórico

O [PR #36](https://github.com/Proj-Smart-Barber/api/pull/36) foi fechado em 09/10 às 18h06, **sem merge**. Better Auth, token de sessão opaco único, `expiresAt` no login, papéis globais, cookies, `logout-all` e troca de senha daquele PR não estão na `main` atual.

Não reutilizar literalmente as rotas e DTOs da [análise de 09/10](ANALISE_FRONTEND_ISSUE_32_2026-10-09.md). Os [planos de 03/10](PLANO_AUTENTICACAO_2026-10-03.md) continuam como registro de requisitos e decisões do produto, sujeitos à comparação com o código entregue.

## 2. PRs, merges e validação registrada

Todos os PRs abaixo são de `AlvaroSena` e foram incorporados à `main`.

| PR | Merge em São Paulo | Entrega verificada no código | Impacto no frontend |
| --- | --- | --- | --- |
| [#37](https://github.com/Proj-Smart-Barber/api/pull/37) | 09/10 19h06 | JWT de acesso + refresh opaco; rotação; revogação de família ao reutilizar refresh | Guardar o par, renovar com exclusão de concorrência e sair pela API |
| [#38](https://github.com/Proj-Smart-Barber/api/pull/38) | 09/10 20h53 | Confirmação de e-mail e redefinição de senha; templates React Email/Resend | Novas telas, tratamento de login não verificado e retorno dos links |
| [#39](https://github.com/Proj-Smart-Barber/api/pull/39) | 10/10 13h59 | OWNER convida por e-mail; titular lista/aceita/recusa; OWNER revoga | Área de convites e aceite autenticado; fechou #34 |
| [#40](https://github.com/Proj-Smart-Barber/api/pull/40) | 10/10 15h07 | Reserva com um serviço; item, carrinho e reserva em transação | Substituir resumo demonstrativo por confirmação real; não usar endpoints intermediários removidos |
| [#41](https://github.com/Proj-Smart-Barber/api/pull/41) | 10/10 15h34 | Normalização de e-mails e consultas sem distinção de caixa | Tratar espaços/maiúsculas sem criar outra identidade |
| [#42](https://github.com/Proj-Smart-Barber/api/pull/42) | 10/10 15h34 | Feed de notificações; convite gera aviso para conta existente; link aponta ao frontend | Caixa de notificações e entrada pelo link de convite |
| [#43](https://github.com/Proj-Smart-Barber/api/pull/43) | 10/10 15h40 | Relação inversa `users.refreshTokens` no schema | Correção de infraestrutura; não acrescenta endpoint |
| [#44](https://github.com/Proj-Smart-Barber/api/pull/44) | 10/10 16h02 | CPF validado, normalizado em dígitos e consultado de forma canônica | Compatibilizar formulário e erros; não recadastrar pessoa existente |

**Evidência:** os arquivos e rotas foram inspecionados. O PR #44 declara 188 testes passando, TypeScript e Biome sem erros; isso é validação relatada pelo autor. Os checks remotos consultados exibem Vercel e Vercel Preview Comments com sucesso, não uma execução independente da suíte por esta análise. Nos PRs #37–#44 não foram encontrados reviews formais nem comentários humanos; os comentários observados são do bot de deployment.

O PR #38 deixa rate limiting para depois. O PR #37 registra a rotação sequencial. Nenhuma declaração dessas substitui teste real de concorrência, segurança ou integração web/mobile.

### Issues e quadro da organização

| Issue | GitHub / quadro consultado | Comparação com a entrega |
| --- | --- | --- |
| [#32 — Login Unificado e Gestão de Sessões](https://github.com/Proj-Smart-Barber/api/issues/32) | OPEN / Canceladas | Sessões e recuperação avançaram. Tipo global, cookie web, prazo do gestor, saída geral, troca de senha e proteção de manutenção continuam divergentes/ausentes |
| [#33 — Autenticação do Cliente](https://github.com/Proj-Smart-Barber/api/issues/33) | OPEN / Backlog | Cadastro comum, confirmação e login disponíveis; área pessoal e contratos de reservas pessoais incompletos |
| [#34 — Cadastro e Autenticação do Barbeiro](https://github.com/Proj-Smart-Barber/api/issues/34) | CLOSED / Done | Fechada pelo PR #39; convite por e-mail não cobre literalmente cadastro por CPF, tipo BARBER permanente, preview/reenvio e remoção de vínculo previstos no corpo |
| [#35 — Autenticação do Administrador](https://github.com/Proj-Smart-Barber/api/issues/35) | OPEN / Backlog | Identidade/provisionamento e autenticação específica do gestor não entregues |
| [#30 — Gestão de Atendimentos na Agenda](https://github.com/Proj-Smart-Barber/api/issues/30) | OPEN / In progress | Agenda e cancelamento do profissional existem. Checkbox de edição está marcado, mas não foi encontrado endpoint de edição na versão examinada |

Essas issues não apresentam comentários na consulta. A situação do quadro não identifica quem mudou o status nem seu motivo. Fechamento da #34 não demonstra frontend implementado nem todos os critérios atendidos. Não houve alteração de issues ou do quadro nesta análise.

## 3. Contrato HTTP realmente disponível

Rotas canônicas abaixo. `/api/staffs` é alias de `/api/users`; não significa um tipo de usuário diferente. `Bearer` significa JWT de acesso no header `Authorization`. Datas de entidades serializadas no JSON devem ser interpretadas como strings, com nulabilidade preservada.

### 3.1 Conta, sessão, confirmação e recuperação

| Método e caminho | Entrada / autenticação | Sucesso |
| --- | --- | --- |
| POST `/api/users/` | Público; `{name,email,password,cpf}` | 201 `{userId}`; sem sessão e sem envio automático de confirmação |
| POST `/api/users/sessions/auth` | Público; `{email,password}` | 201 `{access_token,refresh_token}` |
| POST `/api/users/sessions/refresh` | `{refresh_token}` | 200 `{access_token,refresh_token}` novos |
| POST `/api/users/sessions/sign-out` | `{refresh_token}` | 204 sem corpo; revoga o refresh informado |
| POST `/api/users/verification-email` | Público; `{email}` | 200 `{sentTo}`; genérico, inclusive conta desconhecida/já verificada |
| GET `/api/users/verification-email/confirm?token=...` | Público; token na query | 200 `{verified:true,alreadyVerified,userId,email,emailVerifiedAt}` |
| POST `/api/users/password-recovery` | Público; `{email}` | 200 `{sentTo}` genérico |
| POST `/api/users/password-recovery/reset` | Público; `{token,newPassword}` | 200 `{userId,email,passwordUpdatedAt}`; sem login automático |
| GET `/api/users/me` | Bearer | 200 `{user,staff:user}` |
| GET `/api/users/me/barbershops` | Bearer | 200 `{barbershops:[{id,name,role,status,timezone}]}` |

Perfil `user`: `{id,name,email,avatarUrl?,phoneNumber?}`. **Não retorna role global, CPF, emailVerifiedAt, accountType, permissions ou status da conta.** A role da lista de unidades é `OWNER` ou `BARBERMAN`; `status` é ACTIVE/INACTIVE da barbearia, não do vínculo.

Erros relevantes:

- Cadastro: 400 CPF inválido/schema, 409 CPF ou e-mail em uso.
- Login: 401 credenciais inválidas; 403 `{error:"email_not_verified"}`. O bloqueio atual ocorre antes do login, não apenas antes de reservar.
- Refresh: 401 token inexistente, expirado, revogado ou reutilizado.
- Confirmar/reset: 400 link inválido/expirado/usado; reset exige pelo menos oito caracteres. O cadastro não impõe esse mesmo mínimo no servidor.
- Middleware: 401 com `{error:"token_expired"|"invalid_token"}` ou `{message:...}`. Controllers geralmente usam `{error:string}`. Não depender de um único formato de erro.
- Envio de e-mail pode retornar 500. Resposta genérica 200 não prova recebimento do e-mail.

Access JWT tem `sub` e expiração; refresh é opaco, armazenado por hash no servidor. Defaults do código: acesso 15 minutos, refresh 30 dias, verificação 24 horas, recuperação uma hora, convite sete dias. São defaults, não comprovação da configuração em produção. Login/refresh não retornam `expiresAt` do refresh; não exibir vencimento exato que a API não informou.

Não há Cookie/Set-Cookie, SDK Better Auth, `/api/auth`, `sessions/logout`, `logout-all` ou `PATCH /me/password` na entrega atual. `cors()` atual não implementa a estratégia de cookie autenticado discutida anteriormente.

### 3.2 Convites

| Método e caminho | Entrada / regra | Sucesso |
| --- | --- | --- |
| POST `/api/barbershops/:shopId/invitations` | Bearer OWNER da unidade ativa; `{email}` | 201 `{invitationId,invitedEmail,expiresAt}` |
| GET `/api/barbershops/:shopId/invitations` | Bearer OWNER | 200 `{invitations:[{id,email,status,role,expiresAt,respondedAt,createdAt}]}` |
| DELETE `/api/barbershops/:shopId/invitations/:invitationId` | Bearer OWNER; convite PENDING | 200 `{revoked:true,invitationId,status}` |
| GET `/api/invitations` | Bearer titular; busca por e-mail da conta | 200 `{invitations:[{id,barbershopId,barbershopName,status,role,expiresAt,createdAt}]}` |
| POST `/api/invitations/accept` | Bearer titular; `{token}` | 200 `{accepted:true,invitationId,barbershopId,barbermanId,status}` |
| POST `/api/invitations/decline` | Bearer titular; `{token}` | 200 `{declined:true,invitationId,status}` |

Estados persistidos: PENDING, ACCEPTED, DECLINED e REVOKED. Expiração é derivada de `expiresAt`, não um estado EXPIRED persistido. A lista do titular seleciona PENDING, inclusive os já expirados; a tela precisa distinguir esses casos. Sem paginação, preview por token, reenvio ou remoção de membro publicados.

Aceite exige que o e-mail autenticado corresponda ao convidado, token válido e nenhum vínculo existente. Cria membership BARBERMAN e marca ACCEPTED na mesma transação. Não cria conta, não consulta CPF como identificador desse fluxo e não altera um tipo global de usuário. Erros de domínio, inclusive identidade incorreta, normalmente retornam 400 com mensagem, não códigos separados 403/409/410.

**Diferença com o produto aprovado:** OWNER inicia o convite, mas informa apenas e-mail. Um convidado sem conta precisa cadastrar a própria conta comum, confirmar e-mail e entrar para aceitar. Um cliente existente aceita na mesma conta; isso preserva sua identidade, mas não representa a conversão global CLIENT→BARBER exigida anteriormente. Esse desvio não deve ser escondido no frontend.

### 3.3 Notificações

GET `/api/notifications`, Bearer → 200:

```ts
{
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    referenceType: string | null;
    referenceId: string | null;
    readAt: string | null;
    scheduledAt: string;
    createdAt: string | null;
  }>;
}
```

Ordenação por criação decrescente; sem paginação, limite, filtros ou contador remoto de não lidas. O produtor funcional encontrado é INVITATION_RECEIVED com referência INVITATION, somente quando a conta já existe na criação do convite. Uma conta criada posteriormente consegue listar seus convites por e-mail, mas não recebe retroativamente o registro no feed.

Não há endpoint para marcar como lida, nem ações de convite por ID. Feed/listas trazem o ID do convite; aceitar/recusar requer o token que veio **apenas no e-mail**. A notificação sozinha não permite concluir a ação. Para atender à decisão aprovada de aceitar/recusar dentro do aplicativo, contratar ações autenticadas por ID; não expor token ou hash no feed e não exigir retorno ao e-mail para essa jornada.

Aceite, recusa e revogação não atualizam o registro do feed. A tela deve consultar o estado atual do convite e não tratar uma notificação antiga como prova de convite ativo. Não foi encontrado produtor real de confirmação/cancelamento de reserva, push, WebSocket/SSE ou cadastro de dispositivo. Registros demonstrativos não são prova de evento implementado.

### 3.4 Reservas, disponibilidade e agenda

| Método e caminho | Entrada | Sucesso / limite |
| --- | --- | --- |
| POST `/api/bookings` | Bearer; `{serviceId,barbermanId,date:"YYYY-MM-DD",startTime:"HH:mm",endTime:"HH:mm"}` | 201 `{booking:{id,barbershopId,barbermanId,shoppingCartId,date,startTime,endTime,createdAt}}`; somente um serviço |
| GET `/api/barbershops/:shopId/availability` | Público; `date`, `serviceIds` separados por vírgula, `barbermanId` opcional | 200 `{slots:[{start,end}]}`; ISO com offset da unidade |
| GET `/api/bookings/barberman/schedule?date=...` | Bearer do profissional | Agenda do próprio usuário, sem filtro publicado por unidade |
| GET `/api/bookings/barberman/schedule/details?date=...` | Bearer do profissional | `{bookings:[...]}` com customer e snapshots dos serviços |
| DELETE `/api/bookings/:bookingId/cancel` | Bearer do profissional responsável | 200 com booking; apaga a reserva |

Reserva deriva a unidade do serviço e o consumidor do token. Item de serviço com snapshots, carrinho e reserva são criados em uma transação. 404 serviço ausente/inativo, 409 conflito encontrado, 400 outras validações e 401 autenticação. Não há status, pagamento ou confirmação de envio de notificação no DTO de criação.

Disponibilidade aceita vários serviços e soma suas durações, mas criação aceita somente `serviceId`. **Não executar várias reservas para simular um combo:** isso criaria operações e falhas parciais independentes. Sem `barbermanId`, a disponibilidade genérica não considera reservas de um profissional; um horário genérico não é garantia de slot livre para reservar.

Não foram encontradas rotas públicas para listar profissionais da unidade nem rotas HTTP para o cliente consultar/cancelar as próprias reservas. O use case `FetchClientBookings` existe, mas não está exposto no router e consulta por carrinho, não uma agenda pessoal completa. O cancelamento existente não permite cliente cancelar sua reserva nem OWNER cancelar atendimento de outro profissional. Edição de reserva não está publicada.

Cancelamento apaga reserva e notificações referenciadas, mantém item/carrinho e não produz evento de cancelamento. Portanto, não presumir histórico CANCELLED ou notificação enviada.

`date` serializado como meia-noite UTC representa a data civil; `startTime/endTime` são strings locais. No frontend, usar o fuso da unidade e o slot escolhido, evitando deslocar o dia pelo fuso do aparelho.

## 4. Links e jornadas que precisam ser integradas

### Cadastro e acesso comum

Decisão confirmada pelo usuário em 11/10: exigir confirmação de e-mail antes do login, mantendo o comportamento atual do backend. Isso torna o requisito anterior de confirmação antes de agendar mais restritivo na entrada da conta. Catálogo público continua acessível sem login; confirmação não inicia sessão automaticamente.

1. Cadastro retorna `userId`. Apresentar a conta criada e solicitar confirmação por chamada separada; não tentar login automático como se a conta já estivesse verificada.
2. Login 403 direciona para confirmação/reenvio, preservando o e-mail e o destino legítimo anterior.
3. Depois da confirmação, novo login, obtenção do par de tokens, perfil e vínculos.
4. Conta sem vínculo não deve cair automaticamente no cadastro de barbearia. Preservar a intenção explícita de cadastro OWNER sem transformar todo cliente em proprietário.
5. Perfil/vínculos são autoridade para identidade e contexto que estiverem de fato publicados. ID salvo, CPF, alias `/staffs` e token decodificado não concedem permissões.

### Links atuais

| Finalidade | URL que o código monta | Consequência |
| --- | --- | --- |
| Confirmação | `APP_URL/api/users/verification-email/confirm?token=...` | Abre a API, confirma por GET e retorna JSON; não entrega a tela de confirmação do aplicativo |
| Recuperação | `(FRONTEND_URL ou APP_URL)/reset-password?token=...` | Precisa de rota frontend acessível sem sessão e reload/deep link válido |
| Convite | raiz de `(FRONTEND_URL ou APP_URL)` com `?token=...` | Bootstrap precisa preservar o convite; ainda não há caminho dedicado nem discriminador de finalidade |

Não há geração de `smartbarber://` nesses serviços. O app já tem esse scheme, mas retorno nativo e links universais ainda precisam de contrato/configuração e teste no dispositivo. Quando FRONTEND_URL não está configurada, recuperação e convite podem apontar para o host da API. Não inferir configuração real a partir do fallback.

Escolher com Álvaro uma URL de verificação que termine em UI e retorno permitido. Não copiar do PR #36 um POST de confirmação que não existe. GET atual altera estado; avaliar comportamento de scanners de e-mail e reabertura na homologação. Já verificado retorna sucesso antes da checagem de token expirado/usado naquele fluxo.

### Convite e identidade

OWNER envia convite → titular recebe e-mail → abre aplicativo → usa conta existente ou cria conta comum → confirma e-mail, se necessário → entra → aceita/recusa explicitamente → frontend reconsulta vínculos, invalida consultas de unidade e permite escolher contexto autorizado.

Token pendente não deve aparecer em logs, analytics ou mensagens de erro. Preservar continuidade durante login, limpar após resolução/saída e não aceitar automaticamente ao abrir um link. Quando usuário errado estiver conectado, orientar troca de conta sem afirmar que o convite pertence a ele.

Falta preview para exibir destinatário/unidade com segurança antes de aceitar; a lista autenticada pode fornecer contexto ao titular, mas não resolve todas as entradas via link. Necessidade de ação diretamente no feed deve virar dependência explícita do backend.

Decisão confirmada pelo usuário em 11/10: titular pode aceitar ou recusar diretamente pela notificação no aplicativo. Fluxo: abrir aviso → consultar estado atual e unidade do convite → escolher aceitar/recusar → executar ação autenticada → atualizar convite, feed e vínculos. Abrir/ler o aviso não aceita o convite automaticamente. Sem sessão, solicitar login e retornar ao contexto pendente.

### Sessão e falhas

Frontend precisa renovar sem enviar refresh token como Bearer, substituir o par rotacionado, limpar sessão/cache na saída e impedir que resposta tardia restaure uma conta já encerrada. Renovação precisa ser única por sessão; no navegador isso inclui coordenação entre abas. Não renovar repetidamente o mesmo token após timeout sem estratégia aprovada.

Atualmente sign-out revoga apenas o refresh informado; o access JWT continua válido até expirar. Reset revoga refresh tokens da conta e invalida links de recuperação antigos, mas não invalida imediatamente JWTs já emitidos. A UI não pode prometer saída instantânea de todos os dispositivos.

SecureStore serve ao nativo. Para web, o requisito anterior era cookie protegido e persistência após fechar o navegador; a API atual recebe refresh no JSON e não entrega cookie. Um proxy/BFF ou suporte a cookies no backend exigem desenho e responsabilidade definidos. Guardar refresh em armazenamento JavaScript muda a proteção aprovada e não deve ser decidido silenciosamente.

## 5. Lacunas e validação necessária

| Prioridade | Evidência estática / diferença | Encaminhamento |
| --- | --- | --- |
| P0 | Perfil não tem CLIENT/BARBER/OWNER/PLATFORM_ADMIN; membership não resolve BARBER sem unidade nem gestor | Álvaro: contrato autoritativo de tipo global e estados; Wellington: gates e destinos após contrato |
| P0 | Convite não cadastra por CPF nem promove tipo global; remoção do último vínculo não publicada | Comparar com #34 e manter as decisões de conta única/tipo profissional permanente; formalizar ajuste de backend |
| P0 | Cookie web e duração curta do gestor não entregues; rotação sem transação/CAS | Definir transporte; reproduzir concorrência e perda de resposta em HTTP/PG; não anunciar segurança inexistente |
| P0 | Rotas de migração/seed permanecem montadas sem autenticação em `src/app.ts` | Álvaro: proteger/remover antes de liberar acesso real; não chamar essas rotas para testar esta análise |
| P1 | Confirmação abre JSON da API; links nativos sem contrato | Álvaro e Wellington: destino, telas e retorno seguro; verificar e-mail real em ambiente isolado |
| P1 | Novos cadastros não enviam confirmação automaticamente; contas antigas ganham coluna nullable de verificação | Planejar chamada de envio e recuperação de acesso de usuários antigos; não recadastrar contas |
| P1 | Feed sem leitura, ação por ID, paginação ou novos eventos de reserva | Separar lista entregue de experiência completa; contratar endpoints/eventos que forem aprovados |
| P1 | Reserva recebe um serviço; catálogo e disponibilidade aceitam vários | Usuário confirmou vários serviços em 11/10: estender contrato e persistência de reserva múltipla |
| P1 | Reserva não valida vínculo profissional, unidade ativa, jornada/exceção, duração derivada ou passado | Testes diretos isolados desses casos antes de pedir correção conclusiva; UI não substitui validação do servidor |
| P1 | Checagem de sobreposição antes da transação, sem trava/exclusão; conflito escopado por profissional+unidade | Testar duas reservas concorrentes e profissional em unidades diferentes; garantir exclusividade no backend |
| P1 | Seleção de profissional e histórico pessoal sem endpoints publicados | Álvaro: listar profissionais elegíveis e consultas pessoais antes de concluir reserva do consumidor |
| P2 | Troca autenticada de senha, logout-all e gestão de vínculo ausentes | Tratar como pendências da especificação original, não fabricar rotas no frontend |

Os riscos de concorrência/validação acima foram identificados no código; **não houve reprodução HTTP neste trabalho**. Se um teste direto provar que o comportamento está protegido por outra camada, remover o pedido de correção correspondente. Falhas efetivamente reproduzidas devem gerar cenário e evidência sanitizada para Álvaro.

CPF novo agora é validado e canônico. Não foi encontrada migração que normalize todos os CPFs antigos já armazenados com pontuação: dados legados e colisões precisam de inventário isolado antes de qualquer saneamento. Normalizar parâmetros de busca não é evidência de saneamento de todas as linhas existentes.

### Banco e implantação

Cinco migrações novas: refresh_tokens, email_verifications + users.email_verified_at, password_recovery_tokens, invitations e alteração de notifications para destinatário/referência genéricos. A última migração faz backfill por booking/cart e depois exige user_id NOT NULL; verificar linhas órfãs ou dados antigos incompatíveis em cópia isolada antes de executar em ambiente real.

Inicialização da API dispara migrações. Não importar/rodar `src/app.ts` apontado a banco real apenas para testar rotas. Resend/EMAIL_FROM e URLs são configuração do backend; nenhuma credencial de envio deve ir para o frontend. A integração depende de migrações aplicadas e URL/versionamento homologados; merge e preview Vercel não demonstram esse estado do banco.

## 6. Mapa completo de trabalho frontend, com dependências

Esta sequência organiza a integração; os contratos ausentes e decisões abertas abaixo impedem tratá-la como plano executivo final. Responsabilidade frontend: Wellington. Backend/contratos e e-mail: Álvaro, com exceção do aceite/recusa de convite por ID, que o usuário atribuiu à nossa execução em 11/10, incluindo backend e integração frontend. Não incluir tudo indiscriminadamente na issue #32.

### Diagnóstico do frontend inspecionado

| Comportamento atual | Efeito com a API nova | Trabalho necessário |
| --- | --- | --- |
| Login DTO e storage guardam apenas access_token | Refresh recebido é descartado; sessão termina quando o acesso expira | Consumir/persistir o par conforme transporte aprovado |
| Restore remove JWT expirado antes de consultar a API | Não aproveita refresh válido | Renovar antes de encerrar a sessão |
| Cadastro executa auto-login imediatamente | Conta é criada, mas login recebe 403 por e-mail não confirmado | Separar conta criada, envio e confirmação; evitar repetir cadastro |
| RegisterResponseDto espera staffId | Contrato novo retorna userId | Corrigir adapter e fixtures de contrato |
| Storage web usa sessionStorage; nativo suprime erro de gravação | Persistência após fechar navegador não é garantida; falha de storage pode aparentar sucesso | Transporte web definido e erros explícitos no nativo |
| Descoberta de unidade usa ID salvo/leitura pública e silencia falhas | Pode confundir falta de vínculo com falha remota | Contexto validado por memberships; estado de erro distinto |
| Dashboard/agenda tratam não-OWNER como BARBER e usam default-staff-id | Cliente/identidade incompleta podem disparar queries profissionais | Gates antes das queries e chaves por identidade/unidade |
| Resumo do catálogo encerra em revisão demonstrativa | Nenhum booking real é criado | Profissional/slot/confirmar e POST com resultado real |
| Não há features de invitations/notifications | Novas rotas não são consumidas | Features separadas, navegação e estados de UI |

Esses pontos foram lidos no checkout local. O delta com a main remota também foi consultado; reconciliar ambos antes de escolher os arquivos finais de execução. Testes existentes de sessão fazem parte de seu trabalho manualmente por mocks/storage; ampliar a cobertura para exercitar o provider/engine que será realmente usado.

### Bloco A — Base e contrato comum (#32)

Arquivos existentes: `src/features/auth/api/auth.api.ts`, `auth.dto.ts`, `auth.mapper.ts`; `src/shared/api/http-client.ts`, `api-errors.ts`; testes de auth/HTTP.

Entregável: adapter canônico `/api/users`, DTO do par de tokens e `userId`, resposta 204 sem tentativa de ler JSON, normalização das variantes de erro e endpoints reais de confirmação/recovery. Alias legado não será usado para inferir papel. Reutilizar AuthApi e camadas existentes, sem introduzir SDK Better Auth.

Aceite: request/response reais conferidos; 401, 403 não verificado, 409 duplicidade, 500 de envio e resposta vazia diferenciados; nenhuma rota antiga do PR #36 chamada. Regressão cadastro OWNER preservada.

### Bloco B — Ciclo de sessão e contexto (#32)

Arquivos existentes: `src/features/auth/model/use-session.tsx`, `auth-state.ts`, `src/features/auth/lib/jwt-helper.ts`, `src/shared/storage/token-storage.*`, `barbershop-storage.ts`; layouts `src/app/_layout.tsx`, `(auth)/_layout.tsx`, `(app)/_layout.tsx`, `index.tsx`; roles em `src/entities/staff/model`.

Entregável a desenhar: engine central testável atrás do provider, persistência do par conforme transporte aprovado, refresh único, restauração remota, limpeza/invalidação por usuário e unidade, proteção contra conclusão tardia após logout/troca de conta. Decodificação do JWT serve como sinal de expiração, nunca autorização.

Dependências: estratégia web e contrato de tipo global. Até existir identidade autoritativa, não declarar login de quatro tipos completo nem inventar admin/cliente/barbeiro por ausência de barbearia.

Aceite: reiniciar app/navegador conforme persistência aprovada; acesso expirado com refresh válido recupera sessão; refresh inválido encerra; falha temporária não vira credencial inválida; duas chamadas/abas não competem pelo mesmo token; resposta tardia não repõe cache de outro usuário.

### Bloco C — Confirmação e recuperação (#32 / entrada #33)

Reutilizar `LoginForm`, `RegisterForm`, schemas/view-models de auth e `AuthLayout`. Novas responsabilidades: solicitação/reenvio de confirmação, resultado de confirmação, pedido de recuperação e reset em rota pública. Paths definitivos dependem do alinhamento dos links.

Entregável: cadastro → confirmação → login, login 403 recuperável, reset de senha sem login implícito e continuidade do destino permitido. Não resetar formulário/carrinho desnecessariamente; não reaplicar cadastro porque o envio de e-mail falhou após conta criada.

Regra aprovada em 11/10: o login exige e-mail confirmado para todos os tipos de conta. Cadastro OWNER mantém sua intenção e segue ao cadastro da barbearia após confirmação e login; o titular de convite mantém o convite pendente até entrar. Acesso de contas antigas não verificadas deve oferecer confirmação/reenvio, preservando conta, senha e histórico.

Aceite: e-mail desconhecido tem resposta genérica; conta criada permanece criada após falha de envio; link expirado/usado orienta nova solicitação; senha não fica em URL/storage/log; reload e retorno web/nativo funcionam. Política de senha uniforme depende de backend e decisão da equipe.

### Bloco D — Convites OWNER e titular (#34)

Nova feature por domínio, seguindo padrões `api`, `model`, `ui`, `tests` existentes; adicionar rotas Expo para lista OWNER e lista/aceite do titular. Não misturar a implementação inteira no provider de sessão.

Entregável: OWNER cria/lista/revoga convite; titular lista convites, abre link, entra com conta correta e aceita/recusa; reconsulta memberships; seleciona unidade ativa; cache isolado por userId/shopId. OWNER não define senha de conta já existente.

Dependências: decisão já aprovada de cadastro profissional por CPF/tipo BARBER deve ser representada no backend ou formalmente revisada pelo usuário. Preview, reenvio, remoção de membro e ação por ID só podem ser implementados quando publicados.

Aceite: cliente existente mantém ID e histórico; usuário errado não aceita; convite expirado/revogado não concede acesso; múltiplas unidades não misturam recursos; status não é deduzido de notificação antiga. Não declarar manutenção de BARBER sem vínculo se o contrato não possui esse tipo.

### Bloco E — Central de notificações

Nova feature de notifications com adapter GET, query por userId, view-model de estados e UI integrada à navegação. Reutilizar estados loading/erro/vazio e design system; consultar ao abrir/focar e invalidar após ações. Polling frequente e push não fazem parte do contrato entregue.

Entregável disponível: lista real e navegação para contexto de convite. Entregável completo, dependente do backend: marcar leitura persistida, aceitar/recusar por referência autenticada, estado atualizado e eventos de reservas que forem aprovados.

Regra de leitura aprovada pelo usuário em 11/10: marcar a notificação como lida quando seus detalhes forem abertos. Exibir o aviso na lista, carregar o feed ou mostrar uma prévia não marca leitura. A leitura pertence à conta destinatária e deve ser persistida no servidor; abrir detalhes não aceita nem recusa convite.

Contrato de leitura a especificar com o backend: ação autenticada por notificationId que devolva id e readAt definido pelo servidor. Repetir a ação preserva a primeira data de leitura, inclusive sob concorrência. Só o destinatário pode alterar o aviso. O frontend atualiza readAt/contador após confirmação da persistência; falha mantém a leitura pendente e permite nova tentativa, sem impedir a consulta dos detalhes. Aceite/recusa de convite e registro de leitura são operações independentes.

Aceite/recusa diretamente pela notificação foi aprovado em 11/10. Em seguida, o usuário atribuiu a implementação dessa extensão à nossa execução: backend e frontend. Implementaremos as ações autenticadas por ID e a validação de destinatário, expiração e estado no servidor, preservando as rotas por token existentes. Depois de resposta bem-sucedida, o frontend reconsulta o convite e os vínculos; somente aceite confirmado libera contexto profissional. Erro, expiração ou revogação não podem deixar o convite aparentando aceito. Leituras e respostas repetidas/concorrentes devem ter resultado coerente sem duplicar vínculo.

Aceite: vazio não se confunde com falha; conta nova encontra convite na lista mesmo sem aviso retroativo; trocar usuário elimina feed anterior; referência expirada/revogada não permite ação; contador de lidas não é simulado localmente como verdade remota. Paginação deve ser contratada antes de presumir escalabilidade do feed.

### Bloco E.1 — Extensão de convite por ID sob nossa responsabilidade

**Escopo incluído pelo usuário em 11/10:** implementar a extensão no backend e consumi-la na notificação/lista do frontend. O pedido deste turno é incluir o trabalho no plano. As rotas abaixo são planejadas e ainda não existem na baseline analisada.

| Rota planejada | Autenticação e entrada | Resposta prevista |
| --- | --- | --- |
| POST `/api/invitations/:invitationId/accept` | JWT; UUID no path; sem token de e-mail ou userId no corpo | 200 com o mesmo DTO do aceite atual: accepted, invitationId, barbershopId, barbermanId, status |
| POST `/api/invitations/:invitationId/decline` | JWT; UUID no path; sem token de e-mail ou userId no corpo | 200 com o mesmo DTO da recusa atual: declined, invitationId, status |

**Arquitetura prevista:** manter Express → controller/factory → use case → interfaces de repository → Drizzle, conforme a estrutura existente. Reutilizar `InvitationsRepository.findById`, que já existe, e compartilhar as regras de resposta com as rotas atuais `/accept` e `/decline` por token. Não duplicar cadastro de usuário, criação de identidade ou lógica profissional global nesta extensão.

**Regras do contrato:**

- `userId` vem exclusivamente da autenticação. `invitationId` vem do path validado; body/query não podem sobrescrever nenhum deles. O adapter atual combina params e query: as novas rotas precisam de extração explícita segura e teste desse caso.
- Normalizar e comparar o e-mail da conta autenticada ao destinatário do convite no servidor. Possuir o ID ou ter visto uma notificação não concede acesso.
- Convite inexistente, de outra conta, expirado ou fora de PENDING falha sem criar vínculo e sem revelar detalhes de outro destinatário. Preservar o padrão atual de erro 400 genérico; ausência/token inválido segue 401 do middleware. UUID inválido retorna 400.
- Aceite só conclui quando a transição PENDING→ACCEPTED e a criação do vínculo BARBERMAN forem persistidas juntas. Recusa só altera PENDING→DECLINED e não cria vínculo.
- A transição precisa ser condicional/atômica no banco, não apenas uma checagem seguida de UPDATE por ID. Respostas e revogação concorrentes precisam competir pelo mesmo estado PENDING; no máximo uma vence. Falha de persistência reverte integralmente a operação.
- Aceite/recusa repetido de convite já respondido mantém o estado terminal e devolve o erro de convite inválido, sem novo vínculo. Depois de resposta perdida, reconsultar convites/vínculos; não reenviar cegamente.
- Não incluir token secreto ou hash em notifications, listas ou novas respostas. O fluxo pelo link do e-mail continua usando o token nas rotas existentes.

**Tarefas previstas — backend, nossa execução:**

1. Acrescentar entrada por invitationId aos use cases de aceite/recusa, compartilhando a validação com o caminho por token; DTOs/response types devem manter compatibilidade com callers existentes.
2. Implementar controllers/factories e montar as duas rotas em `src/infra/http/routes/invitation.routes.ts`, usando autenticação e validação UUID no padrão Zod da API. Garantir autoridade do path e do usuário autenticado.
3. Revisar persistência de respostas e revogação para transição condicional. Arquivos afetados: contratos `src/domain/application/repositories/invitations-repository.ts` e `memberships-repository.ts`; implementações `src/infra/drizzle/repositories/drizzle-invitations-repository.ts` e `drizzle-memberships-repository.ts`; use case `revoke-invitation` quando necessário para compartilhar a transição. Aceite permanece transacional.
4. Adaptar repositories in-memory e testes de `accept-invitation`, `decline-invitation`, `revoke-invitation`; acrescentar testes de controllers/rotas e documentar os endpoints no Swagger. Manter os testes das rotas por token.
5. Rodar testes pertinentes, TypeScript e Biome no checkout atualizado da API; depois testar HTTP com PostgreSQL isolado. Não usar o app inicializado contra banco real, pois o boot dispara migrações.

**Tarefas previstas — frontend, nossa execução:**

1. Criar adapter de invitations que exponha `acceptById(invitationId)` e `declineById(invitationId)` com os DTOs acima, consumindo o cliente HTTP e a sessão existentes.
2. Na feature de notifications, tratar referência INVITATION: obter contexto na lista autenticada de convites, mostrar unidade/estado e permitir ação explícita. A lista de convites também oferece a ação quando a conta foi criada depois e não possui aviso retroativo.
3. Manter estado de mutation por convite: bloquear os dois botões durante envio, mostrar resultado somente após sucesso e preservar estado na falha. Abrir a notificação não aceita automaticamente.
4. Invalidar/reconsultar queries de convites, feed e memberships para o usuário atual. Liberar contexto profissional somente a partir dos vínculos reconsultados; não promover tipo global artificialmente pelo resultado de uma mutation.
5. Se faltar sessão, preservar somente contexto do convite e retornar após login/confirmação. Resposta tardia de uma conta anterior não modifica a nova sessão/cache.

**Aceite e testes indispensáveis:**

- Titular aceita por ID e recebe exatamente um vínculo; titular recusa e não recebe vínculo; conta CLIENT existente conserva ID, CPF, senha e histórico.
- Outro usuário, owner que não é destinatário, ID desconhecido, ID inválido, convite expirado/revogado/aceito/recusado não concedem acesso.
- Body/query com userId ou invitationId distintos não mudam a identidade autenticada nem o convite do path.
- Aceite+aceite, aceite+recusa e aceite+revogação concorrentes não deixam estados incompatíveis nem duplicam vínculo; provar em PostgreSQL além dos testes in-memory.
- Falha de insert/update reverte vínculo e estado; a UI não anuncia sucesso. Recuperação de timeout pela reconsulta mostra o estado real.
- Rotas antigas por token continuam funcionando e exigindo titular correto. Feed/DTOs não expõem tokens; trocar conta limpa contexto e ignora respostas tardias.

**Limites deste acréscimo:** marcar notificação como lida, push, paginação, novos eventos de reserva, cadastro profissional por CPF e tipo global continuam em seus blocos/contratos. A atribuição à nossa execução é específica para responder convites por ID; não transfere automaticamente as demais pendências do backend.

**Referências consultadas pela skill Context7:** nenhuma ferramenta Context7 estava disponível nesta sessão; aplicado o fallback de documentação oficial. Versões locais observadas: Express 5.2.1, Zod 4.5.4, Drizzle ORM 1.0.0-rc.4 e TanStack Query 5.66.0. Usar [rotas Express 5](https://expressjs.com/en/guide/routing/), [transações Drizzle](https://orm.drizzle.team/docs/transactions), [schemas Zod](https://zod.dev/api) e [invalidação após mutations TanStack Query](https://tanstack.com/query/v5/docs/framework/react/guides/invalidations-from-mutations). A documentação Drizzle não fixa esse prerelease; confirmar APIs de transação/atualização contra o pacote instalado durante a execução, sem atualizar dependências implicitamente.

### Bloco F — Reserva real do consumidor (#33 e fluxo de agendamento)

Arquivos existentes: `src/features/services/model/use-public-services.ts`, `ui/PublicCatalogView.tsx`, `ui/SelectedServicesSummary.tsx`; `src/features/availability/api/availability.http.ts`; nova feature de bookings com adapter POST e fluxo de confirmação.

Entregável: catálogo → serviços → profissional elegível → data/slot do fuso da unidade → resumo → login/confirmação quando necessário → POST → confirmação real. Preservar seleção ao passar pela autenticação. Não depender de e-mail de confirmação de booking que o servidor não produz.

Decisão confirmada pelo usuário em 11/10: manter vários serviços no mesmo agendamento. O frontend preservará a seleção múltipla existente. O backend precisa estender a criação para reservar todos os serviços em uma única operação; o endpoint atual com serviceId único ainda não atende essa decisão.

Dependências: extensão para múltiplos serviços, listagem de profissionais, validações/concorrência server-side e consulta das próprias reservas. Não enviar múltiplos POSTs para montar um agendamento com vários serviços.

Critérios da extensão a contratar com Álvaro: serviços ativos da mesma unidade, preço total e duração calculados pelo servidor, snapshots de cada serviço e uma única reserva vinculada ao consumidor/profissional. Criação deve ser integral em uma transação: se qualquer item falhar, nenhum item/carrinho/reserva parcial permanece. O formato final do DTO e a relação de múltiplos itens no carrinho devem ser publicados antes da implementação do adapter.

Aceite: 409 atualiza disponibilidade sem perder intenção; clique duplo não duplica; timeout de POST não reenvia cegamente reserva cuja criação é incerta; date/endTime correspondem ao slot e duração contratados; confirmação aparece apenas após sucesso real. Idempotência/reconciliação de resposta perdida exigem contrato para solução completa.

### Bloco G — Agenda e dashboard existentes (#30)

Arquivos existentes: `src/features/agenda/api/agenda.http.ts`, `agenda.mapper.ts`, view-models e telas; `src/features/dashboard/api/dashboard.http.ts`.

Entregável: adaptar agenda detalhada/telefone nullable e invalidar disponibilidade após cancelamento; explicitar visão profissional e unidade. A API agrega o profissional entre unidades; não apresentar isso como agenda exclusiva da unidade selecionada sem filtrar com dados suficientes ou obter endpoint apropriado.

Aceite: cancelamento confirmado libera slot na reconsulta; erro mantém item; cliente não ganha botão de cancelamento de profissional; OWNER não recebe direito de cancelar agenda alheia por UI. Não inventar CONFIRMED/CANCELLED nem apresentar soma de preços agendados como receita efetivamente recebida. Edição e eventos de cancelamento dependem de backend.

### Bloco H — Gestor da plataforma (#35)

Não há entrega backend correspondente que autorize concluir esta integração. Requer provisionamento controlado, tipo global e identificação/autorização de gestor. Depois, login comum e área inicial protegida, com sessão curta conforme requisito original. Métricas, planos, pagamentos, Google/Apple, MFA e recrutamento continuam fora da implementação atual.

## 7. Homologação e critério de conclusão

### Verificação por camada

| Camada | Estado nesta análise | O que deve comprovar na execução |
| --- | --- | --- |
| PRs/commits/rotas e uso dos contratos | PASS — inspeção | Baseline fixada, adapters correspondentes, nenhuma rota inventada |
| Backend versus critérios originais | PARTIAL | Resolver diferenças de identidade, sessões, CPF/cadastro profissional e recursos pessoais |
| Integração frontend | NOT TESTED | Nenhum código funcional foi alterado nesta etapa |
| HTTP + PostgreSQL isolado | NOT TESTED | Auth, convites, reservas, permissões, concorrência e rollback reais |
| E-mail/URLs e mobile/browser | NOT TESTED | Recebimento, clique, reabertura, deep link, reload, persistência |
| Produção/migrações/deployment | NOT TESTED | Versão efetiva, migrações e topologia autorizadas em validação separada |

Testes de frontend devem executar o provider/engine e adapters reais com respostas controladas, não apenas reproduzir manualmente o mesmo fluxo de storage em um teste. Na execução, rodar `npm run typecheck`, testes Vitest pertinentes e `npm run build`; evidência local não comprova produção.

Matriz mínima de integração real: CPF com/sem máscara e duplicidade; e-mail com caixa/espaços; usuário não confirmado; refresh válido/expirado/reutilizado/concorrente; logout/refresh tardio; reset com link usado e JWT anterior; convite em conta existente/nova/errada e duas unidades; feed sem leitura/ações disponíveis; reserva com um e com vários serviços, soma de preço/duração, serviço de outra unidade/inativo, rollback integral, conflito simultâneo, profissional inadequado, jornada inválida; cancelamento e nova disponibilidade; separação entre contas e unidades.

Usar somente contas/banco/e-mails de homologação, sem tokens ou dados pessoais nos artefatos. O teste que motivar correção deve ter request sanitizada, status/body relevante, versão e pré-condições, distinguindo reproduzido de risco estático.

Premissas propostas para o desenho: web/Android/iOS; preservar Expo Router, TanStack Query e design system; reutilizar timeout de 15s como referência a confirmar; queries só com identidade/contexto válidos; nenhuma meta de SLA/carga de produção presumida; backend de Álvaro e frontend de Wellington. Definir desempenho e volume quando a estratégia do feed e o transporte forem escolhidos.

## 8. Decisões preservadas e fronteira do planejamento

Preservado do planejamento anterior: login único automático; uma conta por CPF; proprietário inicia o acesso profissional; mesma pessoa pode consumir e atender; múltiplas unidades com permissões separadas; manter tipo BARBER após saída de unidades; preservar cadastro OWNER; e-mail/senha com confirmação; sessão persistente; gestor sem implementação de planos nesta etapa.

### Decisão confirmada em 11/10 — vários serviços

Escolha: manter vários serviços no mesmo agendamento. Alternativa considerada: limitar a primeira versão a um serviço por reserva. Motivo: preservar a experiência do catálogo já existente e permitir uma única confirmação para os serviços selecionados. Consequência: extensão do contrato e persistência no backend é pré-requisito; a API atual não foi alterada por esta decisão.

### Decisão confirmada em 11/10 — confirmação antes do login

Escolha: manter confirmação de e-mail obrigatória antes de entrar. Alternativa considerada: permitir login sem confirmação e bloquear somente agendamentos. Motivo: aproveitar a regra já implementada pelo backend e manter uma jornada de confirmação comum. Consequência frontend: cadastro sem auto-login, envio/reenvio de confirmação, tratamento específico do 403 email_not_verified e preservação da intenção de reserva, cadastro OWNER ou convite até o login. Recuperação de senha não deve ser apresentada como confirmação de e-mail.

### Decisão confirmada em 11/10 — ações de convite pela notificação

Escolha: permitir ao titular aceitar/recusar o convite diretamente pela notificação no aplicativo. Alternativa considerada: exibir o aviso e exigir que o usuário volte ao link do e-mail para agir. Motivo: concluir a jornada dentro do app. Consequência: contrato autenticado por ID é pré-requisito, sem inclusão de token secreto no feed. Preservar o contexto durante login e reconsultar convite/vínculos após a ação. A decisão não representa aprovação de push nem define automaticamente a regra de marcar avisos como lidos.

### Decisão confirmada em 11/10 — leitura ao abrir detalhes

Escolha: marcar a notificação como lida ao abrir seus detalhes. Alternativa considerada: exigir ação manual para marcar leitura. Motivo: acompanhar o consumo do aviso sem adicionar uma etapa. Consequência: persistência server-side por destinatário, repetição idempotente e atualização do feed após confirmação. Nenhum aceite/recusa implícito ocorre ao abrir. A decisão define o comportamento; a responsabilidade pela rota de leitura segue a divisão do bloco de notificações, sem ampliar implicitamente a extensão por ID atribuída à nossa execução.

### Decisão confirmada em 11/10 — responsabilidade da extensão por ID

O usuário determinou que nós implementaremos o aceite/recusa por ID no backend e sua integração no frontend, usando Context7 para consulta técnica. A tarefa deixa de ser somente uma solicitação a Álvaro; está detalhada no bloco E.1. O restante da divisão de responsabilidades permanece como descrito nos outros blocos. Planejamento desta extensão não significa que as novas rotas já foram implementadas ou testadas.

### Pendências técnicas decididas pela revisão

1. Tipo global persistido e membership separados; CPF/e-mail divergentes não fundem contas. Cadastro profissional pendente é iniciado pelo OWNER e a conta existente é preservada.
2. Web com refresh em cookie protegido e `/api` na mesma origem por proxy; native com SecureStore. Sem BFF de sessão ou troca do mecanismo JWT existente. Prazo absoluto30d para CLIENT/BARBER/OWNER e8h para gestor, com revogação por família.
3. Links novos HTTPS por finalidade, com token em fragmento e ação explícita; resolver/preview/detalhe e leitura persistida têm contratos projetados. Leitura é independente do aceite, e refetch de perfil/vínculos não pode ocultar resposta já confirmada.
4. Reserva múltipla é transacional, com cálculo pelo servidor, idempotência e consulta exata de tentativa ambígua antes de nova chave. Feed paginado20/max100 e refetch por foco/ação. Senha nova15 caracteres, preservando login legado e limites do hashing atual.

As definições completas, alternativas, objeções e responsabilidades estão no [desenho aprovado](DESENHO_INTEGRACAO_E_DECISOES_2026-10-11.md). O que permanece é entregar/alinhar os contratos projetados e executar os gates, não rediscutir escolhas de produto. Nossa extensão assume a transição canônica de convite ID/token após schema/regras de identidade de Álvaro; não confundir endpoint por ID entregue com fluxo profissional inteiro homologado. Eventos adicionais de reserva ficam em pendência futura separada.

Planos executivos derivados: [autenticação](planos/2026-10-11-integracao-autenticacao.md), [convites](planos/2026-10-11-integracao-convites.md), [notificações](planos/2026-10-11-integracao-notificacoes.md) e [reservas/agenda](planos/2026-10-11-integracao-reservas-agenda.md). Cada um tem arquivos, interfaces, tarefas, checks e responsabilidades; todos os passos estão inicialmente NOT EXECUTED.

Adendo solicitado depois: [análise atual do seedDB](ANALISE_SEEDDB_AUTENTICACAO_2026-10-11.md) e [quinto plano — seed/autenticação](planos/2026-10-11-seeddb-autenticacao.md). Novos INSERTs já verificam e-mails; o acréscimo garante reaplicação seletiva de registros fictícios antigos e cobertura de todas as contas, sem bypass de cadastro real. O agente executor do conjunto completo deverá também tratar os pré-requisitos projetados do backend, em mudanças revisáveis e preservando trabalho humano; não simular recursos faltantes.

### Handoff objetivo de contratos para Álvaro

- **Identidade:** publicar tipo global e verificação no perfil; manter conta/CPF/ID ao adquirir acesso profissional e representar BARBER sem unidade. Preservar permissões por membership.
- **Sessão:** alinhar cookie/persistência web, prazo do gestor, logout geral e troca autenticada de senha com #32; garantir rotação concorrente e esclarecer revogação de JWT conforme o requisito escolhido.
- **Convites:** definir como o cadastro iniciado pelo proprietário identifica CPF/conta existente; publicar preview/reenvio/remoção de vínculo previstos em #34. Aceitar/recusar por ID com autorização do destinatário passou à nossa execução no bloco E.1; coordenar o contrato e preservar compatibilidade com o fluxo do Álvaro.
- **Notificações:** publicar leitura persistida, paginação e estados/eventos necessários. Confirmação/cancelamento de booking só devem ser anunciados quando existir produtor e entrega verificáveis.
- **Reservas:** decisão confirmada: vários serviços em uma única reserva/transação, com preço e duração calculados pelo servidor e snapshots de todos os itens. Publicar o contrato estendido, profissionais elegíveis e consultas pessoais; reproduzir e corrigir validações/concorrência que falharem. Edição/cancelamento e histórico precisam corresponder ao escopo de cada papel.
- **Links e operação:** retorno à UI/deep links e migrações homologadas; manutenção HTTP protegida/removida antes de liberar ambiente real.

Esses itens são requisitos de contrato a alinhar, não rotas já entregues nem instrução para modificar o backend nesta etapa. Aguardar os contratos finais antes de fixar nomes/signatures de novas chamadas no plano executivo.

Após revisão dessas diferenças, dividir os planos executáveis por sessão/autenticação, convites/equipe, notificações e reservas/agenda; atualizar os escopos das issues mediante autorização. A #32 continua sendo a base comum, não um recipiente para concluir todas as áreas.

## 9. Arquivos principais inspecionados no backend

Os caminhos abaixo são relativos à cópia fixada do backend; o [inventário completo](ARQUIVOS_BACKEND_2026-10-11.csv) registra a lista remota de arquivos alterados. Algumas contagens de diff da API do GitHub vieram zeradas mesmo para arquivos modificados; essas contagens não provam ausência de alteração. Conteúdo lido na snapshot é a referência para a análise funcional.

| Área | Arquivos / responsabilidade |
| --- | --- |
| Montagem HTTP | `src/app.ts`, `src/infra/http/routes/index.ts`, `users.routes.ts`, `booking.routes.ts`, `barbershop-invitation.routes.ts`, `invitation.routes.ts`, `notification.routes.ts`, `schedule.routes.ts` |
| Sessões | `src/domain/application/services/auth-token-service.ts`, use cases em `src/domain/application/use-cases/users/sign-in-user`, `refresh-session`, `sign-out`; `src/infra/http/middlewares/ensure-user-is-authenticated.ts`; `drizzle-refresh-tokens-repository.ts` |
| Perfil/cadastro | use cases `users/create-user`, `get-user-profile`, `fetch-user-barbershops`; `src/domain/enterprise/entities/value-objects/cpf.ts`; `create-user-controller.ts`; `drizzle-users-repository.ts` |
| Confirmação/reset | serviços de verification/recovery token; use cases `send-email-verification`, `verify-email`, `send-password-recovery`, `reset-password`; respectivos controllers e repositories |
| Convites | use cases em `src/domain/application/use-cases/invitations`; `invitation-token-service.ts`; `src/domain/enterprise/entities/invitation.ts`; repositories de invitations/memberships |
| Notificações | `src/domain/application/use-cases/notifications/fetch-user-notifications`; `src/domain/enterprise/entities/notification.ts`; `drizzle-notifications-repository.ts`; produtor em `invite-barberman.ts` |
| Reservas/horários | `booking/create-booking`, `cancel-booking`, fetch diário/detalhado; `schedule/calculate-availability`; `drizzle-bookings-repository.ts`; `create-booking-controller.ts`; schema e mappers |
| E-mail | `src/infra/email/resend-email-service.ts`, renderers e templates de verification, recovery e invitation |
| Banco/configuração | `src/infra/drizzle/schema.ts`, cinco migrações novas, migrator, schema de configuração em `src/infra/env/index.ts`, dependências e tests |

Não foram lidos arquivos `.env` nem credenciais reais. Dados e seeds não foram aplicados.

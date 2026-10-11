# Contrato de autenticação v1 — handoff para backend e frontend

Estado: contrato detalhado para revisão dos planos. Deriva do [desenho aprovado pelo usuário em 2026-10-03](DESENHO_AUTENTICACAO_2026-10-03.md). Os endpoints ampliados/novos ainda não foram implementados ou validados por HTTP.

## C01. Constantes e identidade

`AccountType = CLIENT | BARBER | OWNER | PLATFORM_ADMIN`; `AccountStatus = PENDING_EMAIL | ACTIVE | SUSPENDED | REVIEW_REQUIRED`; `MembershipRole = OWNER | BARBERMAN`; `MembershipStatus = ACTIVE | SUSPENDED | REVOKED`.

CPF canônico: 11 dígitos, dígitos verificadores válidos, sequências repetidas rejeitadas, índice UNIQUE. Máscara é apresentação. E-mail: aparar bordas, comparar em caixa baixa como política explícita da aplicação, preservar endereço original para envio; não remover pontos, sufixos `+` ou aplicar regras de provedores. Inventariar colisões antigas antes da migração.

Senha nova/cadastro/troca/recuperação: proposta técnica de mínimo 15 caracteres (contagem por pontos de código Unicode, igual no cliente/servidor), máximo 72 bytes UTF-8 para respeitar o bcrypt atual, sem trim ou conversão de caixa. Manter bcrypt custo 12. Login continua validando senhas legadas existentes; não rejeitar login somente por a senha antiga ser curta. Esse endurecimento deve aparecer no formulário OWNER como validação, preservando sua jornada. Valores novos são parte desta revisão dos planos. Referências: [mínimo sem MFA](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#implement-proper-password-strength-controls) e [limite bcrypt](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#input-limits-of-bcrypt).

Prazos: acesso comum 900s; acesso gestor 300s; sessão comum absoluta 2.592.000s (30 dias); gestor absoluta 28.800s (8h); confirmação de e-mail 86.400s; recuperação 1.800s; ativação profissional 259.200s (72h). Tokens de ação/refresh aleatórios: 32 bytes gerados por CSPRNG, codificados base64url; hash SHA-256 no armazenamento. Nunca usar CPF como token.

Limites iniciais propostos para execução: login 10 falhas por chave e-mail canônico/IP em 15min, com limite adicional de 100 tentativas/IP/15min; cadastro 5/IP/h; confirmação/recuperação/reenvio 3/destinatário/h e 20/IP/h; ativação 10 falhas/cadastro/15min; refresh 60/sessão/min. Contadores compartilhados em PostgreSQL, não em memória local. 429 inclui `Retry-After` em segundos. Esses limites protegem autenticação; quotas de reservas são assunto do domínio de agendamento.

## C02. Permissões e estados

Catálogo fechado v1: `account:read:self`, `account:verify-email`, `account:change-password`, `session:logout:self`, `session:logout:all`, `bookings:read:self`, `bookings:create:self`, `barbershops:create:self`, `agenda:read:self`, `schedules:read`, `schedules:manage`, `services:manage`, `team:manage`, `platform:enter`.

- CLIENT/BARBER/OWNER ativos: permissões pessoais de leitura da conta/reservas e gestão da própria sessão. `bookings:create:self` exige e-mail confirmado; o domínio ainda revalida a reserva.
- Permissões operacionais somente de membership ACTIVE + barbearia ACTIVE: role BARBERMAN concede agenda própria e horários de leitura; role OWNER naquele vínculo concede agenda própria, gestão de horários/serviços/equipe, sem fabricar métricas de toda equipe. Tipo global OWNER não concede gestão em uma unidade onde não haja vínculo OWNER coerente.
- PLATFORM_ADMIN ativo: conta/sessão próprias e `platform:enter`; não recebe permissões comerciais nem acesso operacional automático a unidades.
- SUSPENDED: não emitir/renovar acesso de negócio; middleware revoga ou bloqueia sessões. REVIEW_REQUIRED: tipo null, permissões vazias e estado de revisão, sem inferência de tipo.
- PENDING_EMAIL de qualquer tipo já provisionado: sessão limitada para conta, confirmar/reenvio e sair, sem acesso de negócio; a exceção de setup OWNER está abaixo. BARBER novo só recebe vínculo ativo após ativação/contato confirmado.
- OWNER novo PENDING_EMAIL: preservar cadastro/entrada/setup, permitindo criar a própria barbearia por `barbershops:create:self`; após criação, orientar confirmação antes de gestão operacional. Não permitir que outro tipo use essa exceção.
- OWNER legado classificado com evidência de propriedade: estado ACTIVE pode ter `emailVerified:false`; não presumir verificação de contato. Preservar gestão existente; reservas pessoais continuam exigindo verificação. Classificação/estado legados são parte da migração auditada, não uma regra pública de cadastro.

Matriz de tipos: CLIENT→BARBER somente por cadastro de OWNER + aceite; BARBER→BARBER acrescenta vínculo; revogar vínculo mantém BARBER. OWNER/PLATFORM_ADMIN não são convertidos por cadastro profissional: 409 `ACCOUNT_ROLE_CONFLICT`. Cadastro público duplicado nunca cria outra identidade. Transição autônoma CLIENT/BARBER→OWNER não é acrescentada nesta entrega: se esse CPF chegar ao cadastro público OWNER, manter o conflito atual e orientar a entrar/revisar o cadastro, sem fusão/elevação automática.

## C03. Perfil e sessão

`GET /api/users/me` → 200 `SessionProfile`:

```ts
type SessionProfile = {
  contractVersion: 1;
  user: { id: string; name: string; email: string; avatarUrl: string | null;
    accountType: 'CLIENT' | 'BARBER' | 'OWNER' | 'PLATFORM_ADMIN' | null;
    status: 'PENDING_EMAIL' | 'ACTIVE' | 'SUSPENDED' | 'REVIEW_REQUIRED';
    emailVerified: boolean };
  personalPermissions: Permission[];
  platformPermissions: Permission[];
  memberships: Array<{ id: string; role: 'OWNER' | 'BARBERMAN';
    status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
    barbershop: { id: string; name: string; status: 'ACTIVE' | 'INACTIVE'; timezone: string };
    permissions: Permission[] }>;
  staff?: { id:string; name:string; email:string; avatarUrl:string|null;
    role:'OWNER'|'BARBERMAN'|null }; // compatibilidade C07; não concede acesso v1
};
```

`Permission` é a união dos literais C02. Tipo null somente com REVIEW_REQUIRED. O parser v1 admite o campo deprecated `staff` apenas no formato acima e o ignora como fonte de autorização. Permissões operacionais pertencem ao vínculo; preferências locais não as concedem. Se uma unidade foi revogada/inativada, remover sua seleção e mostrar escolha/estado sem vínculo, sem enviar BARBER ao cadastro OWNER.

Sucesso de login 201 e refresh 200: `{contractVersion:1,access_token,expires_in,session:{id,expiresAt},refresh_token?}`. `expiresAt` ISO UTC é o limite absoluto; `expires_in` 900 ou 300. Web nunca recebe `refresh_token` JSON; nativo recebe em login/refresh. `/me` não expõe senha, refresh, CPF completo ou histórico pessoal à equipe.

## C04. Transporte, renovação e saída

Login solicita `transport:'WEB_COOKIE'|'NATIVE_BODY'`. O servidor aceita WEB somente para Origin exata permitida, inclusive via proxy que preserva Origin; requer `Content-Type:application/json`. Origin `null`, não admitida ou requisição browser pedindo NATIVE são rejeitados. NATIVE exige ausência de Origin/headers browser e não aceita cookies de autenticação. Ausência desses headers não é certificação de aplicativo: a segurança depende de credenciais, vínculo persistido do transporte e rejeição de fontes intercambiadas.

Persistir transporte na sessão. Refresh WEB aceita somente cookie, valida Origin e metadados Fetch quando presentes, rejeita token no corpo; refresh NATIVE aceita somente corpo, sem cookie, e exige sessão NATIVE. Forjar o campo `transport` não muda a fonte aceita. Expor respostas com `Cache-Control:no-store`. CORS, quando necessário, admite origens exatas com credenciais, nunca wildcard com cookies.

Cookie WEB: `smart_barber_refresh`, `HttpOnly; Secure; SameSite=Lax; Path=/api/users/sessions`, host-only, `Max-Age` até o limite absoluto restante. Logout remove o cookie com mesmos atributos/path. Proxy `/api/:path*` deve preceder fallback SPA e conservar Cookie/Set-Cookie. Desenvolvimento/homologação web usa HTTPS local de teste para esse contrato. Não fazer fallback de refresh para localStorage.

Nativo guarda somente refresh no SecureStore (`smart_barber_refresh_token`); acesso em memória. SecureStore indisponível é erro explícito de persistência, sem fallback de segredo para web/memória fingindo sucesso durável.

Refresh exige `Idempotency-Key` UUID por tentativa lógica, preservado quando a resposta se perde. Serializar rotação no servidor por sessão e geração. Por 30s, repetir o mesmo token antigo/chave devolve a mesma rotação somente se a geração resultante ainda for a atual e a sessão estiver ativa; resposta guardada criptografada e transportada somente à sessão/fonte correspondente. Se já houve rotação posterior, devolver 409 sem credencial/Set-Cookie, evitando regressão do cookie. Outra chave disputando a geração antiga nessa janela recebe 409 `SESSION_REFRESH_CONFLICT`, `Retry-After:1`, sem revogar a sessão. Cliente espera uma vez e tenta com credencial atual; falha continuada vira recuperação temporária, sem loop. Reutilização da geração antiga após 30s revoga a família e devolve 401 `SESSION_REVOKED`; a revogação é um resultado de segurança que deve ser COMMITADO antes da resposta de erro, não desfeito por rollback de Either Left. Não estender `expiresAt`. A chave de criptografia da janela fica no backend, fora do repositório/logs.

Logout online revoga a sessão inteira e todas as gerações, inclusive refresh concorrente. Pode usar refresh válido C04 ou JWT atual da própria sessão, permitindo cleanup após falha de persistência no login; verificação de Origin/fontes permanece obrigatória. Frontend incrementa uma geração local antes de qualquer await, cancela requests/cache e grava marcador não secreto de saída. No web, marcador localStorage `smart_barber_logout_v1` contém UUID da intenção e instante; evento storage notifica outras abas. Enquanto presente, nenhuma aba/restauração automática chama refresh. Reabrir online tenta concluir logout usando o cookie e mantém estado desconectado; retirar marcador somente após revogação confirmada ou novo login explícito bem-sucedido que substitui/revoga o cookie anterior. Refresh tardio não limpa marcador nem restaura perfil. Se localStorage falhar, apresentar erro explícito: saída persistente offline não comprovada, sem alegar sucesso remoto.

Logout nativo remove refresh local mesmo sem rede; revogação remota fica sem confirmação até comunicação autenticada possível. `logout-all` e troca/recuperação de senha revogam todas as sessões. Falha de rede/503 não é sessão inválida; 401 de senha errada na tela de login não dispara renovação. GET autorizado pode repetir uma vez após renovar; mutação não é reexecutada automaticamente.

## C05. Cadastro e ações de e-mail

| Método/caminho sob `/api` | Entrada | Saída |
| --- | --- | --- |
| `POST /users/` | `{purpose:'CLIENT'|'OWNER',name,email,cpf,password}` | 201 `{userId,verificationRequired:true}`; conflito 409 genérico. |
| `POST /users/sessions/auth` | `{email,password,transport}` | 201 C03; credenciais inválidas 401. |
| `POST /users/sessions/refresh` | WEB `{}` + cookie; NATIVE `{refresh_token}`; ambos chave C04 | 200 C03. |
| `POST /users/sessions/logout` | WEB cookie; NATIVE `{refresh_token}`; aceita acesso já expirado mediante refresh válido | 204; retirar cookie inclusive quando já inválido. |
| `POST /users/sessions/logout-all` | Acesso atual + `{currentPassword}` | 204; revogar todas e limpar transporte atual. |
| `POST /users/email-verifications/request` | `{email}`; resposta igual para conta existente/inexistente | 202 `{accepted:true}`. |
| `POST /users/email-verifications/confirm` | `{token}` | 204; token repetido/expirado 410 `ACTION_TOKEN_EXPIRED_OR_USED`. |
| `POST /users/password-resets/request` | `{email}` | 202 `{accepted:true}`, sem confirmar existência. |
| `POST /users/password-resets/confirm` | `{token,newPassword}` | 204; consumir token e revogar sessões em transação; voltar ao login. |
| `PATCH /users/me/password` | Acesso atual + `{currentPassword,newPassword}` | 204; revogar todas, limpar transporte e voltar ao login. |

Verificação por e-mail recebe somente token de finalidade EMAIL_VERIFY; reset somente PASSWORD_RESET. Reset e troca de senha serializam por usuário e invalidam TODOS os tokens PASSWORD_RESET pendentes na mesma transação da atualização/revogação de sessões; link anterior ou reset concorrente não pode substituir novamente a senha. Confirmar contato não desbloqueia SUSPENDED/REVIEW_REQUIRED; reset não marca e-mail verificado nem eleva tipo. GET de uma página/link não consome token: a confirmação ocorre por POST, evitando acionamento por prévia de e-mail. Links usam somente origem configurada do frontend ou scheme `smartbarber`; não construí-los com Host/returnTo arbitrário da requisição. Frontend remove token da URL após captura, não envia a analytics/logs e conserva-o apenas em memória durante a ação.

Porta de entrega: `IdentityMessageSender.send(message: {id:string;kind:'EMAIL_VERIFY'|'PASSWORD_RESET'|'BARBER_ACTIVATION';recipient:string;url:string;expiresAt:Date}):Promise<void>`. Outbox persistida/criptografada, envio após commit, idempotente por ID, máximo 5 tentativas com atrasos 1min/5min/15min/1h; worker drena `dispatchIdentityMessages({limit:20})` por execução autenticada interna. A API pode acionar uma execução após commit; falhas permanecem no outbox para o runner autorizado. Provedor é adaptador de infraestrutura, configurado pela equipe backend; sandbox de homologação é obrigatório antes de uso real. Limpar payload sensível após entrega/expiração. Logs guardam IDs/resultado, não destinatário/token/URL completos.

## C06. Cadastro de barbeiro e equipe

| Método/caminho sob `/api` | Entrada/autor | Saída |
| --- | --- | --- |
| `POST /barbershops/:shopId/barbers` | OWNER da unidade; `{name,cpf,email}`; `Idempotency-Key` UUID | 202 `{registrationId,status:'PENDING',deliveryStatus:'QUEUED'}`; não expõe identidade de cliente. |
| `GET /barbershops/:shopId/barbers?page=1&limit=20` | OWNER da unidade; limite máximo 100 | 200 `{members:[{membershipId,user:{id,name,avatarUrl},status}],registrations:[{id,displayName,status,deliveryStatus,expiresAt}],page,limit,total}`. |
| `POST /barbershops/:shopId/barber-registrations/:id/resend` | OWNER da unidade; `{}` | 202 `{accepted:true}`; invalidar link antigo e emitir novo, respeitando limite. |
| `DELETE /barbershops/:shopId/barber-registrations/:id` | OWNER da unidade | 204; revogar somente cadastro pendente. |
| `POST /users/barber-registrations/preview` | `{token}`; sem consumir | 200 `{barbershop:{id,name},activationMode:'SIGN_IN'|'SET_PASSWORD',status:'PENDING'}`; sem CPF/e-mail/perfil do destinatário. |
| `POST /users/barber-registrations/activate` | `{token,newPassword?}`; autenticação obrigatória quando CPF já existir | 200 `{userId,membershipId,accountType:'BARBER',status:'ACTIVE'}`; perfil precisa ser reconsultado. |
| `POST /users/barber-registrations/decline` | `{token}`; conta correspondente autenticada se existente | 204; marcar DECLINED, sem alterar identidade/vínculos. |
| `DELETE /barbershops/:shopId/barbers/:userId` | OWNER da unidade; alvo BARBERMAN | 204; revogar vínculo; preservar BARBER, outras unidades e reservas. |

Cadastro: CPF/e-mail separadamente; CPF existente + e-mail fornecido pelo owner diferente do contato registrado não substitui esse contato. Enviar a confirmação ao contato já registrado/verificado; se não verificado, titular conclui confirmação na própria conta. E-mail de outra identidade: 409 `IDENTITY_CONFLICT`, sem revelar quem. OWNER/gestor alvo: 409 `ACCOUNT_ROLE_CONFLICT`. Vínculo já ativo ou cadastro repetido na mesma unidade/chave retorna registro/resultado consistente, sem segundo usuário/membro.

Ativação reconsulta CPF/e-mail sob transação. Se o CPF era novo e passou a existir, responder 409 `ACTIVATION_REQUIRES_SIGN_IN`; app muda de SET_PASSWORD para entrada autenticada, não grava a senha informada sobre a conta encontrada. Titular autenticado deve corresponder ao `userId` resolvido pelo CPF do cadastro, não a ID enviado pelo app. Duas unidades concorrentes podem concluir vínculos na mesma conta BARBER; duas criações concorrentes do CPF reutilizam a identidade somente após autenticação/autorização correspondente.

Estados de cadastro: PENDING→ACCEPTED/DECLINED/EXPIRED/REVOKED. Reenvio de PENDING troca geração/validade; estados terminais não reabrem silenciosamente. Preview não ativa nem autentica como o destinatário. Token recebido por conta errada: 403 `ACTIVATION_IDENTITY_MISMATCH`. Owner/unidade revogados antes do aceite: 403 `REGISTRATION_NOT_AUTHORIZED`. Token inválido/expirado/usado: 410, sem revelar dados pessoais.

Ativação não emite sessão: SET_PASSWORD concluído mostra “Conta ativada. Entre para continuar”, depois login comum e `/me`; SIGN_IN já autenticado pode reconsultar perfil imediatamente. Recusa mostra término/retorno sem converter tipo ou simular aceite. Conta errada precisa entrada/troca explícita para aceitar ou recusar, preservando token apenas em memória e sem revelar destinatário.

## C07. Compatibilidade e migração

Janela de compatibilidade: 30 dias a partir da publicação coordenada, registrada em `AUTH_V1_LEGACY_UNTIL` pelo operador, nunca prolongada automaticamente no boot. `purpose` ausente no cadastro legado significa OWNER somente nessa janela, preservando o formulário existente; explícito CLIENT/OWNER é obrigatório no cliente novo. `transport` ausente é derivado dos sinais/fontes C04. Aliases `/staffs` permanecem disponíveis durante a janela.

Manter `staff` legado com `{id,name,email,avatarUrl,role:'OWNER'|'BARBERMAN'|null}` no perfil e `access_token` na sessão. `/me/barbershops` mantém `{barbershops:[{id,name,role,status,timezone,membershipId,membershipStatus}]}`, filtrando membership ativo; o perfil v1 contém todos os estados. Não fabricar papel de equipe para CLIENT/gestor.

JWT antigo sem `sid`: somente nas rotas legadas e até o prazo, com assinatura/expiração e conta/vínculos atuais verificados. Novos endpoints sensíveis exigem sessão v1. Frontend novo não mantém token legado como sessão persistente: orienta entrada para estabelecer cookie/refresh v1. Retirar aliases/aceitação legada é tarefa de cutover, depois de confirmar versões em uso; não quebrar cliente anterior na primeira publicação backend.

Inventário de migração restrito: CPF canônico conflitante, e-mail equivalente, vínculos/propriedade incompatíveis, usuários sem prova de tipo, referência de carrinhos e reservas. OWNER por propriedade e membership coerentes; BARBER por vínculo/evidência histórica confirmada; ausência de vínculo sozinha não classifica CLIENT. Registros ambíguos permanecem REVIEW_REQUIRED. Preservar IDs e senhas; não aplicar merge automático. Migração executada apenas em ambiente explicitamente autorizado, com cópia de teste e relatório sem dados pessoais completos.

## C08. Erros, agenda e critério de conclusão

Erro v1: `{error:{code,message,fieldErrors?}}`, com IDs de correlação fora de dados pessoais. 400 validação/transport inválido; 401 `INVALID_CREDENTIALS|SESSION_EXPIRED|SESSION_REVOKED`; 403 `EMAIL_VERIFICATION_REQUIRED|FORBIDDEN|ACTIVATION_IDENTITY_MISMATCH|REGISTRATION_NOT_AUTHORIZED`; 404 recurso fora do escopo; 409 `IDENTITY_CONFLICT|ACCOUNT_ROLE_CONFLICT|ACTIVATION_REQUIRES_SIGN_IN|SESSION_REFRESH_CONFLICT`; 410 `ACTION_TOKEN_EXPIRED_OR_USED`; 429 `RATE_LIMITED`; 503 `AUTH_SERVICE_UNAVAILABLE`. Logs não devolvem objetos internos de exceção. Adaptador preserva envelope v1 e aceita legado durante C07.

Integração obrigatória nas operações existentes: agenda profissional simples/detalhada exige `shopId` UUID no cliente v1, profissional vem de `userId` autenticado e deve ter vínculo ativo na unidade. Consulta/repositório filtra profissional + unidade + data. Cancelamento existente continua pelo profissional da reserva, com autorização de vínculo na unidade; não habilitar cancelamento CLIENT/OWNER de terceiros sem política de domínio. OWNER só vê sua agenda de atendimentos por esse contrato, sem alegar agenda de equipe.

Leitura pessoal planejada: `GET /api/users/me/bookings?page=1&limit=20` (máximo 100) → `{bookings:[{id,barbershopId,barbershopName,timezone,barbermanId,date,startTime,endTime}],page,limit,total}`; nome/fuso vêm da barbearia persistida, sem assumir fuso do aparelho para todas as unidades. Deriva titular de `shoppingCarts.userId`, nunca de shoppingCartId/userId arbitrário. Cliente/barbeiro/proprietário vê somente suas reservas. Ausência de status no domínio permanece ausência no DTO, não estado fabricado.

Nenhuma criação HTTP de reserva de cliente foi encontrada. Neste pacote, concluir a autenticação exige teste de `assertCanBookForSelf(profile)`/política backend com e-mail confirmado, titular e conta ativa; a confirmação comercial de reserva permanece dependência explícita da fase de agendamento. Sem POST real autorizado e revalidação do domínio, o botão de confirmar reserva não será apresentado como funcional nem o fluxo declarado concluído. Integração futura deve consumir essa política e testá-la por HTTP, incluindo titular diferente e conta não verificada.

## C09. Interfaces dos planos

Assinaturas nomeadas, a implementar nos locais indicados pelos planos:

- `Cpf.create(value:string):Either<InvalidIdentityInputError,Cpf>`; `EmailIdentity.create(value:string):Either<InvalidIdentityInputError,EmailIdentity>`.
- `UsersRepository.findByCpf(canonicalCpf:string):Promise<User|null>`; `findByEmail(canonicalEmail:string)`; `updateIdentity(user:User):Promise<User>` preserva ID; `save` continua criação.
- `AuthUnitOfWork.execute<T>(operation:(repos:AuthTransactionRepositories)=>Promise<T>):Promise<T>`; repos inclui users, sessions, actionTokens, memberships, registrations, outbox e auditoria. Exceção `AuthTransactionAbort` aborta operação inconsistente; resultado explícito `DENIED_REVOKED` comita a revogação de segurança e só depois é traduzido para Either/HTTP 401. Não inferir rollback automaticamente de toda resposta negativa.
- `SessionService.authenticate(input:{email:string;password:string;transport:SessionTransport}):Promise<Either<AuthError,SessionCredentials>>`; `refresh(input:{credential:string;transport:SessionTransport;idempotencyKey:string}):Promise<Either<AuthError,SessionCredentials>>`; `logout(input:{credential:string;transport:SessionTransport}):Promise<void>`; `revokeAll(userId:string):Promise<void>`.
- `SessionCredentials = {accessToken:string;expiresIn:number;sessionId:string;expiresAt:Date;refreshToken:string}`; somente controller/transport omite refresh JSON no web. `SessionTransport = 'WEB_COOKIE'|'NATIVE_BODY'`.
- `IdentityActionService.request(input:{purpose:'EMAIL_VERIFY'|'PASSWORD_RESET';email:string}):Promise<void>`; `confirmEmail(token:string):Promise<Either<AuthError,void>>`; `resetPassword(input:{token:string;newPassword:string}):Promise<Either<AuthError,void>>`; `changePassword(input:{userId:string;currentPassword:string;newPassword:string}):Promise<Either<AuthError,void>>`.
- `BarberRegistrationService.create(input:{ownerId:string;shopId:string;name:string;cpf:string;email:string;idempotencyKey:string}):Promise<Either<AuthError,RegistrationReceipt>>`; `preview(token:string):Promise<Either<AuthError,RegistrationPreview>>`; `activate(input:{token:string;authenticatedUserId?:string;newPassword?:string}):Promise<Either<AuthError,ActivationReceipt>>`; `decline(input:{token:string;authenticatedUserId?:string}):Promise<Either<AuthError,void>>`; `revokeMembership(input:{ownerId:string;shopId:string;userId:string}):Promise<Either<AuthError,void>>`.
- `RegistrationReceipt`, `RegistrationPreview`, `ActivationReceipt` são as respostas exatas C06. `AuthError` contém `code` C08 e mensagem segura; classes HTTP não entram no domínio.
- `AuthorizationService.getProfile(userId:string):Promise<SessionProfile>`; `requireUnitPermission(input:{userId:string;shopId:string;permission:Permission}):Promise<Either<AuthError,void>>`; `assertCanBookForSelf(input:{userId:string;claimedUserId?:string}):Promise<Either<AuthError,void>>` usa identidade atual e ignora concessões de plano.

Frontend: `AuthApi.login(credentials,transport)`, `refresh(idempotencyKey)`, `getProfile()`, `logout()`, `logoutAll(currentPassword)`, `requestEmailVerification(email)`, `confirmEmail(token)`, `requestPasswordReset(email)`, `confirmPasswordReset(token,newPassword)`, `changePassword(currentPassword,newPassword)` retornam DTOs C03/C05 ou void; o adaptador nativo fornece refresh do storage, nunca a UI.

`AuthUiError={code:string;message:string;retryable:boolean;shouldClearSession:boolean}` valida code contra C08 e códigos locais fechados `NETWORK_UNAVAILABLE|CONTRACT_INCOMPATIBLE|PERSISTENCE_UNAVAILABLE`. Somente sessão definitivamente inválida/revogada apaga contexto; 409 de disputa/503/rede não equivale a credencial inválida.

`SessionEngine.signIn({email,password}):Promise<void>`; `restore():Promise<void>`; `refreshProfile():Promise<void>`; `selectMembership(id:string):void`; `signOut():Promise<LogoutResult>`; `signOutAll(currentPassword:string):Promise<LogoutResult>`; `getSnapshot():SessionSnapshot`; `subscribe(listener:()=>void):()=>void`. `LogoutResult={localCleared:boolean;remoteRevoked:boolean;persistenceCleared:boolean}`. `SessionSnapshot={status,profile:SessionProfile|null,activeMembershipId:string|null,accessToken:string|null,error:AuthUiError|null}`; status `BOOTSTRAPPING|UNAUTHENTICATED|AUTHENTICATING|AUTHENTICATED|REFRESHING|RECOVERABLE_ERROR|SIGNING_OUT`.

`resolveDestination(snapshot:SessionSnapshot):AuthDestination`; destinos `LOGIN|VERIFY_EMAIL|REVIEW_REQUIRED|CLIENT_HOME|OPERATIONAL_HOME|OWNER_SETUP|PROFESSIONAL_HOME|PLATFORM_HOME|RECOVERY`. CLIENT autenticado nunca resolve OWNER_SETUP. OWNER pendente sem unidade pode concluir setup; com unidade segue verificação; OWNER legado ACTIVE segue operação. BARBER sem unidade resolve PROFESSIONAL_HOME.

## C10. Dependências externas e aprovação

Publicação de proxy/domínios/cookies, envio real de e-mails, execução de runner/outbox e migração exigem ambiente autorizado e provas reais. A equipe backend define o adaptador do provedor e o runner no handoff de execução; suas credenciais não fazem parte do pacote. Falta dessa integração não pode ser substituída por e-mail simulado declarado como entregue.

Aprovação do desenho já recebida não publica issues nem autoriza implementação/deploy. O usuário revisará os planos detalhados; depois, confirmar o projeto GitHub e publicar o backlog solicitado. Nomes de branches, commits e artefatos devem permanecer neutros.

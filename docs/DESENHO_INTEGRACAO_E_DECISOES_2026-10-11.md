# Desenho e decisões da integração Smart Barber

Data: 11/10/2026. Estado final: **APPROVED — desenho técnico aprovado pela arbitragem após revisão sequencial**. Este documento especifica o comportamento futuro; não declara rotas novas implementadas, ambiente homologado ou código de produção alterado.

Referência de fatos: [análise do backend e mapa de integração](ANALISE_INTEGRACAO_BACKEND_2026-10-11.md), backend `23fca4f859654ef2a862f2cad28df02486208e69`. PR #36 fechado sem merge. Base frontend deve reconciliar main `991aff2a4cdab9253f0b597f6f8bc526a54bb4de` com a correção local e os arquivos não commitados.

## Entendimento confirmado e autorização para decidir

- Integração web/Android/iOS dos novos contratos, preservando a arquitetura frontend e o cadastro OWNER.
- Login único e identidade autoritativa; quatro tipos globais, uma conta por CPF e permissões por unidade.
- Cadastro profissional iniciado pelo proprietário; evolução da conta existente e manutenção de BARBER mesmo sem unidade.
- Vários serviços em uma reserva, confirmação de e-mail antes do login e persistência de sessão até sair/expirar.
- Aceite/recusa pelo aviso no app e leitura ao abrir detalhes; extensão de resposta por ID atribuída à nossa execução no backend/frontend.
- Sem planos, cobrança, métricas de plataforma, redes sociais, MFA, push ou recrutamento nesta etapa.

Esses pontos foram confirmados ao longo da conversa. Na solicitação atual, o usuário autorizou decidir os pontos técnicos restantes com revisão multi-agent-brainstorming e informar as escolhas. Não é necessário reabrir o entendimento ou pedir novamente autorização para estudar/documentar. Execução e alterações remotas são etapas separadas.

## Premissas e limites

- Timeout HTTP de 15 segundos; sem repetição automática de mutations e sem SLA de produção presumido.
- Primeiro ensaio de concorrência: 20 sessões, além das disputas específicas de token/convite/horário. Isso é cenário de teste, não limite do produto.
- Reutilizar Expo Router, TanStack Query 5, React Hook Form, Zod e os adapters atuais. Sem SDK de autenticação adicional.
- Não manter credenciais em logs/analytics. Dados legados e migrações são verificados em banco isolado antes de qualquer operação real.
- Frontend, sessão e UI: Wellington. Demais contratos backend: Álvaro. Nossa exceção confirmada: resposta a convite por ID e seu frontend. Definir contratos no plano não envia tarefa a ninguém.
- Dependência backend não precisa estar implementada para fechar o desenho; precisa ter interface e responsável identificados. Só liberar o respectivo bloco após integração real.

## D01 — Arquitetura frontend

**Escolha:** adaptar AuthApi/HTTP atuais e extrair um engine de sessão testável, mantendo o provider React como ponte para telas/queries. Features separadas para invitations, notifications e bookings; sem concentrar esses domínios no provider.

Alternativas: substituir o cliente por SDK de autenticação; acrescentar BFF com sessões próprias. A primeira exige endpoints ausentes; a segunda acrescenta outra autoridade de sessão. A solução escolhida conserva padrões e mantém o backend como autoridade única.

Estado mínimo de sessão: restoring, authenticated, unauthenticated e recoveryRequired; erro temporário é distinguido de credencial inválida. Resposta tardia de geração anterior não restaura token/cache após sair ou trocar conta. Query keys incluem userId e os contextos shopId/professionalId/date aplicáveis; consultas protegidas só rodam com identidade e vínculo válidos.

## D02 — Sessão web e topologia

**Escolha:** JWT de acesso somente em memória no web; refresh em cookie HttpOnly/Secure/SameSite=Lax, host-only, com Path `/api/users/sessions` e expiração persistente. Native guarda o par em um único registro SecureStore e comunica falha de gravação.

Web chama `/api` na mesma origem do aplicativo. O hosting faz rewrite/proxy de `/api/*` para o backend **antes** do fallback SPA; isso não constitui um BFF de sessão. Evita depender de cookies entre domínios Vercel distintos. Nativo continua na URL absoluta da API.

Alternativas: API em subdomínio próprio do mesmo site, exigindo domínio/DNS certificados; refresh em storage JavaScript, que muda a proteção já aprovada. SameSite=None em hosts distintos não será fallback silencioso. Se o hosting não retransmitir Set-Cookie/Origin corretamente, o bloco permanece sem liberação até validar a alternativa de mesmo site.

Cookie somente pelo servidor; o frontend não tenta ler Set-Cookie. Backend diferencia transporte web/native sem usar essa indicação para autorizar papéis. Web não recebe refresh no JSON. Native precisa fornecer refresh explícito; nunca converter cookie web em token JSON usando um parâmetro de plataforma.

Contrato de transporte: cliente novo envia `X-SmartBarber-Client: web|native`. Com Origin presente, só o modo web de origem exatamente autorizada é aceito; indicação native não contorna isso. Sem Origin, modo web é rejeitado e modo native exige ausência de Cookie e refresh explícito quando aplicável. Cookie+refresh no JSON é transporte ambíguo e retorna 400. Compatibilidade de cliente sem header é temporária, classificada por Origin e sem converter cookie em credencial JSON; seu prazo termina no rollout do frontend/native atualizado.

Mutations de sessão web enviam `X-SmartBarber-Action: session`, com Origin autorizado, JSON e credentials same-origin; origens desconhecidas ou header ausente retornam 403 antes de criar/alterar sessão. Login usa a mesma proteção. Native sem Origin não usa cookies e continua autorizado somente pela credencial explícita. Não usar CORS aberto com credentials. Headers encaminhados para identificação/IP só serão confiados no caminho do proxy homologado.

Toda resposta de sessão/perfil/vínculos/convite/notificação/reserva privada tem Cache-Control no-store. Rewrite externo não cacheia `/api`; desabilitar o cache no hosting e verificar ausência de cache compartilhado, Set-Cookie, Origin e path em teste real antes de liberar. Não inferir esses comportamentos da documentação. [Referência de rewrites Vercel](https://vercel.com/docs/routing/rewrites).

Referências: [cookie e credenciais — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie), [proteção CSRF — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [proxies Express](https://expressjs.com/en/guide/behind-proxies/).

## D03 — Renovação, prazo e revogação

**Escolha:** preservar JWT + refresh rotativo e tornar a rotação atômica. Prazo absoluto da família: CLIENT/BARBER/OWNER 30 dias; PLATFORM_ADMIN 8 horas. Renovação não prolonga indefinidamente esse prazo. Acesso: 15 minutos para usuários comuns e 5 para gestor. Backend publica accessExpiresAt e sessionExpiresAt; frontend não presume defaults de produção.

Uma sessão/família por login de dispositivo. Access JWT novo inclui sid assinado da família; middleware confirma família ativa para o usuário, inclusive expiração absoluta. Sign-out revoga a família do refresh informado mesmo quando esse refresh já foi rotacionado; logout-all e mudança/reset de senha revogam todas. Isso permite rejeitar acesso após revogação, em vez de prometer saída instantânea mantendo JWT antigo válido. A consulta pode reutilizar refresh_tokens/familyId, sem criar outro sistema de autenticação. Decisão final de revogação é revalidada na mesma transação da rotação; logout e refresh concorrentes não podem deixar uma sucessora ativa após saída confirmada.

Serialização server-side obrigatória: lock transacional PostgreSQL por userId, adquirido por login/emissão, refresh, sign-out, logout-all e troca/reset; quando necessário, adquirir lock de família depois do de usuário, sempre nessa ordem. Revalidar credencial/família sob esse lock. Bcrypt pode ocorrer antes do lock para evitar espera cara, mas emissão só prossegue se o hash/credentialVersion reconsultado não mudou. Troca/reset incrementa credentialVersion e revoga famílias na mesma transação. Se reset confirma primeiro, login que validou a senha antiga antes dele não emite sessão utilizável. PG entre duas instâncias, não lock em memória de processo, é a autoridade. Requisições de dados falham fechadas com503 em indisponibilidade do banco, não401 inventado nem autorização em cache não invalidável.

Backend faz rotação e consumo em transação com condição de token ativo e mantém a expiração original. Reutilização comprovada segue a revogação de família existente. Frontend usa single-flight; web serializa login, refresh, sign-out e logout-all no mesmo lock por origem, não apenas refresh. Comunicação entre abas transmite lifecycle/generation sem tokens. Sem suporte necessário, bloquear renovação compartilhada insegura e oferecer recuperação explícita, sem fallback de token longo em storage.

Logout local imediato marca intenção pendente persistente não secreta no web e notifica as abas. Antes de restaurar/renovar ou iniciar outro login, o app resolve essa saída no servidor sob o mesmo lock. Native guarda somente a credencial necessária à revogação pendente em SecureStore, com marcador que proíbe usá-la para renovar. Falha/offline mantém UI desconectada e a informação de revogação não confirmada; reconexão reenvia sign-out idempotente, não refresh. Só confirmação remota limpa a pendência. Não prometer que credencial antiga já foi revogada offline.

Mensagem da saída offline: “Você saiu neste aparelho. A confirmação da saída depende da conexão.” Se tentar entrar enquanto pendente: “Restabeleça a conexão para concluir a saída e entrar novamente.” Preservar dados não secretos da tarefa e nunca reabrir área protegida. Falha de persistir o próprio marcador não é suprimida nem tratada como saída durável: informar que precisa conexão para finalizar, mantendo acesso local encerrado enquanto aberto.

Logout+novo login não concorrem: o novo login espera conclusão da saída anterior. Resposta/cookie tardio de família revogada não recupera acesso porque middleware/refresh revalidam a família; não liberar nova mutation de sessão enquanto uma operação anterior tiver resultado ambíguo. Testar também Set-Cookie tardio/abort no navegador: geração React sozinha não protege o cookie. Se não for possível comprovar ordenação e limpeza nessa topologia, impedir liberação da persistência web em vez de afirmar sucesso.

Timeout de refresh é resultado ambíguo, não prova de credencial inválida: não repetir automaticamente o token possivelmente consumido. Nativo sem sucessor confirmado encerra o acesso local e mantém a recuperação pendente. Usa o refresh anterior exclusivamente no sign-out idempotente que revoga sua família, sob o lock comum; nunca usa esse refresh para renovar. Só depois de confirmação da revogação libera novo login. Offline mantém a pendência e sua mensagem, sem reabrir acesso protegido. Contexto público/draft é preservado. Perda de resposta de cookie web e duas abas são casos obrigatórios de homologação.

A adoção do identificador de família exige rollout do contrato e tratamento explícito de JWTs legados; não há garantia de revogação instantânea no backend atual. Release precisa decidir corte controlado de sessões antigas e mensagem de novo login, sem migração invisível de credenciais.

Referência: [coordenação por origem — Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).

## D04 — Identidade e permissões

**Escolha:** campo persistido accountType com CLIENT/BARBER/OWNER/PLATFORM_ADMIN. `/me` fornece accountType e emailVerifiedAt; `/me/barbershops` mantém papel OWNER/BARBERMAN e status da unidade. Tipo global não substitui membership.

Cadastro público cria CLIENT. Criar barbearia pelo fluxo OWNER existente atualiza a mesma conta para OWNER na transação correspondente; intenção de onboarding não concede acesso. Aceite profissional de CLIENT torna a mesma conta BARBER junto do vínculo. OWNER que atende continua OWNER. Remover o último vínculo BARBER não rebaixa o tipo. Gestor não nasce por signup nem por atributo enviado pelo usuário: provisionamento restrito operacional.

Retomada OWNER explícita: cadastro → confirmar e-mail → login → concluir criação da barbearia → área OWNER. Persistir onboardingIntent=OWNER como metadado de jornada na conta criada, sem papel/permissão; `/me` retorna esse hint até concluir a criação. Assim o retorno em outro navegador não transforma o cadastro em jornada CLIENT nem depende somente de storage local. Signup já existente retorna conflito e orienta login; intenção explícita de criar barbearia é retomada após login sem alterar a conta pública por e-mail. Confirmação informa “Entre para continuar seu cadastro”; OWNER só é atribuído depois de criação autorizada.

CPF e e-mail canônicos identificam conta única; backend não sobrescreve credenciais/CPF de cliente ao vinculá-lo. Migração de dados legados exige inventário de conflitos. Backfill determinístico: preservar gestor provisionado explicitamente; entre os demais, OWNER real tem precedência sobre membership BARBERMAN; depois BARBER e então CLIENT. PLATFORM_ADMIN nunca é inferido de e-mail/seed. Dados contraditórios não são resolvidos por merge automático.

Gates frontend usam tipo e vínculos vindos do servidor. UNKNOWN não vira BARBER nem OWNER por default. Usuário sem unidade tem acesso à sua área/convites, sem setup de proprietário automático. Papel operacional de uma unidade não autoriza outra.

## D05 — Cadastro profissional iniciado pelo proprietário

**Escolha:** proprietário informa nome/CPF/e-mail e cria cadastro profissional pendente. Reutilizar o domínio de convite e a criação de membership, acrescentando a identificação profissional necessária; não manter dois fluxos que duplicam contas.

CPF existente: só permitir o cadastro quando o e-mail fornecido identifica a mesma conta; vincular internamente e entregar solicitação ao e-mail já pertencente à conta. Divergência retorna conflito genérico sem informar o e-mail existente. Aceite exige login do titular correto e preserva senha/ID/histórico. Dados enviados pelo proprietário não alteram nome, e-mail, CPF ou senha de conta existente. A resposta OWNER não revela dados pessoais de contas externas.

CPF novo e e-mail livre: cadastro pendente do OWNER precede qualquer ativação profissional. O titular define sua senha pela ativação desse cadastro, confirma e-mail antes de login e responde explicitamente ao convite; não pode obter tipo BARBER por signup público. Revalidar CPF/e-mail em transação na ativação. Se ambos agora identificam a mesma conta, retornar account_already_exists e exigir login/aceite dela; nunca aplicar a senha informada na ativação à conta existente. Se apenas um identificador coincide, rejeitar identity_conflict. CPF novo com e-mail já pertencente a outra conta é rejeitado desde a criação.

Matriz de identidade: (livre,livre) → pendente; (mesma conta,mesma conta) → reusar após login; (CPF existente,e-mail diferente/livre) → conflito; (CPF livre,e-mail existente) → conflito; (duas contas diferentes) → conflito. Normalização e índices únicos são rechecados na transação; CPF válido não prova identidade civil. A autorização continua sendo posse do link de ativação e login/verificação do titular, não conhecimento de CPF pelo OWNER.

Mensagens de recuperação: OWNER em conflito recebe “Confira os dados com o profissional; não foi possível associar este cadastro”, sem e-mail existente revelado. Titular em account_already_exists recebe “Entre na sua conta existente para continuar. Se precisar, recupere sua senha”; senha da ativação não muda essa conta. Preservar unidade/convite correto após login. Conta errada recebe orientação para trocar de conta, sem expor identidade do destinatário.

Endpoints previstos do cadastro e seus DTOs estão no contrato projetado abaixo, a entregar a Álvaro; não são disponibilidade da main. Reutilizar convite/membership, associando metadados de cadastro profissional e consumo de ativação. Ativação cria a conta e registra consumo atomicamente, mantendo o convite PENDING para resposta explícita posterior. Revogação/ativação competem por estado válido; cadastro de CPF existente não precisa redefinir senha. Aceite/recusa por ID e rotas por token compartilham a regra de identidade e transição.

Não mudar o tipo do gestor nem substituir OWNER por BARBER ao adicionar função de atendimento. Conta/convite e vínculo são objetos distintos; revogar convite pendente não apaga usuário.

Dados do cadastro pendente têm finalidade de ativar o profissional daquela unidade e acesso restrito ao OWNER autorizado/titular. Identificadores/name/e-mail/CPF duplicados do pendente são removidos ou anonimizados 30 dias após resposta, revogação ou expiração; metadados mínimos de ID/estado/tempos/referência à conta podem permanecer para consistência. Não apagar CPF/credencial da conta existente ou conta já ativada nesse cleanup. Nome de cadastro arquivado pode ser null no DTO; não conservar CPF pendente indefinidamente. Bloquear saneamento automático de colisões legadas para tratamento explícito.

## D06 — Links, confirmação e recuperação

**Escolha:** e-mails novos usam URL HTTPS do frontend com paths dedicados e token no fragmento: `/verify-email#token=...`, `/reset-password#token=...`, `/invitation#token=...` e `/activate-barber#token=...` quando houver cadastro profissional novo. Fragmento não é enviado como query HTTP ao hosting; o app o captura e manda token apenas no corpo da ação/resolver. FRONTEND_URL deve ser explícita por ambiente, sem fallback para host da API nos links novos. Parser aceita query dos links legados somente na compatibilidade descrita abaixo.

Capturar/remover o segredo de URL antes de inicializar analytics/terceiros, mantê-lo apenas na memória necessária e definir Referrer-Policy no-referrer na resposta HTTP da página desde o primeiro carregamento. Backend redige query, Authorization, Cookie e campos de senha/token nos logs; adaptar originalUrl/body de erro atuais. Verificar hosting/access logs com tokens fictícios; não afirmar confidencialidade de logs que não foram inspecionados. Não consumir token ao abrir tela.

Nova confirmação por POST no backend; emissão de e-mails migra ao path frontend. GET legado de confirmação passa a redirecionar ao frontend com fragmento, sem consumir token; preservar validade e contexto dos links já emitidos, documentando a alteração do retorno JSON para redirect. Compatibilidade termina após a maior validade configurada dos tokens antigos; não remover sem teste de links emitidos. Rotas token-based POST de convite permanecem válidas. Link legado em query exige redaction de hosting durante a transição e gate de release, não promessa de URL sempre secreta.

Aplicativo instalado pode abrir o mesmo HTTPS por Universal/App Links **após** configurar associações e testar iOS/Android; sem isso, o link funciona no web. Scheme existente pode auxiliar retorno explícito; não declarar deep link funcional só porque há configuração no app.

Cadastro → solicitação de confirmação → confirmação → login. Erro de envio depois de cadastrar mantém conta criada e oferece reenvio. Reset não confirma e-mail e não faz login. Consumo de token/reset é atômico; reabrir confirmação de conta já verificada informa esse estado sem fabricar sessão.

Convite recebido por link: POST `/api/invitations/preview` resolve o token ao invitationId correto e contexto mínimo, sem conceder acesso. Preview de ativação profissional tem endpoint próprio. Depois dessa resolução, guardar somente purpose+ID+expiresAt como intenção temporária, sem token secreto persistente no web; obter estado pelo detalhe autenticado após login. Nunca escolher o primeiro convite da lista. Token necessário a verificação/reset/ativação fica só na memória da tela; depois de reload perdido, orientar reabertura do e-mail. Não consumir ao abrir.

Links legados `/?token=...` são reconhecidos exclusivamente como convite da emissão antiga e encaminhados ao resolver de convite, sem adivinhar finalidade. Link inválido/expirado/respondido apresenta estado seguro ou indisponibilidade, sem associar outro convite. Contexto por ID sobrevive ao login, mas não concede permissão. Nova conta encontra convites próprios pela lista se a intenção se perder. Tela OWNER/booking conserva intenção legítima, sem executar mutations após login automaticamente.

## D07 — Política de senha e proteção de envio

**Escolha para revisão:** mínimo de 15 caracteres Unicode para senha nova em criação/ativação/reset/troca, sem exigências artificiais de composição; máximo de 72 bytes UTF-8 enquanto bcryptjs for mantido, rejeitando excesso sem truncamento silencioso. Contar caracteres por code point, não unidades UTF-16. Login preserva senhas antigas válidas, sem forçar troca em massa nem normalizar silenciosamente a senha já existente. Frontend e backend aplicam a mesma regra e permitem colar/usar gerenciador de senhas. O máximo em bytes é uma limitação de compatibilidade do hashing atual; não declarar conformidade integral com NIST.

Referência primária para o mínimo no cenário de senha sem MFA: [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/).

Troca autenticada requer senha atual e revoga todas as sessões; usuário entra novamente com a nova senha. Não guardar senha para efetuar login automático depois de reset/troca.

UI explica senha nova antes do envio: “Use pelo menos 15 caracteres. Uma frase fácil de lembrar funciona.” Para excesso: “Essa senha é longa demais. Use uma frase mais curta”, sem exigir entendimento de bytes. Login legado não usa essa validação de criação. Depois de reset: “Senha atualizada. Entre com a nova senha”; se e-mail não confirmado, seguir ao reenvio/confirmação, sem dizer que reset verificou a conta. Token perdido/expirado oferece reabrir e-mail ou pedir novo link, conforme a finalidade.

Login e pedidos de confirmação/recuperação/reenvio precisam rate limit e resposta genérica, com Retry-After no 429. Contador compartilhado/atômico em PostgreSQL existente, não Map local por processo ou novo fornecedor. Defaults propostos: cinco falhas de login por par e-mail normalizado+IP em 15 minutos, mais 30 tentativas por IP em 15 minutos; pedidos de envio até três por e-mail por hora e 20 por IP em 15 minutos, com feedback genérico para contas existentes e desconhecidas. Configuráveis por ambiente e testados sob concorrência. Não bloquear conta globalmente porque um terceiro errou a senha; não registrar e-mail/IP cru no contador quando uma chave derivada basta.

Counter é incremento/upsert atômico por janela da hora PostgreSQL, chave HMAC de e-mail/IP/endpoint com segredo privado e índice único keyHash+windowStart. Limitação precede comparação cara de senha e envio; não usar IP fornecido por header arbitrário. Retenção24h de buckets expirados, cleanup diário em lotes de1000 na manutenção backend, sem criar automação ou fornecedor nesta revisão. Saturação não vira erro de senha: 503 service_unavailable com Retry-After, sem repetição automática de mutation.

Limites DB: lock_timeout4s e statement_timeout10s nas transações deste desenho, ambos menores que15s HTTP; rollback e503 quando a espera/saturação excede o limite. Reutilizar pool configurado e respeitar orçamento de conexões do ambiente; não configurar trust proxy=true indiscriminadamente nem criar pool por requisição. Verificar índices para família e counters, medir20 sessões em duas instâncias contra orçamento de conexões contratado, incluindo espera/queries. Sem orçamento/medição ou operação controlada de cleanup, não liberar o bloco nem declarar escala/SLA.

## D08 — Convites por ID e leitura

**Escolha confirmada:** novas rotas POST `/api/invitations/:invitationId/accept|decline`, mantendo as atuais por token. Titular autenticado e destinatário devem corresponder; UUID do path e userId de sessão não podem ser substituídos por body/query. Nenhum token/hash no feed. Reutilizar respostas atuais.

Transição PENDING→ACCEPTED/DECLINED e revogação competem por estado atômico. Aceite e membership ficam na mesma transação. Repetição de convite terminal falha de modo seguro e frontend reconsulta para mostrar a situação real; não duplica vínculo.

Responsável pela autoridade de IDs de recurso: backend de cada bloco. Nossa execução usa extração específica do path nas rotas por ID; Álvaro aplica o mesmo requisito nos demais controllers/adapters novos. Homônimos de path/actor em body/query são rejeitados400, não reinterpretados. Testar invitationId,notificationId,shopId,bookingId e barbermanId; não presumir que o adapter atual foi corrigido.

Leitura: PATCH `/api/notifications/:notificationId/read`, sem userId no body, restrita ao destinatário. Retorno `{notification:{id,readAt}}`; readAt servidor UTC, preservando primeira leitura em chamadas repetidas. Frontend chama ao abrir detalhes; failure mantém pendência e detalhes acessíveis. Leitura não responde convite e resposta de convite não marca leitura implicitamente.

UI mantém três resultados separados: leitura, resposta do convite e carregamento de acesso. Falha de leitura nunca esconde aceite confirmado. Depois de200accepted e falha de reconsulta, mostrar “Convite aceito. Não foi possível carregar o acesso. Tente atualizar”, com aceitar/recusar desativados; reconsultar também `/me` para obter tipo global, além de vínculos/feed/convite. Timeout/terminal reconsulta detalhe e exibe aceito, recusado, revogado ou expirado conforme estado real. Nunca inferir que falha visual desfez a resposta.

Preview/detalhe autenticado do convite por ID evita depender de ele ainda aparecer na lista PENDING: GET `/api/invitations/:invitationId` retorna unidade, role, status e expiresAt somente ao destinatário. Permite mostrar convite expirado/respondido em notificação antiga sem revelar tokens/CPF/e-mail de outra pessoa. Contrato adicional backend de Álvaro; responder por ID permanece nossa extensão.

## D09 — Feed e limites de notificações

**Escolha:** feed paginado por cursor de criação+ID, 20 itens por página e máximo 100; conservar os campos dos itens legados, mas retirar a lista ilimitada na versão do novo frontend. Contador remoto unreadCount só quando implementado, não calculado como total a partir da página carregada. Invalidar após leitura/ação; reconsultar ao abrir/focar, sem polling contínuo.

Evento funcional entregue continua sendo convite. Confirmação/cancelamento de reserva são pendências futuras separadas, não critério de conclusão desta integração nem tarefa enviada/aceita por Álvaro. Não anunciar entrega de e-mail como push nem afirmar inbox completo de eventos ausentes. Convite recebido antes de criar conta pode ser encontrado pela lista autenticada independentemente de aviso retroativo.

## D10 — Reserva de vários serviços

**Escolha confirmada:** um POST com serviceIds únicos, um profissional, uma unidade e um intervalo contínuo. Backend valida serviços ativos da mesma unidade, vínculo elegível do profissional, unidade ativa, e-mail confirmado, passado, jornada/exceções e conflitos. Atender é capacidade inerente do OWNER nesta entrega, conforme decisão do usuário: membership OWNER em unidade ativa é elegível, sem flag profissional adicional. Lista, disponibilidade e reserva aplicam a mesma regra; falta de jornada efetiva resulta em ausência de slots.

Contrato futuro POST `/api/bookings`: `{serviceIds,barbermanId,date,startTime,expectedTotalPriceInCents,expectedDurationInMinutes}`, com header Idempotency-Key por tentativa lógica. Unidade vem dos serviços, todos devem concordar. Backend calcula total, duração e endTime; valores esperados só detectam mudança de preço/duração, não autorizam cobrar valor fornecido pelo cliente. Mudança devolve 409 e nova revisão explícita. Resposta inclui booking e snapshots/totais reais.

Legacy serviceId pode ser normalizado para lista de um; se enviado junto com serviceIds incompatível, rejeitar. endTime legado, quando presente, deve coincidir com cálculo. Snapshot de cada item, carrinho e reserva são transacionais; nenhuma lista é simulada por várias reservas.

Conflito é do profissional no instante real, inclusive entre unidades. Duração/instantes calculados no fuso da unidade; data civil não é convertida pelo fuso do aparelho. Serializar disputa no banco por profissional/intervalo, não confiar em check anterior ao insert.

Idempotency-Key é UUIDv7, vinculado ao usuário e hash do payload normalizado; timestamp da chave serve somente à janela de replay, não autorização. Janela 24 horas; chave mais velha retorna 409 idempotency_key_expired, independentemente de cleanup, e horário futuro acima de cinco minutos retorna 400. Frontend usa referência de hora do servidor e a mesma chave/payload para recuperar resposta perdida dentro da janela; após expirar consulta a tentativa por requestId antes de permitir nova revisão/chave, como descrito adiante. Não repetir automaticamente uma tentativa antiga.

Referência de hora: serverTime ISO UTC em login/refresh e GET/me, originado da hora PostgreSQL após locks. Frontend usa essa referência com tempo decorrido monotônico/latência e reconsulta quando não houver referência válida após retomada, sem depender do relógio civil do aparelho. Validação de chave, prazos de família, counters e cleanup usam hora PostgreSQL após lock (clock_timestamp), com limites exatos documentados: 24h é expirada; futuro maior que5min é inválido. UUIDv7 antigo não passa a novo após limpar seu registro. Testar aparelho errado, bordas, duas instâncias e limpeza.

Registro idempotente e reserva são comprometidos na mesma transação. Disputa pela mesma chave espera resultado até limite de lock; timeout da disputa retorna 409 booking_request_in_progress/Retry-After, sem segundo insert. Mesmo payload concluído retorna o booking existente; diferente retorna409 idempotency_key_conflict. Se o booking foi apagado por cancelamento dentro da janela, conservar marcador e retornar409 booking_no_longer_available, sem recriar. Falha/rollback não deixa booking parcial. Metadados e snapshots de replay têm retenção mínima da janela e cleanup definido; não prometer replay eterno.

UI em timeout: “Ainda não foi possível confirmar o resultado”; preserva chave/payload e oferece verificação explícita. Chave expirada não prova ausência: consultar reservas pessoais pela mesma clientRequestId antes de oferecer nova tentativa; consulta indisponível mantém a incerteza e não libera segundo POST com chave nova. Booking mantém clientRequestId durante sua existência, independentemente do cleanup do registro de replay. GET/me com filtro requestId retorna só correspondência própria, em qualquer período, sem inferir ausência a partir de uma página upcoming. Se consulta autoritativa confirmar nenhuma reserva ativa, nova revisão explícita pode gerar chave nova. Preço/duração mudados mostram anteriores/atuais, exigem confirmação e reconsulta de slots; nunca substituir silenciosamente o que foi aprovado.

## D11 — Consultas pessoais, profissionais e agenda

**Escolha:** GET público `/api/barbershops/:shopId/professionals` devolve somente id, nome de exibição e avatar de profissionais elegíveis, sem CPF/contatos privados. Slots reserváveis são consultados após escolher profissional. Jornada individual pode herdar a geral da unidade quando não houver própria; exceções individuais se aplicam.

GET `/api/bookings/me` e GET `/api/bookings/:bookingId` dão ao consumidor consultas próprias, com paginação e identidade da sessão; o backend autoriza também leitura profissional legítima do recurso, sem IDs arbitrários. Agenda profissional ganha filtro shopId validado para não misturar unidades e não simular visão de equipe do OWNER com dados próprios.

Cancelamento existente permanece com a permissão publicada do profissional responsável até um contrato específico ampliar isso. Edição, cancelamento pelo consumidor/OWNER de agenda alheia e histórico persistente de cancelados não são fabricados nesta integração. A UI só oferece ações contratadas; ausência de status/pagamento é tratada como ausência, sem receita presumida.

## D12 — Gestor e manutenção

**Escolha:** PLATFORM_ADMIN tem login comum, sessão curta e destino inicial protegido. Provisionamento restrito operacional; nenhuma rota pública atribui esse tipo. Não implementar administração de planos, métricas ou permissões de negócio de funcionalidades futuras. Backend deve proteger/remover endpoints de manutenção pública; isso é pré-requisito de liberação do ambiente, não botão na interface.

## D13 — Divisão de tarefas e conclusão

| Bloco | Responsável | Dependência / validação |
| --- | --- | --- |
| Sessão web/native, identidade, senha, links, token atômico | Álvaro backend; Wellington frontend | Contrato e homologação de cookie/DB/e-mail |
| Cadastro profissional por CPF e tipos permanentes | Álvaro backend; Wellington telas | Conta única e ativação/aceite concorrentes |
| Aceite/recusa por ID e transição canônica compartilhada | Nossa execução backend+frontend | Após schema/regras de identidade do bloco Álvaro; HTTP/PG e regressão por token |
| Leitura, preview/detalhe por ID e paginação | Álvaro backend; Wellington frontend | Contratos de notificação e titularidade; eventos de reserva ficam em pendência futura |
| Reserva múltipla, idempotência, profissionais e consultas | Álvaro backend; Wellington frontend | Transação, conflito, timezone e response-loss |
| Gestor inicial/manutenção | Álvaro backend; Wellington gates/destino | Identidade/provisionamento e prazo curto |

Adendo de execução solicitado pelo usuário após esta revisão: preparar prompt para seu agente executar o conjunto completo, incluindo o seedDB. O executor deverá integrar ou completar os pré-requisitos backend projetados em checkout de trabalho revisável, preservando o trabalho do Álvaro; as atribuições humanas acima continuam como referência de responsabilidade/revisão, não como justificativa para simular endpoint ausente ou entregar somente frontend parcial. Nenhum trabalho foi enviado a Álvaro nem nenhum código foi alterado por esse adendo.

Planos executivos foram separados por domínio, com interfaces, arquivos, testes e dependências. Planos não são prova de execução. Estado por bloco: contrato projetado, backend entregue, frontend integrado e homologado são marcos distintos.

| Ordem | Plano | Gate para integração real |
| --- | --- | --- |
| 1 | [Autenticação/sessão e gates](planos/2026-10-11-integracao-autenticacao.md) | Contratos de identidade/sessão, cookie/proxy e e-mail |
| 2 | [Convites/cadastro profissional e nossa extensão](planos/2026-10-11-integracao-convites.md) | Schema/regras de Álvaro antes da transição comum; ID/token no PG |
| 3 | [Notificações e leitura](planos/2026-10-11-integracao-notificacoes.md) | Leitura/detalhe/paginação de Álvaro; fluxo de convites |
| 4 | [Reserva múltipla e agenda](planos/2026-10-11-integracao-reservas-agenda.md) | POST múltiplo/ledger/profissionais/consultas de Álvaro |
| 5 | [SeedDB e contas fictícias verificadas](planos/2026-10-11-seeddb-autenticacao.md) | Planejamento read-only antes de apply; schema final e banco isolado para smoke |

Integração de navegação/arquivos compartilhados é serializada; testes com fixtures podem preceder entrega de endpoints, mas gatesHTTP/PG/web/native não. A self-review dos planos verificou cobertura D01–D13, ordem de produção/consumo de interfaces, dono da transição e cenáriosS/C/U. Passos estão inicialmente NOT EXECUTED.

Propriedade de componente compartilhado: nossa extensão assume a transição canônica de resposta a convite e os repositories/use cases accept/decline/revoke necessários à exclusão de concorrência, servindo tanto ID quanto token. Álvaro é dono de schema/migrations de accountType/credentialVersion e cadastro profissional, da matriz de identidade e interfaces de usuário. Essas entregas vêm primeiro. Nossa transação aplica as regras já definidas de titular/CPF e promoção CLIENT→BARBER, preservando OWNER/gestor, junto do membership; não cria uma política de identidade alternativa. Nossa entrega de endpoint por ID pode ser testada na baseline antiga, mas não é homologação do fluxo profissional completo sem as dependências de identidade/ativação. Arquivos compartilhados recebem um único dono durante essa etapa; sem edições concorrentes dos dois responsáveis.

Dados/código legado preservados. Sem merge/push/deploy/migração/GitHub issues alteradas nesta revisão. Antes de release, executar typecheck/test/build frontend, suíte/TypeScript/Biome backend, HTTP com PG isolado, e-mails e web/nativo reais. Gates críticos não podem ser dispensados por mock ou sucesso Vercel.

## D14 — SeedDB fictício verificado para testes

Requisito adicional confirmado pelo usuário: todas as contas fictícias do seed já devem nascer verificadas e contas antigas comprovadamente gerenciadas devem receber confirmação se NULL. O código atual já faz isso nos INSERTs, mas não no caminho de reutilização; a [análise de seed](ANALISE_SEEDDB_AUTENTICACAO_2026-10-11.md) registra fonte, escopo e efeitos colaterais de dry-run/verificador.

Escolha: confirmar somente a população de fixtures com identidade/ownership aprovados, preservando primeira data, ID, senha e histórico. Alternativas rejeitadas: desabilitar verificação global, defaultNow em todos os cadastros, UPDATE de todos osNULLs/domínio e reset/recriação do banco existente. Cadastro real continua pendente e testes negativos de403 permanecem. Atualização idempotente não envia SMTP para fictícios.

Antes de apply, inspeção sem DDL/credenciais/manifesto/rollback identifica candidatos/conflitos. Registry sozinho não prova criação: validar namespace/logicalKey/ID/e-mail/CPF e provenance; colisões e registros sem prova ficam bloqueados. Fixtures de CPF inválido recebem valores sintéticos válidos, com mapa legado explícito somente para demo reconhecida. Nenhum CPF real é alterado por essa exceção.

Verificação SQL por população gerenciada e smoke HTTP de todas as contas ocorrem em banco isolado. Verificador antigo importaapp e cancela/recria reservas: não é ferramenta read-only. Gestor fictício, quando necessário para #35, é provisionado somente via operador/seed restrito, após remover/proteger manutenção HTTP pública. Nenhuma rota pública ganha privilégio de provisionamento.

PlanoS1–S4 trata criação, reaplicação/backfill, fixtures, dry-run e confirmação de que usuário externo continua não verificado. A aprovação anterior D01–D13 não representa revisão histórica deste adendo; ele corresponde à nova instrução explícita do usuário. Revisão adicional do árbitro concluiu APPROVED para D14, quinto plano e prompt integral, sem correções obrigatórias. “Todas as contas seed” inclui as três básicas, as vinte demo e qualquer fixture adicional realmente provisionada; medir pelo conjunto lógico esperado, não pela contagem global. Essa aprovação não comprova banco atualizado nem autoriza apply em ambiente existente/remoto.

## Registro de revisão sequencial

### Registro de escolhas, alternativas e fundamento

Alternativas abaixo foram consideradas pelo designer a partir do contrato entregue, do planejamento anterior e das opções debatidas com o usuário. Não são novas propostas de funcionalidade nem votos atribuídos aos revisores. Escolhas já confirmadas pelo usuário permanecem fechadas.

| Decisão | Alternativa considerada | Escolha e motivo |
| --- | --- | --- |
| D01 — arquitetura | SDK do PR36 ou BFF com sessão própria | AuthApi/engine atuais: contrato JWT entregue e uma autoridade backend, sem substituir arquitetura |
| D02 — web | API em subdomínio mesmo site; refresh em storageJS | Cookie protegido com `/api` proxy: evita depender de terceiro domínio e conserva proteção aprovada |
| D03 — ciclo | Refresh com prazo renovado indefinidamente; revogar só refresh e esperar JWT expirar | Prazo absoluto e família verificada: atende30d/8h e revogação real; timeout fecha por sign-out, não retry |
| D04 — identidade | Inferir tipo somente dos vínculos, como a UI atual | Tipo global persistido+membership: distingue BARBER sem unidade e gestor, sem inferir permissão |
| D05 — profissional | Convite só por e-mail da main; criar cadastro BARBER separado de CLIENT | Pendência iniciada por OWNER/CPF e mesma conta: preserva decisão contra duplicidade e credenciais |
| D06 — links | GET direto da API que confirma e retorna JSON; raiz com token sem finalidade | Tela por finalidade e açãoPOST, com fragmento nos novos links: UX de app e menos exposição no hosting |
| D07 — senha/limites | Manter mínimo8 somente no reset e cadastro sem política uniforme | Mínimo15 novo, login legado preservado e limitebcrypt explícito: cenário semMFA com regra uniforme; PG compartilhado evita contador por processo |
| D08 — ações/leitura | Exigir link do e-mail para responder; marcar leitura manualmente | Resposta por ID e leitura nos detalhes: ambas aprovadas pelo usuário, com autenticação e operações independentes |
| D09 — feed | GET ilimitado atual; polling contínuo | Cursor20/max100 e refetch por foco/ação: custo limitado e nenhuma promessa de push |
| D10 — reserva | Um serviço da main; POST separado por serviço; retry com chave nova após timeout | Lista única/transação e tentativa identificada: preserva multisseleção e impede confirmação/duplicação indevida |
| D11 — consultas | Usar agenda profissional como agenda pessoal/equipe e derivar status/receita | Contratos pessoais/profissionais separados, privacidade e limites reais; não simular recursos ausentes |
| D12 — gestor | Signup público com tipo gestor; incluir planos/métricas agora | Provisionamento restrito/destino inicial: mantém escopo de autenticação e protege o tipo privilegiado |
| D13 — execução | Misturar tudo na #32 ou editar componentes comuns com dois donos | Planos por domínio e dono único da transição: revisão isolada, dependências e responsabilidades claras |

Objeções e mudanças vinculadas a cada decisão constam nas tabelas S/C/U. Nenhuma objeção foi descartada sem justificativa.

| Rodada | Estado | Objeções e resolução |
| --- | --- | --- |
| Cético | RESPONDIDO | S01–S08 aceitas; revisões e condições registradas abaixo |
| Guardião de restrições | RESPONDIDO | C01–C07 aceitas; condições e responsáveis registrados abaixo |
| Defensor do usuário | RESPONDIDO | U01–U06 aceitas; fluxos, mensagens e recuperação registrados abaixo |
| Árbitro | APPROVED | Após duas correções documentais finais, aprovou desenho; nenhuma objeção rejeitada ou definição de produto pendente |
| Adendo seed/prompt | APPROVED | Revisão adicional confirmou ownership, idempotência, separação read-only/apply e cobertura integral; nenhuma correção obrigatória |

O registro D01–D13 contém escolhas, alternativas e fundamentos. Cada objeção será registrada abaixo com ID, decisão referenciada, resposta e mudança. O designer principal não aprova sozinho o resultado.

Arbitragem final: aceitas S01–S08, C01–C07 e U01–U06; rejeitadas nenhuma. Primeiro veredito REVISE pediu explicitar fechamento do refresh nativo ambíguo por sign-out idempotente antes de novo login e registrar alternativas de D03–D13. Ambas foram aplicadas e verificadas na segunda arbitragem, cujo resultado foi APPROVED para planejamento. Restam execução/dependências/homologação, não decisões de produto pendentes neste recorte.

### Resposta à revisão cética

| Objeção | Resolução pelo designer | Prova de execução requerida |
| --- | --- | --- |
| S01 — transportes/cache | ACEITA: contrato web/native, rejeições e no-store/disable cache explícitos em D02 | Cookie/Origin/cache no hosting real isolado |
| S02 — logout tardio/offline | ACEITA: lock de todas mutations, revogação de família na transação, logout pendente e novo login serializado | Duas abas, abort, offline, resposta tardia e reabertura |
| S03 — CPF/e-mail divergentes | ACEITA: matriz rejeita colisões cruzadas; senha de conta existente nunca substituída | Criação/ativação concorrentes e titular errado |
| S04 — OWNER elegível/backfill | ACEITA: atendimento inerente ao OWNER, jornada efetiva; precedência OWNER→BARBER→CLIENT | Mesma regra em lista/slots/reserva e migração isolada |
| S05 — identificar link/convite | ACEITA: resolver por token, contexto por ID específico, detalhe autenticado e regra do link legado | Vários convites, reload/login, expiração e link respondido |
| S06 — interfaces indefinidas | ACEITA: anexo de contratos projetados; não confundir contrato com entrega | Contract tests e alinhamento com a baseline de execução |
| S07 — ciclo da idempotência | ACEITA: janela24h UUIDv7, concorrência, rollback e replay de cancelado definidos | HTTP/PG, clock, mesma chave e timeout |
| S08 — eventos fora do recorte | ACEITA: fora dos critérios e do trabalho atribuído; somente pendência futura | Nenhuma UI anuncia evento não produzido |

### Resposta à revisão de restrições

| Objeção | Resolução pelo designer | Prova de execução requerida |
| --- | --- | --- |
| C01 — lock comum/credencial | ACEITA: PG serializa usuário→família; version/hash revalidado antes de emitir; reset atômico | Refresh/logout/reset/login em duas instâncias sem sucessora indevida |
| C02 — adapter sobrepõe IDs | ACEITA: extração do path por responsável do bloco; homônimos body/query400 | IDs de recurso e ator adulterados não mudam seleção |
| C03 — logs/referrer | ACEITA: links novos com fragmento, redaction, no-referrer e bootstrap antes de analytics; legado verificado | Token fictício ausente em logs/requests externos, erro500 e link antigo |
| C04 — budget/tempo/counters | ACEITA: horaPG, HMAC/index,24hcleanup, locks4s/statement10s e503 controlado | Ensaio20 em duas instâncias, pool/espera/rollback/counter atômico |
| C05 — origem da hora | ACEITA: serverTimePG em sessão/perfil; UUIDv7 validado com mesma autoridade de tempo | Borda24h/futuro5min, relógio errado, cleanup e duas instâncias |
| C06 — dados pendentes | ACEITA: finalidade/acesso restrito; minimização30dias após terminal/expiração | Cleanup remove dados pendentes sem apagar conta/credencial |
| C07 — código compartilhado | ACEITA: dono único nossa transição, Álvaro schema/regras/migração primeiro; gates distintos | ID e token disputam mesma transição; tipo e CPF validados no fluxo completo |

### Resposta à revisão de experiência

| Objeção | Resolução pelo designer | Prova de execução requerida |
| --- | --- | --- |
| U01 — OWNER perde jornada | ACEITA: hint de onboarding sem permissão, sequência completa e retomada em outro navegador | Cadastro novo/existente, confirmação/login e criação sem OWNER antecipado |
| U02 — conflito sem saída | ACEITA: mensagens orientam conferir com profissional ou entrar/recuperar na conta existente | Sem revelar e-mail ou alterar senha, preservar convite específico |
| U03 — senha/token/reset | ACEITA: regra antes de enviar, excesso explicado sem bytes, login legado e reabertura | Acentos/emoji/72–73bytes, reset sem verificação implícita, links/reload |
| U04 — logout parece travar | ACEITA: informar saída local/pendência de conexão e falha do marcador | Offline/reconexão, login bloqueado só pela pendência explicada |
| U05 — leitura e aceite confundidos | ACEITA: estados separados,200aceite não desfeito por refetch; atualizar me/vínculos | Leitura falhou, membership falhou, terminal/timeout e troca de conta |
| U06 — chave expirada duplica reserva | ACEITA: clientRequestId durável, consulta própria exata antes de nova chave; quote explícita | Timeout24h+/cleanup, consulta indisponível e mudança de preço/duração |

## Anexo — contratos projetados para planejamento

Todos são requisitos futuros, não inventário da main. Backend de Álvaro, salvo POST de aceite/recusa por ID sob nossa execução. IDs do recurso vêm do path e ator da sessão; nenhum body define papel/actor. DTOs retornam datas ISO UTC, exceto date civil e HH:mm no fuso explicitado.

Tipos compartilhados:

```ts
type AccountType = 'CLIENT' | 'BARBER' | 'OWNER' | 'PLATFORM_ADMIN';
type InvitationState = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
type SessionDto = {
  access_token: string;
  refresh_token?: string; // exclusivamente transporte native
  accessExpiresAt: string;
  sessionExpiresAt: string;
  serverTime: string;
};
type InvitationDto = {
  id: string; barbershopId: string; barbershopName: string;
  role: 'BARBERMAN'; status: InvitationState;
  expiresAt: string; createdAt: string | null; respondedAt: string | null;
};
type RegistrationDto = {
  registrationId: string; invitationId: string; displayName: string | null;
  status: InvitationState; expiresAt: string; createdAt: string | null;
};
type BookingDto = {
  id: string; barbershopId: string; barbermanId: string;
  clientRequestId: string | null; // null nos registros legados sem tentativa identificada
  date: string; startTime: string; endTime: string; timezone: string;
  services: Array<{ id: string; title: string; priceInCents: number; durationInMinutes: number }>;
  totalPriceInCents: number; totalDurationInMinutes: number;
  status: string | null; paymentStatus: string | null; createdAt: string;
};
```

Paginação projetada de feed/consultas pessoais: cursor opaco com sortAt+ID, limit default20/max100; nextCursor null termina. Para notifications, sortAt=COALESCE(createdAt,scheduledAt), ordenação DESC+ID; para bookings, ordenação por início real+ID, ASC upcoming e DESC past. Cursor inválido retorna400 invalid_cursor. Não reutilizar cursor entre usuários/escopos. NotificationDto conserva campos da análise, com readAt/referências/createdAt nullable. Legacy unpaged será retirado na versão do novo frontend, sem prometer escalabilidade de lista ilimitada.

| Método/path projetado | Request | Sucesso | Erros/autoridade |
| --- | --- | --- | --- |
| POST `/api/users/sessions/auth` | email,password; transporte D02 | 201 SessionDto; web Set-Cookie | 401 credenciais,403 email_not_verified/origem,429 limite |
| POST `/api/users/` | name,email,password,cpf,onboardingIntent? OWNER/CLIENT | 201 `{userId}`; accountType CLIENT | Hint não concede papel;400CPF/policy,409identidade;409não modifica conta existente |
| POST `/api/users/sessions/refresh` | web `{}`+cookie; native `{refresh_token}` | 200 SessionDto; web cookie sucessor | 400 transporte,401 refresh inválido/expirado,403 origem |
| POST `/api/users/sessions/sign-out` | web `{}`+cookie; native `{refresh_token}` | 204; web limpa cookie | Idempotente, revoga família mesmo se token rotacionado;403 origem |
| POST `/api/users/sessions/logout-all` | Bearer; sem body | 204; revoga famílias | Ator autenticado;401/403 |
| PATCH `/api/users/me/password` | currentPassword,newPassword; Bearer | 200 `{passwordUpdatedAt}`; logout obrigatório | 400 policy,401 senha atual, sem relay/login implícito |
| GET `/api/users/me` | Bearer | `{user:{id,name,email,accountType,emailVerifiedAt,avatarUrl,phoneNumber,onboardingIntent},staff:user,serverTime}` | Campos opcionais de contato/hint como null;401 |
| POST `/api/users/verification-email/confirm` | `{token}` | Resposta do confirm atual; verified/alreadyVerified | 400 inválido; sem criação de sessão |
| POST `/api/invitations/preview` | `{token}` | `{invitationId,barbershopId,barbershopName,role,status,expiresAt}` | Bearer do link só concede preview;400 genérico; não retorna destinatário/CPF |
| GET `/api/invitations/:invitationId` | Bearer | `{invitation:InvitationDto}` | 404 igual para ausente/outro destinatário;401/400UUID |
| POST `/api/invitations/:invitationId/accept` | Bearer; sem body | DTO accepted atual | 400 invalid_invitation/already_member;401; não altera ator/path por body/query |
| POST `/api/invitations/:invitationId/decline` | Bearer; sem body | DTO declined atual | 400 invalid_invitation;401 |
| PATCH `/api/notifications/:notificationId/read` | Bearer; sem body | `{notification:{id,readAt}}` | 404 ausente/terceiro; idempotente, primeira data preservada |
| GET `/api/notifications` | Bearer; cursor?,limit? | `{notifications:NotificationDto[],nextCursor,unreadCount}` | 401/400cursor; unreadCount é total próprio no servidor |
| POST `/api/barbershops/:shopId/barber-registrations` | OWNER; `{name,cpf,email}` | 201 `{registrationId,invitationId,status:'PENDING',expiresAt}` | 400CPF,409 identity_conflict,403OWNER; sem dados de conta externa |
| GET mesmo cadastro | OWNER; cursor?,limit? | `{registrations:RegistrationDto[],nextCursor}` | 403; cursor por createdAt+ID |
| POST `/api/users/barber-registrations/preview` | `{token}` | `{registrationId,invitationId,barbershopId,barbershopName,status,expiresAt,requiresActivation}` | 400 genérico; sem CPF/e-mail/credencial; token de ativação com finalidade própria |
| POST `/api/users/barber-registrations/activate` | `{token,password}` | 201 `{userId,invitationId,emailVerificationRequired:true}` | 400token/policy;409 account_already_exists (mesma identidade)/identity_conflict (divergência) |
| POST `/api/barbershops/:shopId/barber-registrations/:registrationId/resend` | OWNER; sem body | `{registrationId,expiresAt}` | Invalida link anterior; sem modificar identidade;400terminal/403/429 |
| DELETE mesmo cadastro | OWNER | 200 `{registrationId,status:'REVOKED'}` | Sem apagar usuário; transição condicional;400terminal/403 |
| DELETE `/api/barbershops/:shopId/barbers/:barbermanId` | OWNER | 204 | Remove BARBERMAN da unidade; não remove OWNER;403/404; accountType mantido |
| GET `/api/barbershops/:shopId/professionals` | Público; unidade ativa | `{professionals:[{id,displayName,avatarUrl}]}` | Sem CPF/contatos;404unidade; avatarUrl nullable |
| POST `/api/bookings` | Corpo D10; Idempotency-Key UUIDv7; Bearer | 201 `{booking:BookingDto}`; replay200 mesmo recurso | 400dados/jornada,403verificação,404serviço,409slot/preço/duração/idempotência |
| GET `/api/bookings/me` | Bearer; scope upcoming(default)/past;cursor?,limit?,requestId? | `{bookings:BookingDto[],nextCursor}` | Consumidor da sessão; requestId filtra exato e ignora período/paginação;401/400cursor; sem exigir membership |
| GET `/api/bookings/:bookingId` | Bearer | `{booking:BookingDto}` | Consumidor próprio ou profissional legítimo;404igual ausente/terceiro |
| GET agenda profissional existente | Bearer; date,shopId? | DTO detalhado existente, com serviço múltiplo | shopId restringe vínculo;403/400; sem visão de equipe artificial |

Erros novos usam `{error:code,message?:string}`; transição continua normalizando formatos antigos da análise, sem tratar todo401/400/500 como logout. Status de booking só é preenchido se o backend o persistir; ausência fica null, não CONFIRMED inventado. Quantidade de serviços só é lista única, sem duplicar IDs para indicar quantidade não contratada.

Toda reserva criada pelo contrato novo devolve clientRequestId igual à chave da tentativa; registros legados sem essa identificação retornam null. Não fabricar chave para histórico antigo nem usar esses registros para afirmar que uma tentativa nova foi encontrada.

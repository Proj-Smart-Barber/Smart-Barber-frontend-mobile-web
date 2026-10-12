# Frontend da issue 32: contexto e contrato observado

> **Atualização de 11/10/2026:** este documento registra o PR #36, que foi fechado sem merge. Seu contrato Better Auth não entrou na `main`. Para as entregas atuais, usar a [análise de integração de 11/10](ANALISE_INTEGRACAO_BACKEND_2026-10-11.md), baseada em `23fca4f859654ef2a862f2cad28df02486208e69`. O conteúdo abaixo foi preservado como histórico e não deve orientar literalmente a implementação.

Data: 2026-10-09. Estado: recorte confirmado pelo usuário; desenho em discussão, anterior ao novo plano de execução. Não houve implementação de autenticação nesta etapa.

## Base e escopo

Issue: [Sprint 3 — Login Unificado e Gestão de Sessões](https://github.com/Proj-Smart-Barber/api/issues/32). PR backend: [#36](https://github.com/Proj-Smart-Barber/api/pull/36), HEAD `4abcf4e59894365b296c0ef00436b39f9cfd0018`, ainda aberto na consulta desta etapa. Frontend inspecionado: `fix/auth-users-endpoint-compatibility@bf650406967f67c21337567544774578b3b5df99`.

Preservar alterações/documentos preexistentes e a cópia isolada do PR em `.tmp/auth-http-pr36-20261009`. Essa cópia foi somente lida; o teste HTTP de CPF preparado anteriormente não chegou a ser executado. A prova isolada do validador não equivale a cadastro real via HTTP/banco.

Responsabilidade frontend da #32: login único, confirmação/reenvio de e-mail, recuperação/redefinição/troca de senha, persistência web/nativa, renovação/saída e roteamento comum conforme identidade. Preservar cadastro e telas OWNER existentes, design system e navegação responsiva.

Áreas completas de cliente (#33), cadastro/aceite de barbeiro/equipe (#34), recursos próprios de gestor (#35) não serão reconstruídos como parte da base #32. Reconhecer seus tipos e definir destinos mínimos seguros é necessário ao login comum; não equivale a concluir as outras issues. O usuário confirmou esse recorte antes do desenho.

## Contrato real do backend

Todos os caminhos abaixo começam com `/api/users`. Este inventário descreve o código do PR, não um teste HTTP executado.

| Ação | Método/caminho | Corpo | Sucesso observado no código |
| --- | --- | --- | --- |
| Login | POST `/sessions/auth` | `email,password,callbackURL?` | 201 `{access_token,token,user,expiresAt}`; relay de Cookie/header quando presente. |
| Renovação | POST `/sessions/refresh` | `{}` web; `{token}` nativo | 200, mesmo formato de login. A sessão precisa ainda estar válida. |
| Saída | POST `/sessions/logout` | Sem campos | 200 `{status:true}`; exige sessão Cookie/Bearer. |
| Saída geral | POST `/sessions/logout-all` | Sem campos | 200 `{status:true}`; exige sessão; sem senha atual no corpo. |
| Perfil | GET `/me` | Nenhum ID arbitrário | 200 `{user,staff:user}`. |
| Unidades próprias | GET `/me/barbershops` | Nenhum ID arbitrário | 200 `{barbershops:[{id,name,role,status,timezone}]}`. |
| Pedir confirmação | POST `/email-verifications/request` | `email,callbackURL?` | 200 `{status:true,message}`, genérico; não comprova envio recebido. |
| Confirmar e-mail | POST `/email-verifications/confirm` | `token,callbackURL?` | 200 `{status:true}`; não entrega token/cookie de nova sessão pelo wrapper. |
| Pedir recuperação | POST `/password-resets/request` | `email,redirectTo?` | 200 `{status:true,message}`, genérico. |
| Redefinir senha | POST `/password-resets/confirm` | `token,newPassword` | 200 `{status:true,message}`; sem sessão nova. |
| Trocar senha | PATCH `/me/password` | `currentPassword,newPassword` | 200 `{status:true,message}`; possível `set-auth-token`/Cookie em headers, token ausente no JSON. |

Identidade: `id,name,email,role,cpf,emailVerified,phoneNumber?,avatarUrl?`. Role global: CLIENT/BARBER/OWNER/PLATFORM_ADMIN. Papel de membership da lista de unidades: OWNER/BARBERMAN, diferente do enum incompleto atualmente descrito no Swagger.

O perfil não contém `accountType`, `accountStatus`, `permissions`, `contractVersion`, membershipId ou membershipStatus. O mapper não deve fabricar esses valores ou ler CPF como prova de permissão. Reconhecer tipo global é diferente de conceder gestão de uma unidade.

Token de sessão é opaco; `access_token` e `token` são aliases. Não há JWT de acesso separado, refresh token separado ou família de rotação explícita nesse contrato. Refresh estende a mesma sessão a partir do instante atual. O backend usa 30 dias para CLIENT/BARBER e 8h para OWNER/PLATFORM_ADMIN; isso diverge do desenho anterior, que previa OWNER30d e limite absoluto. O frontend deve ler a data recebida, sem alterar silenciosamente a decisão de produto ou anunciar outro prazo.

Senha nova: mínimo8 no controller/configuração PR; esse parâmetro difere do contrato anterior15/72bytes para bcrypt. O backend passou ao hashing padrão Better Auth; não copiar os limites do bcrypt ao novo formulário sem decidir a política final com a equipe.

Erros: controllers/adapter respondem `{error:"mensagem"}`; middleware responde `{message:"Sessão inválida ou expirada."}`. Não há código público estável. Schema, token inválido/expirado/usado e senha fraca tendem a400; credencial/sessão/senha atual incorreta401; rate limit traduzido429; outros erros500. Pedido de confirmação não traduz o429 descrito no Swagger. Uma falha interna no middleware é convertida a401: registrar isso como dependência de classificação de erro do backend, sem prometer que o frontend distingue o que a resposta não distingue.

## Links e transportes observados

- Verificação web: `/verify-email?token=...`; nativo: `smartbarber://auth/verify-email?token=...`.
- Recuperação web: `/reset-password/TOKEN`; nativo: `smartbarber://auth/reset-password?token=...`.
- Links não devem consumir token por GET da tela. Capturar sem registrar segredo; confirmar/redefinir por POST ao wrapper. Reabrir link utilizado/expirado precisa mensagem e nova solicitação.
- Confirmação200 não significa login automático utilizável: wrapper não repassa a sessão do SDK. Já autenticado: reconsultar perfil; sem sessão: oferecer login explícito.
- Troca de senha pode fornecer credencial substituta no header. Consumir headers requer resposta HTTP com metadados; o cliente atual entrega apenas corpo. Definir no desenho a continuidade/encerramento da sessão conforme decisões anteriores, sem assumir token JSON.
- Web: preparar Cookie com credentials e topologia de origem compatível. `vercel.json` atual só possui fallback SPA; não há proxy API. A persistência real depende de cookies, CORS, Origin e homologação do hosting.
- Nativo: SecureStore guardará a credencial de sessão prevista no PR; não uma credencial de refresh inventada. Retornar erro explícito se a persistência falhar.

Correções de CPF/origem/uso único foram solicitadas ao Álvaro. O HEAD consultado continua o mesmo da análise anterior. O novo plano seguirá o contrato publicado/observado e deverá ser revalidado após as correções; homologação será condicionada à versão corrigida.

## Lacunas do frontend atual e mapa de responsabilidade

| Local | Alteração a planejar |
| --- | --- |
| `features/auth/api/auth.dto.ts`, `auth.api.ts`, `auth.mapper.ts` | Modelo real de sessão/perfil/erros, headers e datas; retirar fallback por404 como descoberta de tipo. |
| `features/auth/model/use-session.tsx`, `auth-state.ts`, `lib/jwt-helper.ts` | Remover invalidação automática de token nãoJWT; backend autoritativo; distinguir restauração/renovação/falha temporária/saída. |
| `shared/api/http-client.ts`, `shared/storage/token-storage.*`, `index.ts` | Separar Cookie web e Bearer nativo, acesso à metadata, erros de persistência e marcador de saída offline. |
| `entities/staff/model/staff.types.ts`, `app/_layout.tsx`, `(app)/_layout.tsx` | Identidade geral com quatro tipos, gates antes de telas/queries e contexto de unidade confirmado. |
| `LoginForm`, `RegisterForm`, modelos/schemas atuais | Login geral, recuperação e compatibilidade do cadastro OWNER; não redesenhar a jornada pronta. |
| Novas telas comuns de confirmação/reset/troca de senha | Consumir rotas CSG reais, estados/erros de link, reenvio e retorno permitido. |
| Navegação, dashboard/agenda/availability/services view-models | Impedir UNKNOWN/CLIENT/gestor de virarem BARBER por default; chaves por usuário/unidade e refresh de dados sem reiniciar bootstrap. |
| Tests de auth/storage/http/gates | Engine real com promises controladas/clock, token opaco, Cookie/SecureStore, saída tardia, perfil/contrato, regressão OWNER. |

O cadastro OWNER existente é apresentado como cadastro de proprietário, mas o PR cria a conta inicialmente CLIENT e atribui OWNER após criar a barbearia. O desenho deverá preservar essa origem de jornada sem tratar todo CLIENT sem unidade como candidato a OWNER, sem inferir papel global de um ID local e sem repetir criação de barbearia por falha de reconsulta de perfil.

## Reutilização do plano anterior

Usar [plano frontend anterior](planos/2026-10-03-autenticacao-frontend.md) como mapa de padrões/arquivos e decisões, não como contrato literal do PR.

- F01/F02/F03: aplicáveis à #32, com DTOs/transporte/sessão reescritos para contrato observado.
- F04: somente jornadas comuns/login/confirmar/recuperar/trocar senha e preservação OWNER. Cadastro/área CLIENT e catálogo completo são #33.
- F05: somente gates, tipos, unidade/contexto e destinos mínimos. Áreas completas ficam nas respectivas issues.
- F06: pertence à #34; não incluir equipe/aceite/conversão CLIENT→BARBER nesta implementação #32.
- F07: depende de recursos pessoais/profissionais de #33/#34; não inventar API de reservas ausente neste PR.

## Premissas e entendimento confirmado

Escopo confirmado: apenas a responsabilidade frontend da #32, reconhecendo os quatro tipos no login/base e preservando OWNER. Decisões já aceitas de CPF único, cadastro profissional pelo proprietário e futuras funcionalidades permanecem registradas; não precisam de nova discussão de produto.

Premissas herdadas para validar no desenho: web/Android/iOS, design system existente, timeout15s, falha temporária preserva sessão e não expõe dados; primeiro ensaio de desempenho usa referência aprovada de20sessões, sem declarar escala/SLA de produção; backend responde por contratos/e-mail/correções, frontend por transportes/jornadas/cache/UX.

Pendências técnicas: política final de prazo/senha versus PR, topologia web/cookies, classificação de401/500 e relay de credencial/cookie após ações; cobertura de teste real e regressão OWNER. Essas questões serão detalhadas no desenho. Não iniciar implementação antes da validação do desenho/plano solicitada pelo usuário.

## Registro de decisões do recorte 32

| ID | Estado | Decisão e fundamento |
| --- | --- | --- |
| F32-D01 | Confirmada pelo usuário em 2026-10-09 | Implementar a base frontend #32, preservando OWNER e sem concluir funcionalidades específicas #33–#35. |
| F32-D02 | Em discussão | Abordagem recomendada: adaptar AuthApi/HTTP existentes e extrair engine de sessão própria, consumindo wrappers `/api/users` do PR. Alternativa: cliente SDK oficial, que exige novas dependências e integração com endpoints `/api/auth`. |

### Comparação de abordagem

| Abordagem | Vantagem | Custo/limite |
| --- | --- | --- |
| AuthApi existente + engine testável (recomendada) | Consome exatamente o contrato que Álvaro criou, preserva padrões e componentes, centraliza Cookie/Bearer, estado/cache e erro por operação. | Precisamos implementar a coordenação de sessão e validar o transporte real; biblioteca backend não substitui isso automaticamente. |
| Cliente oficial Better Auth para React/Expo | Disponibiliza métodos/hooks do SDK e integração Expo. | Acrescenta dependências e adaptações para `/api/auth`; não reproduz automaticamente os wrappers e controles particulares do PR. Sua viabilidade depende das correções dessas rotas no backend. |

Referência primária da alternativa SDK: [cliente Better Auth](https://better-auth.com/docs/basic-usage) e [integração Expo](https://better-auth.com/docs/integrations/expo).

Premissas da abordagem recomendada, para revisão: tratar token como string opaca e validade como metadata; Cookie protegido no web, sem token longo em storage JavaScript; sessão nativa no SecureStore; nenhum refresh separado inventado. A engine obtém autoridade em `/me`/vínculos e protege a UI contra responses tardias de login/refresh/logout. Autorização do servidor e correções pendentes permanecem responsabilidades do backend.

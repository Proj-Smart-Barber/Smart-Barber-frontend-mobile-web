**Descrição**
Como usuário do Smart Barber, quero entrar por e-mail e senha em uma tela única e ser direcionado conforme meu tipo e permissões.

**Responsabilidades**
- **Front-end — @wellingtonspdev:** integrar login único, confirmação de e-mail, recuperação de acesso, persistência web/nativa, saída e roteamento. Preservar cadastro e telas do proprietário já prontos.
- **Back-end — @AlvaroSena:** garantir conta única por CPF, perfil/tipo/vínculos autoritativos, sessões renováveis e revogáveis, tokens de e-mail e isolamento por unidade. Corrigir erros de autenticação e proteger/remover manutenção HTTP pública.

**Rotas principais**
Ampliar `/api/users/`, `/api/users/sessions/auth`, `/api/users/me` e `/api/users/me/barbershops`. Acrescentar `sessions/refresh`, `sessions/logout`, `sessions/logout-all`, `email-verifications/request|confirm`, `password-resets/request|confirm` e `PATCH /api/users/me/password`.

**Critérios de Aceite:**
- [ ] CPF validado/canônico identifica uma única conta; tipos CLIENT, BARBER, OWNER e PLATFORM_ADMIN sem permissões inferidas.
- [ ] Login identifica o tipo automaticamente; unidade e recursos são autorizados pelo servidor.
- [ ] Sessão persiste até sair/expirar: até 30 dias para usuários e 8 horas para o gestor.
- [ ] Refresh web em cookie protegido e nativo em SecureStore; logout, concorrência e falha temporária não restauram acesso indevido.
- [ ] Confirmação/recuperação usam tokens expirantes e de uso único; senha alterada revoga sessões e links antigos.
- [ ] UX web/mobile segue o design system; regressão OWNER e integração com API/banco/e-mail reais são verificadas.

**Escopo desta entrega:** autenticação. Google/Apple, MFA, planos, métricas da plataforma e recrutamento ficam para evolução futura.

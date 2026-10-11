**Descrição**
Como gestor e dono do Smart Barber, quero me autenticar e acessar uma área privada própria da plataforma.

**Responsabilidades**
- **Front-end — @wellingtonspdev:** integrar login e direcionamento à área do gestor, apresentar conta/saída e impedir acesso indevido por outros tipos de usuário.
- **Back-end — @AlvaroSena:** provisionar PLATFORM_ADMIN por procedimento interno controlado, sem cadastro público; expor perfil/permissões e sessões revogáveis de validade menor.

**Rotas principais**
Login, perfil, confirmação/recuperação e logout da base comum. Provisionamento do gestor por procedimento interno, sem endpoint público de elevação de tipo.

**Critérios de Aceite:**
- [ ] Gestor entra pela mesma tela de e-mail/senha e segue à área administrativa.
- [ ] CLIENT, BARBER e OWNER não recebem acesso administrativo por corpo/URL alterados.
- [ ] Sessão do gestor persiste até sair ou expirar, com limite absoluto de 8 horas.
- [ ] Recuperação de senha e logout revogam as sessões pertinentes; credenciais não ficam no repositório/app.
- [ ] Acesso é validado em web/mobile com API real, sem conceder operação automática em todas as barbearias.

**Escopo atual:** somente autenticação e área privada inicial. Métricas da plataforma, planos, cobrança, controle de funcionalidades por plano e MFA serão evoluções futuras.

**Dependência:** https://github.com/Proj-Smart-Barber/api/issues/32.

**Descrição**
Como cliente, quero criar minha conta, confirmar meu e-mail e acessar minha área para consultar meus agendamentos e me identificar antes de reservar.

**Responsabilidades**
- **Front-end — @wellingtonspdev:** criar cadastro e área do cliente, integrar confirmação de e-mail e recuperação, preservar seleção do catálogo durante o login e bloquear acesso às áreas profissionais.
- **Back-end — @AlvaroSena:** cadastrar CLIENT com CPF único, expor perfil e leitura dos agendamentos do titular, validar conta ativa/e-mail confirmado para a futura confirmação de reserva.

**Rotas principais**
`POST /api/users/` com finalidade CLIENT; `GET /api/users/me`; confirmação/recuperação da base comum; `GET /api/users/me/bookings` por titular autenticado.

**Critérios de Aceite:**
- [ ] Cliente cadastra nome, CPF, e-mail e senha sem criar conta duplicada.
- [ ] Conta autenticada e e-mail confirmado são obrigatórios para permitir agendamento.
- [ ] Login direciona à área do cliente, sem enviar ao cadastro de barbearia.
- [ ] Cliente consulta apenas suas reservas; erro de rede apresenta nova tentativa sem apagar sessão válida.
- [ ] Seleção do catálogo é preservada e revalidada; não apresentar confirmação de reserva como pronta sem a rota real do domínio.
- [ ] Fluxos web/mobile e isolamento de dados são validados com API e banco reais.

**Dependência:** https://github.com/Proj-Smart-Barber/api/issues/32.

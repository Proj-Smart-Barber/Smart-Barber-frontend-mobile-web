**Descrição**
Como barbeiro cadastrado pelo proprietário, quero ativar meu acesso e entrar nas barbearias autorizadas usando uma única conta.

**Responsabilidades**
- **Front-end — @wellingtonspdev:** criar cadastro/listagem de equipe para OWNER e ativação/aceite para o titular; integrar escolha da unidade, estados de acesso e agendamentos pessoais.
- **Back-end — @AlvaroSena:** criar cadastro profissional pendente, preview/ativação/recusa/reenvio/revogação e vínculos por unidade. Aproveitar a conta CLIENT existente pelo CPF, sem alterar ID, senha ou histórico.

**Rotas principais**
`POST|GET /api/barbershops/:shopId/barbers`; reenvio/revogação em `barber-registrations/:id`; `POST /api/users/barber-registrations/preview|activate|decline`; `DELETE /api/barbershops/:shopId/barbers/:userId`.

**Critérios de Aceite:**
- [ ] Cadastro começa pelo OWNER autorizado; barbeiro não se cadastra autonomamente.
- [ ] CPF de cliente existente evolui na mesma conta após aceite autenticado; CPF novo ativa e segue ao login comum.
- [ ] Ativação concorrente, expirada, revogada ou por outra conta não duplica identidade nem concede acesso.
- [ ] Barbeiro atua em várias unidades com permissões separadas e também agenda serviços para si.
- [ ] Remover o último vínculo mantém o tipo BARBER e histórico, sem acesso operacional à unidade removida.
- [ ] Integração web/mobile/API/banco valida aceite, revogação e isolamento; perfil e agenda já planejados nas issues existentes permanecem preservados.

**Dependência:** https://github.com/Proj-Smart-Barber/api/issues/32.
**Relacionadas:** #27, #28, #29 e #30; esta issue cobre autenticação/vínculos, sem duplicar suas funcionalidades.

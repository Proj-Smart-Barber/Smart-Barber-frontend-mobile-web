# Autenticação completa: desenho aprovado

Data: 2026-10-03. Estado: base aprovada pelo usuário, incluindo prazos e premissas apresentados. Os [contratos detalhados](CONTRATO_AUTENTICACAO_2026-10-03.md) e planos serão revisados antes de execução/publicação. Nenhum contrato novo abaixo é API já implementada.

Base factual e decisões: [Análise e registro de decisões](ANALISE_AUTENTICACAO_E_DECISOES_2026-10-03.md). Checkouts: frontend `bf650406967f67c21337567544774578b3b5df99`; API `5564d5bf0df757389ef6f4b508f748fe7cc0035a`.

## 1. Escopo confirmado

- Login único por e-mail/senha, identificação automática dos acessos pelo servidor.
- Uma conta por CPF, com um único tipo vigente: cliente, barbeiro, proprietário ou gestor da plataforma.
- Cliente precisa de conta, autenticação e e-mail confirmado para agendar.
- Proprietário inicia o cadastro do barbeiro; o titular ativa seu acesso. Cliente existente evolui na mesma conta, preservando CPF, ID, credenciais e histórico.
- Barbeiro pode integrar várias unidades e agendar serviços para si. Mantém o tipo barbeiro após sair da última unidade.
- Proprietário pode administrar e atender. Seu cadastro de conta/barbearia já está pronto e será preservado.
- Gestor/dono do Smart Barber terá autenticação e área correspondente. Métricas, planos, cobrança e limites por plano pertencem à evolução futura nesta proposta.
- Sessão persiste entre aberturas, até sair ou expirar; validade menor para o gestor.
- Recuperação de acesso e confirmação por e-mail nesta entrega. Google, Apple, MFA e recrutamento ficam para evolução futura.

O objetivo é concluir identidade, sessão, roteamento e autorização por usuário/vínculo. A confirmação completa de reservas, cancelamento pelo cliente e regras comerciais de agendamento precisam de contratos de seu domínio; sua ausência não será disfarçada por ações simuladas na área autenticada.

## 2. Arquitetura recomendada

Evoluir a identidade única `users` e os vínculos `membership` existentes. No frontend, manter `app/features/entities/shared`, DTOs e mappers, modelos de apresentação e componentes do design system. No backend, manter entidades, casos de uso com `Either`, portas de repositório, controllers/factories, rotas e adaptadores Drizzle.

O tipo global identifica a jornada principal; o vínculo ativo identifica a unidade e o papel operacional. Uma capacidade de consumidor do barbeiro não exige outro tipo de conta. O gestor é uma identidade da plataforma, sem membership artificial em uma barbearia.

Alternativas consideradas: autenticação externa por provedor central, com maior mudança de infraestrutura/contratos; ou jornadas com módulos de sessão separados, aumentando duplicação. A evolução da estrutura atual atende à escolha explícita de aproveitá-la e reduz alterações no cadastro OWNER já pronto.

Nomes de contrato propostos: `AccountType = CLIENT | BARBER | OWNER | PLATFORM_ADMIN`. Papéis de vínculo mantêm compatibilidade com `OWNER | BARBERMAN`; a UI pode apresentar BARBER. Tipo desconhecido não é convertido implicitamente em barbeiro ou cliente.

## 3. Identidade e transições

Persistir o CPF canônico como 11 dígitos validados, com unicidade no banco. Resolver CPF e e-mail separadamente; CPF de uma pessoa e e-mail de outra são conflito, não autorização para fundir contas. Política de comparação de e-mail documentada e consistente em cadastro, entrada, verificação e recuperação; preservar o endereço de contato original.

Cadastro público permite somente as finalidades cliente e proprietário. O cadastro do barbeiro nasce de proprietário autorizado em uma unidade. O gestor é provisionado por procedimento interno controlado, sem cadastro administrativo público ou credenciais no app.

Estados propostos de conta: pendente de confirmação, ativa, suspensa e revisão de identidade legada. Autenticação limitada pode permitir concluir verificação; operações de negócio exigem os estados/permissões apropriados.

Transições:

| Origem | Evento | Resultado |
| --- | --- | --- |
| CPF novo | Cadastro público de cliente + confirmação | Conta CLIENT, mesma identidade nas operações futuras. |
| CPF novo | Cadastro profissional pelo proprietário + ativação | Conta BARBER e vínculo ativo criados de forma consistente. |
| CLIENT | Cadastro profissional pelo proprietário + aceite autenticado | Mesmo `userId`, tipo BARBER e vínculo com a unidade. |
| BARBER | Cadastro por proprietário de outra unidade + aceite | Novo vínculo autorizado, mesma conta e tipo. |
| BARBER | Revogação do último vínculo | Mantém BARBER e funções pessoais; perde operações da unidade. |
| OWNER | Atendimentos próprios | Mantém OWNER; capacidade de atender sem rebaixar para BARBER. |

CPF/e-mail/tipo enviados pelo proprietário não sobrescrevem credenciais ou identidade de uma conta existente. Transições para OWNER e classificação de registros antigos devem respeitar a jornada já pronta e as evidências de propriedade/vínculo; conflitos serão resolvidos antes da migração, sem classificação silenciosa.

## 4. Cadastro profissional pelo proprietário

Fluxo: Equipe → Cadastrar barbeiro → validação da unidade/autor → cadastro pendente → ativação pelo titular → identidade e vínculo concluídos em transação. A conta de cliente permanece como estava enquanto a operação estiver pendente.

CPF novo: guardar o cadastro profissional pendente; a ativação verifica contato e estabelece credenciais da conta única. CPF existente: exigir a identidade autenticada correspondente; preservar senha, contatos de recuperação e reservas. O contato fornecido pelo proprietário não assume o controle da conta existente.

Ativação, criação/atualização de identidade, vínculo e consumo do token são atômicos. Revalidar proprietário, unidade, destinatário, expiração e conflito no momento de concluir. Solicitação repetida não duplica conta/vínculo; o contrato trata concorrência, e-mail de outra identidade e requisição de cadastro público concorrente.

Vínculos propostos: ativo, suspenso ou revogado. Cadastros pendentes têm ciclo próprio: pendente, aceito, recusado, expirado ou revogado. Revogar uma unidade não apaga a conta/histórico nem os demais vínculos. A entrega de mensagem é separada da aceitação do pedido; falha de envio permite recuperação/reenvio sem converter a conta.

## 5. Matriz de acesso e jornadas

| Identidade/contexto | Entrada e acesso |
| --- | --- |
| Visitante | Catálogo público; criar conta ou entrar ao precisar confirmar reserva. |
| CLIENT sem e-mail confirmado | Concluir confirmação/reenvio; reservas bloqueadas pelo servidor. |
| CLIENT ativo e confirmado | Área do cliente e recursos próprios; sem acesso operacional. |
| BARBER com vínculos ativos | Área profissional e seleção de unidade autorizada; recursos próprios de consumidor. |
| BARBER sem vínculos ativos | Área pessoal/profissional sem agenda de unidade; pode usar recursos pessoais de consumidor. |
| OWNER | Área operacional existente, unidades próprias, gestão autorizada e agenda própria de atendimentos. |
| PLATFORM_ADMIN | Área privada do gestor, sem telas de planos, métricas fictícias ou acesso implícito à operação de todas as unidades. |
| Conta suspensa, identidade em revisão ou tipo desconhecido | Estado de acesso restrito/revisão; nenhuma permissão operacional inferida. |

O frontend usa o perfil autoritativo para destino e menu. O backend verifica conta, sessão, autor e unidade em cada operação. Guard e botão desabilitado não substituem autorização HTTP.

Premissa aprovada com o desenho: OWNER também pode usar recursos pessoais de consumidor, como BARBER, mantendo OWNER. Isso é uma capacidade, não um segundo tipo.

## 6. Áreas e estados do frontend

Preservar `(app)` e o shell operacional para OWNER/BARBER; acrescentar caminhos explícitos `/client` e `/admin` para evitar colisão entre índices de grupos do Expo Router. Preservar catálogo e URLs públicas já existentes. A navegação operacional mantém sidebar, drawer e navegação inferior previstos no projeto.

Novas jornadas: cadastro de cliente, confirmar e-mail/reenvio, esqueci minha senha, definir nova senha, ativar cadastro profissional, cadastro/listagem de equipe pelo proprietário, seleção de unidade e saída da sessão. A jornada OWNER existente recebe somente adaptações necessárias ao contrato comum.

Sessão distingue restauração, entrada, autenticação limitada, autenticada, renovação, falha temporária e encerrada. Conta pendente de verificação não é enviada ao cadastro de barbearia. Barbeiro sem vínculo não é promovido a OWNER.

Após mudança de tipo/vínculo: reconsultar perfil e permissões, cancelar respostas do contexto anterior e invalidar caches pertinentes. Proteger contra login/restauração que concluam depois de sair/trocar de conta. Consultas operacionais incluem usuário e unidade nas chaves; reservas pessoais separam consumidor de atendimentos prestados.

Retorno ao catálogo usa destinos internos permitidos. Serviços escolhidos são intenção preservada; horário/preço só são revalidados pelo domínio na confirmação. A área inicial do gestor identifica o acesso e oferece saída; métricas e controles futuros não são apresentados como dados ou ações prontas.

## 7. Sessão persistente: proposta técnica

Prazos aprovados com o desenho: acesso de CLIENT/BARBER/OWNER por 15 minutos, sessão renovável até 30 dias absolutos; gestor com acesso por 5 minutos e sessão máxima de 8 horas. Renovação não estende indefinidamente o limite absoluto. Login cria uma sessão por instalação/navegador; sessões simultâneas são permitidas, com saída deste aparelho e saída de todos.

Persistir sessão/refresh revogáveis no servidor. JWT identifica usuário e sessão; tipo/permissões não são uma autoridade imutável contida no token. Middleware revalida estado atual da sessão/conta e vínculo pertinente. Recuperação/troca de senha revoga sessões anteriores; retorno ao login é explícito.

Web: acesso em memória e refresh em cookie `HttpOnly`, `Secure`, com expiração controlada pelo servidor. Proposta preferida: API sob a mesma origem por proxy de `/api`, antes do fallback da SPA, validando encaminhamento de Cookie/Set-Cookie e proteção de Origin/CSRF. O proxy não existe na configuração atual. Não armazenar refresh longo em localStorage como substituição silenciosa.

Nativo: refresh em SecureStore separado, acesso em memória. Transporte web/nativo é declarado e validado pelo servidor; cookie e token de corpo não podem ser intercambiados para contornar as proteções. Testes usam adaptadores em memória.

Renovação é coordenada: uma operação por contexto no cliente, com tratamento explícito de concorrência entre abas no servidor. Não executar repetidamente mutações de negócio por falha de sessão. Falha de rede/503 preserva credenciais e apresenta nova tentativa; 401 definitivo encerra o contexto.

Saída online revoga sessão, elimina cookie/refresh e cache. Saída offline impede restauração automática e informa o limite da revogação remota; web precisa registrar a intenção de saída sem segredo enquanto o cookie HttpOnly não puder ser apagado pelo servidor. Uma resposta antiga não pode restaurar a conta após esse evento.

## 8. Perfil autoritativo e compatibilidade

Ampliar `/api/users/me` para informar identidade, tipo, estado, confirmação de e-mail, capacidades pessoais/plataforma e vínculos com papel, estado, unidade, fuso e permissões. Não exigir descoberta pública de uma barbearia para provar vínculo. CPF completo e dados privados de cliente não integram a listagem de equipe por padrão.

Formato proposto de alto nível:

```ts
type SessionProfile = {
  user: { id: string; name: string; email: string; avatarUrl: string | null;
    accountType: 'CLIENT' | 'BARBER' | 'OWNER' | 'PLATFORM_ADMIN' | null;
    status: 'PENDING_EMAIL' | 'ACTIVE' | 'SUSPENDED' | 'REVIEW_REQUIRED';
    emailVerified: boolean };
  personalPermissions: string[];
  platformPermissions: string[];
  memberships: Array<{ id: string; role: 'OWNER' | 'BARBERMAN';
    status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
    barbershop: { id: string; name: string; status: string; timezone: string };
    permissions: string[] }>;
};
```

Listas de permissões terão catálogo fechado na especificação/contrato final. `accountType: null` é permitido somente para identidade legada em `REVIEW_REQUIRED`, com listas de permissões vazias. Esse caso não pode ser forçado a um dos tipos conhecidos pelo mapper; exige estado de revisão expresso e sem acesso operacional.

Preservar temporariamente aliases `/staffs`, envelope legado de perfil e `access_token`. Atualizar o DTO de cadastro para `userId`. O frontend novo consome contrato explícito; não usar fallback 404 para esconder perfil inexistente, falta de autorização ou API incompatível. A finalidade de cadastro OWNER/CLIENT será explícita; o fluxo OWNER atual terá adaptação de compatibilidade coordenada.

## 9. Rotas para a equipe de backend

Os caminhos abaixo são proposta para revisar/versionar. Corpos, envelopes, códigos e compatibilidade serão fechados antes de implementação. Autoria vem da sessão, não de `ownerId/userId` arbitrário enviado pelo app.

| Método e caminho | Responsabilidade | Situação |
| --- | --- | --- |
| `POST /api/users/` | Cadastro CLIENT/OWNER explícito, CPF único, confirmação de e-mail; preservar jornada OWNER. | Ampliar existente. |
| `POST /api/users/sessions/auth` | E-mail/senha; emitir acesso e sessão revogável; transporte refresh por plataforma. | Ampliar existente; sucesso atual 201. |
| `GET /api/users/me` | Perfil autoritativo e acessos; incluir estado pendente/restrito. | Ampliar existente. |
| `GET /api/users/me/barbershops` | Vínculos próprios, com estados; compatibilidade de descoberta. | Ampliar existente. |
| `POST /api/users/sessions/refresh` | Renovar acesso/refresh com revogação e controle de concorrência. | Nova. |
| `POST /api/users/sessions/logout` | Revogar sessão atual e limpar transporte persistente. | Nova. |
| `POST /api/users/sessions/logout-all` | Revogar todas as sessões do titular após autenticação apropriada. | Nova. |
| `POST /api/users/email-verifications/request` | Solicitar/reenviar confirmação, com limites e resposta sem enumeração. | Nova. |
| `POST /api/users/email-verifications/confirm` | Consumir token de confirmação de e-mail. | Nova. |
| `POST /api/users/password-resets/request` | Solicitar recuperação; resposta genérica. | Nova. |
| `POST /api/users/password-resets/confirm` | Definir nova senha por token de uso único; revogar sessões. | Nova. |
| `PATCH /api/users/me/password` | Troca autenticada com verificação de senha atual; revogar sessões anteriores. | Nova. |
| `POST /api/barbershops/:shopId/barbers` | Proprietário inicia cadastro profissional pendente; aproveitar CPF existente. | Nova. |
| `GET /api/barbershops/:shopId/barbers` | Proprietário consulta equipe/cadastros da unidade, com paginação e dados mínimos. | Nova. |
| `POST /api/barbershops/:shopId/barber-registrations/:id/resend` | Reenvio pelo proprietário autorizado, sem tokens expostos. | Nova. |
| `DELETE /api/barbershops/:shopId/barber-registrations/:id` | Revogar cadastro ainda pendente. | Nova. |
| `POST /api/users/barber-registrations/activate` | Titular ativa cadastro; transição CLIENT→BARBER ou criação da identidade nova. | Nova. |
| `DELETE /api/barbershops/:shopId/barbers/:userId` | Revogar vínculo BARBERMAN naquela unidade, preservando identidade e demais vínculos. | Nova. |

Provisão do gestor: procedimento interno/script auditável no backend, sem senha fixa no repositório e sem endpoint público de elevação. Não há rotas de planos/cobrança nesta entrega.

Dependência de integração do domínio: leitura das reservas próprias precisa derivar o titular pela sessão, por exemplo `GET /api/users/me/bookings`; criação/cancelamento/reagendamento precisam de políticas próprias. As rotas profissionais atuais de agenda também precisam validar/representar a unidade ao usar vários vínculos. Planejar esses ajustes como integração de autorização, sem apresentar o agendamento completo como já implementado.

## 10. Erros, mensagens e entrega de e-mail

Padronizar códigos de aplicação: credenciais inválidas, sessão expirada/revogada, confirmação pendente, acesso proibido, conflito de identidade, ativação inválida/expirada e limitação temporária. Diferenciar 401 de 403 e indisponibilidade; não devolver 500 para JWT expirado. Retornos 429 incluem orientação de nova tentativa; rede/5xx não apagam a sessão automaticamente.

Confirmação, recuperação e ativação usam tokens de finalidades distintas, aleatórios, expirantes e de uso único. Guardar somente material protegido/verificadores apropriados no servidor e impedir registro de tokens/senhas/CPF completo nos logs. CPF não é segredo de autenticação.

Entrega de mensagem será uma porta de infraestrutura da API. Solicitação aceita e mensagem entregue são estados distintos; falha do provedor não duplica cadastro ou consome o token. Provedor e credenciais serão definidos pela equipe backend no ambiente autorizado; testes usam um adaptador controlado.

## 11. Migração e prioridades

Primeiro, corrigir a classificação de erros de autenticação e tratar as rotas locais de manutenção atualmente sem autenticação como prioridade de segurança. A proposta é removê-las do HTTP público e manter operação de manutenção por procedimento interno controlado; isso não transforma manutenção em funcionalidade do gestor nesta entrega.

Depois, inventariar schema/migrações efetivamente aplicados em ambiente autorizado. Os caminhos SQL e migrador de boot divergem; não executar ambos nem supor equivalência. Ensaiar em cópia de teste e preservar IDs, carrinhos, reservas e vínculos.

CPF canônico pode revelar duplicidades textuais antigas; múltiplos papéis podem contrariar o tipo global único. Produzir relatório restrito de conflitos e resolver antes de impor constraints. Não fundir usuários, reatribuir reservas ou classificar barbeiro sem vínculos como CLIENT automaticamente. Cada migração terá validação e recuperação documentadas.

## 12. Premissas operacionais para revisão

- Plataformas: web, Android e iOS da arquitetura Expo existente. Homologar persistência no browser e SecureStore em dispositivos reais.
- Desempenho proposto: em homologação documentada com 20 sessões concorrentes, p95 de entrada até 2 segundos e perfil/refresh até 1 segundo, excluindo entrega de e-mail. São metas propostas, não resultados medidos. Manter timeout explícito de 15 segundos como limite de comunicação inicial.
- Escala: não foi informado volume de usuários/unidades ou SLA de produção. Usar esse ensaio como referência inicial, não como certificação de capacidade ou promessa de disponibilidade.
- Confiabilidade: operações críticas atômicas e idempotentes; limites persistidos/compartilhados no servidor, sem depender de memória de uma instância serverless; recuperação de falha de envio e sessão sem loops de retry.
- Privacidade: CPF e contatos mínimos, sem expor histórico pessoal ao proprietário; retenção de tokens/eventos conforme finalidade e política técnica a especificar.
- Manutenção: backend responde por domínio, persistência, migração, e-mail e contratos; frontend por jornadas, transporte por plataforma, guards, cache e UX. A equipe homologa os fluxos integrados em ambiente de teste.

A publicação real de proxy, domínios, cookies, infraestrutura ou migração depende da etapa autorizada de execução/homologação; esta proposta não verifica nenhum deploy.

## 13. Aceitação e divisão dos planos

Planos a produzir após revisão deste desenho:

1. Backend: identidade/CPF/tipos/migração e precedentes de segurança.
2. Backend: sessões revogáveis, confirmação/recuperação, entrega de e-mail e provisão do gestor.
3. Backend: cadastro profissional e vínculos com transição da conta existente.
4. Frontend: transporte/engine de sessão e DTOs, login/cadastro cliente/verificação/recuperação, destinos/guards por tipo e estados.
5. Frontend: cadastro de equipe/ativação/seleção de unidade, integração operacional preservada e área inicial do gestor.
6. Contratos e homologação: compatibilidade, integração de autorização no domínio de agendamentos, ensaios com banco de teste, web/nativo e roteiro manual.

Verificar: CPF equivalente e concorrente; cliente existente ativado sem novo usuário; convite revogado/expirado/de outro titular; proprietário sem permissão; barbeiro com várias unidades e sem vínculos; confirmação e recuperação repetidas; persistência real entre aberturas; renovação concorrente; sair/trocar conta com requests pendentes; falha temporária; 401 versus 403; acesso direto proibido; consumidor acessando somente reservas próprias; gestor sem cadastro público; OWNER existente preservado; nenhum recurso de plano/MFA/social implementado por acidente.

Testes unitários/fixtures, HTTP com PostgreSQL de teste e homologação real têm evidências separadas. A documentação atual não executou esses testes. O plano final detalhará arquivos, interfaces, casos e comandos. As issues serão preparadas/publicadas depois da consolidação e revisão previstas pelo usuário.

## Referências técnicas

- [OWASP: autenticação](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [autorização](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) e [sessões](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- [OWASP: segurança do armazenamento web](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).
- [MDN: cookies e atributos de segurança](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies).

Os prazos, metas e caminhos propostos são decisões deste desenho para revisão, não valores prescritos pelas fontes nem contratos já implementados.

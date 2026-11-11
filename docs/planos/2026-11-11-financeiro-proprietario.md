# Gestão financeira do proprietário

## Objetivo e entrega inicial

Disponibilizar uma área Financeiro no menu da unidade para seu proprietário ativo.
A tela deve apresentar valores dos serviços concluídos, previsão dos agendados,
recebimentos registrados, contas a pagar e saldo do período com gráficos mensais.
Usar os tokens, tipografia, cartões e estados de carregamento do produto.

## Regras dos valores

- Serviços concluídos representam faturamento dos atendimentos COMPLETED.
- Serviços CONFIRMED, WAITING e IN_SERVICE compõem a previsão operacional.
- Cancelados e ausências ficam fora da previsão e do faturamento realizado.
- Recebido representa lançamentos explícitos de recebimento. Concluir um atendimento não registra dinheiro recebido.
- Os preços vêm do snapshot do atendimento. Dados sem preço são apresentados como incompletos.
- Saldo do período corresponde a recebimentos registrados menos despesas pagas.
- Valores monetários são inteiros em centavos. Datas seguem o calendário da unidade.
- A visão de caixa usa a data do pagamento. O vencimento determina as contas a pagar.
- Os gráficos mostram valores monetários e rótulos acessíveis, acompanhados dos totais.

## Despesas e recebimentos

Cadastrar descrição, categoria, valor e vencimento. Categorias iniciais são
despesa fixa, variável, repasse a barbeiro, salário e outras despesas.
O favorecido é opcional. Salários e repasses são registros de controle.
O proprietário pode registrar pagamento ou cancelar uma previsão.
Um lançamento pago mantém seu histórico. Correções financeiras exigem lançamento compensatório posterior.
Cada atendimento concluído pode ter um recebimento integral registrado uma única vez.
Despesas fixas são cadastradas por competência, com cópia explícita para o mês seguinte.
O dia de vencimento é ajustado ao último dia do mês quando necessário.
A cópia mantém um vínculo com a origem para impedir duplicação por repetição do toque.

## Persistência e acesso

Criar tabela finance_entries na API, ligada à unidade, ao autor e, opcionalmente, à reserva.
Autenticação e membership OWNER ACTIVE são verificadas em todas as operações.
Os identificadores de lançamento são sempre consultados junto ao identificador da unidade.
Usar chave de solicitação única por unidade para criação idempotente e versão para alterações concorrentes.
Conflitos retornam erro recuperável e solicitam atualização dos dados.
Consultas e caches do frontend são isolados por usuário, unidade e mês.
A mudança de unidade limpa o formulário e impede o uso de dados anteriores.

## Implementação

1. API com migration idempotente, projeção financeira, consultas e escrita transacional.
2. Testes HTTP com PostgreSQL descartável em loopback, incluindo acesso indevido, repetição e concorrência.
3. Tela universal com seleção de competência, indicadores, gráfico, formulário e listas.
4. Registro de recebimentos e pagamentos com confirmação, feedback e bloqueio de duplo envio.
5. Integração com menu mobile e desktop somente para OWNER ativo.
6. Revisão de responsividade e interação no Chromium e WebKit com dados controlados.

## Critérios de aceite

Um proprietário vê apenas os dados da sua unidade e pode cadastrar, pagar e cancelar uma despesa.
Repetir uma solicitação não cria valores duplicados.
Um barbeiro ou membro inativo recebe recusa da API e não acessa a tela.
Uma reserva concluída não passa a recebida sem registro explícito.
Preços ausentes não são tratados como receita zero.
Uma alteração de mês preserva a consistência entre resumo, gráfico e lançamentos.
Erros de API não são apresentados como saldo vazio ou ausência de despesas.

## Publicação

Preparar as migrations no repositório da API. Executá-las apenas em banco isolado durante a implementação.
A aplicação em banco compartilhado e a publicação dependem de autorização específica.
Validar a versão publicada antes de usar os indicadores para controle real.


## Implementação e verificação

A etapa anterior de identidade da unidade foi concluída e o PR #92 foi mesclado.
A implementação financeira está nos checkouts frontend-financeiro e api-financeiro,
na branch feat/financeiro-proprietario de cada repositório.

- Tela disponível em /finance, com entrada no menu lateral mobile e na sidebar desktop.
- API documentada em docs/financeiro-proprietario.md do repositório backend e no Swagger.
- Recebimentos registrados manualmente por atendimento concluído.
- Despesas fixas repetidas por ação explícita no mês seguinte.
- Resumo compacto em duas colunas no mobile, com rótulos ajustados para 320 px.
- 87 testes frontend seletivos passaram, incluindo financeiro, navegação, sessão e dashboard.
- 12 testes backend passaram, incluindo 10 testes HTTP com PostgreSQL descartável.
- O teste HTTP usa autenticação de fixture e autorização real de unidade no banco.
- Navegador local confirmou cadastro, pagamento, recebimento e cópia mensal.
- Revisão em Chromium a 320 e 1440 px e WebKit a 390 px, com dados HTTP controlados.
- A exportação web e o TypeScript frontend passaram.
- O TypeScript global da API mantém cinco erros preexistentes de descoberta e cadastro de barbearia.
- O checkout frontend não possui a configuração do ESLint exigida pela versão instalada.

Os testes de navegador utilizam respostas controladas e não comprovam integração com
produção ou dispositivo físico. As migrations foram executadas apenas no PostgreSQL
descartável, sem alteração do banco compartilhado. O módulo financeiro ainda não foi publicado.


## Revisão de cabeçalho e filtros

O cabeçalho operacional foi reduzido a logo, nome da unidade e data no fuso da barbearia.
O menu inferior mantém o acesso à navegação no mobile. O atalho de novo agendamento
permanece no desktop.

O resumo financeiro usa totais do intervalo em um gráfico comparativo único.
Os blocos semanais fixos foram substituídos por filtros de mês, semana, dia e intervalo
personalizado. A semana vai de segunda a domingo. O intervalo personalizado inclui
as duas datas informadas e pode atravessar meses e anos. A API filtra as reservas
pela data civil da unidade, despesas por vencimento e caixa por data do pagamento.
A explicação dos indicadores fica disponível por uma ação de ajuda.

A API deve ser publicada antes do frontend desta revisão. A mudança usa a tabela
financeira existente e não exige migration adicional.

A revisão de períodos passou em 79 testes frontend seletivos e 13 testes backend,
incluindo PostgreSQL isolado. Chromium e WebKit confirmaram mês, semana, dia,
intervalo entre meses, cadastros e pagamentos com dados controlados.
TypeScript frontend e exportação web passaram. A API mantém os cinco erros
preexistentes de TypeScript documentados anteriormente.

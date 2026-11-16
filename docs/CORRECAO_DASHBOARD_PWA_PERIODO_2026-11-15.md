# Dashboard operacional: área segura e filtros de período

## Correções

Dashboard e Agenda passam a usar os insets normalizados de `useAppSafeArea`, por meio de `AppSafeAreaView`. O `SafeAreaView` bruto aplicava diretamente os valores recebidos do WebKit, permitindo uma reserva excessiva acima do cabeçalho. O cabeçalho não deve encolher, e a rolagem não reaplica automaticamente a área segura já tratada pela tela. A mudança atende proprietário e barbeiro, que compartilham o dashboard.

No modo PWA standalone, o HTML usa alturas percentuais para ocupar o viewport de layout. A regra evita depender de `100dvh` nessa apresentação, em que WebKit pode deixar uma faixa sem conteúdo junto à área do gesto. A proteção dos controles na área segura continua ativa. O indicador do gesto pertence ao iOS e não foi ocultado.

## Período e autorização

O dashboard permite selecionar dia no calendário, navegar por dia ou semana e voltar a Hoje. A semana usa segunda a domingo. Totais e valores das reservas acompanham o filtro; as avaliações gerais continuam identificadas como referentes a todas as datas. O destaque da fila imediata só aparece para o dia atual, evitando apresentar uma reserva futura como atendimento em andamento.

A API atual oferece resumos por dia. A visão semanal reaproveita a consulta canônica do dia selecionado e consulta os outros seis dias, com três itens de prévia por dia e resumos completos do servidor. Não calcula totais contando essa prévia. Os caches incluem usuário, papel, unidade, data e profissional. Para BARBERMAN, o profissional permanece restrito ao próprio ator; OWNER mantém o escopo autorizado da unidade.

A consulta da semana não substitui a referência de horário do servidor recebida pela consulta canônica. Resumo ausente ou valor incompleto não é apresentado como receita zero. O calendário mantém a janela de navegação de 90 dias. O atalho da lista preserva a data ao abrir a Agenda, e cada atendimento abre a sua própria data.

## Verificação

41 testes focados passaram: apresentação do dashboard, períodos, consultas semanais nos dois papéis, área segura e read model de reservas. TypeScript passou. Os testes simulam insets inflados e respostas HTTP; não comprovam execução física em iPhone.

A exportação web passou: 73 rotas estáticas e preparação do PWA concluídas. A versão local gerada é `905bdc78711e622e`. Build não publica. A revisão no PWA físico será feita pelo responsável, conforme combinado. Conferir o topo com nome longo, rolagem, faixa inferior, dia futuro com reservas, semana, volta a Hoje e navegação para detalhes.

Não houve mudança de schema, seed, credenciais, autorização backend ou instalação de dependências.

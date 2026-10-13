# Correções da Agenda Unificada — 13/10/2026

## Implementação

1. Busca de cliente: editar a consulta libera uma nova busca e invalida respostas anteriores, sem travar o carregamento.
2. Recuperação de operações: preserva o escopo original, inclusive no expurgo e em gravações tardias. Resultados sem detalhes autorizados ou escopo conhecido exibem confirmação neutra, sem navegação ou nova reserva automática.
3. Paginação: revisões compartilhadas por QueryClient impedem incorporar páginas antigas após atualizar a primeira página. Home e Agenda podem observar a mesma consulta sem invalidar os dados uma da outra.
4. Dashboard: utiliza o read model canônico e os totais autoritativos da API; dados parciais e valores ausentes não viram indicadores exatos. Elimina fallback de unidade e relógio local.
5. Virada de dia: atualiza a data civil e distingue acompanhar hoje de uma data escolhida explicitamente.
6. Retorno operacional: transporta a unidade definitiva da reserva e bloqueia contexto divergente, preservando data e profissional.

Durante a homologação foi identificado e corrigido também um botão coberto pela navegação inferior no agendamento mobile. A criação reserva espaço para a cápsula e remove o disparador flutuante sobre esse fluxo.

## Evidências

- PASS: 66 arquivos, 379 testes na suíte final após o ajuste mobile.
- PASS: TypeScript sem erros.
- PASS: export web de produção, 52 rotas; o export final foi executado com permissão ampliada após EPERM na criação de diretórios pelo ambiente restrito.
- APPROVE: revisão independente estática dos bloqueadores de geração compartilhada e acompanhamento do dia atual. Não equivale a homologação de produção.
- Backend original: sem alterações, confirmado por git status.
- Alguns testes assíncronos emitem avisos de act; a suíte passa, mas não é declarada livre de avisos.

Os testes de navegador usam Chrome e API/banco temporários locais. Os resultados finais estão registrados abaixo. Não há prova de execução física Android/iOS ou de produção nesta entrega.

- PASS OWNER, 1280px: login, redirecionamento legado, reload, busca de cliente, dois serviços, criação UNIT, retorno à unidade/data definitivas e cancelamento.
- PASS BARBER, 390px: mesma jornada operacional na própria agenda, com botões acessíveis por cliques reais.
- PASS CLIENT, 390px: reserva com dois serviços, dispositivo em UTC, remarcação da mesma reserva sem POST adicional, cancelamento lógico e notificações visíveis.

## Publicação

As alterações permanecem locais na branch feat/agenda-unificada-criacao, preservando a implementação anterior. Nenhum commit, push, merge, deploy ou alteração no banco de produção foi realizado.

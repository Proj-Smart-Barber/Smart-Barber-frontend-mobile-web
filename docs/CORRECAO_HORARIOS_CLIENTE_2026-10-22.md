# Horários do cliente: análise, correção e evidências

## Resultado e alcance

Correções implementadas localmente em duas worktrees isoladas. O código existente nas demais branches foi preservado. Não houve commit, push, PR, merge, deploy, seed ou criação de reserva em produção nesta tarefa.

- Frontend: `D:/smart_barber/Smart-Barber-frontend-mobile-web/.tmp/frontend-slots-clock`, branch `fix/client-slots-clock`, base `414bce6`.
- API: `D:/smart_barber/Smart-Barber-frontend-mobile-web/.tmp/api-slots-clock`, branch `fix/availability-clock`, base `d29a0d2`.
- Plano de evolução: [agendamento, mídia e avaliações](PLANO_AGENDAMENTO_MIDIA_AVALIACOES_2026-10-22.md).

O defeito ainda precisa da publicação dos dois diffs para deixar de ocorrer no site publicado. A alteração é de código e contrato aditivo; não depende de migration nova ou alteração do seed.

## Reprodução real e causas

Em 22/10/2026, consulta pública à disponibilidade da unidade demonstrativa Santana para **21/10/2026** retornou HTTP 200, **18 slots, todos anteriores ao `serverTime` `2026-10-22T04:02:45.748Z`**. O cabeçalho era `Cache-Control: public, must-revalidate, max-age=0`. Nenhuma reserva foi criada durante essa verificação.

1. A geração de slots no backend considerava expediente, exceções e reservas, mas não descartava o passado. O horário do servidor era acrescentado depois, no controller.
2. A tela mostrava os slots recebidos integralmente; não havia expiração visual contínua ou atualização periódica da ocupação.
3. O carrossel de datas usava o relógio/fuso do aparelho e permanecia memorizado. Um cliente em outro fuso ou com relógio incorreto podia selecionar o dia inadequado.
4. A invalidação de cache após criar uma reserva só alcançava a instância local do cliente, sem avisar outra sessão.
5. A consulta de conflitos combinava instantes reais com comparação legada entre horas UTC da solicitação e horas civis da reserva. Esse fallback podia produzir conflitos falsos. A leitura diária também podia ignorar a ocupação do mesmo profissional em outra unidade/fuso/data civil.
6. O tratamento do frontend interpretava qualquer erro com `requestId` como resultado incerto antes de reconhecer `SLOT_UNAVAILABLE`.

A API já tinha locks e rejeição de passado/conflito na criação. Isso foi confirmado por execução concorrente real, não apenas pela leitura do código. A correção não adiciona um sistema de reserva temporária de slots.

## Correções na API

- Disponibilidade usa `clock_timestamp()` do PostgreSQL, capturado após carregar a ocupação, e elimina `start <= serverTime`.
- Resposta inclui `slots`, `serverTime` e `timezone`, inclusive quando vazia. Rota/adaptador enviam `Cache-Control: no-store` e `Pragma: no-cache`.
- Identificadores, data civil e lista de serviços são validados no controller.
- Leitura de ocupação usa o intervalo real do dia no fuso da unidade. Instantes canônicos têm prioridade; registros legados são convertidos com seu próprio fuso no PostgreSQL.
- O conflito continua global por profissional. Cancelados liberam o intervalo; estados desconhecidos permanecem bloqueantes, preservando a regra conservadora existente.
- Criação idempotente recebe o relógio do contexto transacional, após aquisição dos locks. Validação de preço/duração, vínculos, jornada e ledger foram preservados.
- Disponibilidade, criação e remarcação calculam o dia da semana a partir da data civil selecionada; evita deslocamento indevido em UTC+14.
- Swagger documenta o endpoint, os campos retornados e a natureza de snapshot da oferta.

## Correções no frontend

- Disponibilidade sincroniza a referência monotônica existente com amostra HTTP e geração da sessão. Resposta sem relógio válido falha; não inventa autoridade com `Date.now()`.
- Filtro local remove slots vencidos a cada segundo enquanto o cliente escolhe/revisa, sem precisar recarregar a página.
- Datas são calculadas no fuso da unidade usando o relógio do servidor. Sem referência válida, mostra sincronização em vez de datas baseadas no aparelho.
- Lista é consultada a cada **15 segundos** durante escolha/revisão, no foco/reconexão e no retorno do aplicativo. Não há promessa de atualização instantânea entre navegadores.
- Seleção vencida ou confirmadamente ocupada é removida com explicação e retorno à escolha do horário. Seleção futura é preservada enquanto a retomada do aplicativo consulta sua validade.
- Antes de preparar uma nova operação, a disponibilidade é consultada novamente. Falha de leitura impede envio; serviços/profissional permanecem selecionados.
- `SLOT_UNAVAILABLE` definitivo solicita nova seleção, inclusive quando o erro contém `requestId`. Timeout/resposta perdida após mutação continuam no fluxo de reconciliação.
- O transporte combina cancelamento do chamador com o timeout existente; fornecer um `AbortSignal` não desativa mais o timeout.

## Evidências executadas

| Verificação | Resultado | Limite |
| --- | --- | --- |
| Reprodução de leitura na API publicada | Defeito confirmado: 18/18 slots vencidos | Produção anterior à correção; sem mutações |
| Casos de uso de criação/disponibilidade | 31 testes aprovados | Repositórios em memória, relógio controlado |
| Integração nova de disponibilidade/criação | 3 testes aprovados | HTTP real, autenticação e PostgreSQL descartável real |
| Regressões finais do frontend | 15 testes aprovados | Hooks/QueryClient reais, DOM em memória e transporte controlado |
| Suíte geral do frontend | 98 arquivos / 641 testes aprovados | Executada antes do último cenário de retomada; regressões finais, tipos e export repetidos após os últimos ajustes |
| TypeScript frontend e API | Exit 0 | Projeto completo de cada worktree |
| ESLint dos 9 arquivos frontend alterados/novos | 0 erros, 18 avisos; 0 avisos de dependências dos hooks | Perfil local já existente, via adaptador temporário removido após a execução |
| Biome dos 14 arquivos API alterados/novos | Sem erros | Avisos de dívida de tipos existentes não foram desativados |
| Export web final | Exit 0, 67 rotas | Bundle local `entry-758aba60045259823fbc0a97c6c0d0f7.js` |
| `git diff --check` em ambos os diffs | Exit 0 | Sem publicação remota |

Os 15 testes focados se sobrepõem à suíte geral; não somar as contagens como testes exclusivos. Após a suíte geral, foi acrescentado um cenário específico de preservação de seleção na retomada e executado com as demais regressões finais.

O primeiro processamento geral do frontend teve um timeout de 5 segundos em teste da landing sob concorrência intensa. Reexecução com dois workers passou integralmente, sem alterar o teste ou ampliar seu timeout. Permanecem avisos preexistentes de `act(...)` e de resolução de configuração Vite/Expo no ambiente de worktrees.

O primeiro export apontou ausência de `expo-location` no conjunto de dependências inicialmente reutilizado. O export final reutilizou o conjunto completo já instalado na worktree anterior. Não houve instalação, mudança de SDK ou alteração de lockfiles nesta correção.

## O que a concorrência real comprovou

- Dois clientes autenticados observaram inicialmente o mesmo slot e enviaram criações simultâneas com chaves diferentes.
- Somente uma resposta foi HTTP 201; a outra foi HTTP 409 `SLOT_UNAVAILABLE`. O banco continha uma única reserva naquele ponto.
- Reenvio com a chave vencedora retornou o mesmo ID, sem nova reserva.
- Nova leitura não ofereceu slots que sobrepunham a duração reservada; intervalo adjacente permaneceu disponível.
- Cancelamento pela rota real liberou o horário; o outro cliente conseguiu criar uma nova reserva depois.
- Registros canônicos, legados e em outra unidade/fuso foram comparados pelo instante correto, sem o conflito UTC falso.

O helper de testes exigiu URL de loopback e nome dedicado, criou banco aleatório e o removeu ao concluir. `DATABASE_URL` herdada foi substituída por destino inválido durante os testes. Não foi executada a suíte indiscriminada da API nem qualquer seed legado.

## Publicação e homologação restantes

1. Revisar os dois diffs e autorizar sua publicação. Preferir API primeiro, pois a resposta é aditiva e corrige imediatamente a oferta no servidor.
2. Publicar frontend e confirmar a versão do bundle no domínio real.
3. Homologar no site com duas sessões autorizadas: expiração sem reload, disputa, cancelamento e retorno do aplicativo.
4. Android/iOS físicos e aceite visual desta alteração permanecem não testados. Export e happy-dom não os substituem.

Fotos, galeria, link Google e avaliações próprias estão analisados no plano conjunto. Nenhum fluxo de upload ou tabela de avaliações foi implementado nesta etapa.

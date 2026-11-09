# Entrega de proximidade, Agenda e transições

Data: 09/11/2026. Estado: implementação entregue para revisão manual; nenhuma prova de aparelho físico ou PostgreSQL real nesta execução.

## Implementação

- Agenda compacto, preservando título completo e nome acessível: PR frontend #83 mesclado, commit main `5fcb589c283daeaac46b6330b19e19b5904cffae`.
- API geográfica com radiusKm:null explícito, sem bbox/limite radial e com ordem por distância antes da paginação: PR API #76 mesclado, commit `0c048528dc9757824aa104e0326e13c7c1b34005`.
- Frontend usa política de proximidade da seção mesmo quando o limite está desativado. Posição válida continua sendo enviada ao endpoint geográfico; null não chama a lista geral.
- Sem posição e sem pesquisa manual, não solicita lista geral disfarçada de proximidade. Com pesquisa textual explícita, mantém a recuperação manual identificada e sem distância pessoal fictícia.
- A recuperação de GPS preserva a escolha de limite; não ativa automaticamente 10 km. Fallback 503 não troca silenciosamente a seção por ALL.
- Gaveta sem os dois cards de modo: Sem limite e quatro raios. Mantém rascunho, cancelamento e aplicação explícita; não sobrescreve o draft por um rerender comum da lista.
- Reutiliza busca textual do endereço cadastrado, com indicação de cidade/endereço. A consulta de destino geocodificado não foi incluída: dependia de escolha específica do responsável e autorização própria.
- Motion opt-in com presença até a saída, cancelamento por geração, preferência reduzida e fade de entrada de seções/rotas. Gaveta usa opacidade e deslocamento discreto de 24 px; não anima blur/altura da lista nem mantém dois players ativos.

Ruling: os modos ALL/NEARBY foram conservados internamente como representação compatível do snapshot de UI legado (sem limite/raio aplicado). A política nova é que define sempre a consulta geográfica quando há posição válida. Essa escolha reduz o alcance em outros consumidores de useDiscovery; não reintroduz a escolha visual de modo nem permite que ALL chame busca geral com GPS válido nessa seção.

## Validação automatizada

| Camada | Resultado e limite |
| --- | --- |
| Navegação Agenda | 24 testes locais passaram; CI do PR #83 ficou verde antes do merge |
| Frontend, suíte completa intermediária | 165 arquivos / 1.064 testes passaram antes das últimas adições de presença e recuperação GPS |
| Ajustes posteriores | 19 testes focados de filtros, abas, proximidade e presença passaram; 14 de proximidade/recuperação/tela passaram após o último ajuste |
| Presença | 3 testes provaram retenção até saída, callback obsoleto após reabrir e fechamento imediato com movimento reduzido |
| TypeScript frontend | PASS nas verificações locais realizadas |
| Export web | PASS, dist gerado; build não comprova funcionamento de aparelho ou publicação |
| API | 15 testes de controller, caso de uso e SQL gerado passaram, sem conexão ao banco |
| API PostgreSQL | NOT TESTED: daemon Docker local indisponível. SQL gerado não substitui execução em PostgreSQL |
| TypeScript API | Quatro erros preexistentes de required_error/Zod em create-barbershop.controller.ts; nenhum arquivo dessa dívida foi alterado |
| Lint/typed lint/rules frontend | Scripts ausentes no package.json deste checkout; não foram inventados gates para declarar aprovação |
| Safari/PWA físico e revisão visual | NOT TESTED nesta entrega; o responsável assumiu explicitamente a revisão manual |

Os testes da API usaram DATABASE_URL de loopback inacessível e mocks de repositório, não produção. O checkout isolado de validação usa npm ci com o lockfile próprio. O checkout principal da API, com alterações independentes, foi preservado.

## Ambiente local para revisão

- Frontend: `D:/smart_barber/worktrees/frontend-experiencia-cliente-mobile`, branch `feat/proximidade-agenda-transicoes`.
- Aplicativo: `http://localhost:8081`.
- Origem de dados: `http://127.0.0.1:3336`, fixture sintético, sem banco ou API publicada.
- Fixture: `D:/smart_barber/Smart-Barber-frontend-mobile-web/.tmp/proximidade-review-api.cjs`.
- Conta local de revisão: `review@example.test`; senha de exemplo `LocalReview123!`. Esses valores só alimentam o fixture local, não são credenciais reais.
- API de código/testes: `D:/smart_barber/worktrees/api-proximidade-validacao`, branch `feat/proximidade-sem-limite-validada`.

O servidor simulado contém três unidades sintéticas, incluindo uma em Campinas. Ele permite demonstrar UI, raio e pesquisa; não prova integração da consulta Drizzle no banco ou contrato publicado. Os guards de produto não foram alterados para simular autenticação. O fixture serve somente loopback.

Uma aba isolada de Chromium foi usada para abrir/login local. A revisão interativa foi interrompida quando o responsável pediu para fazer as validações manuais, evitando gasto adicional. Não houve nova rodada de subagentes após essa orientação.

## Roteiro de revisão manual

1. Abrir localhost:8081, entrar com a conta do fixture e permitir localização somente se desejado. A origem 127.0.0.1:3336 precisa estar ativa.
2. Ir a Perto de você. Com posição válida, conferir ausência de limite inicial e ordem das distâncias.
3. Abrir filtros: somente Sem limite/5/10/25/50 km. Mudar rascunho/cancelar/reabrir/aplicar/limpar. Recuperar GPS não deve impor 10 km.
4. Pesquisar Campinas. Com raio que exclua a cidade, remover o limite explicitamente; confirmar que a posição de referência não muda para Campinas.
5. Rolar cards e voltar do catálogo/mapa; conferir foco, posição e último CTA acima da cápsula.
6. Abrir/fechar rapidamente a gaveta e o mapa, trocar seções e testar movimento reduzido. Conferir saída, backdrop e foco.
7. Conferir Agenda na barra e Meus agendamentos no título da tela, incluindo fonte ampliada.

## Pendências de prova

- PostgreSQL descartável real, desempenho da consulta sem raio e consistência entre páginas sob alterações concorrentes de dados.
- iPhone físico, Safari/PWA, mapa Google real e dados reais de API local autorizada.
- CI/revisão/merge do PR de frontend restante, conforme regras de proteção do repositório.
- Publicação compatível da API não foi verificada mediante chamada em produção. Não foi executado comando de deploy.

Nenhuma migration, seed ou mutação de dados de produção foi realizada. As evidências automatizadas não devem ser descritas como validação manual ou homologação integral.

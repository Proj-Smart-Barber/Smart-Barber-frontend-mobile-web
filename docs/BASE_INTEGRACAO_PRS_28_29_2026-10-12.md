# Registro de Bases e Escopo de Integração — PRs 28 e 29

Data: 12/10/2026
Ambiente: Local isolado (`Smart-Barber-frontend-mobile-web`)

## 1. Baselines Revalidadas

| Referência | SHA | Branch / Remote | Estado / Observação |
|---|---|---|---|
| `main` (frontend) | `6a17846bb792fa5e6e039ebcbe1da41573e3fa01` | `origin/main` | Base oficial atual (Grupo 3 integrado por squash) |
| PR #28 | `d034a53da1202c536b5de2271a692ae768d9f9a5` | `origin/update-booking-schedule` | Aberto, mergeable=true; UI Atendimentos da barbearia |
| PR #29 | `849908f0f3938f5c7667a9de7b8f023f17221fc4` | `origin/feat/agendamento-jornadas-agenda-recuperacao` | Aberto, mergeable=false (20 conflitos com `main` por base `1d94c28`) |
| Commit Grupo 4 | `849908f0f3938f5c7667a9de7b8f023f17221fc4` | `origin/feat/agendamento-jornadas-agenda-recuperacao` | Delta limpo Grupo 4 sobre parent `1d94c28` |
| Branch de Integração | `f4e37f4` (cherry-pick de `849908f`) | `feat/integracao-reservas-atendimentos` | Criada sobre `6a17846bb792fa5e6e039ebcbe1da41573e3fa01` |

## 2. Proveniência e Isolamento

- Nova branch neutra criada: `feat/integracao-reservas-atendimentos` a partir de `origin/main` (`6a17846`).
- Aplicação do delta Grupo 4 via `git cherry-pick -x 849908f0f3938f5c7667a9de7b8f023f17221fc4`:
  - Resultado: commit `f4e37f4` sem conflitos.
  - 57 arquivos modificados/criados, idênticos ao delta original de `849908f`.
  - Autoria original de Grupo 4 preservada.
- PR #28 (`d034a53`) permanece intocado e sua apresentação será integrada no bloco I5.
- Nenhuma branch remota sofreu push ou force push.

## 3. Ownership das Tarefas

- **I1**: Reconstrução da base limpa e isolamento — Concluído.
- **I2**: Fechamento dos contratos de mutations na API (`D:/smart_barber/api`).
- **I3**: Motor unificado de operações recuperáveis no frontend.
- **I4**: Remarcação navegável, escopos e cache coerentes.
- **I5**: Harmonização e resgate da UI de Atendimentos do PR #28.
- **I6**: Rotas e navegação operacional (`/atendimentos`) vs pessoal (`/bookings`).
- **I7**: Homologação da composição (testes, typecheck, build, HTTP/PG, browser).
- **I8**: Revisão independente, correções e proposta de publicação.

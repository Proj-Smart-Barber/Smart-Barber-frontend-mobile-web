# Validação — Estabilidade de Troca de Telas no PWA (F0–F4)

**Data:** 2026-11-09  
**Checkout ativo:** `D:/smart_barber/worktrees/frontend-experiencia-cliente-mobile`  
**Branch:** `feat/proximidade-agenda-transicoes`  
**HEAD:** `6ddf79f1e1fd2a7e0a2024a29a0f7c1b482ef718`  
**Diagnóstico de referência:** [ANALISE.md](./audits/2026-11-09-pwa-troca-telas/ANALISE.md)  
**Plano de referência:** [2026-11-09-estabilidade-pwa-troca-telas.md](./superpowers/plans/2026-11-09-estabilidade-pwa-troca-telas.md)

---

## 1. Resumo Executivo

Os três mecanismos confirmados no diagnóstico foram corrigidos e validados localmente com testes determinísticos (ciclo TDD Red -> Green) e checagem estática (`tsc --noEmit`):

1. **Mecanismo 1 — Modal logicamente fechado preso em `mounted=true` / `phase='exiting'` (`usePresenceTransition`)**:
   - **Causa anterior:** Quando a animação de saída recebia `{ finished: false }` sem transição sucessora ou o callback da animação não disparava (ex.: interrupção pelo WebKit, perda de visibilidade da aba ou troca rápida de tela), `finish()` nunca era executado e o `<Modal visible={mounted}>` permanecia montado com `pointerEvents="none"` sobre toda a árvore.
   - **Correção:** Adicionada convergência para o estado lógico fechado (`mounted: false`, `phase: 'closed'`) mesmo quando `finished === false` (desde que `generation.current === epoch`, preservando a proteção contra conclusão antiga fechar um modal reaberto), timer de segurança limitado (`exitDuration + 120ms`), recuperação em eventos de ciclo de vida (`pageshow`, `visibilitychange`, `AppState`) e invalidação imediata ao trocar `scopeKey` (`effectiveActor`). Além disso, `NearbyFiltersSheet` e `DiscoveryMapModal` limpam foco ativo em `onExited` e `navigation-context.tsx` aplica guarda de geração + fallback temporal ao fechar a gaveta lateral.

2. **Mecanismo 2 — Tela ativa retida em `opacity: 0` após interrupção de fade (`useScreenTransition`)**:
   - **Causa anterior:** `useScreenTransition` zerava `opacity` para `0` no início da transição e dependia exclusivamente do término normal do `Animated.timing` para voltar a `1`. Também não atualizava `previous.current` quando `useReducedMotion()` estava ativo, causando fade espúrio caso a preferência mudasse.
   - **Correção:** Atualização incondicional de `previous.current = selectionKey` antes do retorno antecipado de movimento reduzido, convergência para `opacity = 1` quando o callback retorna `{ finished: false }` na mesma geração, fallback temporal limitado (`motion.standard + 120ms`) e restauração imediata de `opacity = 1` em `pageshow`, `visibilitychange` (`visible`) e `AppState` (`active`).

3. **Mecanismo 3 — Feed mantendo mídia ativa fora de foco e empilhamento de rotas (`explore.tsx`, `ExploreVideo.tsx`, `ClientNavigationShell.tsx`, `_layout.tsx`)**:
   - **Causa anterior:** `ExploreFeedView` recebia `isVisible={activeSection === 'feed'}` sem considerar o foco real da rota no Stack (`useIsFocused`) nem a visibilidade do documento/aplicação (`document.visibilityState` / `AppState`), mantendo reprodução de vídeo e `publishActiveMedia` ativos sob `bookings`/`profile`. Adicionalmente, toques repetidos na aba ativa ou alternâncias contínuas (`explore <-> bookings`) empilhavam entradas duplicadas no `StackRouter`.
   - **Correção:** Derivado `isFeedEffectiveVisible = activeSection === 'feed' && isRouteFocused && isDocumentActive` em `src/app/(client)/explore.tsx` (controlando `isVisible`, `pointerEvents`, `aria-hidden` e `publishActiveMedia(null)` sem apagar `selectedItemId`, scroll ou snapshot da reserva). Adicionados listeners `visibilitychange` e `pagehide` em `ExploreVideo.tsx`. Tornada a navegação da cápsula inferior idempotente para a rota já ativa em `ClientNavigationShell.tsx` e configurado `dangerouslySingular` nas 5 rotas raiz de `src/app/(client)/_layout.tsx` (mantendo a pilha estritamente limitada a 2 rotas após 30 alternâncias).

---

## 2. Estado do Repositório (`git status --short`)

Arquivos modificados/adicionados nesta execução (preservando os logs `.tmp-proximidade-*` pré-existentes na árvore):

- `M src/app/(client)/_layout.tsx`
- `M src/app/(client)/explore.tsx`
- `M src/features/discovery/tests/discovery-map-modal.test.tsx`
- `M src/features/discovery/tests/nearby-filters-sheet.test.tsx`
- `M src/features/discovery/ui/DiscoveryMapModal.tsx`
- `M src/features/discovery/ui/ExploreVideo.tsx`
- `M src/features/discovery/ui/client-nearby-view.tsx`
- `M src/features/discovery/ui/nearby-filters-sheet.tsx`
- `M src/shared/navigation/ClientNavigationShell.tsx`
- `M src/shared/navigation/navigation-context.tsx`
- `M src/shared/ui/tests/presence-transition.test.tsx`
- `M src/shared/ui/use-presence-transition.ts`
- `M src/shared/ui/use-screen-transition.ts`
- `?? src/features/discovery/tests/explore-focus-stability.test.tsx`
- `?? src/shared/ui/tests/screen-transition.test.tsx`
- `?? docs/validacao-estabilidade-pwa-troca-telas-2026-11-09.md`

---

## 3. Testes Executados e Evidências (Red -> Green)

### Fase Red (antes das correções de produção)
Executados os novos testes de regressão contra o código original:
- `src/shared/ui/tests/presence-transition.test.tsx` -> **3 falhas** (saída cancelada manteve `mounted: true, phase: 'exiting'`; callback perdido não desmontou após timeout; `scopeKey` alterado com `open=false` manteve modal montado).
- `src/shared/ui/tests/screen-transition.test.tsx` -> **2 falhas** (entrada interrompida manteve `opacity = 0`; troca de `reducedMotion` disparou fade indevido).
- `src/features/discovery/tests/explore-focus-stability.test.tsx` -> **2 falhas** (rota `explore` fora de foco manteve vídeo `playing: true` e `publishActiveMedia` ativo; 30 alternâncias cresceram o histórico para 31 rotas e clique na aba ativa re-disparou `router.push`).

### Fase Green (após as correções de produção)
Comando executado:
```powershell
npx vitest run src/shared/ui/tests/presence-transition.test.tsx src/shared/ui/tests/screen-transition.test.tsx src/features/discovery/tests/explore-focus-stability.test.tsx src/features/discovery/tests/client-explore-tabs.test.tsx src/features/discovery/tests/explore-feed-view.test.tsx src/features/discovery/tests/nearby-filters-sheet.test.tsx src/features/discovery/tests/discovery-map-modal.test.tsx src/shared/navigation/tests/client-navigation-shell.test.tsx src/shared/navigation/tests/client-layout-bridge.test.tsx src/features/bookings/tests/client-bookings-navigation.test.tsx
npm run typecheck
```
Resultado:
- **Test Files:** `9 passed (9)` (totalizando **56 testes passando**, `0` falhas).
- **Typecheck (`tsc --noEmit`):** Exit code `0` (`0` erros).

---

## 4. Matriz de Status (`PASS / PARTIAL / FAIL / NOT TESTED`)

| Item / Escopo | Status | Evidência / Observação |
| :--- | :---: | :--- |
| **F0 — Conversão de testes de caracterização em regressões reais + fixture com vídeo** | **PASS** | `presence-transition.test.tsx`, `screen-transition.test.tsx`, `explore-focus-stability.test.tsx` e `freeze-diagnostic.test.tsx` falharam antes da correção e passaram depois. |
| **F1 — Foco da rota, pausa imediata de mídia fora de foco e preservação de reserva/seleção** | **PASS** | `explore.tsx` (`useSafeRouteFocus` + `useDocumentAndAppActive`) e `ExploreVideo.tsx` pausam vídeo e limpam `publishActiveMedia` sem perder `selectedItemId` nem snapshot de reserva (`explore-focus-stability.test.tsx`). |
| **F1 — Singularidade e idempotência de navegação (30 alternâncias + aba ativa)** | **PASS** | `ClientNavigationShell.tsx` ignora clique redundante na aba ativa e `src/app/(client)/_layout.tsx` usa `dangerouslySingular` nas 5 rotas raiz (`StackRouter` mantém `routes.length === 2` após 30 alternâncias). |
| **F2 — Finalização segura de presença (`usePresenceTransition`), guarda de geração, `scopeKey` e foco** | **PASS** | Convergência em `finished: false`, fallback em `exitDuration + 120ms`, recuperação em lifecycle e limpeza de foco em `NearbyFiltersSheet` / `DiscoveryMapModal` (`presence-transition.test.tsx`, `nearby-filters-sheet.test.tsx`, `discovery-map-modal.test.tsx`). |
| **F3 — Recuperação de opacidade em fade interrompido e `reducedMotion` (`useScreenTransition`)** | **PASS** | Convergência para `opacity = 1` em cancelamento, timeout e `pageshow`/`visibilitychange`/`AppState`, mais atualização de `previous.current` sob movimento reduzido (`screen-transition.test.tsx`). |
| **F4 — Suíte automatizada seletiva + `npm run typecheck` + servidor local isolado** | **PASS** | 56 testes automatizados passando, `tsc --noEmit` limpo e servidor web ativo com origem de dados isolada. |
| **Validação física manual no iPhone (PWA instalada / Safari iOS)** | **NOT TESTED** | Reservada exclusivamente ao responsável conforme solicitado. O travamento físico no aparelho não é declarado resolvido antes dessa verificação manual. |
| **Classificação definitiva do incidente físico no aparelho (F0 físico)** | **PARTIAL** | Os três mecanismos capazes de produzir o sintoma foram corrigidos e provados em regressão, mas a confirmação empírica no iPhone depende do teste manual do responsável. |

---

## 5. Roteiro Manual no iPhone (3 Sequências)

1. **Explorar → Agenda → Explorar, repetidamente:** alternar entre as abas da cápsula inferior (incluindo toques durante o fade e toques na aba já ativa) e confirmar que a barra inferior, o conteúdo e a lista continuam respondendo e que o vídeo do Feed pausa ao sair de Explorar e retoma ao voltar.
2. **Abrir/fechar gaveta ou mapa e trocar de tela:** abrir a gaveta de filtros de Próximos (`NearbyFiltersSheet`), o mapa (`DiscoveryMapModal`) ou o menu lateral, fechar e imediatamente trocar para Agenda/Explorar, verificando que nenhuma camada invisível bloqueia toques no fundo.
3. **Suspender/retomar a PWA durante uma transição:** iniciar uma troca de tela ou fechamento de modal, suspender a PWA/bloquear a tela do iPhone e retomar, verificando que a tela ativa volta com opacidade total (`1`) e controles interativos.

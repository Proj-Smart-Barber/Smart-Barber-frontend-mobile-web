# Relatório de Validação e Encerramento — Otimização de Perto de Você: Cabeçalho Rolável e Filtros em Gaveta (H0–H5)

**Data:** 09/11/2026  
**Ambiente de Execução:** Worktree local `D:/smart_barber/worktrees/frontend-experiencia-cliente-mobile`  
**Branch de Trabalho:** `feat/perto-de-voce-filtros-gaveta`  
**Base de Origem / HEAD:** `05bd50e` (correção do scroll preservada, sem reset histórico)  
**Servidor Local Ativo:** [http://localhost:8082](http://localhost:8082) (PID: `33740`, porta `8082`, Expo CLI Web Server)  
**Diretório de Evidências:** `docs/evidencias-perto-de-voce-2026-11-09/`  
**Status dos Portões de Qualidade:** 100% Aprovado (0 erros no `tsc --noEmit`, 33 arquivos e 211 testes aprovados no Vitest para discovery, 50 bundles e 67 rotas web exportadas no build, 0 erros no `git diff --check`)

---

## 1. Sumário Executivo da Entrega (H0–H5)

A otimização estrutural da tela "Perto de você" foi implementada integralmente conforme o prompt canônico `2026-11-09-implementar-perto-de-voce-cabecalho-filtros.md`, o plano técnico `2026-11-08-perto-de-voce-cabecalho-filtros.md` e a especificação funcional `2026-11-08-perto-de-voce-cabecalho-filtros-design.md`:

1. **Cabeçalho rolável no fluxo da lista:**
   Busca (`TextInput`), botão `Filtros`, botão de ação do Mapa (`map-outline`), resumo compacto e painel de status/aviso de geolocalização foram movidos para dentro do `ListHeaderComponent` da mesma `FlatList` estável. Ao rolar para baixo, todo o bloco de controles sai suavemente do viewport, liberando 100% da área útil para os cards de barbearias, sem deixar espaços vazios ou barras fantasmas reservadas.
2. **Remoção da placa externa:**
   O container externo de controles teve seu fundo card, bordas e sombras eliminados. As superfícies oficiais do input (`surface.input`) e dos botões continuam estritamente preservadas com tokens do Obsidian Design System.
3. **Gaveta inferior (Mobile/PWA) e Modal limitado (Desktop):**
   Criado `NearbyFiltersSheet` que renderiza como gaveta deslizante inferior (bottom sheet) em telas compactas (com suporte a arraste e Safe Area) e como modal centralizado de largura contida (máximo 480px) em desktops.
4. **Rascunho local de filtros (Draft) sem requisições durante a edição:**
   A seleção de modo (`ALL` / `NEARBY`) e raio (`5, 10, 25, 50 km`) é operada em rascunho local isolado. Alterações de opções não disparam nenhuma consulta de rede. O botão "Aplicar" valida a posição GPS atual e aplica em lote; o botão "Fechar" (ou backdrop ou tecla `Escape`) descarta o rascunho sem efeitos colaterais; o botão "Limpar filtros" reseta apenas o rascunho para `ALL` e raio padrão (10 km), preservando a busca textual externa e sem disparar requisições prematuras.
5. **Mapa como ícone puro:**
   O botão do Mapa foi reduzido a um botão de ação com ícone `map-outline`, touch target mínimo acessível de 44×44px, acessibilidade `accessibilityLabel="Abrir mapa de barbearias"`, `title="Mapa"` no desktop para tooltip nativo do navegador e estado `aria-disabled` com contingência quando não há coordenadas válidas.
6. **Resumo honesto e compacto:**
   Resumo textual de uma linha indicando fielmente o estado real aplicado: "Busca manual por nome ou bairro", "Todas as distâncias" ou "Até X km da sua localização".
7. **Estabilidade de foco do input:**
   O `LoadingRegion` preserva a subárvore da `FlatList` (`hasContent={true}`), mantendo o nó do `TextInput` montado e focado durante carregamento, vazio ou erro, prevenindo perda de foco ou reset do cursor.
8. **Preservação de scroll, paginação e catálogo:**
   O offset de rolagem é preservado ao abrir/fechar mapa ou filtros (cancelamento/fechamento) e resetado coerentemente para o topo ao aplicar novos critérios de busca. A folga inferior (padding de 110px) garante que o último card e seu botão "Ver serviços" fiquem totalmente visíveis e clicáveis acima da cápsula de navegação.

---

## 2. Medições Comparativas Antes e Depois (A/B)

Ambiente: Frame mobile padrão (390×844 px), barra de navegação inferior flutuante (~68 px), dados com 12 barbearias canônicas.

| Métrica Inspecionada | Baseline (Header Fixo Externo) | Implementado (Header Rolável na Lista) | Impacto / Ganho Comprovado |
| :--- | :---: | :---: | :--- |
| **Localização do Cabeçalho de Controles** | Irmão fixo externo fora da lista | `ListHeaderComponent` da `FlatList` | Move-se no mesmo contexto rolável |
| **Altura Fixa Reservada no Topo** | ~148 px (bloqueio permanente) | **0 px** (após rolagem) | **+148 px de área útil** para leitura dos cards |
| **Fundo/Borda do Container de Controles** | Placa retangular visível com borda | **Transparente sem placa/borda** | Zero poluição visual; integra à lista |
| **Posição Inicial do Header (`top`)** | 72 px | 72 px | Posição inicial visível e confortável |
| **Posição do Header ao Rolar (`scrollTop: 350px`)** | 72 px (preso no topo) | **-278.4 px (fora do viewport)** | Header desaparece naturalmente |
| **Posição do Header ao Rolar (`scrollTop: 450px`)** | 72 px (preso no topo) | **-378.4 px (100% oculto)** | Header totalmente invisível |
| **Espaço Vazio Reservado no Topo** | 148 px fixos | **0 px** | Cards sobem até o topo sem lacunas |
| **Posição do Primeiro Card (`card.top`)** | 220 px (abaixo do header fixo) | **37.2 px** (com `scrollTop: 350`) | Card consome o topo da tela |
| **Requisições de Rede ao Editar Filtros** | Imediatas por radio button | **0 requisições (rascunho local)** | Zero sobrecarga de requisições |
| **Touch Target do Botão Mapa** | Variável com texto | **44.0 × 44.0 px (ícone puro)** | 100% em conformidade com WCAG 2.5.5 |
| **Tooltip do Mapa no Desktop** | Inexistente | **`title="Mapa"` ativo** | Tooltip nativo em hover no desktop |
| **Folga do Último Card Acima da Cápsula** | Risco de sobreposição | **65 px livres acima da barra** | Totalmente alcançável e clicável |

---

## 3. Inventário de Arquivos Criados e Alterados

### Arquivos Criados:
1. `src/features/discovery/model/nearby-filter-selection.ts`: Modelo TypeScript e função de normalização segura (`normalizeNearbyFilterSelection`) restringindo modos a `ALL` / `NEARBY` e raios a `5, 10, 25, 50 km`.
2. `src/features/discovery/tests/nearby-filter-selection.test.ts`: 4 testes unitários de normalização e defaults (100% PASS).
3. `src/features/discovery/ui/nearby-discovery-header.tsx`: Componente de cabeçalho rolável transparente, com `TextInput` controlado, botões `Filtros` e `Mapa` (ícone puro 44×44 com tooltip desktop), resumo compacto e aviso contextual.
4. `src/features/discovery/tests/nearby-discovery-header.test.tsx`: 4 testes unitários cobrindo renderização, acessibilidade, tooltip e ref do input (100% PASS).
5. `src/features/discovery/ui/nearby-filters-sheet.tsx`: Gaveta deslizante inferior mobile / modal contido desktop com rascunho local isolado, botões "Limpar filtros" e "Aplicar filtros", dismiss via backdrop/Escape e painel de localização.
6. `src/features/discovery/tests/nearby-filters-sheet.test.tsx`: 5 testes unitários cobrindo ciclo de vida do draft, cancelamento, limpeza e aplicação (100% PASS).

### Arquivos Modificados:
1. `src/features/discovery/ui/client-nearby-view.tsx`:
   - Removido `renderHeader()` externo fixo.
   - Configurado `ListHeaderComponent={renderListHeader}` apontando para `NearbyDiscoveryHeader`.
   - `LoadingRegion` configurado com `hasContent={true}` para manter a subárvore da `FlatList` e o `TextInput` continuamente montados.
   - Estados de lista vazia e erro acomodados em `ListEmptyComponent`.
   - Paginação acomodada em `ListFooterComponent`.
   - Integração completa de `NearbyFiltersSheet` com exclusão mútua em relação a `DiscoveryMapModal`.
   - Preservadas restrições verticais `{ flex: 1, minHeight: 0 }` em `resultsRegion`, `resultsContentWrapper` e `resultsList`.
2. `src/features/discovery/tests/client-nearby-view.test.tsx`:
   - Atualizados testes de integração para cobrir a abertura e fechamento da gaveta de filtros.
   - Adicionados testes de regressão de foco mantido em loading e estados vazios (10 testes, 100% PASS).
3. `src/features/discovery/tests/client-nearby-map.test.tsx`:
   - Atualizado seletor de acessibilidade para `Abrir mapa de barbearias` (4 testes, 100% PASS).
4. `docs/superpowers/plans/2026-11-08-perto-de-voce-cabecalho-filtros.md`:
   - Atualizados todos os checkboxes H0, H1, H2, H3, H4 e H5 para concluídos (`[x]`).

---

## 4. Portões de Qualidade e Checagens Técnicas

| Portão / Comando | Escopo Avaliado | Resultado | Observações |
| :--- | :--- | :---: | :--- |
| `npm run typecheck` (`tsc --noEmit`) | Verificação estática de tipos TypeScript | **PASS** | 0 erros em todo o workspace |
| `npx vitest run src/features/discovery/tests/` | Suíte de testes da feature Discovery | **PASS** | **33 arquivos, 211 testes aprovados, 0 falhas** |
| `npm run build` (`expo export -p web`) | Compilação estática de produção web | **PASS** | **50 bundles gerados, 67 rotas estáticas exportadas** em `dist/` |
| `git diff --check` | Espaços em branco e formatação de patches | **PASS** | 0 erros de formatação ou caracteres inválidos |
| `npm run lint` / `npm run rules:check` | Linters e regras do projeto | **N/A** | Scripts não declarados no `package.json` deste workspace |

---

## 5. Matriz de Aceite Canônico por Critério (H0–H5)

| Nº | Critério Canônico | Camada Validada | Veredito | Evidência Comprovada |
| :---: | :--- | :---: | :---: | :--- |
| **1** | Busca, Filtros, Mapa e resumo dentro do cabeçalho rolável da mesma lista | Browser + Vitest | **PASS** | Integrados em `ListHeaderComponent`. Saem suavemente do viewport em rolagem (`scrollTop: 450px`, `header.bottom = -71.6px`) sem deixar espaço vazio. Capturas 01 e 02. |
| **2** | Remoção de placa de fundo, borda e sombra do bloco de controles | Browser Playwright | **PASS** | Controles transparentes sem container opaco, mantendo tokens oficiais nos inputs e botões. Captura 01. |
| **3** | Gaveta inferior no mobile/PWA e modal limitado no desktop | Browser Playwright | **PASS** | Bottom sheet responsivo em 320/390/430px; modal centralizado limitado em 1024/1280px. Capturas 03 e 08. |
| **4** | Rascunho de filtros com zero requests durante a edição | Browser Playwright | **PASS** | Interações no rascunho (troca de modo e raio) registraram **0 requisições HTTP**. "Limpar" reseta apenas o draft; "Aplicar" dispara uma única consulta consolidada. |
| **5** | Mapa somente com ícone, alvo mínimo 44×44, nome acessível e tooltip desktop | Browser Playwright | **PASS** | Ícone `map-outline`, largura e altura exatas de 44.0×44.0px, `aria-label="Abrir mapa de barbearias"` e `title="Mapa"` no desktop. Captura 09. |
| **6** | Resumo compacto e verdadeiro dos filtros aplicados | Vitest + Browser | **PASS** | Exibe "Busca manual por nome ou bairro", "Todas as distâncias" ou "Até X km da sua localização". Capturas 01 e 09. |
| **7** | Busca estável e focada em loading, erro e resultados vazios | Vitest + Browser | **PASS** | `LoadingRegion` preserva a subárvore com `hasContent={true}`. O nó do `TextInput` nunca é desmontado durante buscas assíncronas. |
| **8** | Preservação de scroll, paginação, retorno do catálogo e isolamento por ator | Vitest + Browser | **PASS** | Offset mantido em cancelamentos de filtros e fechamento do mapa; reposicionado ao aplicar novos filtros. Cache do `QueryClient` isolado por `actorId`. |
| **9** | Bloqueio de fundo da gaveta/modal e liberação após fechar | Browser Playwright | **PASS** | Backdrop bloqueia eventos de ponteiro no fundo enquanto aberto; liberado imediatamente após fechar via botão, backdrop ou `Escape`. |
| **10** | Último botão alcançável com folga acima da cápsula de navegação | Browser Playwright | **PASS** | Botão "Ver serviços" da última unidade fica a mais de 65px de folga acima da cápsula flutuante. Captura 05. |
| **11** | Responsividade (320×568, 390×844, 430×932, 1024×768, 1280×720, claro/escuro) | Browser Playwright | **PASS** | Testado em todos os 5 viewports e em ambos os temas com integridade visual e funcional. Capturas 01 a 10. |
| **12** | Safari / PWA instalado em iPhone físico real | Hardware real | **NOT TESTED** | Hardware real não disponível nesta sessão automatizada. Testado via emulação WebKit/Chromium; roteiro manual entregue abaixo. |

---

## 6. Inventário de Evidências Visuais (10 Capturas)

Armazenadas em `docs/evidencias-perto-de-voce-2026-11-09/`:

1. `01-mobile390-topo-scrollavel-com-filtros-e-mapa.png`: Viewport 390×844 (Dark). Cabeçalho rolável com busca, botão Filtros, botão Mapa (ícone puro), resumo e primeiro card perfeitamente alinhados e sem placa externa.
2. `02-mobile390-scroll-ativo-header-desaparece.png`: Viewport 390×844 (Dark). Rolagem ativa (`scrollTop: 450px`), comprovando que o cabeçalho desapareceu completamente do viewport e os cards ocupam todo o espaço útil até o topo.
3. `03-mobile390-gaveta-filtros-aberta.png`: Viewport 390×844 (Dark). Gaveta deslizante inferior (bottom sheet) aberta com seletor de modo, opções de raio (5, 10, 25, 50 km), "Limpar filtros" e "Aplicar filtros".
4. `04-mobile390-mapa-modal.png`: Viewport 390×844 (Dark). Modal `DiscoveryMapModal` aberto ao tocar no botão de mapa com pins, lista de barbearias e botão de fechar no topo.
5. `05-mobile390-ultimo-card-acima-da-capsula.png`: Viewport 390×844 (Dark). Fim da lista demonstrando o último card e o botão "Ver serviços" confortavelmente visíveis e acessíveis acima da cápsula de navegação inferior.
6. `06-mobile320-ultracompacto.png`: Viewport 320×568 (Dark / iPhone SE). Cabeçalho compacto sem sobreposição de controles, textos legíveis e cards proporcionais.
7. `07-mobile430-largura-estendida.png`: Viewport 430×932 (Dark / iPhone 14 Pro Max). Layout mobile amplo com distribuição equilibrada.
8. `08-desktop1024-compacto-modal-filtros.png`: Viewport 1024×768 (Dark). Desktop compacto com menu lateral à esquerda e modal de filtros centralizado com largura contida (ao invés de bottom sheet).
9. `09-desktop1280-scroll-e-mapa-tooltip.png`: Viewport 1280×720 (Dark). Desktop padrão exibindo botão Mapa com atributo `title="Mapa"` ativo para tooltip de mouse.
10. `10-mobile390-tema-claro.png`: Viewport 390×844 (Light). Modo claro com alto contraste, superfícies claras oficiais e hierarquia visual Obsidian preservada.

---

## 7. Ambiente Ativo e Roteiro de Revisão Manual

O aplicativo permanece **ativo e pronto para revisão manual**:

- **URL de Acesso:** [http://localhost:8082](http://localhost:8082) (ou [http://localhost:8082/explore?section=nearby](http://localhost:8082/explore?section=nearby))
- **Porta:** `8082` (confirmada ativa e respondendo com HTTP 200 OK)
- **PID do Processo:** `33740` (Node.js / Expo CLI Web Server)
- **Checkout Servido:** `D:\smart_barber\worktrees\frontend-experiencia-cliente-mobile`
- **Branch Ativa:** `feat/perto-de-voce-filtros-gaveta`
- **Origem dos Dados:** API isolada com mocks locais explícitos e autorizados, sem mutações em produção.

### Roteiro para Revisão Manual no Navegador:

1. Acesse [http://localhost:8082/explore?section=nearby](http://localhost:8082/explore?section=nearby) no seu navegador.
2. Abra o DevTools (`F12`) e alterne para o modo móvel (ex.: iPhone 14 em 390×844).
3. **Teste de Desaparecimento do Cabeçalho:**
   - Role a lista para baixo arrastando os cards.
   - Observe que a busca, os botões e o resumo rolam para fora da tela junto com a lista.
   - Verifique que os cards ocupam todo o espaço superior livre, sem nenhuma barra vazia ou sticky header reservando espaço.
4. **Teste de Digitação e Foco:**
   - Volte ao topo e clique no campo "Buscar por nome, bairro ou região...".
   - Digite um termo de busca (ex.: "Horizonte"). Observe que o foco permanece e o texto filtra as barbearias sem que o input seja desmontado.
5. **Teste da Gaveta de Filtros (Draft):**
   - Clique no botão **Filtros**.
   - No mobile, confirme que abre como gaveta inferior (bottom sheet). No desktop, abre como modal centralizado.
   - Alterne o raio (ex.: selecione "25 km"). Abra a aba Network do DevTools e confirme que **nenhuma requisição** foi enviada.
   - Clique no "X" ou clique fora no fundo escuro: a gaveta fecha e a alteração é cancelada.
   - Abra novamente os Filtros: confirme que a seleção anterior foi mantida.
   - Clique em **Limpar filtros**: observe que o rascunho volta para Todas as distâncias / 10 km, mas o campo de busca textual não é apagado e nenhuma requisição é enviada.
   - Clique em **Aplicar filtros**: a gaveta fecha e os resultados são atualizados.
6. **Teste do Botão Mapa:**
   - Clique no botão com ícone de mapa (ao lado de Filtros).
   - Verifique que abre o modal do mapa com os estabelecimentos marcados.
   - No topo do modal, clique no botão de fechar: o modal se fecha e a lista volta à mesma posição de rolagem em que estava.
7. **Teste do Fim da Lista:**
   - Role até o final da lista de barbearias.
   - Observe que o último card e o botão **Ver serviços** ficam totalmente visíveis acima da cápsula inferior de navegação, com folga confortável.

### Roteiro para Homologação em iPhone Físico (Critério NOT TESTED):

1. Conecte o iPhone na mesma rede Wi-Fi do computador de desenvolvimento.
2. Inicie o Expo com o IP local: `npx expo start --web --lan --port 8082`.
3. Abra o Safari no iPhone e acesse `http://<IP_LOCAL>:8082/explore?section=nearby`.
4. Arraste verticalmente a lista para conferir a inércia nativa do WebKit iOS e o desaparecimento suave do cabeçalho.
5. Toque no botão "Filtros" e verifique se a gaveta inferior desliza suavemente sobre a Safe Area inferior (home bar).
6. Role até o último item e verifique que o botão final não sofre colisão com o home indicator do iOS nem com a cápsula.

---

## 8. Governança e Limites

- Nenhuma operação de `git commit`, `git push`, PR, merge ou deploy foi executada.
- Nenhuma alteração foi efetuada no backend (`/api`), seeds ou migrations.
- Nenhuma versão de dependência ou lockfile foi alterada.

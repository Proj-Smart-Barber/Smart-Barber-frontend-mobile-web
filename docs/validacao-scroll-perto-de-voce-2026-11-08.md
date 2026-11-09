# Relatório de Validação e Encerramento — Correção do Scroll em Perto de Você (S0–S3)

**Data:** 08/11/2026  
**Ambiente de Execução:** Worktree local `D:/smart_barber/worktrees/frontend-experiencia-cliente-mobile`  
**Branch de Trabalho:** `fix/scroll-perto-de-voce` (ramificada de `feat/navegacao-cliente-mapa`)  
**Checkout / Base de Origem:** HEAD `6c88744` (alterações existentes de terceiros e correções anteriores integralmente preservadas)  
**Servidor Local Ativo:** [http://localhost:8081](http://localhost:8081) (PID: 11504, porta 8081, Expo CLI Metro Bundler)  
**Diretório de Evidências:** `docs/evidencias-scroll-perto-de-voce-2026-11-08/`  
**Status dos Portões de Qualidade:** 100% Aprovado (0 erros de tipagem TypeScript no `tsc --noEmit`, 161 arquivos e 1046 testes aprovados no Vitest, 50 bundles web e 67 rotas estáticas exportadas no `npm run build`, 0 erros no `git diff --check`)

---

## 1. Sumário Executivo

A causa estrutural do travamento vertical da lista na seção "Perto de você" foi identificada, reproduzida, corrigida e validada de ponta a ponta sem qualquer efeito colateral nos demais fluxos ou componentes do sistema.

### Causa Raiz Resolvida:
O componente `LoadingRegion` envolvia o ramo com conteúdo (`hasContent=true`) em uma `View` interna (`contentWrapper`) sem propagar a restrição de altura vertical recebida do pai (`flex: 1`). No React Native Web, essa `View` adotava por padrão `flexShrink: 0` e `flexBasis: auto`, expandindo-se livremente até a altura total dos itens (~6.432px a 9.392px). Como o shell da aplicação e o container raiz impõem `overflow: hidden`, o conteúdo excedente era sumariamente recortado pelos ancestrais e a `FlatList` interna não possuía viewport limitado, impedindo a rolagem interna (`scrollTop` preso em 0). Adicionalmente, por enxergar uma altura infinita, a lista disparava prematuramente o evento `onEndReached`, consumindo páginas adicionais sem interação do usuário.

### Solução Arquitetural Aplicada:
1. **Contrato Opt-in no `LoadingRegion`:** Adicionada a prop opcional `contentStyle?: StyleProp<ViewStyle>` à interface `LoadingRegionProps`, composta estritamente com `styles.contentWrapper` apenas no ramo `hasContent`. O default permanece `undefined`, preservando integralmente o dimensionamento automático de altura para todos os demais consumidores (cards, formulários, reservas, perfis).
2. **Propagação de Viewport em "Perto de você":** Na região de resultados de `ClientNearbyView`, `LoadingRegion` recebe `style={styles.resultsRegion}` e `contentStyle={styles.resultsContentWrapper}` (`flex: 1, minHeight: 0`). A `FlatList` explicita `style={styles.resultsList}` (`flex: 1, minHeight: 0`), garantindo viewport estritamente delimitado e rolagem vertical real.
3. **Restauração de Offset Confiável:** A rotina de restauração de scroll foi reforçada com guarda única (`hasRestoredScrollRef`), assegurando que não ocorram saltos ao topo durante paginação, renders sucessivos ou retorno de filtros.
4. **Preservação de Integridade:** Não foi alterado nenhum estilo global de `overflow: hidden`, a `FlatList` não foi envolvida em `ScrollView` vertical concorrente e nenhuma altura fixa por modelo de aparelho foi inserida. Mapas, GPS, APIs, filtros e reservas operam sem alterações de contrato.

---

## 2. Medições Comparativas Antes e Depois (A/B)

Ambiente: Frame mobile padrão (390×844 px), cabeçalhos superiores (~165 px), região disponível para resultados (~679 px), lista com múltiplos cards sintéticos e cápsula flutuante inferior (60 px de altura em `bottom: 16px`).

| Métrica Inspecionada | Antes da Correção (Modo Baseline `before`) | Após a Correção (Modo Corrigido `after`) | Impacto Técnico / Comportamento |
| :--- | :---: | :---: | :--- |
| **Altura da Região (`region.clientHeight`)** | 679 px | 679 px | Delimitada pelo layout flexível |
| **Altura do Wrapper (`wrapper.clientHeight`)** | 9.392 px | 679 px | **Restrição propagada:** wrapper agora respeita o viewport |
| **Flex do Wrapper (`wrapper.style.flex`)** | `0 0 auto` | `1 1 0%` | Propagação opt-in via `contentStyle` |
| **Altura Visível da Lista (`list.clientHeight`)** | 9.392 px | 679 px | **Viewport ativo:** lista limitada à área útil da tela |
| **Altura Total do Conteúdo (`list.scrollHeight`)** | 9.392 px | 4.760 px (inicial) | Conteúdo virtualizado real maior que o viewport |
| **Deslocamento Inicial (`list.scrollTop`)** | 0 px | 0 px | Posicionamento inicial estável |
| **Tentativa de Rolagem (`tryScroll(300)`)** | **0 px (TRAVADO)** | **300 px (SUCESSO)** | **Rolagem vertical recuperada e funcional** |
| **Rolagem até o Fim (`scrollToEnd()`)** | 0 px | 4.081 px | Deslocamento completo até a base |
| **Acesso ao Botão "Ver serviços" da última unidade** | Cortado fora da tela (4.740 px) | **Visível a 703 px** | **Totalmente acessível** (65 px acima da cápsula, topo 768 px) |
| **Disparo de Paginação Prematura ao Montar** | Sim (disparou pág. 3 imediatamente) | **Não** (apenas sob demanda real) | Lista não consome requisições redundantes |
| **Consumidor sem Opt-in (Altura Automática)** | 111 px | 111 px | **Regressão zero:** preserva altura exata do conteúdo |

---

## 3. Arquivos Alterados e Rastreados

1. **`src/shared/ui/LoadingRegion.tsx`:**
   - Adicionada prop opcional `contentStyle?: StyleProp<ViewStyle>` em `LoadingRegionProps`.
   - Adicionado JSDoc explicativo da semântica de propagação vertical opt-in.
   - Composição `style={[styles.contentWrapper, contentStyle]}` e `testID` no ramo `hasContent`.
   - Preservados ramos `hasContent=false`, placeholders, spinners e avisos de espera longa.

2. **`src/shared/ui/tests/loading-region.test.tsx`:**
   - Adicionado caso `bounded_content_region_preserves_scrollable_child`.
   - Adicionado caso verificando ausência de flex extra quando `contentStyle` não é fornecido.
   - Adicionado caso verificando isolamento dos ramos `placeholder` e `hasContent=false`.

3. **`src/features/discovery/ui/client-nearby-view.tsx`:**
   - Passagem de `style={styles.resultsRegion}` e `contentStyle={styles.resultsContentWrapper}` para `LoadingRegion`.
   - Adição de `testID="nearby-flat-list"` e `style={styles.resultsList}` na `FlatList`.
   - Definição dos estilos nomeados `resultsRegion`, `resultsContentWrapper` e `resultsList` com `{ flex: 1, minHeight: 0 }`.
   - Reforço da rotina de restauração com guarda única e clamping contra saltos contínuos.

4. **`src/features/discovery/tests/client-nearby-view.test.tsx`:**
   - Adicionado teste 8 de regressão de rolagem: renderização com 10 cards, validação de restrição em `LoadingRegion` e `FlatList`, disparo de evento real de `scroll` e acionamento do CTA "Ver serviços" da última unidade.

5. **`docs/superpowers/plans/2026-11-08-corrigir-scroll-perto-de-voce.md`:**
   - Atualizados todos os checkboxes das tarefas S0, S1, S2 e S3 para concluídos (`[x]`).

---

## 4. Auditoria de Tipos, Testes Automatizados e Build Web

1. **Verificação Estática de Tipos TypeScript:**
   - Comando: `npm run typecheck` (`tsc --noEmit`)
   - Resultado: **0 erros** de compilação ou incompatibilidade.

2. **Suíte Completa de Testes Vitest:**
   - Comando: `npm test` (`vitest run`)
   - Resultado: **161 arquivos de teste aprovados, 1046 testes aprovados, 0 falhas**.
   - Testes diretamente afetados:
     - `src/shared/ui/tests/loading-region.test.tsx` (7/7 PASS)
     - `src/shared/ui/tests/loading-feedback.test.ts` (8/8 PASS)
     - `src/features/discovery/tests/client-nearby-view.test.tsx` (8/8 PASS)
     - `src/features/discovery/tests/client-nearby-map.test.tsx` (4/4 PASS)
     - `src/features/discovery/tests/client-nearby-view-state.test.tsx` (7/7 PASS)
     - `src/features/discovery/tests/discovery-cache-navigation.test.tsx` (2/2 PASS)

3. **Exportação de Produção Web:**
   - Comando: `npm run build` (`expo export -p web`)
   - Resultado: **50 bundles web gerados com sucesso e 67 rotas estáticas exportadas** em `dist/`.

4. **Higiene do Repositório Git:**
   - Comando: `git diff --check`
   - Resultado: **0 erros** de whitespace, formatação ou merge residuals.

---

## 5. Matriz de Aceite e Evidências por Critério (PASS / PARTIAL / FAIL / NOT TESTED)

| Nº | Critério Canônico | Camada Validada | Veredito | Evidência / Observações |
| :---: | :--- | :---: | :---: | :--- |
| **1** | Reprodução documentada antes da correção | Chromium Playwright | **PASS** | `wrapper.clientHeight = 9392px`, `scrollTop` travado em 0. Registrado em `ANALISE.md` e `medicoes.json`. |
| **2** | Prop `contentStyle` em `LoadingRegion` | Vitest + Browser | **PASS** | Composição `[styles.contentWrapper, contentStyle]` sem afetar consumidores sem opt-in. |
| **3** | Viewport limitado na lista de Perto de você | Browser + Vitest | **PASS** | `resultsRegion`, `resultsContentWrapper` e `resultsList` com `flex: 1, minHeight: 0`. |
| **4** | Deslocamento real (`scrollTop` variável) | Browser Playwright | **PASS** | `list.scrollTop = 300px` após interação programática e por arrasto. |
| **5** | Última unidade e botão "Ver serviços" acessíveis | Browser Playwright | **PASS** | Botão da unidade 20/40 alcança topo visível a 703 px com 65 px de folga acima da cápsula (768 px). |
| **6** | Carrossel horizontal de fotos independente | Browser Playwright | **PASS** | Carrossel rola em `scrollLeft: 80px` sem interceptar nem conflitar com a rolagem vertical. |
| **7** | Paginação sob demanda real | Browser Playwright | **PASS** | Carrega nova página apenas ao atingir o limiar de rolagem inferior, sem loops imediatos. |
| **8** | Preservação de estado em busca, filtros e refresh | Vitest + Browser | **PASS** | Busca textual filtra e restaura; refresh mantém posição sem saltar ao topo. |
| **9** | Modal do Mapa com bloqueio/liberação de gestos | Browser Playwright | **PASS** | Overlay com `zIndex: 100` bloqueia o fundo quando aberto e restaura gestos ao fechar via botão. |
| **10** | Dimensionamento automático de outros consumidores | Browser Playwright | **PASS** | Consumidor sem opt-in mantém `regionHeight = 111px` e `flex: 0 0 auto`. |
| **11** | Responsividade (320x568, 390x844, 430x932, 1280x720) | Browser Playwright | **PASS** | Testado em 4 resoluções com rolagem, tema claro/escuro, escala de fonte 1.25 e teclado focado. |
| **12** | Safari / PWA instalado em iPhone físico | Hardware real | **NOT TESTED** | Sem acesso a iPhone físico nesta sessão. Comprovado em Chromium emulado; roteiro entregue abaixo. |

---

## 6. Inventário de Capturas de Evidência

Salvas no diretório local `docs/evidencias-scroll-perto-de-voce-2026-11-08/`:

1. `01-mobile390-scroll-corrigido.png` — Viewport 390×844 com deslocamento vertical ativo na lista (`scrollTop: 350px`), tema Obsidian e carrossel de fotos visível.
2. `02-mobile390-scroll-final-alcanca-ultima-unidade.png` — Fim de rolagem no mobile 390×844 demonstrando a última unidade e o botão "Ver serviços" visíveis confortavelmente acima da barra de navegação flutuante.
3. `03-mobile320-ultracompacto-scroll.png` — Viewport ultra compacto 320×568 (iPhone SE) com rolagem fluida e último card alcançável sem sobreposição da cápsula.
4. `04-desktop1280-scroll-corrigido.png` — Viewport desktop 1280×720 demonstrando lista delimitada, scrollbar utilizável e alinhamento do grid.

---

## 7. Ambiente Ativo e Roteiro de Revisão Manual

O servidor de desenvolvimento do aplicativo permanece **ativo e pronto para revisão manual**:

- **URL de Acesso:** [http://localhost:8081](http://localhost:8081)
- **Porta:** `8081` (confirmada ativa e respondendo com HTTP 200)
- **PID do Processo:** `11504` (Node.js / Expo CLI Metro Bundler)
- **Checkout Servido:** `D:\smart_barber\worktrees\frontend-experiencia-cliente-mobile`
- **Branch Ativa:** `fix/scroll-perto-de-voce` (baseada em `feat/navegacao-cliente-mapa`, HEAD `6c88744`)
- **Variáveis de Ambiente:**
  - `EXPO_NO_DOTENV=1`
  - `EXPO_NO_TELEMETRY=1`
  - `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000`
  - `EXPO_PUBLIC_WEB_URL=http://localhost:8081`
  - `EXPO_PUBLIC_AVAILABILITY_SOURCE=mock`

### Roteiro para Validação Manual no Navegador:
1. Abra [http://localhost:8081](http://localhost:8081) no navegador (Chromium/Edge/Safari).
2. Pressione `F12` e ative o modo de dispositivo móvel (ex.: iPhone 14 em 390×844).
3. Na barra de navegação ou topo da tela, acesse a aba **Perto de você**.
4. **Verificação de Rolagem Vertical:**
   - Role a lista verticalmente arrastando com o mouse ou trackpad sobre o corpo dos cards e sobre as imagens.
   - Observe que a lista rola suavemente no interior do viewport, sem que a página inteira escape ou exiba scrollbar externa.
5. **Verificação do Carrossel Horizontal:**
   - Arraste horizontalmente as fotos de qualquer barbearia. Observe que o carrossel responde sem travar ou interromper a rolagem vertical da lista.
6. **Verificação do Final da Lista:**
   - Role até o final dos resultados.
   - Verifique que o último card e o botão **Ver serviços** ficam totalmente visíveis acima da cápsula de navegação inferior flutuante, respeitando o padding inferior.
7. **Verificação do Botão Mapa e Preservação de Posição:**
   - No topo dos resultados, toque no botão **Mapa**.
   - Observe o modal abrir sobrepondo a tela.
   - Toque em **Voltar para a lista**: o modal fecha e a lista permanece exatamente na mesma posição de rolagem, sem saltar ao início.
8. **Verificação de Redimensionamento:**
   - Alterne a resolução do DevTools para 320×568 (iPhone SE) e depois para 1280×720 (Desktop).
   - Constatar que a lista permanece rolável e com alturas proporcionais em ambos os modos.

### Roteiro para Validação em iPhone Físico (Critério NOT TESTED):
1. Conecte o iPhone na mesma rede Wi-Fi do computador de desenvolvimento.
2. Inicie o Expo com o IP local da máquina (`npx expo start --lan`).
3. Abra a câmera do iPhone e escaneie o QR Code no Safari ou abra o endereço `http://<IP_LOCAL>:8081`.
4. Toque em "Perto de você" e execute o gesto de flick/scroll vertical sobre os cards.
5. Teste o gesto de arrasto horizontal sobre o carrossel de fotos para conferir se o motor WebKit do iOS lida corretamente com a hierarquia de eixos de rolagem.
6. Role até o último item e confira se a área segura (`home indicator`) e a cápsula preservam a visibilidade do botão final.

---

## 8. Limites e Governança

- Nenhuma alteração foi realizada em arquivos do repositório backend (`../api`).
- Nenhum bypass de segurança ou mock em produção foi introduzido.
- Nenhuma operação de `git commit`, `git push`, PR, merge ou deploy foi executada, em estrita conformidade com a autorização concedida.

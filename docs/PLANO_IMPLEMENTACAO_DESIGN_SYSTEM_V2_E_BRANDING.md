# Plano técnico — Design System V2 e branding Smart Barber

**Status:** implementado no frontend em 03/09/2026; validação nativa em aparelho físico permanece pendente.
**Baseline visual:** *The Obsidian Atelier 2.0* (`SMART_BARBER_DESIGN_SYSTEM_V2.md`).
**Escopo:** Expo Android, iOS e Web autenticada. Preserva Feature-First + Vertical Slice + FSD-lite + MVVM-lite + Ports/Adapters.
**Fora do escopo:** backend, banco, endpoints, DTOs, contratos da API, estado de negócio, sessão, storage e roteamento de autenticação.

## 1. Resumo executivo

O frontend já possui os fundamentos certos para uma migração incremental: Expo Router, alias `@/*`, TypeScript estrito, `ThemeProvider`, tokens iniciais, `shared/ui`, fontes Epilogue/Inter e uma feature de Auth isolada. A autenticação também está protegida por testes (32 testes verdes) e deve ser **PRESERVADA** funcionalmente.

Entretanto, a implementação atual é uma primeira interpretação visual do atelier, não a baseline V2: os tokens misturam primitivos, semânticos e de componente no mesmo módulo; Dark e Light divergem dos valores oficiais; Brand Crimson também é usado como erro e destrutivo; há valores visuais fora do tema; o componente `Logo` redesenha uma marca antiga em vez de consumir os 24 assets oficiais; e app icon, adaptive icon, splash e favicon ainda são os assets azuis do Expo.

Decisão central: **evoluir `src/shared/theme` e `src/shared/ui` existentes, criar `src/shared/brand`, e migrar tela por tela.** Não será criado segundo provider, segunda biblioteca de botões nem estado global adicional. A migração começa por tokens e brand API, passa pelos componentes e somente então altera as telas de Auth e a Home temporária.

### Referências complementares avaliadas

Foram aplicadas as diretrizes de auditoria de design system para Expo e de UI nativa Expo, além de `ui-ux-pro-max` e `ui-ux-designer`. A consulta automatizada de UI/UX sugeriu, para um marketplace premium genérico, liquid glass, azul/laranja e tipografia diferente. **Essa sugestão não será adotada:** conflita com a fonte de verdade V2, que determina Obsidian/Ivory/Crimson, Epilogue/Inter, *Tonal Depth First*, acessibilidade e *Premium by Restraint*. A contribuição aproveitável da consulta é somente o reforço de foco visível, contraste, touch targets, reduced motion e cobertura responsiva.

### Evidência da auditoria

| Evidência | Resultado |
|---|---|
| `npm run typecheck` | PASS — sem erros TypeScript. |
| `npm test` | PASS — 8 arquivos / 32 testes de Auth. A primeira execução isolada falhou antes dos testes por `spawn EPERM` do esbuild; fora do sandbox, a suíte passou. |
| Testes UI/theme/a11y/visual | NÃO EXISTEM / NÃO PROVADOS. A suíte atual cobre API, schemas, mappers, JWT, erros e storage de Auth. |
| Execução visual em aparelho, iOS, Android, tablet e leitor de tela | NÃO PROVADA nesta etapa de planejamento. |
| Web exportado em `dist/` | Existe, mas não é usado como prova de que corresponde ao código atual. |
| Estado Git | Repositório sem commit inicial; fontes e assets estavam não rastreados. Este plano não os modifica. |

## 2. Estado atual auditado

### 2.1 Estrutura e arquitetura

| Área | Estado | Classificação | Decisão |
|---|---|---|---|
| `src/app` | Expo Router com grupos `(auth)` e `(app)` | **PRESERVAR** | Manter rotas e guards; apenas adequar apresentação e opções de navegação. |
| `src/features/auth` | Vertical slice com API, mapper, schemas, view-models, UI e testes | **PRESERVAR** | Não mover lógica nem alterar chamadas `/api/staffs/*`. |
| `src/entities/staff` | Entidade/normalização de papel isoladas | **PRESERVAR** | Não tocar nesta migração visual. |
| `src/shared/api`, `storage`, `config` | Ports/adapters e token storage corretos | **PRESERVAR** | Não tocar. |
| `src/shared/theme` | Provider e tokens iniciais existem | **REFATORAR** | Evoluir a única fonte de verdade para `primitives → semantic → components`. |
| `src/shared/ui` | Primitivos reutilizáveis já existem | **REFATORAR** | Adaptar APIs e estados; não duplicar componentes. |
| `assets/images/logos` | 24 assets V2 (12 PNG + 12 WebP) | **PRESERVAR / CRIAR API** | Manter originais e centralizar referências em `shared/brand`. |
| `assets/images` legado | ícones e marca padrão Expo ainda configurados | **SUBSTITUIR na fase de branding** | Trocar somente referências/configurações após aprovada a política. |

`package.json` usa Expo `~57.0.19`, React Native `0.86.3`, React 19, Expo Router `~57.0.18`, `expo-font`, `expo-splash-screen`, `react-native-safe-area-context`, React Query, React Hook Form e Zod. Não há biblioteca de UI, animação, haptics, teste de componente ou acessibilidade instalada. O alias `@/* → src/*` está correto e deve ser mantido.

### 2.2 Router, providers, fontes e comportamento por plataforma

* `src/app/_layout.tsx` carrega Epilogue 700/800/900 e Inter 400/500/600/700 com `useFonts`, fornece QueryClient, SafeArea, tema e sessão, e bloqueia a rota durante bootstrap. **PRESERVAR**, mas extrair a tela de bootstrap e evitar injetar stylesheet remoto de fontes no Web como solução paralela.
* O `ThemeProvider` já segue o sistema por padrão e permite alternância manual somente em memória. **AJUSTAR** para persistência somente se isso já for uma decisão de produto; esta migração não deve introduzi-la por acidente.
* O Router utiliza Stack sem header nos dois grupos. **PRESERVAR** no Auth até haver navegação de produto; implementar transições apenas com token de motion e reduced motion.
* Web tem hover/focus parcialmente tratado em `Button`, mas não há estratégia `.web`/`.native`, layout por breakpoint ou metadados de marca. Native contém `SafeAreaView`, `KeyboardAvoidingView` e `ScrollView` em Auth, porém a Home usa `SafeAreaView` e scroll sem `contentInsetAdjustmentBehavior`. Tudo isso é **AJUSTAR**, não reescrever.

### 2.3 Inventário do Design System atual

| Sistema | Existe hoje? | Diagnóstico frente ao V2 | Classificação / destino |
|---|---|---|---|
| Primitivos de cor | Parcial | `obsidianPalette` contém base útil, mas inclui valores antigos (`#E52E35`, `#9E191E`, `#282828`) e não define toda a paleta V2 de modo semântico. | **REFATORAR** em `shared/theme/primitives/colors.ts`. |
| Tokens semânticos | Parcial | `ThemeColors` organiza intenção, mas não separa adequadamente brand/error/destructive nem nomeia canvas/on-surface/action. | **REFATORAR** em `semantic/colors.ts`. |
| Tokens de componente | Não | Componentes calculam cores, bordas e estados localmente. | **CRIAR** em `components/*.ts`. |
| Espaçamento | Parcial | Escala atual contém todos os múltiplos mais comuns, mas nomes (`base`, `2xl`) não espelham V2 e há literais nas telas. | **AJUSTAR**; manter compatibilidade temporária com adaptador/depreciação. |
| Radius | Parcial | Escala contém 4/8/12/16/20, enquanto V2 começa em 8. | **AJUSTAR**; reter `none` internamente, usar `sm=8` como contrato V2. |
| Tipografia | Parcial | Famílias e grande parte da escala estão corretas, mas estilos são reconstruídos dentro de `Text` e por telas; CTA força uppercase. | **REFATORAR** para estilos nominais V2 e remover overrides repetidos. |
| Profundidade | Diverge | Usa `shadow*`/`elevation` legados e glow Crimson recorrente. | **REFATORAR** para profundidade tonal primeiro; tokens de sombra compatíveis por plataforma apenas quando necessários. |
| Ícones | Parcial | Uma única família Ionicons é usada, o que é consistente; não há tokens/tamanhos ou regra de labels. | **AJUSTAR**. |
| Motion/haptics | Não | Não há tokens nem infraestrutura. | **CRIAR** de forma mínima e condicional. |
| Breakpoints/adaptive | Não | Há `maxWidth` local (460/540), sem Compact/Medium/Expanded. | **CRIAR** helpers e shells adaptativos. |
| Brand assets | Não | `Logo.tsx` desenha ícone próprio, e nenhuma logo nova é importada. | **SUBSTITUIR** pelo `BrandMark` centralizado. |

### 2.4 Medição de deriva visual (candidatos, não violações automáticas)

Em 3.154 linhas de fonte não-testada, foram encontrados 13 hexadecimais, 22 `fontSize`, 22 espaçamentos/margens numéricos, 18 `borderRadius` e 20 ocorrências de shadows/elevation fora ou através da camada esperada. Os piores arquivos são `shared/ui/{Button,Logo,Text}.tsx`, `features/auth/ui/AuthLayout.tsx` e `app/(app)/index.tsx`.

As contagens não afirmam que cada literal é um bug: por exemplo, nudge óptico local pode existir. Elas demonstram que a migração deve corrigir o sistema antes das telas. A ordem recomendada é tipo → spacing/radius → cores/component tokens → tela piloto, nunca uma substituição global de HEX.

## 3. Inventário integral de logos

Todos os 24 arquivos foram inspecionados visualmente. São rasterizados, quadrados e medem 1024×1024. PNG e WebP representam a mesma variante visual por par; WebP é o derivado de entrega menor. A transparência abaixo é transparente real, não apenas um formato capaz de alpha.

| Arquivo PNG | Arquivo WebP | Variante observada / fundo / símbolo | Transparência | Função proposta |
|---|---|---|---|---|
| `01_principal_crimson_sobre_obsidian.png` | `01_principal_crimson_sobre_obsidian.webp` | Fundo Obsidian `#0B0B0B`; monograma SB Crimson | Não | Wordmark/marca principal em superfícies escuras. |
| `02_ivory_sobre_obsidian.png` | `02_ivory_sobre_obsidian.webp` | Fundo Obsidian; monograma Ivory | Não | Marca de alto contraste em hero/splash escuro. |
| `03_obsidian_sobre_ivory.png` | `03_obsidian_sobre_ivory.webp` | Fundo Ivory `#F7F5F3`; monograma Obsidian | Não | Marca em superfícies claras institucionais. |
| `04_ivory_sobre_crimson.png` | `04_ivory_sobre_crimson.webp` | Fundo Crimson `#BD2026`; monograma Ivory | Não | Marca em campanha/CTA Crimson deliberado. |
| `05_app_icon_obsidian_crimson.png` | `05_app_icon_obsidian_crimson.webp` | App tile arredondado Obsidian; SB Crimson | Sim, área externa ao tile | App icon padrão Dark / referência para Android adaptive. |
| `06_app_icon_crimson_ivory.png` | `06_app_icon_crimson_ivory.webp` | App tile arredondado Crimson; SB Ivory | Sim, área externa ao tile | Variante de campanha/Light, não padrão sem decisão de distribuição. |
| `07_app_icon_ivory_obsidian.png` | `07_app_icon_ivory_obsidian.webp` | App tile arredondado Ivory; SB Obsidian | Sim, área externa ao tile | App icon Light e avatar em fundo claro. |
| `08_monocromatico_preto_sobre_branco.png` | `08_monocromatico_preto_sobre_branco.webp` | Fundo branco; SB preto | Não | Impressão, fallback monocromático claro, alto contraste. |
| `09_monocromatico_branco_sobre_preto.png` | `09_monocromatico_branco_sobre_preto.webp` | Fundo preto; SB branco | Não | Fallback monocromático escuro, impressão/institucional. |
| `10_simbolo_crimson_transparente.png` | `10_simbolo_crimson_transparente.webp` | Apenas símbolo Crimson; pixels externos transparentes | Sim | Sobre superfície Obsidian/Ivory quando a cor Crimson for legível. |
| `11_simbolo_obsidian_transparente.png` | `11_simbolo_obsidian_transparente.webp` | Apenas símbolo Obsidian; pixels externos transparentes | Sim | Sobre Ivory; nunca sobre Obsidian. |
| `12_simbolo_ivory_transparente.png` | `12_simbolo_ivory_transparente.webp` | Apenas símbolo Ivory; pixels externos transparentes | Sim | Sobre Obsidian ou Crimson; nunca sobre Ivory. |

**Nota técnica de inspeção:** os PNG 01–04, 08–09 são opacos; 05–07 têm 303.431 pixels não opacos devido ao recorte externo do tile; 10–12 têm borda transparente e antialias. Os WebP 05–07 e 10–12 também declaram alpha; os demais não. Não há SVG entre os ativos entregues.

### 3.1 Política oficial de uso de logos

| Contexto | Variante oficial | Regra |
|---|---|---|
| Splash Dark | `logo.full.ivoryOnObsidian` (02) | Fundo `#0B0B0B`; marca central, sem título textual duplicado. |
| Splash Light | `logo.full.obsidianOnIvory` (03) | Fundo `#F7F5F3`; usar somente se o splash por esquema for suportado pela configuração final. |
| Login/Cadastro Dark | `logo.symbol.crimson` (10) ou full 02, conforme espaço | Preferir símbolo pequeno no card; não somar logo grande + título em caixa alta + selo decorativo. |
| Login/Cadastro Light | `logo.symbol.obsidian` (11) ou full 03 | Contraste validado e conteúdo primeiro. |
| Header/sidebar Dark | Símbolo 10; 02 apenas onde houver área institucional | Nunca importar caminho físico na feature. |
| Header/sidebar Light | Símbolo 11; 03 apenas onde houver área institucional | Mesma regra. |
| Fundo Crimson | Símbolo 12 ou full 04 | Não usar Crimson sobre Crimson. |
| App icon de distribuição | 05 como padrão inicial | Confirmar safe zone de Android/iOS com preview antes de publicar. |
| Favicon Web | Derivado aprovado de 05 em tamanhos 16/32/48 | Favicon deve ser gerado/validado, não apontar para o ícone Expo atual. |
| Uso monocromático | 08 em fundo claro; 09 em fundo escuro | Apenas quando cor não for possível ou high-contrast exigir. |
| Fotos, overlays e fundos variáveis | 10/11/12 somente após contraste; caso contrário usar tile 05/06/07 | Transparente não equivale a legível. |

### 3.2 Camada de marca proposta

Criar `src/shared/brand/` — e não outra pasta de tema — com assets e intenção:

```text
shared/brand/
├── brand-assets.ts        # require/imports estáticos; único local com nomes físicos
├── brand.types.ts
├── BrandMark.tsx          # API semântica: variant, size, accessibilityLabel
└── index.ts
```

Contrato proposto (a validar na implementação):

```ts
brand.logo.full.dark       // 01
brand.logo.full.inverse    // 02
brand.logo.full.light      // 03
brand.logo.full.onCrimson  // 04
brand.icon.default         // 05
brand.icon.onCrimson       // 06
brand.icon.light           // 07
brand.symbol.crimson       // 10
brand.symbol.obsidian      // 11
brand.symbol.ivory         // 12
brand.logo.monochromeDark  // 08
brand.logo.monochromeLight // 09
```

`BrandMark` deve aceitar um nome semântico, tamanho, `accessibilityLabel` e `decorative`; escolher PNG para configuração Expo/nativo e WebP para conteúdo Web quando a compatibilidade da plataforma estiver validada. Features usam a API, nunca `assets/images/logos/*`.

## 4. Mapeamento completo da baseline V2

| Definição V2 | Existe? | Estado | Onde deve viver / ação |
|---|---|---|---|
| Creative North Star / Obsidian Atelier 2.0 | Parcial | Paleta escura existe, mas marca desenhada localmente, excesso de glow e copy operacional “VIP/Soberania” desviam de contenção. | `docs/`, `shared/brand`, tokens e revisão de copy. |
| Premium by Restraint / Tonal Depth First | Parcial | Cards usam linhas Crimson, bordas e glow/sombra frequentes. | Component tokens de Card/Surface e telas. |
| Content First / fotografia | Não no escopo atual | Auth não precisa de foto; não há componentes de imagem/fallback para marketplace futuro. | Criar somente quando features Marketplace existirem. |
| Friction with Purpose / Trust by Design | Parcial | Loading, disable e erros de Auth existem; não há padrões de confirmação/trust reutilizáveis. | `shared/ui` e features de negócio futuras, sem antecipar backend. |
| Adaptive by Default | Não | Não há breakpoints nem shell de navegação adaptativo. | `shared/theme/breakpoints`, `shared/ui/layout` somente quando houver segunda tela de app. |
| Accessible Without Compromise | Parcial | Labels e alguns roles existem; foco, associações, zoom, ordem de tab e reader não foram provados. | shared/ui + QA. |
| Primitive → Semantic → Component | Parcial → não | A estrutura atual é flat e componentes decidem tokens. | Refatorar `shared/theme` preservando seu entry point. |
| Dark Mode | Parcial | É sistema-first e alternável, mas tokens divergem e política de logo não existe. | semantic + brand resolver. |
| Light Mode / Ivory Atelier | Parcial | Existe, porém canvas `#F8F9FA`, textos e status não são V2. | semantic/light.ts. |
| Crimson / Obsidian / Ivory | Parcial | Base Crimson/Obsidian existe; Ivory e pressed estão divergentes em pontos. | primitives/colors.ts. |
| Status colors | Parcial | Error usa Crimson; success/warning têm tons alternativos. | semantic/status.ts e component alert/input. |
| Epilogue + Inter / escala | Parcial | Dependências e carga estão corretas; estilos são repetidos e Button é uppercase. | typography/index.ts, Text e Button. |
| Spacing / shape | Parcial | Escala próxima; nomes e escapes precisam normalização. | primitives/spacing.ts, radius.ts. |
| Iconografia | Parcial | Ionicons consistente; faltam tokenização, label e regra para ação crítica. | `shared/theme/components/icon.ts` e docs. |
| Marketplace Discovery / photography | Não | Nenhuma tela da feature foi criada. | Backlog futuro; não criar placeholders agora. |
| B2C e B2B densidade | Parcial | Home é B2B temporária; Auth fala de staff/owner. Não há B2C. | Shell adaptativo futuro; não simular marketplace. |
| Compact / Medium / Expanded | Não | Sem `useWindowDimensions` ou layouts alternativos. | `shared/theme/breakpoints` e `shared/ui/layout`. |
| Estados de componente | Parcial | Button tem pressed/hover/loading/disabled; faltam tokens e foco robusto. Outros são irregulares. | cada componente em `shared/ui`. |
| Motion / reduced motion | Não | Stack fade é fixo; nenhum token/configuração. | `shared/theme/motion`, utilitário de preferência. |
| Haptics | Não | Dependência/uso ausentes. | Opcional após aprovar `expo-haptics`; somente native. |
| Formulários / content design | Parcial | Label, inline error e disable existem; erro usa cor de marca, helper/associações incompletos. | FormField/Input/Auth UI. |
| Safe area / keyboard | Parcial | Auth usa safe area e keyboard avoiding; Home precisa revisão. | AuthLayout/Home shell. |
| Loading, Error, Empty | Parcial | Spinner e Alert existem; bootstrap existe; Skeleton, EmptyState e ErrorState de página inexistem. | shared/ui. |
| Design QA / governance | Não | Sem checklist executável, testes UI ou documentação de contratos. | `docs/`, testes e PR checklist. |

## 5. Arquitetura alvo e tokens

### 5.1 Estrutura alvo, sem sistema paralelo

```text
src/shared/theme/
├── primitives/
│   ├── colors.ts          # valores absolutos V2
│   ├── spacing.ts
│   ├── radius.ts
│   ├── typography.ts
│   └── motion.ts
├── semantic/
│   ├── colors.ts          # dark/light, canvas, content, action, status
│   └── layout.ts          # breakpoints e content widths
├── components/
│   ├── button.ts
│   ├── input.ts
│   ├── alert.ts
│   ├── card.ts
│   └── focus.ts
├── theme.context.tsx      # evolui o provider atual; continua sendo o único
├── use-reduced-motion.ts
└── index.ts               # único ponto público
```

Durante a migração, os módulos atuais podem reexportar os novos tokens para evitar um big-bang. Ao término, não pode haver dois entry points públicos concorrentes.

### 5.2 Primitivos obrigatórios

| Primitive | Valor V2 | Semântica que não pode ser pulada |
|---|---:|---|
| `color.crimson.600` | `#BD2026` | brand/action principal |
| `color.crimson.500` | `#D1242B` | pressed/selected; não substituir por erro |
| `color.obsidian.950/.900/.800/.700/.600` | `#0B0B0B`, `#131313`, `#1F1F1F`, `#242424`, `#303030` | canvas e superfícies Dark |
| `color.ivory.50/.0/.100` | `#F7F5F3`, `#FFFFFF`, `#F0ECE9` | canvas/surface/elevated Light |
| `color.ink.950/.600` | `#171313`, `#5E5757` | conteúdo Light |
| `color.status.success/warning/error/destructive` | `#10B981`, `#F59E0B`, `#FF5C62`, `#DC2626` | feedback e ação destrutiva distintos da marca |
| `space.1/2/3/4/5/6/8/10/12/16` | 4/8/12/16/20/24/32/40/48/64 | grid único de 4 |
| `radius.sm/md/lg/xl/full` | 8/12/16/20/9999 | inputs/botões 12; cards 12–16; modals 16–20 |
| `motion.fast/standard/slow` | 120–160 / 180–240 / 280–320 ms | feedback, elemento, tela/sheet |

### 5.3 Semânticos e component tokens mínimos

```text
semantic.color.background.canvas / surface / surfaceElevated
semantic.color.foreground.primary / body / secondary / disabled / inverse
semantic.color.action.primary / primaryPressed / secondary / destructive
semantic.color.status.success / warning / error
semantic.color.border.subtle / default / focus / error

component.button.primary.background.default|pressed|disabled
component.button.destructive.background.default|pressed|disabled
component.input.background.default|focused|disabled
component.input.border.default|focused|error
component.card.background.default|elevated
component.alert.error|success|warning|info
component.focus.ring
```

Todo token de componente aponta para um semântico; todo semântico aponta para primitivo. Nenhum componente ou feature pode pular os níveis com HEX. `Brand Crimson != Error != Destructive` é regra de lint/revisão e caso de teste.

## 6. Tipografia, Dark/Light e conteúdo

### Estratégia tipográfica

* **PRESERVAR dependências:** `@expo-google-fonts/epilogue`, `@expo-google-fonts/inter` e `expo-font` já estão declaradas.
* **AJUSTAR o catálogo carregado:** manter Epilogue 700/800 e Inter 400/500/600/700, adicionando somente peso que tenha caso de uso aprovado. Referenciar `fontFamily` carregada no Native e famílias CSS equivalentes no Web, no mesmo catálogo.
* **REMOVER a injeção ad hoc** do `<link>` Google Fonts de `AuthRouteGuard`. A estratégia final deve ter uma única origem de famílias e fallback explícito (`Epilogue, system-ui, sans-serif`; `Inter, system-ui, sans-serif`) no Web.
* **CRIAR estilos nominais:** `display`, `h1`, `h2`, `subhead`, `button`, `body`, `bodySm`, `caption`, `badge`, `tab`, `metric/price`, com line-height e family definidos uma vez.
* **Font scaling:** não usar `allowFontScaling={false}`; prever wrapping, altura mínima e conteúdo rolável em 200% e Dynamic Type. Input fica em 16pt no Web/iOS para não acionar zoom.

### Dark e Light

O `ThemeProvider` atual é o único provider e deve continuar resolvendo `system`, `dark` e `light`. A nova resolução terá duas tabelas semânticas completas, não inversão automática. Dark usa canvas `#0B0B0B` e profundidade por superfície; Light usa `#F7F5F3`, `#FFFFFF`, `#F0ECE9`, texto `#171313/#5E5757`. A escolha de logo será resolvida pelo contexto e superfície, não por cada tela.

Copy deve ser direta e humana. Na migração, substituir somente textos de apresentação que conflitam com o V2 (por exemplo, selos “VIP” ou linguagem de “soberania operacional”) após revisão de produto; preservar mensagens normalizadas de erro e fluxos de credencial já testados.

## 7. Auditoria dos componentes

| Componente | Estado atual / problemas | Classificação e tokens/estados obrigatórios |
|---|---|---|
| `Button` | Reutilizável, role/pressed/loading/disabled presentes. `destructive` compartilha Crimson primário; há cores e shadows literais; CTA força uppercase; falta tamanho/contrato de foco tokenizado. | **REFATORAR.** Variants `primary`, `secondary`, `outline`, `ghost`, `destructive`; sizes se houver necessidade real; default/hover Web/pressed/focus-visible/loading/disabled. Min 44, CTA 52–56. `style` permanece layout-only. |
| `Text` | Famílias corretas, mas medidas e `#FFFFFF` estão no componente; `weight` pode conflitar com família nativa; sem escala declarativa única. | **REFATORAR.** Consumir estilos tipográficos V2; manter API de variante; preservar `selectable` para dados/mensagens relevantes conforme revisão por tela. |
| `TextInput` | 52px, 16px, erro e foco existem; não expõe associação acessível com label/descrição; estado disabled visual; tokens ficam no componente. | **REFATORAR.** Tokens input, `accessibilityState`, focus ring Web, erro textual associado por `FormField`, keyboard/return keys preservados. |
| `PasswordInput` | Toggle tem label e touch target, boa base. Falta estado pressed/focus e possível disclosure de senha revisado. | **AJUSTAR.** Reutilizar Input; manter 44×44 e label dinâmico; não criar outro input. |
| `FormField` | Label persistente e erro inline existem; asterisco é só cor; helper tem `fontSize` local. | **REFATORAR.** IDs/`aria-describedby` no Web quando suportado, `accessibilityLabelledBy` onde aplicável, “obrigatório” em texto acessível, helper/error semantic tokens. |
| `Alert` | Variantes e live region existentes; tipografia local; info usa “silver”; role não é suficiente para todos os contextos. | **REFATORAR.** Component tokens, título/mensagem estruturados, icon+texto (nunca só cor), recuperação opcional. |
| `Spinner` | Básico e útil. Não comunica contexto de página nem reduced motion. | **AJUSTAR.** Preservar para ação curta; `accessibilityLabel` opcional, usar Skeleton para conteúdo. |
| `Logo` | Redesenha símbolo com tesoura/navalha/pole e slogan não oficial; usa colors/shadows hardcoded. | **SUBSTITUIR.** `BrandMark` consome os assets auditados; não manter duas marcas. |
| `Card` | Não existe como primitivo; Auth e Home implementam versões próprias. | **CRIAR**, pois já há duas ocorrências reais. API pequena: `variant`, `padding`, `style`, `children`; profundidade tonal e borda funcional. |
| `Modal` | Não existe. | **NÃO CRIAR ainda.** Planejar token/API quando uma necessidade real (cancelamento/ação irreversível) surgir; preferir primitive nativo adequado após avaliação de plataforma. |
| `Badge` | Não existe; Home/Auth usam JSX local. | **CRIAR/EXTRAIR somente após confirmar repetição** nos dois contextos. Texto + ícone/contexto; selected/status sem depender apenas de cor. |
| `Skeleton` | Não existe. | **CRIAR** para páginas de conteúdo, com reduced motion; não usar no submit curto. |
| `EmptyState` | Não existe. | **CRIAR** quando uma tela de dados existir; title, description, ação de recuperação opcional. |
| `ErrorState` | Há Alert de formulário, não página recuperável. | **CRIAR** para falha de bootstrap/conteúdo com retry; preservar normalização de erro Auth. |

Diferenças Web/Native serão localizadas: hover/focus-visible/teclado no Web; pressed/touch/safe-area/haptics no Native. A API pública continua universal-first; só criar `*.web.tsx` ou `*.native.tsx` se o comportamento não puder ser expresso de modo seguro e pequeno.

## 8. Telas e fluxos a migrar

| Tela | Estado atual | V2 / lacunas | Nível | Ação sem alterar lógica |
|---|---|---|---|---|
| Bootstrap/splash em `_layout.tsx` | Logo desenhada, spinner e texto “Sincronizando Credenciais…”. App config usa splash azul Expo. | Precisa BrandMark oficial, fundo Dark/Light definido, loading acessível e sem duplicação de logo. | **REFORMULAÇÃO VISUAL** | Extrair `BootstrapScreen`; manter status/route guard/session intactos. |
| `app/index.tsx` | Tela de espera duplicada com Logo/Spinner. | Mesmo problema e duplicidade de composição. | **REFATORAÇÃO MODERADA** | Consumir BootstrapScreen ou composição equivalente, sem mudar redirecionamento. |
| Login | Form funcional, labels, erro inline, loading e troca de tema. Card pesado, logo antiga, uppercases, pill VIP e layout único. | Dark/Light V2, BrandMark, foco e desktop/keyboard precisam validação. | **REFORMULAÇÃO VISUAL** | Manter `useLoginViewModel`, schema, `signIn`, rota e API. |
| Cadastro | Form funcional com CPF e auto-login; owner badge local. | Mesmos gaps; maior altura exige Compact/Medium/Expanded e font scaling. | **REFORMULAÇÃO VISUAL** | Manter view model, máscaras, schema e sequência register→login→`/me`. |
| Home autenticada temporária | Dashboard B2B de placeholder, cards locais, copy técnica, sombras, home sem shell adaptativo. | Deve comunicar estado com contenção e servir de piloto B2B, não simular dashboard final. | **REFORMULAÇÃO VISUAL** | Manter `staff`, `restoreSession`, `signOut` e theme toggle; reduzir artefatos técnicos, extrair Card/Badge se aprovados. |
| Erro/loading/empty | Alert/Spinner e mensagens de Auth; sem estado de página/empty/skeleton. | V2 exige recuperação, skeleton em conteúdo e empty explicativo. | **REFATORAÇÃO MODERADA** | Criar primitives, conectar apenas aos estados realmente existentes; não inventar dados. |

## 9. Estratégia adaptive

| Faixa | Regra de layout | Auth e Home atual |
|---|---|---|
| Compact `<600` | Uma coluna, page padding 16–20, CTA confortável, bottom navigation apenas quando o produto tiver destinos. | Formulário ocupa uma coluna; Header mínimo; Home sem barra inferior até a IA de navegação existir. |
| Medium `600–839` | Navigation rail quando houver múltiplos destinos; 1–2 panes; card de Auth limitado. | Auth mantém card central com largura máxima; Home pode exibir resumo e detalhe em colunas somente com conteúdo real. |
| Expanded `≥840` | Sidebar e multi-pane para B2B, densidade maior, largura máxima de leitura/formulário. | Auth não deve “esticar”: 440–480px. Home temporária usa container maior com colunas sem dados fictícios. |

Criar `useAdaptiveLayout()` sobre `useWindowDimensions`, nunca `Dimensions.get()` estático. Não introduzir navegação rail/sidebar/bottom navigation antes da feature possuir destinos reais. Testar 320, 375, 414, 600, 768, 840, 1024 e 1440px; sem scroll horizontal.

## 10. Acessibilidade e motion/haptics

### Acessibilidade (baseline WCAG 2.2 AA)

1. Validar contraste normal ≥4,5:1, grande/UI ≥3:1 em ambos os temas, inclusive Crimson sobre superfícies e status.
2. Garantir 44×44 em todos os controles; CTA principal 52–56px.
3. Tornar foco visível e tokenizado no Web, na mesma ordem visual/DOM; Enter deve submeter quando apropriado.
4. Preservar labels de campos; placeholder não é label. Relacionar helper/erro e anunciar erro/falha sem cor como único sinal.
5. Revisar labels de ícone, estado ocupado/desabilitado, nome da marca decorativa versus informativa e tab order.
6. Validar safe areas, teclado virtual e conteúdo rolável em Native; teclado físico e zoom/font scaling no Web.

### Motion e haptics

Criar tokens `fast` (120–160), `standard` (180–240), `slow` (280–320). Aplicá-los somente a pressed de botão, focus de input, entrada de estado, sheet e transição de rota quando não houver redução de movimento. `useReducedMotion` deve reduzir duração a zero/estática e desabilitar loops não essenciais. Haptics é uma dependência opcional futura (`expo-haptics`): apenas Native, selection leve para escolha, success em confirmação real e warning em ação crítica; nunca em cada toque e nunca no Web.

## 11. Plano de testes e QA

| Camada | Cobertura proposta | Gate de evidência |
|---|---|---|
| Unitária | Resolver de tema/marca, mapeamento de tokens, breakpoints, reduced motion. Asserir explicitamente `brand !== error !== destructive`. | Testes verdes. |
| Componentes | Button/Input/FormField/BrandMark/Alert/Card/Skeleton/EmptyState/ErrorState: variantes, estados, labels, disabled/loading, foco e 44px. | Testes por plataforma/renderer aprovados. |
| Fluxos Auth | Login, cadastro, erro remoto, loading, auto-login, logout e guard preservados. | Manter 32 testes existentes e adicionar integração visual sem reescrever lógica. |
| Web a11y | Navegação teclado, foco, labels, zoom e contraste com ferramenta compatível. | Relatório sem violações críticas. |
| Visual | Screenshots Dark/Light em compact/medium/expanded; snapshots só de primitives estáveis. | Baseline revisada; nenhum overflow/regressão aprovada. |
| Native manual | Expo Go/dispositivo: iOS/Android, safe area, teclado, font scaling, touch, tema e reduced motion. | Evidência por dispositivo; simulador/WebKit não substitui aparelho. |

Checklist obrigatório por tela: Dark, Light, mobile pequeno, mobile grande, tablet, Web, font scaling, teclado, loading, error, empty quando aplicável e focus.

## 12. Fases, gates e ordem exata de execução

| Fase | Escopo | Gate objetivo |
|---|---|---|
| F0 — Baseline auditada | Congelar este inventário, screenshots de referência e decisões pendentes. | **PASS somente** com plano aprovado e sem escopo de backend. |
| F1 — Brand assets | Criar API `shared/brand`, testes de seleção e substituir apenas consumidores de Logo após revisão. | Todas as 24 variantes catalogadas; nenhum import físico em feature. |
| F2 — Theme architecture | Separar primitives/semantic/component, manter um ThemeProvider e remover divergências V2. | Tema compila; tabela Dark/Light completa; brand/error/destructive distintos. |
| F3 — Typography | Consolidar fontes/estilos e remover CSS font injection duplicada. | Fonts carregadas nos alvos validados; escala V2 aplicada ao `Text`. |
| F4 — Core UI | Migrar Button/Text/Input/FormField/Alert/Spinner; extrair Card/Badge só quando a prova de repetição se mantiver; criar states necessários. | Contratos e acessibilidade testados; nenhum componente paralelo. |
| F5 — Motion/haptics | Tokens, reduced motion e haptics condicional somente se dependência aprovada. | Preferência reduzida respeitada; sem motion decorativo. |
| F6 — Auth visual | Migrar bootstrap, login e cadastro sem tocar nos view-models/API/session. | Fluxos Auth verdes e matriz visual/a11y aprovada. |
| F7 — App identity | Atualizar splash, icon, adaptive icon, favicon e metadata com os artefatos derivados aprovados. | Preview de Android/iOS/Web sem asset Expo azul; safe zone validada. |
| F8 — Adaptive shell | Breakpoints e containers; adaptar Home temporária sem inventar destinos. | Compact/Medium/Expanded validados sem estiramento mobile. |
| F9 — Accessibility | Auditoria de contraste, teclado, reader, font scaling e safe area. | Sem bloqueador WCAG 2.2 AA nos fluxos existentes. |
| F10 — Regression & QA | Testes, visual baseline, dispositivos e lista de exceções. | Evidência registrada; itens não executados ficam `NÃO PROVADO`. |
| F11 — Documentation | Contratos, política de marca, catálogo de tokens e governança. | Documentação aponta uma única fonte de verdade. |

**Ordem exata:** F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10 → F11. F7 não começa antes de F1 porque configurações Expo não devem apontar para um arquivo sem política/safe zone. F6 não começa antes de F4 porque não deve criar estilos locais para compensar primitives ausentes.

## 13. Decisões importantes (formato de implementação)

### D1 — Evoluir o tema existente

**SITUAÇÃO ATUAL:** `shared/theme` já possui provider e tokens flat.
**PROBLEMA:** criar novo contexto duplicaria a fonte de verdade e causaria deriva.
**DECISÃO:** manter `ThemeProvider` e refatorar internamente para as três camadas V2.
**JUSTIFICATIVA:** preserva consumidores e arquitetura.
**ARQUIVOS AFETADOS:** `src/shared/theme/**`, consumidores de tema.
**RISCO:** imports quebrados durante a transição.
**VALIDAÇÃO:** typecheck, testes do resolver e busca por entry point concorrente.

### D2 — Substituir a logo desenhada, não a API de consumo

**SITUAÇÃO ATUAL:** `shared/ui/Logo.tsx` desenha uma marca antiga com ícone de corte.
**PROBLEMA:** conflita com o sistema de identidade entregue e espalha visual não oficial.
**DECISÃO:** criar `shared/brand/BrandMark`, migrar consumidores e retirar `Logo` após período de compatibilidade controlado.
**JUSTIFICATIVA:** centraliza variantes e impede imports aleatórios.
**ARQUIVOS AFETADOS:** `shared/brand/**`, `shared/ui/index.ts`, Auth, bootstrap, Home.
**RISCO:** asset com contraste inadequado por superfície.
**VALIDAÇÃO:** matriz de logo por tema/superfície e screenshots.

### D3 — Separar Crimson, erro e destrutivo

**SITUAÇÃO ATUAL:** `feedback.error` e `destructive` reutilizam a cor da marca.
**PROBLEMA:** CTA e falha ficam semanticamente indistintos.
**DECISÃO:** mapear Brand `#BD2026`, Error `#FF5C62` e Destructive `#DC2626` para tokens independentes.
**JUSTIFICATIVA:** requisito explícito V2 e acessibilidade de significado.
**ARQUIVOS AFETADOS:** cores, Button, Input, Alert, FormField e Home.
**RISCO:** contraste/expectativa visual de estados antigos.
**VALIDAÇÃO:** teste de igualdade desigual e contraste Dark/Light.

### D4 — Preservar Auth funcionalmente

**SITUAÇÃO ATUAL:** schemas, mappers, `/me`, token storage, guards e normalização possuem 32 testes.
**PROBLEMA:** uma alteração estética pode acidentalmente atingir lógica.
**DECISÃO:** migrar somente composições UI; não alterar APIs, view-models, session engine ou contracts.
**JUSTIFICATIVA:** minimiza regressão e cumpre escopo.
**ARQUIVOS AFETADOS:** somente `features/auth/ui/**`, providers e shared UI/theme/brand.
**RISCO:** atributos de formulário/submit se perderem em wrappers.
**VALIDAÇÃO:** testes existentes + fluxo manual de login/cadastro.

### D5 — Aplicar responsive como layouts, não escala

**SITUAÇÃO ATUAL:** apenas `maxWidth` locais; não há breakpoints.
**PROBLEMA:** desktop apenas estica o mobile e não atende B2B.
**DECISÃO:** tokens Compact/Medium/Expanded e containers; navegação adaptativa somente quando houver destinos reais.
**JUSTIFICATIVA:** cumpre V2 sem inventar IA.
**ARQUIVOS AFETADOS:** theme/breakpoints, AuthLayout, Home e futuros shells.
**RISCO:** criar sidebar/bottom-nav inútil no placeholder.
**VALIDAÇÃO:** matriz de viewport e ausência de overflow.

### D6 — Motion mínima e acessível

**SITUAÇÃO ATUAL:** não há tokens; Stack usa fade fixo.
**PROBLEMA:** animação não é governada nem respeita redução de movimento.
**DECISÃO:** introduzir tokens e preferência reduzida antes de qualquer efeito; haptics somente após decisão de dependência.
**JUSTIFICATIVA:** motion deve comunicar estado, não decorar.
**ARQUIVOS AFETADOS:** theme motion, componentes e options de rota.
**RISCO:** aumento de dependências/bundle e inconsistência Web/Native.
**VALIDAÇÃO:** reduced motion, interação e build por plataforma.

### D7 — Publicar identidade somente após preview nativo

**SITUAÇÃO ATUAL:** `app.json` referencia icon/splash/favicon Expo azul.
**PROBLEMA:** assets de loja/launcher têm safe zones e caches próprios.
**DECISÃO:** derivar arquivos de distribuição dos assets oficiais e atualizar `app.json` apenas em F7.
**JUSTIFICATIVA:** trocar caminhos sem preview pode recortar ou manter cache.
**ARQUIVOS AFETADOS:** `assets/images/*`, `app.json`, metadata Web.
**RISCO:** transparência e mask do Android/iOS.
**VALIDAÇÃO:** preview Expo, Android adaptive, iOS icon e favicon em tamanhos pequenos.

## 14. Riscos, dependências e Definition of Done

### Riscos e dependências

* Aprovação de produto para a variante padrão de distribuição: este plano recomenda 05, mas a decisão final pertence à marca.
* O splash por Light/Dark depende da capacidade/configuração Expo validada na versão em uso; se não for suportado de maneira oficial, escolher um splash Dark único e manter Light somente no bootstrap runtime.
* `expo-haptics`, renderer de testes e ferramenta de a11y podem exigir novas dependências. Nenhuma deve ser instalada antes de aprovação explícita e compatibilidade com Expo 57.
* Contraste real de logo transparente sobre fotografia exige overlay/surface, não apenas token de cor.
* Sem dispositivos físicos e leitores de tela, Native a11y e safe area permanecem não provados.

### Definition of Done

- [ ] Uma única fonte de verdade de tema em três camadas, com todas as cores V2 mapeadas.
- [ ] Dark e Light completos, com Brand Crimson separado de Error e Destructive.
- [ ] As 24 logos originais preservadas e consumidas exclusivamente por API semântica.
- [ ] Não há mais imagem/ícone azul padrão Expo em icon, splash, favicon ou UI publicada.
- [ ] Fontes Epilogue/Inter carregadas uma vez, com escala V2 e font scaling validado.
- [ ] Primitivos compartilhados atendem variantes, estados, foco, loading, disabled, contraste e targets mínimos.
- [ ] Login, cadastro, auto-login, `/me`, guards, logout, mappers e normalização de erro continuam sem mudança de contrato e verdes nos testes.
- [ ] Auth, bootstrap e Home temporária validados na matriz Dark/Light × Compact/Medium/Expanded × estados relevantes.
- [ ] QA de teclado, leitor de tela, contraste, reduced motion, safe areas e dispositivo registra evidência ou marca explicitamente o que não foi provado.
- [ ] Documentação de tokens, componentes e política de marca atualizada; nenhum Design System paralelo criado.

## 15. Registro de execução e evidências

### Entregue

* O tema existente foi evoluído para as camadas `primitives → semantic → components`, sem criar outro provider. Os aliases estritamente necessários permanecem como ponte de migração, todos apontando para tokens V2.
* A API `shared/brand/BrandMark` centraliza as 24 variantes oficiais; `Logo` ficou como adaptador de compatibilidade para não quebrar consumidores existentes. Os arquivos originais em `assets/images/logos` não foram alterados.
* `Button`, `TextInput`, `FormField`, `Alert`, `Card`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState` e `BootstrapScreen` passaram a consumir tema/semântica. Botões respeitam redução de movimento e usam haptic leve somente no nativo; a ação destrutiva usa feedback de aviso.
* Auth, bootstrap e Home foram recompostos visualmente sem alterar view-models, schemas, adapters, contratos HTTP, sessão, storage ou guards.
* Foram criados assets de distribuição derivados da marca e atualizado `app.json`: ícone iOS opaco, adaptive icon e monochrome Android, splash Light/Dark e favicon Web. A configuração pública do Expo os resolveu corretamente.
* `expo-haptics` foi instalado pela resolução de dependência compatível com Expo 57. A instalação reportou um aviso de peer dependency preexistente/da árvore (`react-native-worklets`) e `npm audit` indicou 14 vulnerabilidades moderadas; nenhuma correção automática foi aplicada.

### Validação executada

| Checagem | Resultado |
|---|---|
| `npm run typecheck` | PASS |
| `npm test` | PASS — 9 arquivos / 35 testes |
| `npx expo config --type public` | PASS — icon, adaptive icon, monochrome, splash Light/Dark e favicon resolvidos |
| `npx expo export --platform web` | PASS — 8 rotas estáticas exportadas |
| Testes de tokens | PASS — separação Brand/Error/Destructive, tokens de componente e breakpoints |
| Inspeção visual automatizada no navegador local | NÃO PROVADA — a sessão CDP expirou durante a navegação; não foi tratada como aprovação visual |
| Preview release iOS/Android, safe areas, launcher/adaptive icon e splash real | NÃO PROVADO — requer build/instalação em dispositivo ou emulador compatível |
| Leitor de tela, teclado e matriz completa Compact/Medium/Expanded por plataforma | PARCIAL — contratos e semântica foram implementados, mas a validação assistiva/manual ainda é necessária |

### Definition of Done atualizada

- [x] Uma única fonte de verdade de tema em três camadas, com as cores V2 mapeadas.
- [x] Dark e Light completos, com Brand Crimson separado de Error e Destructive.
- [x] As logos oficiais preservadas e consumidas por API semântica.
- [x] Referências de icon, splash e favicon padrão Expo substituídas na configuração.
- [x] Fontes Epilogue/Inter carregadas uma vez e estilos tipográficos V2 centralizados.
- [x] Primitivos compartilhados atendem estados principais, foco, loading, disabled e target mínimo.
- [x] Fluxos e contratos de Auth preservados e suíte verde.
- [ ] Matriz visual completa em todos os viewports, temas e estados — depende de QA manual confiável.
- [ ] QA física de teclado, leitor de tela, contraste, safe areas, splash e ícones de launcher — depende de build nativo.
- [x] Documentação e política de marca atualizadas, sem Design System paralelo.

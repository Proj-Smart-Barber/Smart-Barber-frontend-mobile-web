# Smart Barber — análise independente da execução da landing

Data: 15/10/2026. Checkout observado: `feat/landing-dark-theme-only`, HEAD `b141686`. Escopo: leitura de código, comparação com o planejamento, verificações locais e inspeção anônima da página publicada. Nenhum código do produto foi corrigido nesta atividade.

## Parecer

**PARTIAL — existe uma base implementada e testável, mas o relatório superestima a fidelidade visual, a cobertura dos testes e a homologação do produto.** A landing apresenta a estrutura planejada, formulário e construção de mensagem, porém possui pendências funcionais e tipográficas anteriores ao novo acabamento cinematográfico. Os testes verdes não tornam essas pendências resolvidas.

A página foi observada em `https://smartbarber.wellingtonsp.uk/inicio`, com viewport desktop de 1440 px e emulação mobile de 390 × 844 px. A inspeção também consultou `/login` sem autenticação. Não foi enviada mensagem, criada reserva ou alterada produção. Não houve teste em aparelho físico, medição de bateria/GPU, auditoria completa WCAG ou validação de conversão.

## O que foi confirmado

| Item | Resultado | Alcance da evidência |
|---|---|---|
| Oito blocos de conteúdo e formulário comercial | PASS estático/visual | Código e página publicada inspecionados. Não equivale a percurso comercial completo. |
| Bypass público no layout | PASS estático / PARTIAL integração | `src/app/_layout.tsx:90–105` permite público antes dos estados de fonte/sessão. Testes existentes não montam esse guard. |
| Isolamento DOM/Motion em `.web.tsx` | PASS estático | Existe fallback `.tsx`; paridade funcional nativa não comprovada. |
| Schema e construção de mensagem | PASS unitário | Limites, formatação e codificação possuem testes. Destino comercial real e envio não homologados. |
| `npm run typecheck` | PASS reexecutado | Exit code 0 nesta análise. |
| Vitest com um worker | PASS reexecutado | 78 arquivos, 470 testes; 151,45 s. Houve warnings de `act` e de resolução da configuração base, sem falha da suíte. |
| Build padrão | PARTIAL / bloqueio de escrita | Compilação chegou a listar 60 rotas; persistência em `dist/(account)/notifications` falhou com EPERM. Não tratar essa tentativa como export concluído. |
| Export em saída nova | PASS reexecutado | `expo export -p web --output-dir .expo/landing-audit-export-20261015` terminou com exit code 0, 60 rotas e bundle web informado de 2,9 MB. HTML de `/inicio` inspecionado depois da gravação. |
| Produção e checkout serem exatamente o mesmo artefato | NOT TESTED | Aparência e comportamento convergem em vários pontos; não foi feita correspondência completa de hashes. |
| PRs #42–#44 e merges remotos | NOT TESTED | Histórico local confirma commits de landing/scroll/tema; status remoto de merge não foi revalidado. |

Comando de testes: `.\node_modules\.bin\vitest.CMD run --pool=threads --maxWorkers=1 --minWorkers=1 --no-file-parallelism`.

## Achados prioritários

### 1. P1 — “Encontrar barbearias” leva ao formulário de donos

**FAIL, confirmado em produção.** Os dois links de cliente usam `#demonstracao`; `/explorar` respondeu HTTP 404 nesta análise. O visitante que quer agendar chega a um formulário pedindo nome de barbearia e porte da equipe.

Origem: `src/features/landing/lib/config.ts:38`, `src/features/landing/ui/LandingPage.web.tsx:239` e `:664`. O planejamento original, em `landing-page-planejamento.md:236`, condicionou o lançamento desse CTA à validação da descoberta. Portanto, esta pendência não pode ser descrita apenas como monitoramento de endpoints.

**Correção a planejar separadamente:** estabelecer destino honesto para o estado atual, ou concluir a descoberta com contrato real antes de liberar a promessa de busca. Não ativar a flag enquanto `/explorar` continuar inexistente.

### 2. P1 — número fictício não é fallback comercial seguro

**FAIL estático.** `src/features/landing/lib/config.ts:6–9` substitui valor ausente/inválido por `5511999999999`. O formulário usa esse resultado para construir a URL contendo os dados do visitante. A `.env` carregada pelo build desta análise só anunciou `EXPO_PUBLIC_API_URL`; isso não prova configuração remota, mas confirma que o código permite handoff sem contato validado.

O plano original exige número validado; não aprova esse fallback. O relatório afirma o contrário em `docs/RELATORIO_EXECUCAO_LANDING_PAGE.md:149`.

**Correção:** configuração ausente deve impedir o handoff e comunicar indisponibilidade de contato, preservando os dados. Validar número internacional e responsável antes de publicação. Nesta auditoria não foi aberto WhatsApp nem enviado dado pessoal.

### 3. P2 — Epilogue e Inter estão declaradas, mas sem correspondência com as fontes registradas

**FAIL estático e runtime na sessão inspecionada.** O root registra `Epilogue_700Bold`, `Epilogue_800ExtraBold` e variantes `Inter_*` em `src/app/_layout.tsx:231–239`. O CSS solicita famílias `Epilogue` e `Inter` em `src/features/landing/ui/styles.ts:38–39`. O loader instalado gera `@font-face` com o nome recebido; não foi encontrado alias agregando esses nomes.

Após `document.fonts.ready`, a produção listou famílias `Epilogue_700Bold`, `Epilogue_800ExtraBold`, `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold` e ícones; nenhuma família chamada apenas `Epilogue` ou `Inter`. As medidas canvas do H1 com a lista declarada e com somente os fallbacks foram idênticas (1430,1875 px para o texto completo); o mesmo ocorreu no apoio (1044,5361 px). Isso sustenta a conclusão de fallback no navegador testado. A leitura visual isolada ou `getComputedStyle().fontFamily` não seria suficiente.

**Comparação com o app:** os próprios tokens web em `src/shared/theme/primitives/typography.ts:5–12` usam `Epilogue`/`Inter`; a tela pública de login também declarou famílias sem registro correspondente. Logo, existe um problema compartilhado de carregamento, não somente uma escolha visual da landing. Não ajustar a landing para reproduzir esse defeito do app.

**Correção:** definir contrato válido de famílias e pesos, com estratégia web compatível com Expo 57. Validar fontes renderizadas, rede e cache frio; manter leitura por fallback e nunca bloquear a landing por carregamento de fonte. Uma eventual mudança compartilhada precisa de escopo e regressão próprios.

### 4. P2 — hierarquia tipográfica e controles não são inteiramente coerentes

**PARTIAL.** H1/h2 usam a família declarada para títulos; vários h3/h4 e títulos de cards herdam a família de corpo. Links e botões não têm todos família explícita. No login publicado, os controles `<button>` observados declararam Arial, enquanto inputs declararam Inter com fallback.

App: títulos e botões Epilogue, corpo Inter medium. Landing: corpo normal, CTA 600 e vários títulos inline sem família. A escala de marketing de 36–56 px no H1 é adequada ao contexto e não precisa copiar o H1 operacional de 22 px. O que precisa de correção é a aplicação real, os pesos e a consistência entre os elementos.

Fontes: `src/features/landing/ui/styles.ts:217–225`, `:270–290`, `:373–380`, `src/features/landing/ui/LandingPage.web.tsx:432`, `:476`, `:564` e `src/shared/theme/primitives/typography.ts:17–28`.

### 5. P2 — o “scrollytelling” entregue é um painel por clique

**FAIL em relação ao comportamento planejado.** `src/features/landing/ui/LandingPage.web.tsx:509–543` troca a cena apenas com `setActiveSceneIndex` no clique; não há `useScroll`, observer de etapas ou ligação de progresso. Em desktop, o painel mede cerca de 445,6 px. Ao rolar de aproximadamente 4206 para 4637 px, a cena selecionada continuou “1. Escolha do atendimento”.

O CSS declara sticky, mas falta a sequência narrativa e a área de rolagem que sustentam a experiência. No mobile, o painel é ocultado; as trilhas textuais continuam disponíveis.

**Correção no novo plano:** cena ligada a progresso local e controles equivalentes por teclado/toque, sem capturar a rolagem ou mover foco automaticamente.

### 6. P2 — animações de entrada são poucas e disparam na montagem

**PARTIAL.** Existem entradas Motion no mockup do Hero e em três cards de confiança. Os cards usam `initial`/`animate`, e não entrada ao alcançar a viewport (`LandingPage.web.tsx:351–356`); podem concluir a animação antes que o visitante os veja. O restante depende sobretudo de hover/CSS, sem coreografia entre seções.

Tempos estão parcialmente repetidos em JSX em vez de consumirem uma política única. Ausência de `AnimatePresence`/crossfade nas cenas e a falta de pausas entre blocos contribuem para a sensação estática. Esta é a principal oportunidade do pedido cinematográfico.

### 7. P2 — Liquid Glass não está aplicado como linguagem de materiais

**PARTIAL visual / FAIL de fidelidade material.** Na página publicada, o header tem `backdrop-filter: blur(12px)` e fundo translúcido; os cards inspecionados têm fundo sólido `rgb(19,19,19)` e nenhum backdrop filter. No código, a landing não importa `LiquidGlassView`.

Fontes: `src/features/landing/ui/styles.ts:121–130` e superfícies de Hero/Bento/pricing/form; `DESIGN.md:9–13`; seção 52 do guia oficial. Falta redução de transparência independente de redução de movimento.

**Risco de reutilização direta:** `LiquidGlassView` decide claro/escuro por `useTheme().isDark`, enquanto a landing fixa Obsidian. Inserir o componente sem resolver o tema pode misturar materiais Ivory e Obsidian. Planejar adapter web semântico com tema local explícito, ou adaptação controlada; não mudar a preferência global do usuário.

### 8. P2 — Hero mobile ainda não dá visibilidade completa aos dois CTAs na dobra

**FAIL no viewport emulado 390 × 844.** O CTA cliente ocupou y≈605–653; o de dono, y≈818–866, parcialmente fora da área visível. Não houve overflow horizontal nesse viewport. A futura correção de fontes pode alterar essas medidas, portanto a composição deve ser reavaliada depois dela.

O plano original exigiu os dois caminhos acima da demonstração e visíveis em 390 × 844. A abertura cinematográfica não deve acrescentar uma vinheta ou área vazia antes das ações. A 320 px e com fonte ampliada, a prioridade é conteúdo íntegro com rolagem natural, sem comprimir texto.

### 9. P2 — links institucionais e canonical não correspondem à publicação observada

**FAIL runtime.** `/termos` e `/privacidade` responderam HTTP 404. O DOM da landing publicada usa canonical e `og:url` `https://smartbarber.com.br/inicio`, enquanto a página foi servida em `https://smartbarber.wellingtonsp.uk/inicio`.

Também há duas descrições no DOM. Não foram encontrados Twitter Cards ou `og:image` na rota inspecionada, apesar da afirmação do relatório. Fontes de implementação: `src/features/landing/lib/config.ts:13`, `src/app/(public)/inicio.tsx:6–23` e `src/app/+html.tsx:19–20`.

A resposta 200 de `/inicio` confirma entrega HTTP; não confirma homologação de SEO ou funcionamento dos destinos.

### 10. P2 — pricing detalha condições comerciais não aprovadas

**FAIL de aderência ao briefing.** `src/features/landing/content/landing-content.ts:284–321` inclui “Agenda para 1 profissional”, combinações de recursos e “Múltiplas cadeiras ou unidades”, além de implantação/atendimento. O usuário confirmou três níveis provisórios com valores sob consulta, sem aprovar limites e inclusões.

**Correção:** manter segmentação como proposta ou obter matriz comercial explícita antes de apresentar recursos como inclusões contratadas. A animação do plano central não deve reforçar afirmações ainda não sustentadas.

### 11. P2 — reabertura do WhatsApp pode usar dados antigos

**FAIL estático.** `preparedUrl` é calculada no submit (`LandingPage.web.tsx:128–129`) e reaproveitada em `:162–165`. Editar campos, mudar ou remover plano não invalida a URL. A ação de copiar usa `formData` atual. Assim, depois de editar, copiar e reabrir podem produzir mensagens diferentes.

**Correção:** invalidar o estado preparado ou revalidar/regenerar ao abrir novamente. Tratar também falha de clipboard, hoje silenciosa, com mensagem selecionável e feedback de erro. As interações de motion do formulário precisam representar esses estados reais.

### 12. P2 — testes e telemetria têm alcance menor que o descrito

**PARTIAL.** `src/features/landing/tests/landing-route.test.tsx` renderiza diretamente o componente, com sessão, router e Motion mockados. Os sete testes não montam o guard nem a rota com metadados; não fazem submit completo; não medem animação, contraste, touch ou Core Web Vitals.

O dispatcher atual usa eventos categóricos nos callsites auditados e não encontrei vazamento concreto dos campos. Entretanto, `target: string` e repasse do evento original não constituem sanitização runtime. O teste de analytics envia eventos seguros e verifica ausência de chaves, sem exercitar rejeição de payload indevido. Não há coletor externo registrado fora de testes. “Instrumentação implementada” não significa funil em produção validado.

### 13. Riscos de regressão a cobrir no acabamento

**PARTIAL / NOT TESTED.** O CSS de scroll afeta `html/body/#root` e nomes de classes gerados do React Native Web (`styles.ts:9–32`); o layout Slot vale para todo o grupo público. Ainda é preciso verificar catálogo/reserva, navegação ida/volta e efeitos dos novos wrappers sobre sticky e posicionamento.

O fallback nativo possui CTA de descoberta sem navegação e reutiliza helper de clipboard web. Não foi executado em iOS/Android. A evolução cinematográfica solicitada deve ficar isolada na web; compatibilidade de importação não deve ser chamada de paridade funcional nativa.

## Direção confirmada para a próxima etapa

O usuário confirmou: **mais cinematográfica, com maior destaque para cenas e transições**, mantendo a landing como escopo e incluindo animação de marca, tipografia oficial e Liquid Glass. O detalhamento está em `landing-animacao-liquid-glass-planejamento.md`.

Prioridade: pendências de conversão/configuração → contrato real de fontes → composição/materiais → marca e cenas → microinterações → validação. Esta ordem evita avaliar fluidez sobre layout que ainda mudará com a fonte correta.

## Referências técnicas

- [Expo Font — SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/font/): conferir a API da versão instalada, nomes e pesos realmente registrados.
- [Motion — scroll](https://motion.dev/docs/react-scroll-animations): separar entrada em viewport de animação vinculada a progresso.
- [MotionConfig](https://motion.dev/docs/react-motion-config): política de movimento reduzido.
- [MDN — backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter): composição de materiais e backdrops.
- [MDN — transparência reduzida](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency): detecção tem suporte limitado; fallback sólido precisa ser bom por si só.

## Complemento de build

O build padrão falhou na gravação de uma pasta de `dist` com EPERM, após compilação. A segunda tentativa, com saída nova em `.expo/landing-audit-export-20261015`, terminou com exit code 0, sem apagar o artefato anterior. Comando: `.\node_modules\.bin\expo.CMD export -p web --output-dir .expo/landing-audit-export-20261015`.

O export listado contém 60 rotas e um bundle web de aproximadamente 2,9 MB (tamanho informado pelo export, não transferência comprimida ou custo isolado da landing). O arquivo `inicio.html` gerado foi inspecionado; contém conteúdo e formulário, mantendo as pendências de canonical/metadados descritas acima. A falha do caminho padrão permanece um limite ambiental/de gravação desta execução, não evidência de erro de TypeScript ou de bundle. O novo export não foi publicado.

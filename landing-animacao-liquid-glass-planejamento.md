# Smart Barber — animação cinematográfica e Liquid Glass da landing

Data: 15/10/2026. Briefing e intensidade confirmados pelo usuário: **mais cinematográfica, com maior destaque para cenas e transições**. Status: proposta técnica e visual para revisão; não implementada. Diagnóstico e evidências: `analise-execucao-landing-page.md`.

## Objetivo e limites

Transformar a landing em uma apresentação de produto com ritmo, profundidade e continuidade entre marca, catálogo e agenda. Preservar a clareza dos dois públicos e tornar o acabamento reconhecível como Smart Barber.

Escopo visual: `/inicio`, header, logos, Hero, confiança, contraste problema/solução, Bento, demonstração, pricing, FAQ, formulário e footer. Manter Obsidian/Crimson e a arquitetura Expo 57. A versão cinematográfica é web; não inserir DOM/Motion nos módulos nativos. Não alterar paleta/typescale globais, comportamento operacional, preços, APIs ou preferência de tema incidentalmente.

O tema escuro exclusivo já está no checkout e foi mantido como base nesta rodada. É diferença em relação ao primeiro plano, que previa Ivory; a autorização histórica dessa mudança fora desta conversa não foi auditada. Esta rodada não propõe restaurar tema claro na landing.

## Decisões e alternativas

| Decisão | Alternativa | Razão |
|---|---|---|
| Cinematografia do produto por cenas conectadas | Somente fades curtos e hover | Direção cinematográfica confirmada pelo usuário. |
| Um palco principal de scroll, com pausas nas demais seções | Todos os blocos sticky ou com parallax | Concentra o pico visual e evita fadiga/rolagem excessiva. |
| Glass derivado do contrato do app, com tema local Obsidian | Copiar componente dependente do tema global sem adaptação | Evita vidro Ivory em landing escura e preserva HTML semântico. |
| Animar assets oficiais da marca | Redesenhar símbolo, inventar vetor ou deformar a imagem | Mantém identidade e reduz risco de discrepância. |
| Corrigir fonte antes de finalizar layout e motion | Ajustar espaçamento sobre fallback | Métricas e quebras de linha vão mudar com a fonte correta. |
| Movimento reduzido oferece narrativa estática completa | Apenas reduzir duração a quase zero | Elimina parallax e necessidade de percorrer um palco longo. |

Abordagens consideradas: editorial discreta (baixo custo, menor presença), cinematografia de produto (recomendada e escolhida como direção), e showcase com vídeo/3D renderizado (custo, peso e produção de assets maiores, sem necessidade demonstrada). A proposta desenvolve a segunda. Não exige motor 3D, novo framework ou vídeo no Hero.

## Dependências de entrada

1. Registrar como trabalho funcional separado: destino do CTA cliente, número comercial validado, termos/privacidade, canonical, pricing aprovado e estado preparado do WhatsApp. O trabalho visual pode avançar em preview, mas não deve publicar ou reforçar percursos falsos.
2. Resolver família/peso de fonte e o layout mobile; confirmar correspondência real no navegador.
3. Revisar o alcance das regras globais de scroll antes de criar sticky e transforms. Não usar classes geradas RNW como API de layout.

## Tipografia: mesmo sistema, escala de marketing

**Defeito a resolver:** `Epilogue`/`Inter` no CSS não correspondem às famílias `Epilogue_*`/`Inter_*` registradas. Não se resolve declarando o mesmo nome outra vez ou aguardando `fontsLoaded`.

**Contrato proposto:** criar registro web autoritativo de recursos oficiais, nomes e pesos; servir aliases `Epilogue` 700/800 e `Inter` 400/500/600/700 com `@font-face` válido, ou usar os nomes efetivos de cada arquivo de forma consistente por papel. Escolher uma estratégia, não misturar as duas por componente. Validar os descriptors compatíveis com o loader do SDK 57; exemplos da documentação atual de SDKs novos não são implementação pronta. Recursos devem ser locais/empacotados; evitar novo provedor remoto.

Aplicar primeiro na landing. A inconsistência dos tokens do app web fica registrada como correção compartilhada explicitamente delimitada, com teste de login, inputs, botão, agenda e cards; não realizar uma troca global de tipografia sem regressão própria. Manter nomes nativos funcionais.

| Papel | Família/peso | Proposta de escala e composição |
|---|---|---|
| Display/H1 | Epilogue 800 | Fluido entre 36 e 56 px; line-height 1,1–1,15; largura controlada e quebras naturais. |
| Títulos de seção | Epilogue 700/800 | 28–40 px; uma família consistente ao longo da narrativa. |
| Títulos de cards/subseções | Epilogue 700 | 18–24 px; parar de depender da herança acidental do corpo. |
| Apoio Hero | Inter 400/500 | 16–18 px; largura curta no mobile. |
| Corpo | Inter 500 | 16 px / 24 px; alinhamento com o app sem copiar sua densidade operacional. |
| Botões/links de ação | Epilogue 700 | 16 px; a mesma regra explícita em `<a>`, `<button>` e controles. |
| Labels e badges | Inter 600 | 12–14 px; rótulos de formulário legíveis. |
| Inputs | Inter 400/500 | Pelo menos 16 px; evita texto miúdo e zoom indesejado em alguns cenários mobile. |
| Valores e limites | Inter 600 | Preservar `tabular-nums font-semibold` e alinhamento por grid. |

Fontes não bloqueiam conteúdo: fallback imediato e troca controlada. Reservar proporções e ajustar métricas de fallback quando necessário para reduzir deslocamento. Preload apenas de recursos críticos comprovadamente usados. Aceite exige checagem de fonte renderizada e requests, não apenas CSS computado ou nome do arquivo.

## Direção de marca e animação das logos

O inventário contém símbolos raster oficiais, inclusive variantes transparentes; não foi encontrado nesta inspeção um SVG oficial pronto para animar traços. O asset `02_ivory_sobre_obsidian.webp` foi inspecionado e contém o símbolo sobre fundo, não um wordmark vetorial animável. Usar os símbolos transparentes adequados ao contexto; não presumir conteúdo pelo nome `full` do registry.

**Header:** símbolo Crimson existente sobre fundo escuro e nome com fonte corrigida. Marca legível e clicável desde a primeira pintura. Wrapper recebe acomodação curta de até 4 px em 300 ms; um reflexo decorativo atrás do símbolo pode cruzar uma única vez. Hover/focus destaca em 140 ms, sem girar o monograma, distorcer letras ou deslocar o alvo clicável.

**Hero:** assinatura ampliada aparece dentro da composição de demonstração, não como splash que precede a página. Símbolo oficial Ivory/Crimson com uma camada decorativa de luz e deslocamento máximo de 16 px; escala de 0,98 a 1 em 300 ms. Reflexo localizado atrás da marca, sem exigir recorte perfeito da silhueta raster. Se a direção exigir desenho por traço, obter SVG oficial e aprovar asset antes de acrescentar essa técnica.

**Footer:** reprise discreta da marca ao entrar em viewport, com deslocamento de 6 px em 220 ms. Não repetir a abertura completa. Nenhuma logo de cliente, parceiro ou integração será inventada para preencher a composição.

O símbolo principal não depende de opacidade zero no HTML exportado. Camadas decorativas podem entrar e sair; o nome acessível da marca permanece único. O usuário continua podendo clicar/rolar durante qualquer sequência.

## Contrato Liquid Glass

**Arquitetura recomendada:** adapter web semântico local de material, com variantes `navigation`, `card`, `form` e tokens derivados do contrato de `LiquidGlassView`. O adapter pode renderizar `header`, `article`, `section` ou `div` sem acrescentar interatividade. Tema Obsidian explícito e local; não alterar `ThemeProvider` global para escurecer a landing.

Um card possui uma face material, uma borda e inset de conteúdo. Wrapper externo controla geometria/sombra; camada interna controla material; conteúdo recebe padding/gap. Mockups, chips, labels e cada linha não ganham um novo blur. Se o componente universal for escolhido em vez do adapter, resolver explicitamente tema, semântica e `contentStyle` antes de adotá-lo.

| Uso | Referência do app / proposta de aplicação |
|---|---|
| Navegação | Base próxima de `rgba(20,20,20,0.72)`, borda sutil, blur estático de 20 px. Cápsula com margens responsivas; header não precisa cobrir a largura inteira. |
| Cards de destaque | Base próxima de `rgba(32,33,38,0.64)`, borda neutra e blur estático de 18 px. Aplicar ao palco e aos dois caminhos do Hero, condicionando quantidade à medição. |
| Cards secundários | Mesma linguagem de raio/borda/inset com superfície mais densa; podem dispensar blur para limitar custo. |
| Formulário | Material denso próximo de `rgba(24,25,29,0.82)`, blur de referência 20 px; inputs estáveis e sem filtro próprio. |
| Fallback | Superfície sólida Obsidian por variante; sem perder borda, contraste ou leitura. |

Esses valores são ponto de partida derivado do componente existente, não contraste ou desempenho já aprovados. Raio de referência 26 px para cards/form; cápsula de navegação até 32 px. Inset compacto 16–20 px, ampliado quando o conteúdo justificar.

Para que o vidro seja percebido sobre o preto, usar poucas massas de cor estáticas e geometria de interface atrás do material: halo Crimson discreto e área Ivory de baixa opacidade perto da demonstração. Não adicionar nebula, partículas ou várias superfícies filtradas de tela inteira. A profundidade vem da composição e da oclusão entre planos.

Animar somente `transform` e `opacity` da camada decorativa de reflexo, mantendo blur/sombra estáticos. O texto não acompanha a refração. Atenção: opacidade, transforms e `will-change` podem criar contextos que alteram backdrops; validar a estrutura final em vez de assumir que envolver tudo em Motion mantém o mesmo material.

Implementar `@supports` para blur e fallback base sólido. Respeitar transparência reduzida independentemente do movimento. Como a media query tem suporte limitado, garantir material padrão legível e permitir forçar fallback em teste. Não apresentar adaptação CSS como Liquid Glass nativo UIKit.

## Política única de movimento

Criar tokens locais `landing-motion-tokens` que adaptam os atuais 140/220/300 ms; easing de desaceleração suave centralizado, distância pequena/média 8/16 px e distância narrativa até 24 px. Stagger de referência 60–80 ms. Não repetir números em cada JSX nem alterar tokens globais do app.

O aspecto cinematográfico vem de planos, enquadramento e encadeamento. Uma abertura pode durar 700–900 ms no total, composta por movimentos de até 300 ms com sobreposição; não é necessário tornar cada botão lento. Feedback de ação continua 140 ms; troca de contexto 220 ms; acomodação de cena 300 ms.

`MotionConfig` e hooks devem ler preferência do sistema. O HTML estático mantém H1, apoio, CTAs, marca e formulário disponíveis. Reveal nunca torna conteúdo essencial dependente de hidratação/IntersectionObserver. A estratégia preferida é estado base visível, com transform curto e overlays decorativos; qualquer opacidade de conteúdo só entra como melhoria depois de garantir o fallback sem JS.

Sem scroll hijack, cursores especiais, som, contadores falsos ou loops permanentes por padrão. Motion values controlam progresso sem React state por frame; estado React só muda ao cruzar um limiar de cena ou ao interagir. Remover listeners/timers/observers ao desmontar. Interromper decoração fora da viewport e em aba oculta. Aplicar `will-change` apenas durante o trecho ativo e medi-lo, em vez de promover todos os cards.

## Storyboard completo

| Região | Cena e comportamento | Movimento / gatilho | Mobile e acessibilidade |
|---|---|---|---|
| Header | Cápsula glass com marca e caminhos claros; ganhar densidade ao sair do Hero sem alterar altura. | Acomodação de marca em 300 ms; reflexo único; hover/focus de 140 ms. | Header compacto, marca e entrar acessíveis; navegação secundária sem espremer tudo na mesma linha. |
| Hero | Composição cliente/barbearia lado a lado no desktop, com monograma e duas interfaces ligadas visualmente. Os CTAs continuam acima da demonstração. | Entrada das camadas com 16 px/300 ms e sobreposição de 80 ms; profundidade por escala até 0,98→1. | Dois CTAs totalmente visíveis em 390×844 na referência padrão; grande demonstração começa abaixo. Sem vinheta antes do conteúdo. |
| Saída do Hero | A composição se aproxima levemente e revela a conexão entre o atendimento e a agenda. | Progresso local controla deslocamento decorativo até 24 px; uma única passagem. | Imagem/miniUI estática, sem parallax. |
| Confiança | Três recortes tornam legíveis preço/duração, revisão e contexto do dia. | Entrada em viewport, uma vez, 220 ms e stagger de 60 ms. | Leitura empilhada; sem números contando ou indicadores sugerindo transação real. |
| Problema/solução | Mensagens se organizam visualmente em um fluxo claro; tensão curta antes da resolução. | Grupos ilustrativos movem até 16 px e cruzam opacidade em 300 ms; preservar textos de comparação estáticos. | Colunas empilhadas; um passo por vez; sem troca rápida enquanto o visitante lê. |
| Bento | Cada card relaciona uma ação à tela correspondente. Apenas cards principais recebem material mais translúcido. | Entrada em grupos de no máximo três; hover de 2 px; exemplo selecionado troca em 220 ms. | Tap explícito; foco equivalente; conteúdo não aparece só no hover. |
| Demonstração principal | Palco contínuo de três cenas: escolher → revisar → aparecer na agenda. É o maior momento visual. | Scroll local distribui as cenas; UI e reflexos cruzam em 300 ms ou interpolação suave por progresso. | Passos empilhados e seleção por botões; detalhes completos, sem palco comprido obrigatório. |
| Pricing | Pausa de leitura após o pico visual; material de destaque no plano central sem agitar as condições. | Entrada única de 220 ms; borda/reflexo decorativo curto ao foco/hover; CTA de 140 ms. | Cards em coluna, mesma hierarquia e números tabulares; sem pulsação ou selo comercial inventado. |
| FAQ | Ritmo diminui para permitir decisão e tirar dúvidas. | Chevron de 140 ms; resposta por opacidade em 140–220 ms, altura natural. | Botões/ARIA corretos; foco mantido; resposta fechada fora da navegação. |
| Formulário | Superfície glass densa, campos estáveis e prévia organizada da mensagem após validação. | Seleção de plano/badge em 140 ms; feedback em 140 ms; nenhuma animação que atrase abrir WhatsApp. | Fonte 16 px, teclado não cobre ação; prévia editável pelo formulário; erro foca primeiro campo. |
| Footer | Reprise curta da marca e dois próximos passos, encerrando o arco. | Marca entra uma vez em 220 ms; sem reprise longa do Hero. | Conteúdo final alcançável e sem overlay cobrindo links. |

### Mecânica do palco cinematográfico

Ativar a versão sticky somente quando houver espaço real, inicialmente desktop ≥1024 px de largura e ≥720 px de altura. Isso é condição de efeito, não mudança dos breakpoints globais compact/medium/expanded do app. Em janela baixa, zoom/fonte ampliada, mobile ou movimento reduzido, usar versão em fluxo normal.

Estrutura: narrativa textual de três passos ao lado de um viewport sticky estável; área total inicial aproximada de 240–280 svh, calibrada em preview para evitar vazio artificial. Progresso do próprio trecho, não da página inteira. Evitar transforms/overflow nos ancestrais que quebrem sticky.

Fases propostas: 0–0,28 destaca escolha de serviço/horário; 0,28–0,62 mostra revisão; 0,62–1 apresenta o registro na agenda. Manter trechos de permanência legível entre as transições. Cada cena contém dados fictícios identificados e preserva a mesma identidade do exemplo ao longo da sequência. A animação não cria reservas ou confirma sincronização real.

A cena é uma miniUI ilustrativa com camadas de serviço, horário, resumo e cartão da agenda; não somente trocar um parágrafo. Uma cópia textual acessível descreve o fluxo e permanece no DOM. Camadas decorativas ficam fora da árvore acessível; um único conjunto interativo é focável. Usar botões comuns com `aria-pressed`, ou implementar integralmente semântica e teclado de tabs; não manter tabs incompletas só por aparência.

Controles: selecionar etapa por botão interrompe a transição atual e mostra o estado escolhido, mantendo foco no botão. Rolagem passiva nunca move foco nem dispara anúncios `aria-live`. Documentar uma regra única de precedência: seleção manual permanece até a próxima ação explícita de navegação de etapa ou saída/reentrada do palco; o scroll não deve desfazer imediatamente o clique. Não bloquear roda, setas, PageDown ou toque para impor a apresentação.

## Progressão emocional e ritmo

Cliente: curiosidade → clareza de escolha → confiança no próximo passo. Dono: reconhecimento da rotina → compreensão da conexão → confiança para conversar. O Hero desperta interesse; a comparação explica o problema; o palco demonstra a solução; pricing/FAQ/formulário desaceleram. Não adicionar movimentos de mesma intensidade a todos os blocos.

As duas ações continuam presentes. O caminho do cliente não pode ser tratado como introdução para vender demonstração ao dono. Não ampliar promessas como “instantaneamente”, disponibilidade, pagamento, múltiplas unidades ou resultados sem confirmação do contrato do produto.

## Arquitetura proposta

Desmembrar o atual `LandingPage.web.tsx` de 899 linhas em composição e seções, mantendo formulário/modelo e conteúdo separados. Introduzir poucos componentes locais: wrapper de marca animada, adapter de material, política de reveal e palco da demonstração. Evitar biblioteca genérica nova para cada efeito.

Arquivos de responsabilidade sugerida:

- `src/features/landing/ui/LandingPage.web.tsx`: composição e fluxo; extrair seções em subdiretório local.
- `src/features/landing/ui/styles.ts`: migrar regras a classes/tokens locais e auditar seletores globais.
- `src/features/landing/ui/AnimatedBrand.web.tsx`: wrapper do asset oficial e decoração.
- `src/features/landing/ui/LandingGlass.web.tsx`: variantes semânticas com tema e fallback explícitos.
- `src/features/landing/ui/ProductStory.web.tsx`: palco, controles e versão estática equivalente.
- `src/features/landing/lib/landing-motion-tokens.ts`: política central de tempos/distâncias/easing.
- `src/features/landing/model/use-product-story.web.ts`: progresso/limiares e precedência de controle, se a extração realmente reduzir complexidade.
- Registro de fontes web: definir localização conforme ownership da correção compartilhada; não espalhar aliases pela landing.

Reutilizar `motion` já instalado; não instalar também outra versão de Framer Motion. Usar `AnimatePresence` com chaves estáveis para trocas condicionais e limpeza de sequências. Considerar carregamento adiado do código do palco apenas se a medição mostrar benefício, preservando dimensões e conteúdo inicial. Nenhum arquivo universal deve importar inadvertidamente módulo que depende de `window` no topo.

## Plano de execução

| Ordem | Entrega | Aceite objetivo |
|---|---|---|
| 1 | Tratar achados funcionais em escopo separado e revisar alegações/copy. | Destinos honestos, contato validado e estado WhatsApp consistente; sem publicar promises pendentes. |
| 2 | Corrigir registro de fontes e fechar matriz tipográfica. | Epilogue/Inter efetivamente renderizadas; pesos corretos; navegação pública não bloqueia; regressão app web delimitada. |
| 3 | Extrair composição, tokens de movimento e adapter glass. | Nenhuma alteração incidental no app; semântica, tema e fallback verificados. |
| 4 | Construir Hero, header e animação de marca. | Dois públicos legíveis; abertura sem splash; contraste e dobra mobile conferidos. |
| 5 | Construir palco de três cenas com scroll e controles. | Escolha manual funcional, conteúdo estático equivalente e ausência de mudança de foco por scroll. |
| 6 | Coordenar confiança, contraste, Bento e pricing. | Ritmo gradual; entrada ao aparecer; hover/focus/toque equivalentes. |
| 7 | Finalizar FAQ, formulário e reprise do footer. | Estados reais preservados; animação não interfere no gesto de abrir WhatsApp; preferências respeitadas. |
| 8 | Validar regressões, acessibilidade, desempenho e preview. | Evidência separada de testes locais, browser, aparelhos e eventual produção. |

## Matriz de validação

**Funcional:** schema/mensagem com caracteres especiais; validação/configuração de contato; invalidar mensagem antiga; sem PII em logs/eventos; CTA de cliente não leva a formulário exclusivo de dono. Não enviar mensagem ao número comercial em testes sem autorização específica.

**Visual:** 320/390/430/768/1024/1440 px, fonte ampliada/zoom, textos longos, tecla Tab e retorno ao formulário. Comparar família/peso de H1/h2/h3/CTA/corpo/input com o contrato, não com a aparência do fallback atual. Verificar o layout após carregar a fonte correta.

**Marca:** tamanho/proporção oficiais, símbolo legível durante animação, uma única identificação acessível, nenhum asset desfocado por escala excessiva. Reentrada na página não deve tocar vinheta bloqueante.

**Movimento:** ativar movimento reduzido antes de carregar e alterá-lo durante a sessão. Sem parallax, grandes deslocamentos ou espaço sticky vazio nessa condição. Texto, CTAs e etapas disponíveis sem JS; voltar à página não reinicia toda a história. Sem animação decorativa em aba oculta/fora da viewport.

**Glass:** testar blur disponível e ausente, transparência reduzida, tema global claro com landing escura e fundo composto real. Medir texto comum ≥4,5:1, texto grande e estados necessários ≥3:1. Verificar backdrop com a estrutura Motion final. Não animar o blur para demonstrar o material.

**Desempenho:** registrar baseline antes/depois em mesmo ambiente, cache e dispositivo, além de traces dos trechos de Hero/palco. Metas de produto propostas: LCP ≤2,5 s, INP ≤200 ms e CLS ≤0,1; dados de laboratório devem ser identificados como tal, sem equivalência a percentil de campo. Traces devem procurar frames longos, layout/repaint repetido e custo de backdrop. “Transform” por si só não prova 60 fps.

Testar Android e Safari iOS reais antes de afirmar fluidez mobile/GPU/bateria. A emulação desta análise não fornece essa prova. Em condições fracas, preservar as cenas em sequência estática e reduzir área/quantidade de materiais filtrados, sem perder a proposta visual.

**Entrega técnica:** typecheck, testes significativos de estado/política/contratos, build completo com saída gravada e HTML inspecionado, navegação entre landing/login/catálogo/reserva. Não escrever testes que apenas contem wrappers de animação. Publicação, se solicitada depois, exige validação no artefato efetivamente publicado.

## Critérios para considerar a etapa concluída

O desenho tem identidade tipográfica correta; marca animada sem deformação; Hero e três cenas claramente cinematográficos; materiais glass coerentes com o app; transições consistentes em toda a landing; caminho dos dois públicos preservado; preferências e alternativas estáticas funcionais; medições e limitações documentadas. Aprovação desta proposta de desenho e autorização de implementação são etapas posteriores.

Referências: [Expo Font SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/font/), [Motion scroll](https://motion.dev/docs/react-scroll-animations), [MotionConfig](https://motion.dev/docs/react-motion-config), [backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) e [transparência reduzida](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency).

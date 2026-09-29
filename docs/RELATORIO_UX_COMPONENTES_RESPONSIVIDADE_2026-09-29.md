# Relatório de UX, componentes e responsividade

Data: 29/09/2026  
Escopo: frontend Smart Barber, web e aplicativo mobile.  
Base: inspeção estática do checkout `ef8db81`, capturas enviadas do Safari no iPhone e documentação pública das bibliotecas. Este documento é um plano; não comprova comportamento no Safari real, API em produção ou integração das bibliotecas.

## 1. Direção visual

Preservar o sistema **Obsidian/Crimson**, Epilogue nos títulos, Inter no texto, superfícies escuras e vermelho como acento. A tela de serviços já tem uma hierarquia reconhecível: título, filtros, cartões, preço e estado. O ganho mais importante vem de **legibilidade, adaptação e comunicação do resultado das ações**. Animação deve explicar mudança de estado, orientar o olhar e dar acabamento; não deve competir com preço, duração ou CTA.

O projeto usa Expo Router, React Native e React Native Web, com tokens de movimento de 140/220/300 ms e um hook de movimento reduzido. Não há Tailwind, shadcn/ui ou Motion nas dependências atuais (`package.json`, `src/shared/theme/primitives/motion.ts`, `src/shared/theme/use-reduced-motion.ts`). Portanto, os exemplos React DOM encontrados não são componentes universais de instalação imediata. Para um piloto web, a resolução por plataforma do Expo permite `.web.tsx` e uma versão base para as outras plataformas. [Expo: módulos por plataforma](https://docs.expo.dev/router/advanced/platform-specific-modules/); [Expo: Tailwind no web](https://docs.expo.dev/guides/tailwind/).

## 2. Achados anteriores e sua relação com componentes

| Prioridade | Evidência / consequência | Tratamento | Papel de componente pronto |
| --- | --- | --- | --- |
| P0 | Em 390 px, o botão “Novo Serviço” sai do cabeçalho na captura; título e botão dividem uma única linha em `src/features/services/ui/ServicesManagementView.tsx`. | Cabeçalho em duas linhas no estreito, CTA integral e legível, back/title com redução controlada. | Nenhuma animação resolve o layout. |
| P0 | `parsePriceToCents` em `src/features/services/model/service.types.ts` interpreta mal `1.234,56` e aceita texto com sufixo. | Parser de moeda pt-BR estrito, apresentação formatada e validação com exemplos de borda. | Feedback do campo pode orientar, mas depende da correção do parser. |
| P0 | Alternar ativo/inativo usa atualização otimista e falha sem explicação visível; estado volta silenciosamente. | Estado pendente por item, erro com ação de tentar novamente e confirmação após resposta. | Status Mark ou Toast Stack são referências de **pendente → sucesso/erro**; não devem esconder o erro de rede. |
| P1 | Esvaziar descrição na edição manda `undefined` e omite o campo; texto antigo permanece. | Definir contrato explícito de limpeza e validar persistência. | Loading Button só comunica progresso; não corrige a atualização. |
| P1 | Compartilhamento aponta para `smartbarber.app`, divergente do domínio visto na captura. | Centralizar origem pública configurável e testar URL gerada. | Feedback “link copiado/compartilhado” só após resultado real. |
| P1 | HTML web sem `theme-color`, fundo do documento transparente, título vazio e idioma inglês; Safari mostra áreas brancas acima/abaixo do conteúdo escuro. | Harmonizar HTML, meta e área segura; validar em Safari instalado. As barras de status/endereço são interface do navegador e podem continuar aparentes. | Fundo animado não resolve cromia do navegador. [Expo: HTML customizado](https://docs.expo.dev/router/web/static-rendering/). |
| P1 | Vermelho de marca sobre cartão escuro mediu cerca de 2,67:1; preto sobre CTA vermelho, cerca de 3,4:1. | Ajustar **tokens de texto, borda e CTA** por contexto, verificar contraste; preservar a identidade cromática. | Toda biblioteca copiada precisa herdar esses tokens. |
| P1 | Cartões de serviços carregam com skeletons de 80/88 px, menores que o conteúdo final; ocorre salto visual. | Reservar geometria semelhante ao cartão real e revelar sem deslocamento abrupto. | Skeleton Reveal é boa referência para transição discreta. |
| P1 | Lista de serviços limita 100 registros e contagens representam somente os carregados. | Paginação/cursor e totais corretos do contrato, ou rótulo explícito de parcial. | Infinite Scroll só depois de resolver paginação e sem ocultar resultados. |
| P1 | Filtros, fechar modal, campos de preço/duração e metadados têm limitações em toque, escala de fonte e largura estreita. | Áreas de toque ≥44 px, coluna no estreito, quebra de linha, modal rolável, foco visível e sem overflow. | Rubber Segment pode servir como piloto no filtro depois do ajuste de altura/semântica. |
| P1 | Resumo do catálogo público usa espaço inferior fixo; CTA e total podem competir no estreito. A mensagem “Seleção concluída” sugere reserva finalizada sem reserva efetiva. | Safe area dinâmica, disposição vertical quando necessário e texto que descreva somente a seleção efetuada. | Animação de conclusão apenas após evento realmente concluído. |
| P2 | Login da captura exibe glifos vazios; no desktop os ícones carregaram. Causa específica do Safari ainda não verificada. Spinner substitui o texto do botão. | Investigar fonte de ícones no Safari, manter rótulo “Entrando…” com spinner, associar labels a inputs. | Loading Button fornece a linguagem visual, não justifica trocar a biblioteca de botões. |
| P2 | Ações rápidas de agenda não correspondem integralmente aos nomes exibidos. | Corrigir destino/implementação ou rótulos antes de animar cliques. | Toast de sucesso só quando a ação existir e for persistida. |

## 3. Curadoria de componentes

**Critério:** benefício de compreensão e estética, esforço no stack atual, compatibilidade web/mobile, acessibilidade, movimento reduzido e dependências. “Adaptar padrão” significa reproduzir o comportamento nos componentes compartilhados já existentes; **não** afirmar que o código da biblioteca foi instalado.

| Fonte e componente | Aplicação concreta | Decisão | Custo relativo / restrição |
| --- | --- | --- | --- |
| [React Bits: Status Mark](https://reactbits.dev/c/micro/status-mark) | Indicador de salvamento e de ativação com `pending/running/done/failed`; texto visível junto do ícone. | **Piloto recomendado** no fluxo de serviços, como padrão universal ou implementação web isolada. | Médio. Código web usa Motion; sincronizar estritamente com a mutação real. |
| [React Bits: Rubber Segment](https://reactbits.dev/c/micro/rubber-segment) | Filtro Todos/Ativos/Inativos com thumb curto e claro. | **Piloto recomendado**, após corrigir a largura e os 44 px de toque. | Médio. Código web usa Motion; `size=lg`, `draggable=false`, contraste e estado controlado. Versão mobile equivalente. |
| [Spectrum UI: Skeleton Reveal](https://ui.spectrumhq.in/docs/skeleton-reveal) | Cartões do catálogo público e gerencial; transição curta entre placeholder e conteúdo. | **Adaptar no `Skeleton` atual**; alinhar altura antes da animação. | Baixo a médio. A fonte é DOM/Tailwind, embora sem dependência adicional declarada; código/CLI pedem login na página pública. |
| [Spectrum UI: Loading Button](https://ui.spectrumhq.in/docs/loading-button) | Login, “Salvar serviço”, “Criar serviço”: texto persistente + spinner + erro sem sumiço do botão. | **Adaptar no `Button` atual**. | Baixo. Copiar componente shadcn/Tailwind traria custo desproporcional. |
| [Spectrum UI: Toast Stack](https://ui.spectrumhq.in/docs/toast-stack) | Aviso de falha e confirmação breve em criar/editar/ativar, com uma notificação por operação. | **Usar como especificação de comportamento** para um feedback compartilhado; avaliar cópia apenas no piloto web. | Médio/alto. Fonte usa Motion, Tailwind, `clsx`, `tailwind-merge`, `lucide-react`; fonte/CLI pedem login. |
| [React Bits: Swipe Toast](https://reactbits.dev/c/micro/swipe-toast) | Alternativa visual de aviso de sucesso/erro com ação de repetição. | **Referência secundária**, não instalar junto com Toast Stack. | Médio/alto. Motion e dois pacotes Hugeicons; evitar dois sistemas de notificações. |
| [Spectrum UI: Undo Pill](https://ui.spectrumhq.in/docs/undo-pill) | Desfazer ativação/desativação em janela explícita. | **Condicional**: só se a operação e a reversão forem realmente confiáveis. | Médio. Confirmar comportamento em falhas e sincronização; “desfazer” fictício prejudica confiança. |
| [Spectrum UI: Animated Alert](https://ui.spectrumhq.in/docs/alert) | Erro persistente dentro do modal, perto do campo/ação que falhou. | **Adaptar transição curta** no `Alert` atual, mantendo mensagem acessível. | Baixo. Validar movimento reduzido; não substituir erro de campo por toast passageiro. |
| [React Bits: Warm Tooltip](https://reactbits.dev/c/micro/warm-tooltip) | Explicar botões com ícone na interface desktop. | **Opcional**. | Baixo/médio. Hover não cobre toque; no mobile manter rótulos explícitos. |
| [Spectrum UI: Number Ticker](https://ui.spectrumhq.in/docs/number-ticker) | Mudança discreta de contagem no dashboard. | **Adiar** até que métrica e contagem sejam reais e consistentes. | Médio. Animar números imprecisos amplifica o erro. |

**Não recomendado neste ciclo:** backgrounds WebGL, partículas, cursores decorativos, tilt/3D, animação contínua dos cartões, gestos de confirmar para CRUD comum e floating labels sem associação semântica. Custam desempenho e distraem do fluxo operacional. Também não migrar toda a interface para Tailwind/shadcn apenas para usar componentes isolados. [React Bits: catálogo](https://www.reactbits.dev/get-started/index); [Spectrum UI: catálogo](https://ui.spectrumhq.in/docs).

### Licenças e disponibilidade

React Bits oferece código para copiar, mas sua licença atual é **MIT com Commons Clause**; exige revisar atribuição e limites de redistribuição de componentes antes de incorporar código. [Licença oficial](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md). Páginas do Spectrum UI descrevem componentes públicos como Apache 2.0, mas **a visualização do código e do comando de instalação pede conta** nas páginas consultadas; a seleção acima não pressupõe acesso à implementação. [Exemplo: Skeleton Reveal](https://ui.spectrumhq.in/docs/skeleton-reveal); [Exemplo: Toast Stack](https://ui.spectrumhq.in/docs/toast-stack). Cada componente copiado precisará de revisão da licença própria e das dependências efetivamente instaladas.

## 4. Regras de movimento e comunicação

1. **Evento primeiro, animação depois.** Pressionar serviço muda para “Atualizando…”; resposta confirmada vira “Ativo”/“Inativo”; falha restaura estado com explicação e “Tentar novamente”. Sucesso não aparece antes da confirmação da API.
2. **Uma ênfase por área.** Filtro pode deslizar; cartões de uma lista operacional não precisam entrar em cascata. Evitar loops decorativos.
3. **Duração alinhada aos tokens:** 140 ms para pressionar, 220 ms para mudança de estado, até 300 ms para entrada/saída. Skeleton pode respirar discretamente enquanto carrega. Nenhuma transição impede uma ação.
4. **Movimento reduzido:** remover deslocamento, bounce, pulso e blur quando solicitado; manter a mudança de conteúdo e o feedback textual. Testar preferência do SO na web e no aplicativo.
5. **Comunicação multimodal:** não depender apenas de cor, ícone ou vibração; usar rótulo, estado, foco e mensagem de erro. Toast temporário não substitui erro persistente de formulário. Usar anúncios apropriados a tecnologias assistivas.
6. **Performance:** animar opacity/transform quando possível, limitar camadas, evitar layout thrash, WebGL e bibliotecas grandes em rotas críticas de login. Medir tamanho do bundle e responsividade antes de aceitar um piloto web.

## 5. Plano de execução proposto

| Fase | Dependência | Entrega | Critério de aceite |
| --- | --- | --- | --- |
| 0. Baseline | Nenhuma | Capturas e matriz de fluxo em 320/360/390/430 px, tablet e desktop; Safari iPhone, Chrome/Edge e app nativo; estados normal/loading/erro, zoom e texto ampliado. | Evidência reproduzível de overflow, barras, toque, contraste e falhas; diferenciar navegador, HTML e layout. |
| 1. Correções bloqueadoras | 0 | Cabeçalho responsivo; parser de preço; limpeza da descrição; erro na ativação; URL pública correta; contagens/paginação definidas; cópia honesta no catálogo. | Sem CTA cortado nem erro silencioso; preços corretos em entradas pt-BR; persistência e URL comprovadas por fluxo real. |
| 2. Base visual e acessibilidade | 1 | Tokens de contraste, áreas de toque, quebra de conteúdo, modal rolável, labels dos campos, safe areas, metadados web, investigação de ícones no Safari. | Sem overflow horizontal nos tamanhos alvo; contraste de texto comum ≥4,5:1 e controles/foco verificáveis; barra do Safari harmonizada no limite permitido pelo navegador. |
| 3. Sistema de feedback | 1–2 | `Button` com rótulo de progresso; `Alert` contextual; feedback global padronizado; estados por item; skeleton com dimensões reais. | Criar/editar/ativar/login exibem progresso, sucesso e falha corretos; sem feedback duplicado ou falso; reduzido movimento mantém informação. |
| 4. Pilotos de microinteração | 2–3 | Filtro com thumb discreto e status de mutação, inspirados nos componentes selecionados; versão web e equivalente nativo. | Comparação visual com baseline, teclado/leitor de tela, toque ≥44 px, fluidez em telefone mediano, sem regressão de bundle/tempo perceptível. |
| 5. Revisão transversal | 4 | Aplicar padrões aprovados ao dashboard, agenda, disponibilidade, catálogo público e autenticação; documentação de uso. | Mesmo vocabulário de cores, movimento e estados em todos os fluxos; teste manual web/mobile e checklist de componentes. |

**Ordem crítica:** corrigir dados e layout antes de introduzir transições. A fase 4 é deliberadamente um piloto mensurável; se uma cópia direta exigir nova infraestrutura CSS ou degradar o mobile, manter o comportamento em componentes universais existentes. O código de produto deve ser implementado somente após revisão deste plano.

## 6. Matriz de validação para a implementação

| Dimensão | Casos mínimos |
| --- | --- |
| Responsividade | 320, 360, 390, 430 px, tablet e desktop; teclado aberto; orientação horizontal; fonte/zoom 200%; conteúdo longo; sem corte/rolagem horizontal inesperada. |
| Serviços | Preço `1.234,56`, inválidos `12abc`, criação, edição, limpeza da descrição, troca de ativo com sucesso/falha, filtros e lista acima de 100 itens. |
| Feedback | Rede lenta, erro HTTP, timeout, duplo toque, troca de tela durante request, anúncio acessível; nenhum estado de sucesso antes da confirmação. |
| Navegadores/mobile | Safari iPhone real para barras, ícones, safe area, modal/teclado; Chrome/Edge web; Android e iOS nativos onde disponíveis. |
| Acessibilidade | Contraste, foco, ordem de tabulação, nomes de campos, leitor de tela, toque ≥44 px, movimento reduzido, estado comunicado sem cor. |
| Desempenho | Comparar bundle e interação antes/depois; observar layout shift dos skeletons e fluidez das transições em aparelho intermediário. |

## 7. Decisões pendentes para revisão

- Confirmar se a implantação deseja **navegador Safari convencional** ou uma experiência PWA instalada. O objetivo visual das barras muda conforme o modo, embora a interface do Safari permaneça sob controle do navegador.
- Confirmar contrato da API para limpar descrição e obter contagem total/paginação antes de implementar essas telas.
- Selecionar **um** sistema de notificações após o piloto, com `Alert` contextual para erro de formulário e feedback global para ações assíncronas.
- Caso se deseje cópia exata de componente Spectrum UI, obter acesso oficial ao código, revisar licença/dependências e estimar a adaptação web/native antes de incluí-lo.

## 8. Ampliação: abertura, autenticação e coerência por fluxo

### Abertura antes do login

Há **três momentos diferentes**. Em iOS/Android, a splash nativa é uma imagem estática com variantes clara/escura configuradas em `app.json`. Depois, `src/app/_layout.tsx` mantém a splash até as fontes carregarem, mas a oculta mesmo quando `useSession` ainda está em `bootstrapping`; `BootstrapScreen` aparece com marca de 112 px, spinner e “Verificando sua sessão…”. Na web, o primeiro fundo depende do documento HTML e do carregamento da aplicação, pois a splash do Expo é nativa. [Expo SplashScreen](https://docs.expo.dev/versions/latest/sdk/splash-screen/); [Expo HTML web](https://docs.expo.dev/router/web/static-rendering/).

Os arquivos `splash-light.png`/`splash-dark.png` são imagens transparentes de 1024 px com conteúdo visível aproximadamente entre 162–862 px na horizontal e 189–834 px na vertical. Com `imageWidth: 200`, a marca visível ocupa aproximadamente 137 px; o `BrandMark` seguinte usa 112 px. É provável haver mudança perceptível de escala/posição entre as etapas, a confirmar em build nativa. **Proposta:** equalizar tamanho aparente, alinhamento vertical e fundo entre splash e primeiro frame; usar a mesma marca existente, uma única transição curta e um texto de estado real. Não introduzir porcentagem inventada, cronômetro ou espera proposital para mostrar animação.

Quando a restauração de token falha por rede ou 500, `use-session.tsx` preserva o token e define `status: 'error'`, mas `AuthRouteGuard` redireciona para login e `LoginForm` mostra apenas seu próprio `submitError`. O usuário pode cair no login sem explicação. **Proposta:** estado de recuperação de sessão com mensagem “Não foi possível verificar sua sessão”, opção **Tentar novamente** (`restoreSession`) e caminho claro para entrar com outra conta; nenhuma limpeza automática do token em falha transitória. Validar o contrato atual antes de alterar navegação.

### Login e cadastro

O formulário existente já tem tema, labels visíveis e mostrar/ocultar senha. Ganhos de menor custo: preservar “Entrando…” ao lado do spinner (`Button` hoje esconde o título); eliminar salto de largura; associar labels, instruções e erro ao input na web; anúncio de erro persistente; conferir ícones que apareceram como caixas no Safari; ajustar card para teclado e altura dinâmica. O [Login Card](https://ui.spectrumhq.in/docs/login) do Spectrum traz login social que o produto não oferece, além de Tailwind/Motion/`next-themes`; não há ganho em copiar a tela inteira. [Text States](https://ui.spectrumhq.in/docs/text-states) inspira mudança textual leve no botão e no bootstrap; declara nenhuma dependência extra, mas a implementação é DOM/Tailwind e está atrás do login do site. [Password Strength](https://ui.spectrumhq.in/docs/password-strength) é útil **somente** no cadastro ou alteração de senha, após confirmar que as regras exibidas correspondem às exigências reais da API.

### Demais fluxos

| Fluxo | Evidência adicional | Melhoria proposta |
| --- | --- | --- |
| Disponibilidade | `AvailabilityScreen.tsx` usa spinner central no carregamento inicial, enquanto agenda e dashboard já usam skeletons. | Manter cabeçalho e estrutura estáveis, placeholder com a geometria dos horários, erro com tentar novamente quando possível. |
| Agenda/dashboard | Badges e skeletons existem, mas o estilo de carregamento, estado de botão e mensagem de sucesso variam. | Reutilizar `Badge`, `Skeleton`, `Button` e um feedback de mutação únicos; não animar métricas que ainda venham de mocks ou dados incompletos. |
| Ações rápidas | `QuickActionsBar.tsx` mostra “Novo Encaixe” sem execução e “Ver serviços” aciona compartilhamento. | Corrigir rótulos/estado disponível; link real e confirmação da ação de compartilhar. |
| Catálogo público | Badge fixa “Atendimento” pode sugerir estado operacional não calculado; modal de seleção usa check de conclusão e não limita altura. | Texto factual sobre serviços, resumo adaptativo e modal com scroll/foco; nenhuma confirmação de reserva sem reserva. |

### Complementos da curadoria

| Componente | Veredito para este ciclo | Motivo |
| --- | --- | --- |
| [Spectrum UI: Text States](https://ui.spectrumhq.in/docs/text-states) | **Selecionar como padrão a adaptar** no texto de bootstrap e botões assíncronos. | Troca de estado com duração curta e caminho de movimento reduzido; manter texto acessível. |
| [Spectrum UI: Status Badge](https://ui.spectrumhq.in/docs/status-badge) | **Adaptar o `Badge` existente** para pendente/sucesso/erro quando o dado suportar. | Mais leitura por texto+ícone, sem criar segundo badge. |
| [Spectrum UI: Password Strength](https://ui.spectrumhq.in/docs/password-strength) | **Condicionar** à regra real de cadastro. | Checklist de requisitos pode prevenir erro; copiar diretamente introduziria Motion/ícones/Tailwind. |
| [React Bits: Lattice Loader](https://reactbits.dev/c/micro/lattice-loader) | **Referência opcional**, não instalar no bootstrap inicial. | Wave/cronômetro acrescentam movimento, mas podem enfatizar demora e não resolver passagem splash→React. |
| [Spectrum UI: Spinner](https://ui.spectrumhq.in/docs/spinner) | **Não duplicar**. | O projeto já tem `Spinner`; ganho maior é combinar indicador e texto no componente atual. |
| [Spectrum UI: Login Card](https://ui.spectrumhq.in/docs/login) | **Não copiar**. | Login social não implementado, layout e dependências extras, sem correção dos problemas concretos. |

O procedimento permanente de consulta a [React Bits](https://reactbits.dev/c/micro) e [Spectrum UI](https://ui.spectrumhq.in/docs) foi adicionado ao [guia oficial de design](../SMART_BARBER_DESIGN_SYSTEM_V2.md). O [plano de implementação detalhado](PLANO_UX_RESPONSIVIDADE_COMPONENTES_2026-09-29.md) transforma esta análise em tarefas e validações para execução posterior.

## Fontes principais

- [React Bits: catálogo Micro](https://reactbits.dev/c/micro), [Status Mark](https://reactbits.dev/c/micro/status-mark), [Rubber Segment](https://reactbits.dev/c/micro/rubber-segment) e [licença](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md).
- [Spectrum UI: documentação](https://ui.spectrumhq.in/docs), [Skeleton Reveal](https://ui.spectrumhq.in/docs/skeleton-reveal), [Loading Button](https://ui.spectrumhq.in/docs/loading-button), [Toast Stack](https://ui.spectrumhq.in/docs/toast-stack) e [Undo Pill](https://ui.spectrumhq.in/docs/undo-pill).
- [Expo: módulos por plataforma](https://docs.expo.dev/router/advanced/platform-specific-modules/), [HTML web](https://docs.expo.dev/router/web/static-rendering/) e [Tailwind](https://docs.expo.dev/guides/tailwind/).
- [Expo: splash nativa](https://docs.expo.dev/versions/latest/sdk/splash-screen/); [Spectrum UI: Text States](https://ui.spectrumhq.in/docs/text-states), [Status Badge](https://ui.spectrumhq.in/docs/status-badge), [Password Strength](https://ui.spectrumhq.in/docs/password-strength) e [Login Card](https://ui.spectrumhq.in/docs/login).

## 9. Relatório de entrega e matriz de validação técnica (P00–P08)

Data de conclusão: 29/09/2026  
Status geral: **Pacotes P00–P08 integralmente implementados e verificados localmente**.

### 9.1. Verificação por inspeção estática e tipagem

- **Compilação TypeScript:** `npm run typecheck` (`tsc --noEmit`) executado com **0 erros**.
- **Contratos e Schemas:**
  - `parsePriceToCents` estrito tratando formatações pt-BR (`R$ 1.234,56`, `1.234,56`, `40,00`, `45.50`, inteiros) e rejeitando valores inválidos/negativos.
  - Suporte explícito a `description?: string | null` em `CreateServiceInput` e `UpdateServiceInput` para permitir limpeza de descrição.
  - `ENV.PUBLIC_WEB_URL` e helper `getPublicCatalogUrl` centralizados em `src/shared/config/env.ts`.
- **Integridade de Repositório:** `git diff --check` aprovado sem erros de quebra de linha ou marcadores residuais de conflito.

### 9.2. Verificação por testes automatizados

- **Suíte de Testes (Vitest):** `npm test` executado com **100% de sucesso**:
  - **26 arquivos de teste** executados e aprovados.
  - **142 testes individuais** passando (`service-model.test.ts`, `services.api.test.ts`, `dashboard-view-model.test.ts`, `agenda.*`, `availability.*`, `auth.*`, `theme.tokens.test.ts`).
  - Testes focados cobrindo todos os casos de borda do parser monetário, mapeamentos de status/tones e mutações com reversão otimista.

### 9.3. Verificação em runtime local e build web estático

- **Build de Exportação Web (`npm run build` / `expo export -p web`):**
  - Gerou com sucesso o diretório `dist` com renderização estática ativa.
  - 18 rotas estáticas pré-renderizadas (incluindo `(app)`, `(auth)`, `(public)`, `services`, `agenda`, `availability`).
  - 1 bundle de entrada web (`_expo/static/js/web/entry-*.js`) com 2.1 MB.
- **Componentes C1–C6 Integrados:**
  - **C1 (Button):** `loadingTitle` integrado em login, cadastro, serviços, agenda e disponibilidade.
  - **C2 (OperationStatus):** Indicador de status assíncrono universal (`idle/pending/success/error`) com rótulo estável.
  - **C3 (SegmentedFilter):** Filtro segmentado acessível em 320 px com alvo ≥44 px e semântica de abas.
  - **C4 (Skeleton):** Esqueletos dimensionados e pulso suave com respeito a `useReducedMotion()`.
  - **C5 (ToastStack):** `ToastProvider` e `useToast` com suporte a string ou opções e controle de duplicação.
  - **C6 (Badge):** Badge evoluído com ícone, variantes de status e conformidade cromática.

### 9.4. Limitações de ambiente e verificações pendentes externas

De acordo com o princípio de transparência estabelecido no plano de UX:
1. **Safari iPhone Físico Real:** A validação das barras nativas de endereço/status do Safari e o comportamento de viewport com teclado dinâmico foram implementados seguindo as especificações de `+html.tsx` e `meta viewport`, mas dependem de teste manual em aparelho físico com iOS real para homologação final de hardware.
2. **Build de Release Nativa (IPA/AAB):** A transição fluida da splash nativa para a primeira pintura foi alinhada nas dimensões (136 px aparente), porém requer geração de build standalone de release (via EAS Build ou Xcode/Android Studio) para homologação do splash screen nativo estático.
3. **Endpoints de API em Produção:** As rotas reais do backend foram integradas via contratos e schemas estritos com mocks de borda; a execução final com credenciais ativas de produção deve ser validada no ambiente de staging com banco populado.


# Smart Barber — planejamento da landing híbrida

Data: 15/10/2026. Status: briefing confirmado; desenho proposto para revisão. Entrega de planejamento, sem implementação ou publicação.

## 1. Benchmarking Estratégico (Referências)

### Base do produto e decisões confirmadas

**Proposta de valor:** conectar quem procura um atendimento à barbearia e ao horário adequados. Para a barbearia, reunir serviços, disponibilidade, agendamentos e acompanhamento do dia para simplificar a operação.

**Públicos:** clientes que desejam encontrar e agendar; donos e gestores interessados em conhecer o sistema. A landing dará igual destaque aos dois caminhos, sem presumir que todo visitante é comprador de SaaS.

| Decisão confirmada | Alternativa considerada | Motivo |
|---|---|---|
| Landing híbrida, com dois caminhos equivalentes | Prioridade exclusiva B2B ou B2C | Conectar oferta e demanda faz parte da proposta do produto. |
| Clientes seguem para encontrar/agendar | Cadastro como primeira ação | A intenção principal do cliente é obter um atendimento. |
| Busca e descoberta em etapa posterior | Direcionar somente a um catálogo existente | A descoberta precisa atender múltiplas barbearias; ainda não existe no frontend inspecionado. |
| Donos solicitam demonstração | Cadastro direto ou assinatura | A oferta comercial ainda precisa ser definida. |
| Formulário prepara mensagem para WhatsApp | Somente formulário ou somente link direto | Organiza o primeiro contato e contextualiza a conversa comercial. |
| Três níveis provisórios, valores sob consulta | Preços e limites inventados | Não existem condições comerciais aprovadas. |
| Preservar Obsidian Atelier | Novo sistema visual | Manter reconhecimento e componentes existentes. |

**Evidência atual:** há código frontend para catálogo/serviços, reserva, agenda, disponibilidade e visão operacional do dia. Não houve teste de integração, execução ou produção nesta atividade. Busca geral, geolocalização, avaliações verificadas, cobrança SaaS e checkout não foram encontrados como capacidades implementadas. O WhatsApp atual abre conversas manuais; não prova automação ou mensageria oficial. O README contém descrições antigas e não foi usado isoladamente como inventário.

Fontes locais: `DESIGN.md`, `SMART_BARBER_DESIGN_SYSTEM_V2.md`, `package.json`, `src/shared/theme`, `src/features/services`, `src/features/bookings`, `src/features/agenda`, `src/features/availability`, `src/features/dashboard` e `src/app/_layout.tsx`. As alterações preexistentes em autenticação foram preservadas.

### Referências consultadas

As observações abaixo derivam do conteúdo e da estrutura documental das páginas oficiais consultadas em 15/10/2026. Não são uma auditoria de desempenho, código ou comportamento de scroll dos concorrentes. As animações deste plano são propostas próprias.

| Referência | Padrão observado | Aplicação proposta ao Smart Barber |
|---|---|---|
| [Apple — iPhone](https://www.apple.com/br/iphone/) | Imagens de produto protagonistas, títulos curtos, explicação progressiva de benefícios e chamadas específicas por contexto. | Uma demonstração central do produto; respiro; revelar cada etapa do atendimento sem encher o Hero de telas. |
| [Booksy Biz](https://biz.booksy.com/pt-br) | Agenda apresentada por benefícios, passos de entrada simples e distinção entre solução profissional e experiência do cliente. | Deixar claro quem agenda e quem gerencia; demonstrar o vínculo entre as duas experiências. |
| [Trinks — barbearia](https://sistema.trinks.com/barbearia) | Vocabulário do setor, blocos sobre situações concretas da operação e autonomia do profissional. | Copy sobre troca de mensagens, organização de horários e visão do dia; selecionar apenas capacidades demonstráveis. |
| [Fresha — barbearias](https://www.fresha.com/pt/for-business/barber) | Fotografia contextual, produto em uso, ligação entre marketplace e gestão e histórias de negócios. | Equilibrar pessoas e interface. Reservar espaço para histórias reais futuras, usando demonstração de produto enquanto não houver prova social própria. |

Os números, depoimentos, integrações e promessas dessas empresas não serão transferidos para o Smart Barber.

### Abordagens de composição

| Abordagem | Vantagem | Custo e risco | Manutenção |
|---|---|---|---|
| **A. Narrativa comum e duas entradas visíveis — recomendada** | Explica a conexão cliente/barbearia e mantém os dois CTAs disponíveis. | Complexidade moderada; exige copy curta para não misturar benefícios. | Uma página e conteúdo compartilhado. |
| B. Alternância entre cliente e dono | Cada público vê uma narrativa específica. | Pode esconder o segundo caminho; adiciona estados, foco e medição. | Duas versões de vários blocos. |
| C. Portal que encaminha a duas páginas | Permite campanhas muito específicas por público. | Mais navegação e risco de abandono antes da proposta de valor. | Três páginas e duplicação editorial. |

O detalhamento seguinte desenvolve A como proposta. O briefing foi confirmado; a composição visual permanece sujeita à revisão do desenho.

## 2. Arquitetura de Seções (De cima a baixo)

### Wireframe textual e contrato visual

```text
Header: marca | Para clientes | Para barbearias | Como funciona | Entrar
Hero: proposta comum
      [Cliente: Encontrar barbearias] [Dono: Solicitar demonstração]
      Demonstração conectada: catálogo → escolha de horário → agenda
Confiança: demonstração verificável do produto
Problema → agitação breve → nova rotina, nas duas perspectivas
Bento: benefícios do cliente e da operação
Como funciona: duas trilhas equivalentes
Planos para barbearias: três configurações sob consulta
FAQ: objeções de ambos os públicos
CTA final: dois caminhos + formulário comercial
Footer: marca | contato | privacidade | termos | entrar
```

**Identidade:** canvas Obsidian `#0B0B0B`, superfícies `#131313`/`#1F1F1F`, ação Crimson `#BD2026`, texto principal claro; tema Ivory `#F7F5F3`, superfícies brancas e texto `#171313`. Utilizar tokens semânticos e `BrandMark`, com variantes adequadas ao tema. Epilogue nos títulos; Inter no conteúdo e números financeiros. Fotografia real/licenciada com contexto de barbearia, sem iconografia literal repetitiva.

**Composição:** uma face de material por card; inset de conteúdo real de 16–20 px; vidro reservado a superfícies de destaque e navegação. Não animar blur, sombras ou gradientes. Respeitar a seção 52 do design system. As recomendações automáticas da pesquisa visual foram filtradas: paleta azul/laranja, fontes alternativas, estrelas e carrosséis de depoimentos foram descartados por conflitarem com a marca ou com a evidência disponível.

**Layout:** compact abaixo de 600 px; medium de 600 a 839 px; expanded a partir de 840 px. Container até 1040 px; margens laterais propostas de 20/32/48 px conforme espaço. Mobile com coluna única e dois CTAs visíveis em sequência, sem carrossel. Desktop com dois caminhos de mesma largura e peso visual. Display web proposto de 36–56 px, com quebra fluida e sem alterar a escala global do aplicativo; corpo de 16 px. Alvos mínimos de 44 × 44 px.

### 2.1 Hero Section — acima da dobra

**Objetivo de venda:** permitir que cada visitante reconheça sua necessidade e encontre sua ação imediatamente.

**Headline:** “Seu próximo horário. Sua barbearia em movimento.”

**Apoio:** “Encontre uma barbearia e escolha seu atendimento. Cuide dos serviços, dos horários e da rotina da sua equipe com o Smart Barber.” Esta é a copy de lançamento conjunto; o primeiro período depende da descoberta operacional.

**Layout:** título comum, apoio curto e dois cards equivalentes: “Quero agendar” / “Encontrar barbearias”; “Tenho uma barbearia” / “Solicitar demonstração”. Os dois botões usam o mesmo tamanho, tratamento primário e destaque. “Entrar” permanece um acesso discreto. Abaixo, composição conectando um catálogo mobile à agenda da barbearia, com dados fictícios identificados como “Demonstração ilustrativa”.

**Animação:** conteúdo e CTAs visíveis na primeira pintura. Apenas o mockup ganha entrada com `opacity` e `translateY` de 12 px até zero em 300 ms. Hover de botão em 140 ms; pressed com escala até 0,98; foco com contorno independente. Sem splash ou espera para revelar o título.

**Aceite:** em 390 × 844 px, os dois públicos e suas ações aparecem sem depender do mockup; a 320 px ou com fonte ampliada, permitir crescimento natural e rolagem, sem corte para forçar a dobra.

### 2.2 Prova Social / Autoridade

**Objetivo de venda:** reduzir incerteza com evidência compreensível.

**Headline:** “Veja o que acontece em cada etapa.”

**Layout:** faixa de confiança com três recortes de produto: serviço/preço/duração, revisão do horário escolhido e agenda operacional. Legendas curtas explicam o que cada tela permite conferir. Esta versão usa prova de funcionamento demonstrável; depoimentos, marcas de clientes e avaliações só entram com origem e autorização verificadas.

**Animação:** entrada única com deslocamento de 8 px e opacidade em 220 ms; intervalo de 60 ms entre os três itens. Em movimento reduzido, tudo estático. Sem contadores crescentes ou logos em movimento.

**Aceite:** cada alegação aponta para tela e comportamento homologados antes de publicação; mockup identificado não conta como prova de integração real.

### 2.3 O Problema vs. A Nova Era — agitação da dor

**Objetivo de venda:** tornar visível o custo da desorganização sem fabricar medo ou perdas financeiras.

**Headline:** “Menos mensagens para combinar. Mais clareza para atender.”

**Copy:** cliente: “Qual serviço? Qual valor? Ainda tem horário?”; dono: “Entre uma conversa e outra, fica difícil acompanhar o dia.” Resolução: “Uma escolha clara para o cliente. Uma rotina organizada para a barbearia.”

**Layout:** comparação em duas colunas: “Hoje, tudo espalhado” e “Com o fluxo organizado”. Usar cartões ilustrativos de conversa sem marcas de terceiros ou dados pessoais. No lado organizado, serviço → profissional → horário → revisão → confirmação real. No mobile, comparação empilhada, sem controle de arraste obrigatório.

**Animação:** o scroll revela primeiro a dispersão e depois a sequência organizada, por opacidade e deslocamento máximo de 12 px. A narrativa continua legível sem animação. Sem tremor, alarme, scroll travado ou promessa de eliminar todas as faltas.

### 2.4 Vitrine de Funcionalidades — Bento Grid interativo

**Objetivo de venda:** apresentar cinco benefícios ligados a capacidades identificáveis.

**Headline:** “Do horário escolhido ao dia organizado.”

| Card / copy | Benefício | Componente e condição |
|---|---|---|
| “Escolha sabendo o que vai contratar” | Consultar serviço, duração e valor antes de avançar. | Recorte do catálogo público. |
| “Encontre um horário que combine com você” | Selecionar serviço, profissional e disponibilidade. | Mini fluxo de reserva; conflitos continuam sujeitos à confirmação do servidor. |
| “Veja sua agenda com contexto” | Acompanhar o dia e localizar cada atendimento. | Recorte da agenda e seus estados reais. |
| “Organize quando sua equipe atende” | Cuidar de horários semanais e exceções. | Miniatura de disponibilidade. |
| “Saiba qual é o próximo atendimento” | Consultar próximos agendamentos e contexto operacional. | Recorte do dashboard; não apresentar como caixa ou conciliação financeira. |

**Layout:** grid de três colunas no desktop, dois cards maiores de 2 × 1 e três menores; duas colunas intermediárias e uma no mobile. Conteúdo completo sempre acessível; ação opcional “Ver exemplo” abre detalhe com botão real. Não tornar cards decorativos falsamente clicáveis.

**Animação:** reveal único de 220 ms; hover com `translateY(-2px)` e transição de 140 ms apenas em dispositivos com hover. Focus-visible também destaca o botão. No toque, o detalhe depende de tap, não de hover; a troca de exemplo usa crossfade de 220 ms e altura reservada.

### 2.5 Demonstração de Fluxo — How it Works

**Objetivo de venda:** produzir o pico de clareza: mostrar que a escolha do cliente chega à rotina da barbearia.

**Headline:** “Uma escolha do cliente. Um atendimento na sua agenda.”

**Layout:** duas trilhas com o mesmo destaque. Cliente: encontrar barbearia → consultar serviços → escolher profissional e horário → revisar e confirmar. Barbearia: configurar serviços → definir disponibilidade → receber e acompanhar reservas. A primeira etapa do cliente pertence à fase posterior de descoberta; as demais dependem da homologação dos fluxos existentes.

**Scrollytelling:** somente no desktop, painel de demonstração sticky durante três blocos narrativos de aproximadamente 70–90 vh. Progresso local ativa as cenas de escolha, revisão e agenda; crossfade de 220 ms e deslocamento de até 12 px. `useScroll`/`useTransform` para valores visuais, sem `setState` por frame. Botões nomeados também permitem escolher cada etapa; o progresso do scroll não move foco.

Mobile, paisagem baixa e movimento reduzido usam os passos empilhados, com capturas estáticas. O painel mantém proporção estável, não captura a roda do mouse e não alonga artificialmente a página. Estados de sucesso de exemplo são sempre ilustrativos; nenhuma demonstração cria reservas reais.

### 2.6 Planos e Preços — três níveis provisórios

**Objetivo de venda:** ajudar o dono a reconhecer o porte da sua necessidade e iniciar a conversa adequada.

**Headline:** “Uma configuração para o momento da sua barbearia.”

| Proposta de nome | Público a investigar na demonstração | Exibição de valor | Ação |
|---|---|---|---|
| Essencial | Operação enxuta, iniciando a organização digital. | Sob consulta | Solicitar demonstração |
| Equipe — destaque visual | Operação com vários profissionais e rotina compartilhada. | Sob consulta | Solicitar demonstração |
| Operação ampliada | Necessidades que exigem dimensionamento e análise de aderência. | Sob consulta | Conversar sobre minha operação |

**Layout:** três cards de mesma altura estrutural; plano central com borda Crimson e selo factual “Para equipes”. No mobile, empilhados. A referência superior é o porte da operação; sem valores aprovados, não há ancoragem monetária legítima. Não usar “mais vendido”, desconto, trial, economia, ilimitado ou funcionalidades exclusivas sem validação comercial.

Nomes e segmentação são propostas, não pacotes contratáveis aprovados. Para publicação antecipada, apresentar como “Configurações sob consulta”, com “Condições e recursos definidos na demonstração”. A matriz de recursos, limites e preço deve ser aprovada antes de transformar os cards em planos de assinatura.

**Regra numérica obrigatória:** todo valor monetário e toda métrica de limite usa as classes `tabular-nums font-semibold`. Como não há Tailwind no projeto, definir essas duas classes em CSS da landing web: `font-variant-numeric: tabular-nums` e `font-weight: 600`, com Inter 600 carregada. Usar grades e linhas equivalentes para alinhar também posição, unidade e rótulos; tabular-nums sozinho só iguala a largura dos algarismos. Em equivalentes nativos, aplicar `fontVariant: ['tabular-nums']` e Inter_600SemiBold. Não criar números ilustrativos como se fossem limites comerciais.

**Animação:** reveal único de 220 ms. Sem alternância mensal/anual enquanto não houver oferta aprovada. Ao clicar, carregar o nome da configuração no formulário e levá-lo ao foco do título, sem apagar preenchimentos existentes.

### 2.7 FAQ Estratégico — quebra de objeções

**Objetivo de venda:** resolver dúvidas dos dois públicos antes da ação.

**Headline:** “Antes de dar o próximo passo.”

1. **“Preciso criar conta para conhecer as barbearias?”** Copy de lançamento proposta: “Você poderá explorar as opções e consultar os serviços antes de entrar. Para concluir o agendamento, seguimos a identificação exigida pelo fluxo de reserva.” Publicar somente após validar navegação e retorno ao agendamento.
2. **“Como sei se meu horário foi confirmado?”** “A reserva estará confirmada quando o sistema apresentar a confirmação do agendamento. Escolher um horário ou revisar os dados ainda não conclui a reserva.”
3. **“Posso remarcar ou cancelar?”** “As opções dependem do estado do agendamento e das regras aplicáveis. Confira as ações disponíveis nos detalhes da sua reserva.” Validar condições reais antes da publicação.
4. **“Quanto custa para minha barbearia?”** “O dimensionamento e os valores são apresentados na demonstração. Conte como sua operação funciona para conversarmos sobre a configuração adequada.”
5. **“O que acontece quando solicito a demonstração?”** “Você preenche um formulário curto e abre o WhatsApp com a mensagem pronta. Revise e envie para iniciar a conversa com nossa equipe.”

**Layout:** accordion semântico com título em botão, `aria-expanded`, `aria-controls` e resposta em fluxo normal. Agrupar visualmente as três dúvidas de clientes e as duas comerciais sem ocultar um público por padrão.

**Animação:** chevron gira até 180° em 140 ms; resposta aparece com opacidade em 140 ms. Altura muda imediatamente para evitar animar layout por frame. Conteúdo fechado não pode receber foco. Sem busca ou componentes complexos para cinco perguntas.

### 2.8 Footer CTA e formulário comercial

**Objetivo de venda:** encerrar com dois próximos passos claros e manter a confiança até a transição para o WhatsApp.

**Headline:** “Seu próximo passo começa com um horário.”

**Layout:** dois painéis equivalentes: “Encontre seu próximo atendimento” / “Encontrar barbearias”; “Conheça uma rotina mais organizada” / “Solicitar demonstração”. O segundo leva ao formulário inline `#demonstracao`. Evitar modal nesta versão para facilitar teclado, retorno do WhatsApp e fonte ampliada. Footer com contato configurado, termos e privacidade reais.

**Campos propostos:** nome (obrigatório, 2–80 caracteres), nome da barbearia (obrigatório, 2–100), cidade/UF (obrigatório, até 100), quantidade de profissionais (seletor obrigatório: 1, 2–5, 6–10, 11 ou mais), principal necessidade (opcional, até 240). Configuração escolhida é opcional e visível quando houver origem no pricing. Sem CPF, senha ou telefone redundante. Limites de texto são regras de formulário propostas, não limites de assinatura.

**Botão:** “Continuar no WhatsApp”. Apoio: “Vamos abrir uma mensagem com os dados que você preencheu. Você poderá revisar e enviar no WhatsApp.”

```text
Olá! Quero conhecer o Smart Barber e solicitar uma demonstração.

Nome: {nome}
Barbearia: {barbearia}
Cidade/UF: {cidade}
Profissionais: {faixa}
Principal necessidade: {necessidade, se informada}
Configuração de interesse: {configuracao, se selecionada}
```

**Contrato técnico:** validar campos, normalizar quebras e espaços, construir a mensagem em função pura e aplicar `encodeURIComponent` uma única vez à mensagem inteira. Abrir `https://wa.me/{numeroComercialInternacional}?text={mensagemCodificada}` por ação direta do usuário, sem encurtadores. Número comercial configurável, em formato internacional apenas com dígitos e validado antes do lançamento. Este é o mecanismo de [clique para conversa documentado pelo WhatsApp](https://faq.whatsapp.com/5913398998672934/?locale=pt_BR).

**Estados:** validação local com erro junto ao campo e foco no primeiro erro; mensagem pronta; tentativa de abrir conversa; retorno com dados preservados enquanto a página continuar montada. Sem toast “enviado”, “recebido” ou “demonstração agendada”. Não há confirmação de entrega pelo link. Oferecer “Abrir conversa novamente” e “Copiar mensagem”, com fallback manual se a área de transferência falhar. No mobile, preferir navegação direta; se houver nova aba no desktop, informar a abertura e usar proteção de opener. Sem esperas assíncronas antes da navegação que acionem bloqueadores de popup.

Dados ficam em memória da página por padrão; sem persistência automática, endpoint de leads, inclusão em analytics ou log da URL montada. A navegação externa carrega os dados na URL codificada: limitar o formulário a informação comercial necessária, informar a transferência e oferecer edição antes de continuar. Confirmação de contato recebido só por evidência do atendimento, fora do clique.

**Animação:** formulário sempre utilizável sem animação. Ao chegar por CTA, rolar respeitando movimento reduzido e margem do header. Foco visível no título/campo; nenhuma animação de erro por tremor. Estados visuais em 140 ms.

### Diretrizes de arquitetura e implementação futura

**Preservar a stack:** Expo 57, React Native, React Native Web e Expo Router. Sem migração para Next.js, Tailwind ou outro design system. A camada web pode usar DOM semântico e CSS encapsulados em arquivos `.web.tsx` fora da árvore de rotas, com equivalentes universais para resolver importações nativas. A documentação oficial descreve [módulos por plataforma](https://docs.expo.dev/router/advanced/platform-specific-modules/). Qualquer biblioteca de movimento deve ficar isolada do bundle nativo.

**Organização proposta:** `src/features/landing/ui` para seções e composição; `model` para schema e estado do formulário; `lib` para montagem da mensagem, configuração de destino e medição; `content` para copy e propostas comerciais. Reutilizar `shared/theme` e `shared/brand`. Contratos de descoberta pertencem a uma feature própria; não acoplar busca à apresentação da landing.

**Rota pública:** desenvolver e revisar em `/(public)/inicio` com URL `/inicio`. Para o lançamento web em `/`, planejar entrada web específica e ajuste explícito do guard; não criar duas rotas que resolvam para a mesma URL. Preservar entrada nativa, destinos por papel e retorno de agendamento. Pessoas autenticadas também podem acessar a landing; o link “Minha área” pode contextualizar a sessão sem redirecionamento automático da página de marketing.

**Bloqueio encontrado:** o guard atual retorna cedo para `(public)` no efeito de redirecionamento, mas ainda renderiza bootstrap ou recuperação de sessão antes de `<Slot />`. O acesso público precisa ficar fora desses bloqueios e do carregamento obrigatório de fontes; a tipografia deve ter fallback. Uma falha de sessão não pode impedir a leitura da landing ou abrir o WhatsApp. Ajustar isso exige coordenação com as alterações locais de Auth já existentes, sem sobrescrevê-las.

**SEO e entrega:** `app.json` já configura `web.output: static`. Validar HTML exportado com título, descrição, H1, texto e links da landing presentes antes da hidratação; não basta o arquivo existir se ele contém só bootstrap. Meta e canonical devem usar o domínio real configurado. Compartilhamento com imagem própria; sem notas, avaliações ou preços fictícios em dados estruturados. A configuração atual da Vercel reescreve rotas para `/index.html`: verificar em preview a entrega do HTML correto para cada URL pública e rotas profundas, ajustando a configuração apenas na implementação. Não copiar APIs da documentação do SDK 58 para o projeto 57 sem checar compatibilidade.

**Motion:** CSS para feedback simples; Motion for React apenas se necessário para a demonstração vinculada ao scroll. Planejar uma única dependência e importação `motion/react`, ainda ausente em `package.json`. Centralizar durações adaptadas dos tokens atuais: 140, 220 e 300 ms; distância de 8–12 px; stagger de 60 ms. Utilizar `once: true` em reveals; `AnimatePresence` com chave estável e saída para trocas condicionais. APIs de [scroll](https://motion.dev/docs/react-use-scroll) e [movimento reduzido](https://motion.dev/docs/react-use-reduced-motion) orientam a proposta, sem copiar diretamente exemplos para componentes nativos.

Sem loops decorativos, números animados ou animação por caractere. Animações opcionais fora da viewport devem parar; cancelar listeners e sequências no unmount. Conteúdo não pode iniciar oculto no HTML para aguardar JavaScript. Movimento reduzido elimina sticky narrativo, deslocamentos e escalas; mantém seleção por botões e conteúdo estático. Acesso por teclado não depende da posição do scroll.

### Etapa posterior — busca e descoberta

**Escopo proposto:** URL pública `/explorar`, busca manual por cidade e nome da barbearia, filtros de serviço apenas quando houver dados, resultados em lista e acesso ao catálogo existente por `shopId`. A primeira versão não precisa de mapa ou permissão de localização.

**Dependência de dados:** inventariar o backend em atividade separada antes da implementação da busca. Não inventar endpoint. Negociar contrato para identidade pública, nome, cidade/endereço publicável, imagem quando existente, serviços, paginação e ordenação. Preços e disponibilidade só são apresentados se retornados por fonte válida; não inferir horário livre de horário de funcionamento.

**Estados obrigatórios:** busca inicial, carregamento, resultados, nenhum resultado, erro com tentar novamente, paginação e barbearia indisponível. Preservar filtros ao voltar do catálogo. Não mostrar distâncias, rankings, estrelas, “aberto agora” ou avaliações verificadas sem fonte e regra correspondentes. Disponibilidade e conflito de reserva continuam autoritativos no servidor; mensagens de erro não podem mascarar uma reserva incerta.

**Autenticação:** explorar e consultar catálogo permanecem públicos; identificar o usuário no ponto exigido pelo fluxo de reserva e preservar seleção/retorno permitido. Testar sessão expirada, troca de conta, retorno ao fluxo e conflito de horário.

**Gate de lançamento:** os CTAs “Encontrar barbearias” só podem ir ao ar quando a descoberta e o caminho até o catálogo estiverem validados. A landing pode ser revisada antes em preview; não publicar promessa de busca com destino vazio, mock sem identificação ou login no lugar da descoberta.

### Conversão, emoção e evidência

**PAS:** Hero reconhece a intenção; prova reduz incerteza; contraste dá nome ao problema e mostra suas consequências cotidianas; Bento e demonstração apresentam a solução; planos/FAQ reduzem risco de decisão; CTA final permite agir. Agitação curta, sem urgência artificial.

**Arco do cliente:** dúvida → reconhecimento → clareza de escolha → confiança para agendar. **Arco do dono:** sobrecarga/ceticismo → reconhecimento da rotina → compreensão do fluxo → confiança para conversar. O pico é a demonstração conectada; a saída exige segurança no próximo passo, não euforia.

**Medição proposta:** `landing_cta_click` com público e posição; `demo_form_start`; `demo_form_valid`; `whatsapp_handoff_click`; `discovery_search`; `catalog_open`; `booking_confirmed` somente com confirmação real da reserva. Nomes de campos permitidos em analytics são categóricos; nunca nome, barbearia, cidade digitada, necessidade, telefone, mensagem ou URL do WhatsApp.

Medir separadamente clique para descoberta e abertura de catálogo; formulário válido e clique para WhatsApp; confirmação real da reserva quando houver instrumentação confiável. Clique para WhatsApp não é lead recebido. Não fixar meta de crescimento percentual sem baseline; comparar os dois percursos separadamente após haver amostra suficiente.

### Execução futura e critérios de aceite

O trabalho solicitado aqui é o plano. A sequência abaixo serve de handoff; não representa implementação concluída.

| Ordem | Entrega | Dependência | Verificação |
|---|---|---|---|
| 1 | Revisar abordagem A, copy e imagens; configurar contato comercial e matriz de alegações. | Este documento. | Dois públicos identificam sua ação; claims têm fonte. |
| 2 | Definir entrada pública e isolamento de web. | Coordenação com Auth em andamento. | Acesso público com sessão ausente, lenta e em erro; destinos nativos preservados. |
| 3 | Construir seções estáticas com tokens e HTML semântico. | 1–2. | Claro/escuro, teclado, fonte ampliada e HTML exportado. |
| 4 | Construir formulário e montagem da mensagem. | Número comercial validado. | Acentos, `&`, `+`, quebras de linha, opcionais e limite; abrir conversa sem enviar automaticamente. |
| 5 | Acrescentar microinterações e scrollytelling progressivo. | Conteúdo estático acessível. | Movimento reduzido, passos clicáveis e ausência de saltos de layout. |
| 6 | Levantar contrato real da descoberta e implementar etapa posterior. | Backend/dados públicos disponíveis; mudanças de backend fora deste escopo. | Busca real, estados vazios/erro, paginação e retorno ao catálogo. |
| 7 | Instrumentar somente eventos necessários. | Percursos definidos. | Nenhum dado preenchido ou URL montada em logs/analytics. |
| 8 | Homologar acessibilidade, regressões, desempenho e entrega em preview. | 1–7. | Evidências abaixo; publicação é uma ação separada. |

**Verificação final planejada:**

- Executar `npm run typecheck`, `npm test` e `npm run build` na implementação; não existe script de lint declarado. Acrescentar testes significativos para schema/mensagem, acesso público em estados de sessão e preservação do retorno de reserva. Não criar testes que apenas repitam textos da copy.
- Conferir 320/390/430/768/1024/1440 px, temas claro e escuro, zoom/fonte ampliada, navegação completa por teclado e leitura do formulário. Contraste medido sobre o fundo composto: texto comum 4,5:1, texto grande e estados necessários 3:1.
- Metas propostas: LCP até 2,5 s, INP até 200 ms e CLS até 0,1 no percentil 75 quando houver dados de campo. Antes disso, registrar laboratório com ambiente e condições; não chamar Lighthouse local de prova de campo. Dimensionar imagens, carregar capturas inferiores sob demanda e evitar baixar sequências de vídeo no Hero.
- Testar WhatsApp em Android e iOS reais, desktop com WhatsApp Web, retorno à página e cenário sem sessão no WhatsApp. Usar dados fictícios e revisar a mensagem; não enviar mensagens de teste ao contato comercial sem autorização específica.
- Verificar acesso direto a `/`, `/inicio`, `/explorar` e catálogo em preview, sessão lenta/em erro e manutenção da entrada nativa. Não considerar entrega estática/SEO aprovada só por testes de componentes.
- Separar evidência estática, testes locais, integração real e produção. Tráfego e SLA de atendimento comercial ainda não foram dimensionados; a arquitetura estática proposta reduz dependências da leitura da landing, sem prometer capacidade ou disponibilidade medidas.

**Pendências de configuração/publicação:** número comercial; horário e responsável pelo atendimento; domínio/canonical; termos e privacidade publicados; imagens autorizadas; matriz comercial; contrato de descoberta; validação real do agendamento. Essas pendências não impedem revisar o desenho, mas impedem declarar os percursos correspondentes prontos para lançamento.

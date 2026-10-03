# Smart Barber — Guia Oficial de Design System, UI/UX e Identidade Visual

**Sistema visual:** The Obsidian Atelier 2.0
**Versão do documento:** 2.1
**Revisão do contrato visual:** 02/10/2026
**Status:** Contrato visual vigente; correções de implantação acompanhadas no plano de espaçamentos e controles
**Escopo:** Android, iOS, Web autenticada e futura camada pública
**Princípio de plataforma:** Mobile-first, adaptive by default
**Arquitetura frontend relacionada:** Feature-First + Vertical Slice + FSD-lite + MVVM-lite + Ports/Adapters

**Entrada resumida:** [DESIGN.md](DESIGN.md). A seção 52 consolida o acabamento de vidro, os controles e o contrato de camadas/spacing vigente. Ela prevalece quando exemplos antigos deste guia divergirem. A identidade Obsidian Atelier 2.0 permanece; a revisão 2.1 não significa que todas as correções já estejam implementadas.

---

# 1. Finalidade

Este documento é a fonte oficial de verdade para o design visual, comportamento de interface, experiência, linguagem de marca e evolução do Design System do Smart Barber.

Deve orientar designers, desenvolvedores, agentes de IA, revisores e QA na criação de novas telas e componentes.

O objetivo é garantir que o produto permaneça:

- reconhecível;
- premium;
- moderno;
- confiável;
- acessível;
- consistente;
- escalável;
- adequado ao contexto multi-tenant;
- coerente em Android, iOS e Web.

---

# 2. Creative North Star

## 2.1 The Obsidian Atelier

O conceito oficial é:

> **The Obsidian Atelier — Inteligência, Luxo, Precisão e Fricção com Propósito.**

A linguagem visual combina:

- barbearia contemporânea;
- tradição barber;
- atelier premium;
- materiais nobres;
- aço;
- couro;
- pedra;
- obsidiana;
- fotografia de alta qualidade;
- tecnologia discreta;
- precisão operacional.

A interface não deve parecer:

- um ERP genérico;
- um template SaaS sem personalidade;
- um aplicativo gamer;
- uma experiência cyberpunk;
- uma interface excessivamente neon;
- uma barbearia presa a clichês visuais.

---

# 3. Pilares da marca

A identidade deve equilibrar:

```text
BARBER
+
PREMIUM
+
SMART
+
HUB
+
CONFIANÇA
```

## 3.1 Barber

A essência barber deve ser percebida por:

- diagonais inspiradas discretamente no barber pole;
- geometria de precisão;
- materiais escuros e metálicos;
- fotografia de cortes, ambientes e profissionais;
- detalhes de aço, couro, madeira e vidro.

Evitar depender sempre de:

- tesoura;
- bigode;
- barba;
- navalha literal;
- barber pole literal.

## 3.2 Premium

Premium significa:

- redução;
- silêncio visual;
- boa composição;
- excelente tipografia;
- fotografia;
- consistência;
- espaço;
- acabamento.

Princípio:

> **Premium by Restraint — premium por redução.**

## 3.3 Smart

“Smart” deve aparecer principalmente na experiência:

- menos etapas;
- melhores defaults;
- status claros;
- disponibilidade em tempo real;
- feedback imediato;
- contexto preservado;
- automação útil;
- personalização progressiva.

Evitar tornar a marca “tecnológica” por excesso de:

- circuitos;
- robôs;
- chips;
- neon;
- símbolos de IA.

## 3.4 Hub

O Smart Barber é um marketplace multi-tenant. O design deve permitir descoberta, comparação e conexão entre múltiplas barbearias e profissionais.

## 3.5 Confiança

O usuário precisa compreender rapidamente:

- se o horário está realmente disponível;
- quanto custa;
- quem realizará o serviço;
- se a reserva foi confirmada;
- qual é a política;
- qual é o estado do pagamento;
- quais avaliações são relevantes.

---

# 4. Princípios UX oficiais

## 4.1 Premium by Restraint

Usar menos elementos com maior qualidade visual.

## 4.2 Content First

Fotografia, serviços, horários, preços, profissionais, avaliações e métricas são protagonistas.

## 4.3 Friction with Purpose

> **Fricção mínima para avançar. Fricção intencional para proteger.**

Baixa fricção:

- pesquisar;
- escolher horário;
- consultar serviço;
- favoritar;
- visualizar perfil.

Fricção intencional:

- excluir;
- cancelar reserva paga;
- remover profissional;
- alterar configuração financeira;
- ações administrativas irreversíveis.

## 4.4 Progressive Disclosure

Exibir primeiro o necessário e revelar complexidade progressivamente.

## 4.5 Recognition over Recall

O usuário deve reconhecer estados, opções, contexto e histórico sem depender de memória.

## 4.6 Error Prevention

Prevenir erros por validação, confirmação, disabled/loading, resumos e guardrails.

## 4.7 Visibility of System Status

Toda operação importante deve deixar claro se está:

- carregando;
- salva;
- aguardando;
- concluída;
- cancelada;
- falhou;
- expirou.

---

# 5. Personalidade e tom

A marca deve ser:

- confiante;
- moderna;
- humana;
- direta;
- elegante;
- precisa;
- premium;
- acessível.

Evitar:

- tecnicês;
- elitismo;
- gírias forçadas;
- mensagens robóticas;
- copy excessivamente publicitária.

---

# 6. Estratégia de tema

O Smart Barber é:

> **Dark-first, não Dark-only.**

Deve possuir:

```text
Dark Mode
+
Light Mode
```

O sistema pode seguir a preferência do dispositivo por padrão.

O Light Mode deve preservar a personalidade da marca e não ser apenas uma inversão cromática.

---

# 7. Arquitetura dos Design Tokens

Usar três níveis.

## 7.1 Primitive Tokens

Valores absolutos.

```text
color.crimson.600
space.4
radius.lg
```

## 7.2 Semantic Tokens

Significado.

```text
background.canvas
foreground.primary
action.primary
status.error
```

## 7.3 Component Tokens

Aplicação.

```text
button.primary.background.default
input.background.focused
card.background.default
```

Fluxo:

```text
PRIMITIVE
    ↓
SEMANTIC
    ↓
COMPONENT
```

Features não devem espalhar hexadecimais diretamente.

---

# 8. Paleta de marca

## Crimson Primary

```text
#BD2026
```

Uso:

- CTA principal;
- ação selecionada;
- branding;
- FAB;
- tabs ativas;
- destaques de conversão.

## Crimson Pressed

```text
#D1242B
```

Uso:

- pressed;
- selected emphasis.

## Crimson Glow

```text
rgba(189, 32, 38, 0.18–0.28)
```

Regra:

> Glow é recompensa visual, não decoração permanente.

Usar apenas em focus, CTA hero ou microinterações importantes.

---

# 9. Paleta Dark — Obsidian

## Canvas

```text
#0B0B0B
```

`#000000` fica reservado a momentos deliberadamente imersivos, mídia e backdrops.

## Surface 1

```text
#131313
```

## Surface 2

```text
#1F1F1F
```

## Surface 3

```text
#242424
```

## Interactive Highlight

```text
#303030
```

---

# 10. Paleta Light — Ivory Atelier

O Light Mode deve remeter a pedra clara, papel premium e atelier sofisticado.

## Canvas

```text
#F7F5F3
```

## Surface

```text
#FFFFFF
```

## Elevated

```text
#F0ECE9
```

## Primary Text

```text
#171313
```

## Secondary Text

```text
#5E5757
```

## Primary Action

```text
#BD2026
```

---

# 11. Cores funcionais

## Success

```text
#10B981
```

## Warning

```text
#F59E0B
```

## Error

Separar semanticamente o erro da cor principal da marca.

```text
#FF5C62
```

## Destructive

```text
#DC2626
```

Regra:

```text
Brand Crimson != Error != Destructive
```

---

# 12. Cores de texto

## Dark

```text
text.primary   = #FFFFFF
text.body      = #E2E2E2
text.secondary = #B8C8DA
```

O antigo `#708090` não deve ser usado como texto pequeno em superfícies elevadas sem validação de contraste.

Pode ser utilizado em:

- ícones secundários;
- disabled;
- decoração.

---

# 13. Tipografia

Famílias oficiais:

## Epilogue

- display;
- H1;
- H2;
- preços;
- métricas;
- CTAs relevantes.

## Inter

- body;
- inputs;
- menus;
- labels;
- metadata;
- badges;
- tabelas;
- navegação.

---

# 14. Escala tipográfica

| Token | Fonte | Peso | Tamanho base | Uso |
|---|---|---:|---:|---|
| Display | Epilogue | 800 | 30 | hero/métricas |
| H1 | Epilogue | 700 | 22 | tela |
| H2 | Epilogue | 700 | 20 | seção |
| Subhead | Epilogue | 700 | 18 | valor/serviço |
| Button | Epilogue | 700 | 16 | CTA |
| Body | Inter | 500 | 16 | corpo/input |
| BodySm | Inter | 500 | 14 | apoio |
| Caption | Inter | 500 | 13–14 | metadata |
| Badge | Inter | 600 | 11–12 | status |
| Tab | Inter | 600 | 12 | navegação |

## Regras

- não utilizar 10px como padrão funcional;
- input permanece 16px;
- layouts devem tolerar font scaling;
- uppercase não é obrigatório em CTAs.

Preferir:

```text
Agendar horário
Criar conta
Continuar
Confirmar agendamento
```

Uppercase pode permanecer em badges:

```text
OWNER
BARBER
VIP
CONFIRMADO
```

---

# 15. Spacing System

Base 4:

```text
space.1  = 4
space.2  = 8
space.3  = 12
space.4  = 16
space.5  = 20
space.6  = 24
space.8  = 32
space.10 = 40
space.12 = 48
space.16 = 64
```

Mobile:

```text
page padding   = 16–20
card padding interno = 16–24
section gap    = 24–32
major section  = 40–48
```

Em superfícies de vidro, o padding pertence à camada de conteúdo (`contentStyle`); margens/largura/flex pertencem ao wrapper (`style`). Nunca criar espaço ao redor do material como substituto do inset interno. Detalhes e exemplo na seção 52.2.

---

# 16. Shape System

```text
radius.sm   = 8
radius.md   = 12
radius.lg   = 16
radius.xl   = 20
radius.full = 9999
```

Aplicação:

```text
inputs estáveis         = 12–16
botões em pilha         = 16–22
botões isolados/em linha= cápsula quando adequado
cards de vidro          = 24–26
modais de vidro         = 26–28
sidebar de vidro        = 28–32
badges                  = full
```

Os tokens globais `sm/md/lg/xl/full` acima são os valores legados ainda presentes no código. Raios de materiais/controles devem ser definidos por tokens de componente, sem redefinir `radius.lg` para alterar todo o produto. O raio da face de vidro não deve ser acompanhado de uma segunda borda arredondada no wrapper.

---

# 17. Profundidade visual

A antiga “No-Line Rule” passa a ser:

> **Tonal Depth First — profundidade tonal antes de contorno.**

Prioridade:

```text
1. diferença de superfície
2. spacing
3. elevação
4. border funcional
```

Borders são permitidas para:

- focus;
- selected;
- erro;
- high contrast;
- inputs;
- tabelas;
- affordance.

Cards usam uma única face de material. Intervalos, grupos e divisores internos são planos/transparentes, sem outro card ou blur. Fundo de input e estados de controles continuam estáveis para leitura. No tema claro, separar borda neutra de definição e reflexo branco; ver seção 52.

---

# 18. Iconografia

Adotar linguagem visual consistente.

```text
icon.sm = 16
icon.md = 20
icon.lg = 24
icon.xl = 28–32
```

Regras:

- stroke consistente;
- uma biblioteca principal;
- evitar misturar estilos;
- ícones desconhecidos devem possuir labels;
- ícones não substituem texto em ações críticas.

---

# 19. Photography System

Fotografia é parte central da experiência e da marca.

## Aspect ratios

```text
Barbershop Cover = 16:9
Lookbook         = 4:5
Staff            = 1:1
Service          = 4:3
```

## Direção

Priorizar:

- ambientes reais;
- pele natural;
- textura de cabelo;
- boa iluminação;
- aço;
- madeira;
- couro;
- vidro;
- detalhes do acabamento.

Evitar:

- stock genérico;
- filtros pesados;
- saturação exagerada.

Toda imagem deve prever:

- loading;
- placeholder;
- fallback;
- crop;
- aspect ratio;
- overlay quando houver texto.

---

# 20. Marketplace Discovery

Cards precisam responder:

```text
É boa?
É perto?
Quanto custa?
Tem horário?
Posso confiar?
```

Priorizar:

- fotografia;
- nome;
- rating;
- review count;
- distância;
- preço inicial;
- próxima disponibilidade;
- CTA.

Exemplo conceitual:

```text
[FOTO]

Barbearia Brendo Kaique
★ 4,9 · 328 avaliações
1,2 km

Corte a partir de R$ 45
Próximo horário 17:30

[ Ver horários ]
```

---

# 21. Trust Patterns

O Design System deve possuir componentes para comunicar:

```text
Reserva confirmada
Profissional verificado
Pagamento protegido
Preço transparente
Política de cancelamento
Horário confirmado
```

Não exagerar no número de selos simultâneos.

Avaliação deve trazer contexto:

```text
★ 4,9 · 328 avaliações verificadas
```

e não apenas estrelas isoladas.

---

# 22. Adaptive Layout

O produto deve ser adaptativo, não apenas responsivo.

## Compact

```text
< 600px
```

- bottom navigation flutuante;
- drawer lateral esquerdo acessível por botão de menu visível;
- single pane;
- mobile.

## Medium

```text
600–839px
```

- manter bottom navigation + drawer quando a largura útil for insuficiente;
- navigation rail apenas quando comportar rótulos e conteúdo sem compressão;
- tablet;
- 1–2 panes.

## Expanded

```text
>= 840px
```

- sidebar;
- multi-pane;
- list + detail;
- painel de navegação arredondado e recuado;
- dashboard com hierarquia e espaço confortável, sem acrescentar informação para preencher largura.

Bottom navigation não é regra universal para todas as plataformas.

---

# 23. Ergonomia Mobile

Touch target mínimo:

```text
44 × 44
```

Botões principais:

```text
52–56px
```

Principais ações devem ficar em zonas confortáveis de alcance quando isso não prejudicar a hierarquia.

---

# 24. Component States

Todo componente interativo deve especificar, quando aplicável:

```text
default
hover
pressed
focus-visible
selected
loading
disabled
error
success
```

Na Web:

- focus deve ser visível;
- tab order deve ser coerente;
- Enter deve funcionar quando apropriado.

---

# 25. Motion System

Tokens:

```text
motion.fast     = 120–160ms
motion.standard = 180–240ms
motion.slow     = 280–320ms
```

Exemplos:

```text
button press    = 120ms
input focus     = 160ms
bottom sheet    = 240ms
page transition = 280ms
```

Motion deve:

- comunicar continuidade;
- reforçar hierarquia;
- confirmar ação.

Não deve atrasar tarefas.

Respeitar reduced motion.

---

# 26. Haptics

Uso moderado:

```text
selection → light
success   → confirmação
warning   → ação crítica
```

Não usar haptic em toda interação.

---

# 27. Formulários

Estrutura:

```text
Label

Input

Helper ou Error
```

Placeholder não substitui label.

Validação deve ser contextual.

Exemplo:

```text
E-mail
[teste@]

Informe um e-mail válido.
```

Não depender apenas de vermelho para erro.

Botões de submit:

```text
loading
+
disabled
```

---

# 28. Content Design

Tom:

```text
confiante
direto
moderno
humano
premium
```

Evitar termos técnicos na UI.

Ruim:

```text
Unauthorized
Booking Hold created
Mutation failed
```

Bom:

```text
Sua sessão expirou. Entre novamente.
Seu horário está reservado por 5 minutos.
Não foi possível concluir agora. Tente novamente.
```

---

# 29. B2C — Smart Barber Customer

A experiência deve ser:

- visual;
- espaçosa;
- emocional;
- orientada à descoberta;
- rápida;
- centrada em fotos.

Prioridades:

```text
Discovery
Lookbook
Serviços
Profissionais
Horários
Reviews
Booking
Checkout
```

---

# 30. B2B — Smart Barber Pro

A experiência deve ser:

- mais densa;
- operacional;
- precisa;
- escaneável;
- orientada a decisão.

Prioridades:

```text
Agenda
Receita
Ocupação
Clientes
Equipe
Serviços
Status
Ações rápidas
```

A marca é a mesma. A densidade é diferente.

---

# 31. Dashboard de Poder

“Dashboard de Poder” significa controle imediato da operação, não excesso de widgets.

Priorizar:

```text
Hoje
Agenda
Ocupação
Receita
Próximos atendimentos
Ações críticas
```

Analytics detalhado deve ser progressivo.

---

# 32. Agenda e Status

Agenda deve mostrar claramente:

- horário;
- cliente;
- serviço;
- profissional;
- status;
- pagamento;
- check-in;
- conflito.

Status possíveis:

```text
AGUARDANDO
CONFIRMADO
EM ATENDIMENTO
CONCLUÍDO
CANCELADO
NO-SHOW
```

Não usar apenas cor para diferenciar estados.

---

# 33. Feedback States

## Loading

Preferir skeleton em páginas de conteúdo.

Na abertura, distinguir três etapas: splash nativa estática (iOS/Android), primeira pintura do documento web e bootstrap React (fontes, sessão e contexto). A transição entre elas deve preservar cor e posição da marca, evitar tela vazia e explicar uma espera perceptível com texto curto. Falha na restauração da sessão precisa oferecer recuperação visível; não manter carregamento infinito nem tratar erro temporário de rede como credencial inválida.

## Empty

Explicar:

```text
o que aconteceu
+
o que fazer
```

Exemplo:

```text
Nenhum horário disponível hoje.

Tente outro dia ou escolha outro profissional.
```

## Error

Sempre que possível, oferecer recuperação.

```text
Não foi possível carregar sua agenda.

[Tentar novamente]
```

---

# 34. Accessibility

Baseline:

```text
WCAG 2.2 AA
```

Fluxos críticos devem considerar:

- contraste;
- leitor de tela;
- teclado;
- foco;
- font scaling;
- touch targets;
- reduced motion.

Objetivos de contraste:

```text
texto normal      >= 4.5:1
texto grande      >= 3:1
UI funcional      >= 3:1
```

Cor nunca deve ser o único indicador de estado.

---

# 35. Safe Area e Keyboard

Native deve considerar:

- notch;
- Dynamic Island;
- home indicator;
- gesture navigation;
- teclado virtual.

Formulários precisam evitar sobreposição pelo teclado e permitir rolagem adequada.

A região inferior reservada para navbar/CTA é transparente. Calcular pela altura medida da cápsula, distância inferior e safe area; contar cada inset uma vez. Último item e CTA precisam ficar acessíveis no fim da rolagem, sem faixas opacas usadas para esconder a sobreposição. Ver seção 52.6.

---

# 36. Design QA

Toda tela deve ser revisada em:

```text
Dark
Light
Mobile pequeno
Mobile grande
Tablet
Web
Font scaling
Keyboard
Loading
Error
Empty
Focus
```

Todo componente interativo deve ter seus estados revisados.

---

# 37. Design Governance

`shared/ui` deve conter apenas componentes verdadeiramente compartilháveis.

Exemplos:

```text
Button
Input
Badge
Modal
Typography
Spinner
```

Componentes de negócio permanecem em suas features.

Exemplo:

```text
features/booking/ui/BookingCard
```

Regra:

```text
features -> shared/ui
```

Nunca:

```text
shared/ui -> features
```

---

# 38. Estrutura recomendada no código

```text
shared/theme/
├── primitives/
├── semantic/
├── components/
├── typography/
├── spacing/
├── radius/
├── motion/
└── breakpoints/
```

O Design System deve ser agnóstico a regras de negócio.

---

# 39. Universal-first

Compartilhar por padrão:

- tokens;
- design language;
- componentes base;
- lógica comum.

Especializar quando necessário:

```text
*.web.tsx
*.native.tsx
```

Web deve considerar:

- hover;
- mouse;
- teclado;
- multi-pane;
- densidade.

Native deve considerar:

- touch;
- safe area;
- haptics;
- gestures;
- keyboard.

---

# 40. Futura identidade visual

Os assets oficiais já existem em `assets/images/logos` e são consumidos por `BrandMark`/`src/shared/brand`. Os conceitos desta seção e da seguinte são histórico de direção criativa; não autorizam redesenhar ou substituir a logo a cada tarefa. Usar símbolo Ivory no escuro e Obsidian no claro, conforme variantes registradas.

A futura marca deve ser um sistema, não uma única logo.

Prever:

1. Master Symbol
2. Wordmark
3. App Icon
4. Institutional Seal
5. Monochrome
6. Dark Variant
7. Light Variant

---

# 41. Briefing da futura logo

Conceitos obrigatórios:

```text
BARBER
+
SMART
+
HUB
+
PREMIUM
```

Direções possíveis:

- monograma `SB`;
- diagonal inspirada discretamente no barber pole;
- uso de negative space;
- geometria precisa;
- conexão/hub sutil.

Evitar como símbolo principal:

```text
tesoura
+ bigode
+ barba
+ navalha
+ barber pole
+ nós
+ tagline
```

ao mesmo tempo.

Esse nível de detalhe pode existir em selo institucional, não no app icon.

Princípio:

> **Premium por redução, não por ornamentação.**

---

# 42. App Icon

Precisa funcionar em:

```text
16px
32px
64px
app icon
favicon
avatar
splash
```

Se os detalhes desaparecem em tamanho pequeno, o símbolo é complexo demais.

---

# 43. Separação entre Design e Tecnologia

Este arquivo não deve se tornar dependente de versões de framework.

Detalhes como:

```text
Expo Router x
React x
ORM x
```

devem permanecer nos documentos de arquitetura e contratos.

Este documento deve apenas referenciar:

> **Consultar a arquitetura oficial do frontend do Smart Barber.**

---

# 44. Checklist — Auth

## Abertura e restauração de sessão

- [ ] splash nativa coerente com tema claro/escuro e primeiro frame React;
- [ ] primeira pintura web com fundo e metadados coerentes com o tema;
- [ ] marca com tamanho e posição próximos entre splash e bootstrap;
- [ ] mensagem de etapa real, sem percentagem inventada;
- [ ] erro temporário de sessão com opção de tentar novamente;
- [ ] usuário sem sessão chega ao login sem espera artificial;
- [ ] validação em build nativa de release e Safari real, além do ambiente de desenvolvimento.

## Login

- [ ] identidade Obsidian;
- [ ] Epilogue nos títulos;
- [ ] Inter em inputs;
- [ ] CTA Crimson;
- [ ] Light/Dark;
- [ ] focus;
- [ ] error;
- [ ] loading;
- [ ] mobile;
- [ ] web;
- [ ] acessibilidade.
- [ ] rótulo do botão permanece visível durante o envio;
- [ ] erro de autenticação é claro e recuperável;
- [ ] labels de e-mail e senha ligados aos campos na web;
- [ ] ícones e marca verificados no Safari;
- [ ] nenhum link de recuperação de senha sem fluxo funcional.

## Cadastro

- [ ] hierarquia clara;
- [ ] labels persistentes;
- [ ] progressive disclosure quando necessário;
- [ ] erro inline;
- [ ] password affordance;
- [ ] CTA claro;
- [ ] Light/Dark.

---

# 45. Checklist — Marketplace

- [ ] foto;
- [ ] nome;
- [ ] rating;
- [ ] número de avaliações;
- [ ] distância;
- [ ] preço inicial;
- [ ] disponibilidade;
- [ ] CTA;
- [ ] trust signal.

---

# 46. Checklist — Agenda

- [ ] horário;
- [ ] cliente;
- [ ] profissional;
- [ ] serviço;
- [ ] status;
- [ ] pagamento;
- [ ] conflito;
- [ ] ação.

---

# 47. Critérios de aprovação de nova tela

Uma tela só é aprovada quando:

- [ ] usa tokens;
- [ ] possui Light/Dark;
- [ ] segue tipografia oficial;
- [ ] segue spacing;
- [ ] funciona em mobile;
- [ ] possui estratégia web;
- [ ] possui loading;
- [ ] possui error;
- [ ] possui empty quando aplicável;
- [ ] respeita acessibilidade;
- [ ] não usa apenas cor para comunicar estado;
- [ ] não duplica componente compartilhado sem necessidade.
- [ ] consultou as fontes de componentes da seção 51 e registrou reutilização, adaptação ou motivo para criar do zero;
- [ ] verificou licença, dependências, acesso ao código, compatibilidade web/mobile e movimento reduzido para componentes externos.

---

# 48. Fórmula visual

Princípio aproximado:

```text
80% superfícies neutras
15% fotografia/conteúdo
5% Crimson/accent
```

Não é regra matemática, mas serve para controlar excesso de cor de marca.

---

# 49. The Obsidian Atelier 2.0

A direção passa a ser oficialmente sustentada por seis pilares:

```text
1. PREMIUM BY RESTRAINT
2. CONTENT FIRST
3. FRICTION WITH PURPOSE
4. TRUST BY DESIGN
5. ADAPTIVE BY DEFAULT
6. ACCESSIBLE WITHOUT COMPROMISE
```

---

# 50. Resultado esperado

O Smart Barber deve transmitir:

```text
MODERNIDADE
+
BARBEARIA
+
MARKETPLACE
+
PREMIUM
+
PRECISÃO
+
CONFIANÇA
```

Sem parecer:

```text
GAMER
CYBERPUNK
GENÉRICO
TRADICIONAL DEMAIS
EXCESSIVAMENTE ORNAMENTADO
```

A tecnologia deve ser percebida pela qualidade da experiência.

O premium deve ser percebido pela redução.

A confiança deve ser percebida pelo comportamento.

A essência barber deve ser percebida pela linguagem visual.

O resultado final deve ser:

```text
sofisticado
+
rápido
+
humano
+
confiável
+
escalável
+
reconhecível
```

Este documento passa a ser a organização recomendada para o **Design System oficial do Smart Barber — The Obsidian Atelier 2.0**.

---

# 51. Fontes de componentes e procedimento de reutilização

Antes de desenhar ou implementar uma nova interação visual, consultar as fontes abaixo e os componentes já existentes em `src/shared/ui` e nas features. O objetivo é aproveitar soluções prontas quando economizam trabalho **e** mantêm a experiência Obsidian Atelier. A consulta é parte da proposta e da revisão de novas telas; nenhum catálogo substitui este guia, os tokens do projeto ou a validação do fluxo real.

| Fonte | Onde procurar | Uso preferencial no Smart Barber |
| --- | --- | --- |
| [React Bits — catálogo](https://reactbits.dev/) e [Micro](https://reactbits.dev/c/micro) | Microinterações, transições e feedback de estado. | [Status Mark](https://reactbits.dev/c/micro/status-mark) para operação assíncrona e [Rubber Segment](https://reactbits.dev/c/micro/rubber-segment) para filtros; avaliar [Lattice Loader](https://reactbits.dev/c/micro/lattice-loader) somente em espera curta com estado textual, sem cronômetro decorativo. |
| [Spectrum UI — catálogo](https://ui.spectrumhq.in/) e [documentação](https://ui.spectrumhq.in/docs) | Padrões de formulário, carregamento, avisos e painéis operacionais. | [Skeleton Reveal](https://ui.spectrumhq.in/docs/skeleton-reveal), [Text States](https://ui.spectrumhq.in/docs/text-states), [Loading Button](https://ui.spectrumhq.in/docs/loading-button), [Toast Stack](https://ui.spectrumhq.in/docs/toast-stack), [Status Badge](https://ui.spectrumhq.in/docs/status-badge) e [Password Strength](https://ui.spectrumhq.in/docs/password-strength), este último apenas em cadastro/alteração de senha e alinhado às regras reais. |
| [Expo — splash nativa](https://docs.expo.dev/versions/latest/sdk/splash-screen/) e [módulos por plataforma](https://docs.expo.dev/router/advanced/platform-specific-modules/) | Ciclo de abertura iOS/Android e separação web/native. | Configurar splash nativa leve e estática; animar discretamente apenas depois que React estiver pronto, quando houver propósito. |

## 51.1 Processo para cada nova tela ou componente

1. Descrever a tarefa do usuário, o estado que precisa ser comunicado e o componente compartilhado atual que pode atendê-la.
2. Buscar nas fontes por função concreta: carregamento, seleção, progresso, erro, recuperação, confirmação ou navegação. Registrar pelo menos uma opção existente ou explicar por que nenhuma serve.
3. Comparar opções por legibilidade, tokens Obsidian/Crimson, esforço de adaptação, dependências, peso, desempenho, licença, disponibilidade do código e compatibilidade com React Native Web/iOS/Android. Código React DOM, Tailwind ou Motion não deve ser presumido universal.
4. Escolher e registrar uma rota: **reutilizar componente local**, **adaptar padrão no componente universal**, **pilotar componente web com equivalente nativo**, ou **criar componente novo** quando as opções anteriores não resolverem. Evitar duas soluções de toast, spinner ou modal para a mesma função.
5. Especificar estados `loading/success/error/empty/disabled`, toque, foco, teclado, leitor de tela, fonte ampliada, movimento reduzido e comportamento sem animação. Resultado visual de sucesso só após confirmação real da operação.
6. Validar a proposta nos tamanhos compactos e em web/mobile; medir regressões de bundle, salto de layout e fluidez quando houver nova dependência. Registrar a decisão no plano ou na revisão da feature.

## 51.2 Aplicação imediata por área

| Área | Referência útil | Limite de adoção |
| --- | --- | --- |
| Abertura | Splash oficial Expo, Text States, Status Mark; Skeleton Reveal após entrada em conteúdo. | Não prolongar splash para exibir marca; primeira pintura web não depende de componente React. |
| Login | Loading Button, Text States e Alert para estado de envio/erro. | O [Login Card](https://ui.spectrumhq.in/docs/login) inclui fluxos sociais não presentes no produto e exige adaptação ampla; não copiar como tela inteira. |
| Cadastro | Password Strength como padrão de requisitos visíveis. | Regras exibidas precisam corresponder ao backend; não pedir complexidade fictícia. |
| Serviços | Rubber Segment, Status Mark, Status Badge, Skeleton Reveal e Toast Stack. | Resolver dados, layout e falhas de API antes de animar estados. |
| Agenda, disponibilidade e dashboard | Skeleton Reveal, Status Badge e avisos com recuperação. | Métricas e disponibilidade devem ser verdadeiras; manter ações operacionais rápidas. |
| Catálogo público | Skeleton Reveal e feedback discreto de seleção. | Não comunicar reserva concluída quando houve apenas seleção de serviços. |

## 51.3 Restrições de adoção

- Preservar Epilogue, Inter, tokens de cor, contraste e a preferência por movimento reduzido.
- Rejeitar animações contínuas, partículas, 3D, cursores especiais e efeitos pesados nas rotas operacionais e de autenticação.
- Revisar [licença do React Bits](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) antes de copiar código. As páginas do Spectrum UI consultadas exigem login para visualizar código/comando; estimar custo somente após acesso e inspeção da implementação exata.
- Seguir o [relatório de curadoria e prioridades](docs/RELATORIO_UX_COMPONENTES_RESPONSIVIDADE_2026-09-29.md) e o [plano de implementação](docs/PLANO_UX_RESPONSIVIDADE_COMPONENTES_2026-09-29.md); atualizar os documentos quando uma decisão ou dependência mudar.

---

# 52. Contrato visual vigente — vidro, espaçamento e controles

Revisão: 02/10/2026. Este contrato consolida as decisões do dashboard, navegação, PWA, autenticação e cards operacionais. Corrige o tratamento de camadas que gerou molduras extras e conteúdo espremido. Sua publicação não declara essas correções prontas no produto; consultar o plano de execução e suas evidências.

## 52.1 Materiais e composição

- `navigation`: cápsula inferior, toolbar/controle flutuante; material legível acima do conteúdo.
- `sidebar`: painel lateral arredondado, com uma única face de vidro e grupos internos sem blur adicional.
- `card`: vidro fosco para informação operacional, sem efeitos ópticos fortes disputando leitura.
- `form`: material mais denso para login, cadastro e modais/formulários.
- Um card tem uma face de material. Sua estrutura técnica pode ter wrapper de sombra, recorte e conteúdo; essas camadas não devem parecer três cards.
- O wrapper externo não desenha background/border quando a face interna já os desenha. Não colocar borda/raio de card no wrapper e outra borda/raio diferente no material.
- Dentro do card, usar títulos, espaço e divisores suaves. Não usar caixas opacas arredondadas para enquadrar cada intervalo, grupo de informações ou linha da agenda.
- Campos de entrada e affordances de controles podem manter fundo estável. A regra de card único não significa inputs invisíveis, perda de foco ou ausência de estado.
- No web/PWA, é uma adaptação de vidro usando os recursos disponíveis, sem alegar material UIKit nativo. Respeitar fallback e redução de transparência.

## 52.2 Contrato de `style` e `contentStyle`

Em `LiquidGlassView` e wrappers equivalentes:

| Camada | Propriedades |
| --- | --- |
| `style` / wrapper | width, maxWidth, flex, margin, posição, altura estrutural e sombra externa |
| Props do material | variant, borderRadius, borderColor, borderWidth, backgroundColor, intensidade |
| `contentStyle` | padding interno, gap entre filhos, direção/alinhamento e distribuição do conteúdo |

Padrão:

```tsx
<LiquidGlassView
  variant="card"
  style={{ width: '100%' }}
  contentStyle={{ padding: spacing[5], gap: spacing[3] }}
  borderColor={hasError ? colors.border.error : undefined}
>
  {/* conteúdo operacional existente */}
</LiquidGlassView>
```

Não passar `padding`/`gap` em `style` contando que atinjam os filhos: o wrapper contém outra View. Não aplicar o mesmo padding nos dois níveis. Não converter automaticamente todos os estilos sem verificar se o espaçamento é interno, externo ou do próprio controle.

## 52.3 Espaço e organização de informação

- Página compacta: padding horizontal inicial 16–20 px.
- Card compacto: inset interno 16–20 px; formulário/modal longo pode usar 20–24 px conforme largura útil.
- Informações relacionadas: gap 8–12 px; grupos distintos: 12–16 px; cards entre si: 12–16 px.
- Texto, badge e ações não encostam no contorno do material. Nomes/serviços longos usam flex/minWidth e quebra adequados; não reduzir fonte só pelo comprimento da string.
- Área de ações é separada do conteúdo por espaço/divisor, com gap de 8–12 px e altura coerente. Botões não ficam prensados contra a borda inferior.
- Em intervalo de horário, Início/Fim compõem uma linha clara quando couber, com labels e inputs completos. A linha não recebe outra moldura de card. Repetições são separadas por espaço/divisor.
- Container de resumo/vazio/loading segue o mesmo inset e não encolhe de maneira que corte texto.

## 52.4 Botões e switches

Família de botões:

| Papel | Aparência |
| --- | --- |
| Principal | Vidro/tint Crimson mais evidente, foreground branco constante e highlight discreto |
| Secundário | Material neutro fino ou tonal, texto primário, contorno leve; sem competir com a ação principal |
| Destrutivo | Fundo neutro/tint discreto e foreground de erro contrastante; mantém confirmação e loading |
| Ícone / toolbar | Controle arredondado com forma e estado reconhecíveis; foco e pressed explícitos |

Manter ao menos 44 × 44 px de alvo; normalmente 48 px de altura para ações de card. Botões em um grupo têm altura coerente e labels completos. Em linha isolada, cápsula quando adequada; em pilha, retângulo arredondado confortável. O acento Crimson continua permitido no botão principal, com material e borda consistentes. Evitar fazer todas as ações parecerem primárias.

Em botões sobre um card de vidro, usar tonalidade/reflexo leve e estados sem empilhar outro blur caro para cada botão. O estilo deve parecer integrado ao material do card.

**Switches de ativar/desativar usam acento Crimson, não verde/teal.** ON: trilho Crimson e thumb Ivory/branco legível nos dois temas. OFF: trilho neutro e thumb contrastante. O estado continua distinguível por posição, label e semântica. Não alterar value/onChange/RHF/mutation nem converter switch em botão com comportamento diferente.

Verde continua disponível para status semântico de sucesso, confirmação e identificação da marca WhatsApp. Não substituir a paleta inteira de feedback para remover o verde de um controle de ativação.

Labels e ícones de ação preenchida usam o foreground do botão, não `text.inverse` dependente do tema. Preços/links sobre material usam `text.brand`, distinto de `brand.primary` usado como pigmento de preenchimento.

## 52.5 Cabeçalho e seletores de data

- No dashboard mobile, menu e logo continuam visíveis. Saudação ocupa espaço flexível; avatar tem área própria. Data e perfil podem ir para segunda linha quando não couberem confortavelmente.
- Não forçar menu + logo + saudação + badge + avatar numa linha rígida. Usar `flex: 1`, `minWidth: 0`, gaps coerentes e quebra/truncamento acessível quando necessário.
- Não usar scale para comprimir badges/textos no cabeçalho. Manter tamanho tipográfico legível e adicionar altura/padding conforme o conteúdo.
- Cabeçalhos integram o fundo da página; nenhum retângulo preto de ponta a ponta para simular uma toolbar. Material de toolbar pode ter superfície própria, legível e recorte coerente.
- Agenda e Horários compartilham a linguagem de seletor de data: alvo, raio, estado, ícone e densidade. Um campo editável continua editável; um acionador de calendário continua um botão.
- Calendário aberto usa `form` com inset interno correto. Células usam estado de seleção e foco estáveis, sem blur independente em cada dia. Preservar datas limite, min/max, locale e formato existentes.

## 52.6 Footer, safe area e overlays

- A cápsula inferior continua flutuante e o drawer continua disponível no mobile.
- Definir uma única medida da região ocupada pela navbar: altura real + posição/margem inferior + safe area quando ainda não incluída. Consumidores não somam novamente a mesma parcela.
- Reserva de espaço é geometria, não uma faixa preta. O wrapper do CTA inferior deve ser transparente; somente o controle/painel de ação tem material.
- “Salvar alterações” deve ficar totalmente acessível acima da navbar ou no fluxo previsto, sem colidir com o acionador flutuante do menu.
- A lista pode passar sob a cápsula durante a rolagem, mas o último item e seus controles precisam alcançar uma posição totalmente acessível.
- Um overlay é uma camada transitória para drawer/modal. Não deixar scrim/backdrop montado ou visível quando o controle está fechado.
- Catálogo público calcula a reserva do seu resumo inferior e não recebe navegação autenticada.

## 52.7 Tema claro e leitura

- Materiais claros têm borda de definição neutra, sombra cinza discreta e highlight separado. Branco sobre branco não basta para indicar limites.
- Texto primário/labels usam tinta escura; texto de status usa foreground semântico específico. Não transferir cores de acento vibrantes para rótulos pequenos sem medir contraste.
- Meta de texto comum: 4,5:1; texto grande: 3:1. Indicadores necessários de controle/estado/foco: 3:1 com cores adjacentes. Uma borda decorativa de card não se confunde com esse requisito funcional.
- Medir o fundo composto real de materiais translúcidos; declarar ratio de dois tokens não certifica todos os backgrounds possíveis.
- ON/OFF, erro, seleção e foco precisam funcionar em claro/escuro e em fallback sem blur. Transparência reduzida e movimento reduzido são preferências distintas.

## 52.8 Marca e critérios de revisão

Usar `BrandMark` e os assets oficiais. Logo no header/sidebar e autenticação/cadastro; variantes Ivory no escuro e Obsidian no claro. Não redesenhar a marca ou substituir por símbolo genérico. Sidebar desktop fica disponível; no mobile, drawer por acionador visível.

Revisão obrigatória da apresentação: 320/390/430 px, tablet/desktop, nomes/mensagens longos, dois temas, teclado, estados de erro/loading, foco e fim da rolagem. Comparar o material, padding interno, controles, calendário, cabeçalhos e footer. Não alterar regras/handlers/dados para resolver um defeito visual.

Referências: [Apple — Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Apple — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [Apple — Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles), [W3C — Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). SwiftUI/UIKit orientam o design; sua API não é copiada para React Native Web.

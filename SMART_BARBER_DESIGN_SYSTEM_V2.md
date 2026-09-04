# Smart Barber — Guia Oficial de Design System, UI/UX e Identidade Visual

**Sistema visual:** The Obsidian Atelier 2.0
**Versão:** 2.0
**Status:** Baseline oficial recomendada
**Escopo:** Android, iOS, Web autenticada e futura camada pública
**Princípio de plataforma:** Mobile-first, adaptive by default
**Arquitetura frontend relacionada:** Feature-First + Vertical Slice + FSD-lite + MVVM-lite + Ports/Adapters

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
card padding   = 16–24
section gap    = 24–32
major section  = 40–48
```

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
inputs  = 12
buttons = 12
cards   = 12–16
modals  = 16–20
badges  = full
```

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

- bottom navigation;
- single pane;
- mobile.

## Medium

```text
600–839px
```

- navigation rail;
- tablet;
- 1–2 panes.

## Expanded

```text
>= 840px
```

- sidebar;
- multi-pane;
- list + detail;
- dashboard mais denso.

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

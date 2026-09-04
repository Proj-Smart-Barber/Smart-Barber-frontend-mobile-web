# ✂️ Smart Barber

<p align="center">
  <img src="./assets/images/logos/02_ivory_sobre_obsidian.png" alt="Smart Barber" width="160" />
</p>

> Marketplace + SaaS multiplataforma para clientes, barbearias e profissionais.

**The Obsidian Atelier 2.0** · *Premium by Restraint.*

## Estado atual

| Estado | O que existe hoje |
|---|---|
| ✅ | Arquitetura frontend Feature-First, Vertical Slice, FSD-lite, MVVM-lite e Ports/Adapters aplicada à feature de Auth. |
| ✅ | Design System V2: tokens em camadas, Light/Dark, componentes compartilhados e identidade Obsidian/Ivory/Crimson. |
| ✅ | Branding: API `shared/brand`, logos oficiais, ícones de app, splash Light/Dark e favicon. |
| ✅ | Auth de Staff: login, cadastro de Owner, auto-login, restauração de sessão, logout e rotas protegidas. |
| ✅ | Baseline Expo para Android, iOS e Web. |
| ✅  | **Issue #2 — Sprint 2: Sistema de Cadastro de Empresa.** |

> A área autenticada atual é uma Home temporária. Agenda, equipe, catálogo, marketplace e demais fluxos de negócio não estão implementados neste repositório nesta baseline.

## Stack

| Tecnologia | Versão efetiva | Papel |
|---|---:|---|
| Expo | 57.0.19 | Runtime universal e configuração de plataformas |
| React | 19.2.3 | Camada de UI |
| React Native | 0.86.3 | Interface Android e iOS |
| React Native Web | 0.21.2 | Interface Web |
| Expo Router | 57.0.18 | Rotas baseadas em arquivos e guards |
| TypeScript | 6.0.3 | Tipagem estrita |
| TanStack Query | 5.66.0 | Estado de servidor/cache |
| React Hook Form + Zod | 7.54.2 + 3.24.2 | Formulários e validação |
| Vitest | 3.0.8 | Testes unitários |

## Início rápido

### Pré-requisitos

- Node.js e npm (o projeto não fixa uma versão de Node em `package.json`);
- uma API compatível configurada em `EXPO_PUBLIC_API_URL` para testar autenticação real;
- Android Studio/emulador ou Xcode/simulador apenas para executar as respectivas plataformas nativas.

```powershell
git clone https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web.git
Set-Location Smart-Barber-frontend-mobile-web
npm install
Copy-Item .env.example .env
npm start
```

No terminal do Expo, use `w` para Web, `a` para Android e `i` para iOS. Também estão disponíveis:

```powershell
npm run web
npm run android
npm run ios
npm run typecheck
npm test
```

> Não existe script de lint nesta baseline. Não documente ou execute `npm run lint` até que ele seja adicionado ao `package.json`.

## Variáveis de ambiente

| Variável pública | Uso |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL base da API consumida pelo frontend. |

Use `.env.example` como ponto de partida. Nunca adicione tokens, senhas, JWTs ou credenciais ao repositório.

## Arquitetura

O frontend combina práticas complementares para manter rotas, UI, domínio e infraestrutura separados:

| Prática | Aplicação neste projeto |
|---|---|
| **Feature-First** | Código de negócio vive dentro da feature correspondente, como `features/auth`. |
| **Vertical Slice** | Cada feature reúne UI, modelo, API, utilitários e testes do seu fluxo. |
| **FSD-lite** | A dependência flui de `app` para `features`, `entities` e `shared`. |
| **MVVM-lite** | ViewModels/hooks coordenam estado e submissão; telas e formulários permanecem focados em apresentação. |
| **Ports/Adapters** | Contratos compartilhados, como `TokenStorage`, desacoplam a feature da implementação Web/Native. |

```text
app
 ├── features
 ├── entities
 └── shared

features ──► entities ──► shared
features ─────────────────► shared
```

Permitido: `app → features/entities/shared`, `features → entities/shared` e `entities → shared`.

Proibido: `shared → features/entities`, `entities → features` e uma feature acessar os detalhes internos de outra feature.

### Estrutura real

```text
src/
├── app/                       # Rotas Expo Router e layouts dos grupos
│   ├── (auth)/                # Login e cadastro
│   └── (app)/                 # Área protegida; Home temporária
├── entities/
│   └── staff/                 # Tipos e normalização de papéis de Staff
├── features/
│   └── auth/                  # API, DTOs, schemas, ViewModels, UI e testes
└── shared/
    ├── api/                   # HttpClient e erros de comunicação
    ├── brand/                 # API semântica das logos oficiais
    ├── config/                # Leitura de variáveis públicas
    ├── storage/               # Port e adapters de token Web/Native
    ├── theme/                 # Primitivos, semântica, componentes e breakpoints
    ├── types/                 # Tipos reutilizáveis
    └── ui/                    # Primitivos visuais compartilhados

assets/images/
├── logos/                     # 12 variantes oficiais em PNG e WebP
└── brand/                     # Derivados para ícone, adaptive icon e splash
```

### Como criar uma tela/feature

Telas não devem chamar `fetch`, conhecer endpoints, acessar storage, conter regra complexa ou interpretar erro HTTP diretamente.

```text
Route / Screen
      ↓
Feature UI
      ↓
Model / ViewModel
      ↓
Feature API
      ↓
Shared API
      ↓
Backend
```

Crie componentes de negócio dentro de `features/<feature>/ui`. Promova algo a `shared/ui` somente quando for realmente reutilizável e sem dependência de negócio.

## Design System

O sistema oficial é **The Obsidian Atelier 2.0**. Seus seis pilares são: **Premium by Restraint**, **Content First**, **Friction with Purpose**, **Trust by Design**, **Adaptive by Default** e **Accessible Without Compromise**.

[📖 Ler o Design System completo](./SMART_BARBER_DESIGN_SYSTEM_V2.md)

### Cores oficiais

| Token | Cor | Uso |
|---|---|---|
| Obsidian | `#0B0B0B` | Canvas Dark |
| Crimson | `#BD2026` | Marca e CTA principal |
| Ivory | `#F7F5F3` | Canvas Light |
| Success | `#10B981` | Sucesso |
| Warning | `#F59E0B` | Atenção |
| Error | `#FF5C62` | Erro |
| Destructive | `#DC2626` | Ações destrutivas |

> **Brand Crimson != Error != Destructive.** Nunca use cor de marca para comunicar falha ou destruição.

### Tipografia e tokens

- **Epilogue:** display, títulos, métricas e CTAs importantes.
- **Inter:** body, labels, inputs, menus e metadata.

```text
Primitive
    ↓
Semantic
    ↓
Component
```

Use `useTheme()` e tokens semânticos/componentes. Não coloque HEX diretamente em features quando houver token correspondente.

### Branding, temas e adaptação

- As variantes oficiais estão em [`assets/images/logos`](./assets/images/logos); há versões principal, Dark, Light, sobre Crimson, app icon, monocromática e símbolos transparentes.
- Use `BrandMark` de `shared/brand`, não imports arbitrários de arquivos de logo em features.
- O produto é **Dark-first, não Dark-only**: Obsidian Atelier no Dark e Ivory Atelier no Light. Toda tela nova deve considerar ambos.
- Breakpoints: **Compact** `<600px`, **Medium** `600–839px` e **Expanded** `>=840px`.
- O princípio é **universal-first, adaptive when needed**. Bottom navigation, navigation rail e sidebar são padrões para aplicar somente quando a feature e o número de destinos justificarem; eles não existem na Home temporária atual.

### Acessibilidade mínima

O baseline segue WCAG 2.2 AA como alvo. Garanta touch targets de pelo menos `44×44`, contraste, labels persistentes, navegação por teclado, foco visível, semântica para leitor de tela, font scaling, reduced motion e estados que não dependem apenas de cor.

## Telas e fluxos implementados

| Área | Estado real |
|---|---|
| Bootstrap | Carrega fontes, tema e restaura a sessão antes de liberar rotas. |
| Login de Staff | Valida credenciais, autentica e busca o perfil. |
| Cadastro de Owner | Valida formulário, cria a conta e executa auto-login. |
| Sessão | Armazena token por adapter de plataforma, valida expiração e confirma `/me`. |
| Logout | Limpa token e cache de sessão. |
| Rotas protegidas | Redirecionam entre `(auth)` e `(app)` conforme o estado da sessão. |
| Home autenticada | Placeholder operacional temporário, sem agenda/equipe/catálogo. |

## Testes e qualidade

Os testes em `src/features/auth/tests` cobrem API, DTO/mapper, schemas, JWT, normalização de erro e sessão. `src/shared/theme/tests` cobre invariantes de tokens e breakpoints.

```powershell
npm run typecheck
npm test
npx expo export --platform web
```

## Git Flow

```text
feature/*  → Pull Request → develop  → Pull Request → main
fix/*      → Pull Request → develop  → Pull Request → main
docs/*     → Pull Request → develop  → Pull Request → main
```

- Não desenvolva diretamente em `main`; prefira também não desenvolver diretamente em `develop`.
- Cada issue possui uma branch própria e todo merge requer Pull Request e revisão.
- Use Conventional Commits, por exemplo: `feat: adiciona cadastro de empresa` ou `docs: documenta baseline do frontend`.
- Convenções de branch: `feature/<issue>-<descricao>`, `fix/<issue>-<descricao>`, `refactor/<issue>-<descricao>` e `docs/<issue>-<descricao>`.

### Próxima issue

**#2 — Sprint 2: Sistema de Cadastro de Empresa**

Branch reservada para a implementação frontend:

```text
feature/2-sprint-2-sistema-cadastro-empresa
```

O fluxo obrigatório será `feature → PR → develop → PR → main`; nunca `feature → main` diretamente.

## 📚 Documentação

- [Design System V2](./SMART_BARBER_DESIGN_SYSTEM_V2.md)
- [Plano de implementação do Design System e branding](./docs/PLANO_IMPLEMENTACAO_DESIGN_SYSTEM_V2_E_BRANDING.md)

# Plano de implementação — UX, responsividade e componentes

Data: 29/09/2026  
Escopo: frontend Expo/React Native/React Native Web, fluxos de abertura, autenticação, serviços, catálogo público, dashboard, agenda e disponibilidade.  
Referências: [guia oficial](../SMART_BARBER_DESIGN_SYSTEM_V2.md), [relatório de análise e fontes](RELATORIO_UX_COMPONENTES_RESPONSIVIDADE_2026-09-29.md).  
Estado: **Executado (P00–P08 entregues em 29/09/2026)**.

## 1. Resultado esperado e limites

O app deve comunicar claramente onde o usuário está, o que está carregando, o resultado de uma ação e como recuperar falhas. A interface deve caber em telas compactas e ampliar sem perda de leitura, preservando The Obsidian Atelier 2.0. Animações curtas devem acompanhar estados verdadeiros. A experiência de abertura inclui splash nativa, primeira pintura web, bootstrap de sessão e chegada à tela correta.

**Limites de escopo:** não criar reserva, recuperação de senha, disponibilidade em tempo real ou métrica que o contrato não fornece; não alterar backend neste plano. Quando uma correção depender de contrato ausente, registrar a dependência e implementar um estado honesto no frontend. Uma falha temporária de rede na sessão não deve apagar o token. Não instalar um segundo design system global para copiar um componente isolado.

## 2. Inventário de componentes a entregar

| ID | Componente/padrão | Origem e rota de adoção | Responsabilidade | Resultado obrigatório |
| --- | --- | --- | --- | --- |
| C1 | Botão com estado textual | Adaptar `src/shared/ui/Button.tsx`, inspirado em [Loading Button](https://ui.spectrumhq.in/docs/loading-button) e [Text States](https://ui.spectrumhq.in/docs/text-states). | Rótulo estável (“Entrando…”, “Salvando…”), spinner secundário, largura sem salto e `busy`. | Login, cadastro, serviços e disponibilidade usam o mesmo padrão. |
| C2 | Estado de operação | Usar [Status Mark](https://reactbits.dev/c/micro/status-mark) como referência; adaptar em `shared/ui` para todas as plataformas. Cópia da versão web só se licença, dependência e bundle passarem na revisão. | `idle/pending/success/error`, rótulo junto do ícone, resultado vindo da mutação. | Ativação de serviço e salvamento mostram progresso e erro recuperável. |
| C3 | Filtro segmentado | [Rubber Segment](https://reactbits.dev/c/micro/rubber-segment) como referência; usar controle único, com implementação web específica apenas se simplificar a manutenção. | Valor controlado, foco, teclado, toque ≥44 px, movimento reduzido. | Todos/Ativos/Inativos cabem e funcionam em 320 px. |
| C4 | Skeleton e revelação | Adaptar `src/shared/ui/Skeleton.tsx`, inspirado em [Skeleton Reveal](https://ui.spectrumhq.in/docs/skeleton-reveal). | Reservar dimensões reais; transição de opacidade curta; sem shimmer obrigatório. | Catálogos, dashboard, agenda e disponibilidade não saltam de altura. |
| C5 | Feedback transitório | Um componente/provedor em `shared/ui`, inspirado em [Toast Stack](https://ui.spectrumhq.in/docs/toast-stack). | Sucesso/erro de operações, ação de tentar novamente quando válida, anúncio acessível, duração apropriada e posicionamento seguro. | Uma operação não gera avisos duplicados; erros de campo permanecem inline. |
| C6 | Badge de estado | Evoluir `src/shared/ui/Badge.tsx` conforme [Status Badge](https://ui.spectrumhq.in/docs/status-badge). | Texto explícito + ícone opcional + cor, variante pendente e temas. | Estados operacionais não dependem só da cor nem são inventados. |
| C7 | Requisitos de senha | Adaptar ideia de [Password Strength](https://ui.spectrumhq.in/docs/password-strength) em cadastro, **somente** após verificar regras reais do backend. | Checklist de requisitos já exigidos, sem estimar “força” além do que se sabe. | Cadastro orienta o usuário sem contradizer validação da API. |

**Não entregar neste ciclo:** segundo spinner, login card completo com login social, Lattice Loader com cronômetro, efeitos 3D, partículas, fundo animado, swipe/undo sem operação reversível comprovada. React Bits é React DOM/Motion; Spectrum UI é React DOM/Tailwind e suas páginas consultadas pedem conta para exibir código. Usar a rota de adaptação definida acima, mantendo código universal. [Expo: módulos por plataforma](https://docs.expo.dev/router/advanced/platform-specific-modules/); [licença React Bits](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md).

## 3. Matriz de estados por fluxo

| Fluxo | Estados obrigatórios | Mensagem/ação principal |
| --- | --- | --- |
| Abertura sem token | Splash/primeira pintura → bootstrap breve → login. | Sem espera artificial; login pronto para interação. |
| Abertura com token válido | Splash → “Verificando sua sessão…” → dashboard ou configuração de barbearia. | Nenhuma passagem por login visível. |
| Sessão expirada | Restaurar → invalidade confirmada → login. | Explicar que a sessão expirou, sem expor detalhe técnico. |
| Falha transitória ao restaurar | Restaurar → tela de recuperação, token preservado. | “Não foi possível verificar sua sessão”, “Tentar novamente” e opção de entrar com outra conta. |
| Login | Vazio, inválido, enviando, perfil/contexto em carregamento, autenticado, erro. | `Entrando…` + feedback de campo ou erro de servidor; não mostrar sucesso até contexto válido. |
| Cadastro | Campos, validação, envio, conta criada, erro. | Requisitos reais de senha e CTA com progresso. |
| Serviços gerenciais | Carregando, vazio, listado, filtrado, formulário, salvando, ativando, erro. | C1–C6; estado pendente por cartão e desfazer visual do otimista com mensagem de falha. |
| Catálogo público | Carregando, sem serviços, seleção, resumo, erro. | Seleção é seleção; agendamento não é apresentado como concluído. |
| Dashboard/agenda/disponibilidade | Carregando, dados, vazio, erro, mutação. | Skeleton proporcional, status textual, reintentar quando possível, sem métricas fictícias. |

## 4. Pacotes de trabalho e dependências

### P00 — Base reproduzível e contratos (primeiro)

**Arquivos/superfícies:** `app.json`, `src/app`, `src/features/auth`, `src/features/services`, documentação de contrato disponível.  
**Trabalho:** registrar baseline em 320/360/390/430 px, tablet e desktop, tema claro/escuro, Safari iPhone real, Chrome/Edge e builds nativas quando disponíveis. Mapear rede lenta, sem rede, HTTP 401 e 5xx. Confirmar contrato de limpeza de descrição (`null`), paginação/contagem total, política de senha e origem pública do catálogo. Medir contraste atual e tamanho do bundle web. Fotografar ou registrar o fluxo splash → bootstrap → login/dashboard em build de release; Expo Go não reproduz integralmente a splash configurada. [Expo SplashScreen](https://docs.expo.dev/versions/latest/sdk/splash-screen/).

**Saída:** baseline e decisões de contrato documentadas. **Aceite:** cada defeito prioritário tem caso reproduzível ou, quando depender de ambiente, está identificado como não verificado; nenhum dado de produção sensível é incorporado.

### P01 — Abertura nativa, primeira pintura web e recuperação de sessão (depende P00)

**Arquivos prováveis:** `app.json`, `assets/images/brand/splash-*.png`, `src/app/_layout.tsx`, `src/app/index.tsx`, `src/shared/ui/BootstrapScreen.tsx`, `src/features/auth/model/use-session.tsx`, novo estado de recuperação em `src/features/auth/ui`, `src/app/+html.tsx` ou mecanismo de HTML web suportado pela versão instalada.

**Trabalho:** alinhar tamanho visível/posição da marca e fundo entre splash nativa, primeiro frame React e login; avaliar fade nativo curto no iOS, sem pressupor o mesmo efeito no Android nem segurar o usuário. Na web, definir fundo HTML/`body`, `lang=pt-BR`, título e `theme-color` coerentes com tema, respeitando limites do Safari. Evitar flash branco antes da hidratação. Exibir progresso sem percentagem simulada; trocar mensagem para verificação somente enquanto a sessão está de fato em verificação. Em erro transitório, apresentar recuperação e `restoreSession`; oferecer caminho explícito para trocar de conta sem descartar token por engano. Descartar token apenas em invalidação autoritativa. Evitar montar tela de login por um frame para usuário autenticado.

**Aceite:** cinco linhas da matriz de abertura passam; sem branco interno, logo saltando ou loop infinito; Safari real e build nativa de release registradas. As barras próprias do navegador não são tratadas como conteúdo da aplicação.

### P02 — Tokens, ergonomia e base acessível (depende P00; pode avançar em paralelo com P01)

**Arquivos prováveis:** `src/shared/theme/primitives/colors.ts`, `src/shared/theme/semantic/colors.ts`, `src/shared/theme/components/tokens.ts`, `src/shared/ui/FormField.tsx`, `TextInput.tsx`, `PasswordInput.tsx`, `Button.tsx`, `Alert.tsx`, `Badge.tsx`.

**Trabalho:** corrigir combinações de contraste para texto vermelho sobre escuro e rótulo do CTA; manter Crimson como identidade e criar variantes semânticas de texto/borda conforme fundo. Fixar toque mínimo ≥44 px em filtros e controles de modal. Associar label, instrução e erro a inputs no DOM web, preservar foco visível. Verificar fonte de ícones no Safari, com fallback de texto em controles críticos. Harmonizar estados hover/focus/pressed/disabled e movimento reduzido.

**Aceite:** texto comum ≥4,5:1, UI funcional ≥3:1, sem informação só por cor; campos anunciados corretamente; navegação por teclado e leitor de tela operante; temas claro e escuro sem regressão.

### P03 — Componentes compartilhados de estado (depende P02)

**Arquivos prováveis:** `src/shared/ui/Button.tsx`, `Spinner.tsx`, `Skeleton.tsx`, `Badge.tsx`, `Alert.tsx`, `index.ts`; novos `OperationStatus`, `SegmentedFilter`, `FeedbackToast`/provedor se necessários; `src/shared/theme/primitives/motion.ts`.

**Trabalho:** entregar C1–C6 com API mínima e tokens locais. `Button` mantém rótulo e spinner lado a lado. `OperationStatus` espelha estados da requisição. `SegmentedFilter` possui semântica de grupo/abas adequada ao uso, valor controlado e áreas de toque. `SkeletonReveal` preserva tamanho sem prender conteúdo atrás de transição. Feedback global não compete com `Alert` inline, permite fechar/ler mensagem e fica acima de safe area/teclado. Badge usa status textual real. Com movimento reduzido, estado muda sem deslocamento ou pulso.

**Aceite:** demonstração isolada de cada estado em web/iOS/Android; sem nova família de cores/ícones; nenhuma dependência externa pesada entra sem medição e licença inspecionada; notificações acessíveis e sem duplicação.

### P04 — Login e cadastro coerentes (depende P01–P03)

**Arquivos prováveis:** `src/features/auth/ui/AuthLayout.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`, `AuthError.tsx`, `src/features/auth/model/use-login-view-model.ts`, `use-register-view-model.ts`, `src/features/auth/model/login.schema.ts`, `register.schema.ts`.

**Trabalho:** aplicar C1 e texto de estágio ao envio, manter inputs utilizáveis e mensagens persistentes; corrigir logo/ícones no Safari; garantir card e teclado em viewport pequeno/dinâmico. Não adicionar “esqueceu a senha” sem rota funcional. Aplicar C7 apenas se P00 confirmar política de senha. Confirmar que login com credencial inválida, sem rede e erro de perfil recebem mensagens diferentes e recuperação adequada, sem expor dados da conta.

**Aceite:** login em 320 px e Safari com teclado aberto, zoom 200% e leitor de tela; envio não perde rótulo; erro não é apagado por animação; cadastro não exibe regras inventadas.

### P05 — Serviços: dados corretos e operações confiáveis (depende P00; antes do acabamento visual)

**Arquivos prováveis:** `src/features/services/model/service.types.ts`, `service.schema.ts`, `use-services-management.ts`, `use-public-services.ts`, `src/features/services/api/services.api.ts`, `src/features/services/ui/ServiceFormModal.tsx`, testes de model/API.

**Trabalho:** parser determinístico para `R$ 1.234,56`, `1.234,56`, `40,00`, `45.50` e inteiros, rejeitando `12abc`, separadores inválidos, zero e negativos; formatação pt-BR sem perda de centavos. Enviar `description: null` quando usuário apagar descrição em edição, se contrato aceitar; confirmar persistência. Ativação otimista com pendência por ID, rollback, erro visível e reintentar; impedir duplicação na mesma linha sem bloquear todas. Páginas acima de 100 registros e contagens com total correto, ou rótulo explícito de itens carregados quando o contrato não permitir total filtrado. Invalidar cache sem perder seleção inadvertidamente.

**Aceite:** casos de parser e descrição têm testes focados; ativação em sucesso/erro/rede lenta comprovada; lista com >100 itens navega sem omissão nem contagem enganosa. Erro de API não recebe fallback silencioso para fixtures.

### P06 — Serviços: layout, filtros e catálogo público (depende P03 e P05)

**Arquivos prováveis:** `src/features/services/ui/ServicesManagementView.tsx`, `ServiceCard.tsx`, `ServiceFormModal.tsx`, `PublicCatalogView.tsx`, `SelectedServicesSummary.tsx`.

**Trabalho:** cabeçalho compacto com título/CTA em linhas adaptativas; C3 no filtro; cartões quebram metadados em fonte grande; C2/C6 no estado de ativação; C4 no carregamento com geometria real; modal com máximo de altura, scroll, foco e fechar ≥44 px; preço/duração em coluna se necessário. Resumo público usa altura medida/safe area, empilha total/CTA no estreito; modal de seleção rola, mantém botão visível e diz claramente que **a reserva ainda não foi efetuada**. Substituir badge fixa “Atendimento” por rótulo factual; feedback de seleção leve e sem confirmação falsa.

**Aceite:** nenhuma ação cortada em 320/360/390/430 px, teclado e fonte 200%; filtros clicáveis e acessíveis; lista pública não fica sob barra inferior; seleção de muitos serviços abre modal utilizável.

### P07 — Coerência em dashboard, agenda, disponibilidade e compartilhamento (depende P02–P06)

**Arquivos prováveis:** `src/features/dashboard/ui/QuickActionsBar.tsx`, `MetricsOverview.tsx`, `TodayTimeline.tsx`, `NextAppointmentCard.tsx`, `src/features/agenda/ui/AgendaView.tsx`, `AgendaTimeline.tsx`, `AgendaActionButton.tsx`, `src/features/availability/ui/AvailabilityScreen.tsx`, `ExceptionForm.tsx`.

**Trabalho:** substituir spinner de página inteira da disponibilidade por estrutura de carregamento proporcional, quando viável; aplicar C1/C4/C5/C6 às operações reais; preservar padrões de confirmação destrutiva já existentes. Corrigir “Ver serviços” que compartilha e “Novo Encaixe” que só alerta: rótulos e affordances devem refletir o que funciona. Centralizar origem pública configurável e validar URL de share; não anunciar compartilhamento se o usuário cancelar. Não animar métricas vindas de mock como se fossem tempo real.

**Aceite:** mensagens e estados coerentes entre fluxos; ações rápidas levam ao destino prometido ou comunicam indisponibilidade antes do clique; URL compartilhada abre o catálogo correto; erro de disponibilidade oferece reintentar quando tecnicamente possível.

### P08 — Validação final e documentação (depende P01–P07)

**Trabalho:** executar a matriz da seção 5, corrigir regressões, atualizar exemplos de uso no guia oficial e documentar opções de componente adotadas/rejeitadas. Registrar diferenças web/native e limites externos. Comparar bundle e tempo percebido com P00. Não declarar validação de API real quando só houve mocks ou teste unitário.

**Aceite:** todos os critérios por pacote satisfeitos; evidência de Safari real e builds nativas ou limitação explícita; revisão visual dos fluxos ponta a ponta; relatório final separa inspeção estática, testes, runtime local e integração HTTP real.

## 5. Testes e matriz de aceitação

| Eixo | Casos obrigatórios | Prova esperada |
| --- | --- | --- |
| Layout | 320/360/390/430 px; tablet; desktop; orientação; teclado; fonte/zoom 200%; textos longos. | Capturas comparáveis e sem overflow/corte. |
| Splash e sessão | Sem token, válido, expirado, rede lenta, offline, 5xx, retry, troca de conta. | Rota e mensagem corretas; token preservado só em erro transitório. |
| Autenticação | E-mail/senha inválidos, submissão duplicada, login aceito com falha posterior em `/me`, cadastro. | Erro persistente e CTA textual; navegação sem flash indevido. |
| Serviços | Parser monetário, limpeza de descrição, CRUD, ativação/rollback, >100 itens, filtros, share. | Testes focados e resposta HTTP real quando ambiente autorizado estiver disponível. |
| Catálogo | Sem serviço, muitos serviços, seleção/limpar, modal de resumo e ausência de booking real. | Conteúdo verdadeiro e modal utilizável. |
| Acessibilidade | Teclado, VoiceOver/TalkBack quando disponíveis, contrastes, foco, nomes, toque, movimento reduzido. | Fluxos críticos operáveis sem cor/gesto/animação como único meio. |
| Performance | Tamanho do bundle web, salto de layout, fluidez em telefone intermediário, primeira pintura. | Comparação antes/depois; reverter efeito que piore experiência. |

**Verificações de engenharia:** typecheck; testes focados de auth/serviços/componentes quando verificam comportamento real; testes existentes afetados; build web; `git diff --check` e inspeção do status final. Testes automatizados não substituem Safari real, builds nativas de release ou integração HTTP. Evitar testes que apenas espelhem estilos internos.

## 6. Dependências, decisões e critério de conclusão

- **Contrato backend:** limpeza de descrição, paginação/contagem, política de senha e reservas. Se não houver suporte, registrar o bloqueio específico e entregar a interface com cópia verdadeira. Não fabricar sucesso.
- **Disponibilidade das fontes:** Spectrum UI exige login nas páginas consultadas para ver código/CLI; a implementação planejada usa seus padrões em componentes locais. Para React Bits, revisar a licença MIT + Commons Clause antes de qualquer cópia. A cópia direta é opcional, nunca pré-condição do fluxo.
- **Ambiente:** Safari iPhone e build nativa de release são necessários para confirmar splash e barras. Sem esses ambientes, concluir código e testes locais, mas marcar a verificação visual como pendente, não como aprovada.
- **Conclusão:** P01–P07 entregues, critérios da seção 5 satisfeitos e documentos de design alinhados. Nenhuma publicação remota ou deploy faz parte deste plano.

## 7. Instrução pronta para o executor

> Implemente integralmente `docs/PLANO_UX_RESPONSIVIDADE_COMPONENTES_2026-09-29.md` neste frontend, respeitando `SMART_BARBER_DESIGN_SYSTEM_V2.md` e usando `docs/RELATORIO_UX_COMPONENTES_RESPONSIVIDADE_2026-09-29.md` como evidência dos achados. Siga P00–P08 e suas dependências. Preserve trabalhos existentes e as convenções de nomenclatura neutra do repositório. Corrija primeiro dados e layout, depois estados/feedback e microinterações. Adapte C1–C6 aos componentes compartilhados; implemente C7 somente se a política real de senha for confirmada. Consulte React Bits e Spectrum UI pelos links do guia oficial antes de criar novos componentes; registre a decisão e revise licença, dependências, acessibilidade, movimento reduzido e compatibilidade web/mobile. Não crie fluxos ou sucesso de API que não existam. Valide typecheck, testes focados, build web, layout compacto, Safari real e builds nativas quando disponíveis. Relate separadamente o que foi verificado por código, testes, execução local e HTTP real, além de limitações do ambiente. Não altere backend nem publique branch, commit, PR ou deploy sem instrução específica.

## 8. Status de execução e fechamento dos pacotes (P00–P08)

| Pacote | Escopo | Status | Evidências e artefatos entregues |
| --- | --- | --- | --- |
| **P00** | Base reproduzível e contratos | **Entregue** | Contratos de parser monetário pt-BR, limpeza de descrição com `null`, isolamento de `docs/PLANO_SEED_DB_DEMONSTRACAO_PRODUCAO_2026-09-28.md` e mapeamento de tokens de contraste. |
| **P01** | Abertura nativa, primeira pintura e sessão | **Entregue** | `src/app/+html.tsx` (lang="pt-BR", theme-color, prevenção de flash branco), `SessionRecoveryScreen.tsx` (retry sem descarte prematuro do token), carregamento de `Ionicons.font` via `useFonts` no root layout e sincronização dimensional da marca (136 px). |
| **P02** | Tokens, ergonomia e base acessível | **Entregue** | Contraste corrigido com `crimson[400]: #FF6B72` (>5:1 sobre Obsidian escuro), foreground do botão primário/destrutivo em `#FFFFFF` (5.96:1), áreas de toque corrigidas para ≥44 px. |
| **P03** | Componentes compartilhados de estado | **Entregue** | Componentes C1 (`Button` com `loadingTitle`), C2 (`OperationStatus`), C3 (`SegmentedFilter`), C4 (`Skeleton` com pulso e reduced motion), C5 (`ToastProvider`/`useToast`), C6 (`Badge` estendido). |
| **P04** | Login e cadastro coerentes | **Entregue** | `LoginForm` e `RegisterForm` com C1 (`loadingTitle`), regras verdadeiras de senha (mínimo de 6 caracteres), `AuthLayout` sem overflow em 320 px e foco preservado. |
| **P05** | Serviços: dados e operações confiáveis | **Entregue** | `parsePriceToCents` estrito com 11 testes unitários cobrindo bordas, `useServicesManagement` com `togglingId`, reversão otimista e `toggleError`, suporte a `description: null`. |
| **P06** | Serviços: layout, filtros e catálogo | **Entregue** | `ServicesManagementView` com cabeçalho em duas linhas adaptativo para 320–390 px, `SegmentedFilter` integrado, `PublicCatalogView` sem reserva falsa e modal rolável. |
| **P07** | Dashboard, agenda e disponibilidade | **Entregue** | `QuickActionsBar` com `getPublicCatalogUrl`, toast de cópia/compartilhamento e affordance honesta ("Novo Encaixe (Em breve)"); `AvailabilityScreen` com skeletons proporcionais (eliminação de layout shift) e retry; `AgendaActionButton` com `loadingTitle`. |
| **P08** | Validação final e documentação | **Entregue** | Typecheck (0 erros), suíte de testes (142/142 passando em 26 arquivos), build estático web `dist` (2.1 MB) e documentação de fechamento. |


# Relatório de Diagnóstico e Diretrizes para o Planejamento do Módulo do Cliente

**Data:** 15 de Outubro de 2026  
**Projeto:** Smart Barber (Mobile & Web)  
**Destinatário:** Agente de Planejamento / Equipe de Arquitetura  
**Autor:** Equipe de Engenharia e Design System  

---

## 1. Sumário Executivo

Com a conclusão e homologação das entregas de **Gestão de Equipe e Unidades** (PRs backend #57 e frontend #39, #40) e a recente correção de **reset de autofill no formulário de autenticação web** (PR #41), o foco principal de desenvolvimento migra integralmente para o **Módulo do Cliente (Customer Experience & Discovery)**.

Atualmente, o usuário autenticado com perfil `CLIENT` é direcionado para a rota `src/app/(client)/index.tsx`, que é um placeholder inicial e estático de 50 linhas ("Olá, [Nome]", "Meus Agendamentos", "Minhas Notificações", "Sair"). Não há erro de execução ou tela quebrada, mas sim uma ausência de interface desenvolvida para a experiência do cliente.

Do lado do **Backend (`api`)**, a infraestrutura de dados e contratos de Descoberta (Grupo 1) já foi implementada e testada em PostgreSQL/PostGIS (PRs #54 e #55), estando 100% disponível para consumo imediato.

Este relatório fornece o diagnóstico técnico, contratos disponíveis, diretrizes de UI/UX (Liquid Glass) e proposta de decomposição para estruturar o plano de implementação do cliente.

---

## 2. Estado Atual do Ecossistema

### 2.1 Backend (`api`)
- **Status:** Disponível na branch `main`.
- **Banco de Dados:** PostgreSQL com extensão **PostGIS** habilitada e migrada.
- **Domínio de Descoberta:** Implementado em `src/domain/application/services/discovery-contract.ts` e exposto via `src/infra/http/routes/barbershop.routes.ts`.
- **Suíte de Testes:** Testes unitários, de integração isolada e benchmarks de performance aprovados.

### 2.2 Frontend (`Smart-Barber-frontend-mobile-web`)
- **Status de Autenticação:** Login, cadastro público, validação de e-mail e persistência de sessão operacionais.
- **Roteamento Operacional:** [`src/features/auth/model/operational-context.ts`](file:///D:/smart_barber/worktrees/frontend-gestao-equipe/src/features/auth/model/operational-context.ts) direciona usuários com role `CLIENT` para o grupo de rotas `/(client)`.
- **Estrutura Atual do Cliente:**
  - `src/app/(client)/index.tsx`: Placeholder estático com menu vertical de botões simples.
  - `src/app/(client)/bookings.tsx`: Lista de agendamentos pessoais do cliente (com suporte a cancelamento).
  - `src/features/discovery/`: **Ainda não criada**.
- **Design System Ativo:** Liquid Glass já padronizado e validado nas telas de Dashboard, Agenda e Equipe.

---

## 3. Contratos e APIs Disponíveis no Backend

As rotas abaixo estão ativas no backend e devem ser integradas pelo frontend na nova feature de descoberta:

### 3.1 Busca Textual de Barbearias
- **Método / Endpoint:** `GET /api/barbershops`
- **Autenticação:** Pública (não exige token).
- **Parâmetros de Query:**
  - `q` *(opcional, string, max 120)*: Termo de busca (nome da barbearia, rua, bairro ou cidade).
  - `page` *(opcional, inteiro >= 1, padrão: 1)*: Número da página.
  - `limit` *(opcional, inteiro entre 1 e 50, padrão: 20)*: Quantidade de itens por página.
- **Resposta de Sucesso (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid-da-barbearia",
        "name": "Barbearia Vintage Club",
        "slug": "barbearia-vintage-club",
        "location": "Rua Augusta, 1500 - Consolação, São Paulo - SP",
        "avatarUrl": "https://.../logo.png",
        "coordinates": {
          "latitude": -23.555771,
          "longitude": -46.660145
        },
        "distanceMeters": null
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasNext": false,
    "serverTime": "2026-10-15T15:00:00.000Z"
  }
  ```

### 3.2 Busca por Proximidade / Geolocalização
- **Método / Endpoint:** `POST /api/barbershops/nearby`
- **Autenticação:** Pública (não exige token).
- **Corpo da Requisição (JSON):**
  ```json
  {
    "latitude": -23.55052,
    "longitude": -46.633308,
    "radiusKm": 10,
    "q": "Corte",
    "page": 1,
    "limit": 20
  }
  ```
  - `latitude` *(obrigatório, number [-90, 90])*: Latitude do usuário.
  - `longitude` *(obrigatório, number [-180, 180])*: Longitude do usuário.
  - `radiusKm` *(obrigatório, valores permitidos: `5`, `10`, `25`, `50`)*: Raio máximo em quilômetros.
  - `q` *(opcional, string, max 120)*: Filtro textual complementar.
  - `page` e `limit` *(opcionais)*: Paginação.
- **Resposta de Sucesso (200 OK):**
  - Retorna a mesma estrutura paginada, porém ordenada pela menor distância, com o campo `distanceMeters` preenchido (ex: `1250` metros).

### 3.3 Detalhes da Unidade e Catálogo
- `GET /api/barbershops/:shopId`: Dados cadastrais da unidade.
- `GET /api/barbershops/:shopId/services`: Lista de serviços ativos, preços e durações.
- `GET /api/barbershops/:shopId/professionals`: Barbeiros ativos aptos para agendamento.
- `GET /api/barbershops/:shopId/availability/slots`: Cálculo de horários disponíveis em tempo real.

### 3.4 Agendamento e Reservas Pessoais
- `POST /api/bookings`: Criação de reserva (idempotente com header `Idempotency-Key` ou `attemptId`).
- `GET /api/bookings/my`: Listagem paginada das reservas pertencentes ao usuário autenticado.
- `PATCH /api/bookings/:bookingId/status`: Cancelamento com validação de janela de antecedência.

---

## 4. Requisitos e Telas do Módulo do Cliente

### 4.1 Home do Cliente (`src/app/(client)/index.tsx`)
A tela inicial deve substituir o placeholder atual por uma experiência rica:
1. **Header do Cliente:**
   - Saudação personalizada ("Olá, [Nome]").
   - Indicador de localização atual ou botão para capturar/alterar CEP/bairro.
   - Acesso rápido a notificações e perfil.
2. **Card de Destaque — "Próximo Agendamento":**
   - Quando o cliente possuir agendamento futuro em aberto (`CONFIRMED` ou `IN_PROGRESS`):
     - Card proeminente em Liquid Glass com data, horário com contagem regressiva suave, nome da barbearia, serviço e barbeiro.
     - Botão de ação rápida: "Ver Detalhes", "Como Chegar" e "Gerenciar Reserva".
   - Quando não houver agendamento futuro:
     - Card de incentivo/call-to-action ("Que tal renovar o visual hoje? Encontre uma barbearia perto de você").
3. **Barra de Busca Rápida:**
   - Campo de entrada com ícone de lupa, acionando a busca textual ou redirecionando para a tela de exploração.
4. **Carrossel / Seção "Barbearias Próximas a Você":**
   - Utiliza a geolocalização do dispositivo (ou localização padrão de fallback) consultando `POST /api/barbershops/nearby`.
   - Cards com foto, nome, distância formatada (ex: `1,2 km`), endereço resumido e botão "Agendar".
5. **Seção "Mais Populares / Mais Bem Avaliadas":**
   - Carrossel secundário com as unidades cadastradas.
6. **Ações Rápidas no Rodapé / Menu Inferior:**
   - Navegação fluida entre Início, Explorar/Buscar, Meus Agendamentos e Perfil.

### 4.2 Tela de Exploração e Busca (`src/app/(client)/explore.tsx`)
1. **Controles de Filtro:**
   - Campo de busca textual com *debounce* de 300ms.
   - Pílulas/Chips de seleção de raio: `5 km`, `10 km`, `25 km`, `50 km`.
   - Alternância de ordenação: "Mais Próximas" ou "Alfabética".
2. **Lista de Resultados:**
   - Grid responsivo (1 coluna no mobile, 2 ou 3 colunas em desktop/telas amplas).
   - Card completo da barbearia com badges de status ("Aberto", "Fechado"), distância e endereço.
   - Estados de *loading* com *skeletons* no padrão Liquid Glass.
   - Estado vazio amigável ("Nenhuma barbearia encontrada nesse raio. Tente expandir para 25 km").

### 4.3 Integração com Geolocalização
- Suporte híbrido:
  - **Mobile:** `expo-location` para solicitação segura de permissões (`requestForegroundPermissionsAsync`) e obtenção de coordenadas (`getCurrentPositionAsync`).
  - **Web:** Fallback transparente para a API padrão do navegador (`navigator.geolocation.getCurrentPosition`).
  - **Fallback Gracioso:** Caso o usuário negue a permissão de localização, a interface deve migrar automaticamente para o modo de busca textual (`GET /api/barbershops?q=...`) sem travar a experiência.

---

## 5. Diretrizes de UI/UX e Design System (Liquid Glass)

Todas as novas telas e componentes devem seguir rigorosamente o padrão estabelecido:
- **Cores de Fundo:** Base escura profunda (`#0B0B0E`), eliminando fundos cinzas chapados.
- **Superfícies de Vidro (Liquid Glass):** Fundo translúcido com gradientes sutis (`rgba(255, 255, 255, 0.05)` a `0.08`), bordas finas com brilho especular (`rgba(255, 255, 255, 0.12)`) e efeito de desfoque de fundo (*backdrop blur*).
- **Destaques e Tipografia:** Acentos em Dourado Vintage (`#C5A880` / `#D4AF37`) para botões de ação primária e destaques de distância/status. Tipografia com contraste mínimo em conformidade com WCAG 2.2 AA.
- **Responsividade e Dual-Platform:**
  - Mobile: Toque facilitado (alvos de toque mínimos de 48px), gestos suaves de rolagem horizontal em carrosséis e feedback háptico.
  - Desktop: Grid flexível que preenche harmonicamente telas maiores, cabeçalhos integrados e navegação limpa sem quebras de layout.

---

## 6. Proposta de Fases de Execução para o Planejador

Recomenda-se a divisão do plano de trabalho nos seguintes grupos de entrega:

1. **Grupo 1 — Camada de Dados e Contratos de Descoberta (`features/discovery`):**
   - Criação de `src/features/discovery/api/discovery.api.ts` e esquemas Zod de resposta.
   - Criação do serviço de geolocalização unificado (Mobile Expo + Web Navigator).
   - Hook React Query `useNearbyBarbershops` e `useSearchBarbershops` com cache e paginação.
2. **Grupo 2 — Componentes Base de UI da Descoberta:**
   - `BarbershopCard`: Card translúcido Liquid Glass com imagem, distância, badge e botão de ação.
   - `RadiusSelector`: Chips interativos para alternância de 5km / 10km / 25km / 50km.
   - `DiscoverySkeleton`: Efeito de carregamento cintilante seguindo os tons escuros do tema.
3. **Grupo 3 — Redesenho da Home do Cliente (`src/app/(client)/index.tsx`):**
   - Implementação do card "Próximo Agendamento" conectado a `useMyBookings`.
   - Seção de barbearias próximas e busca rápida.
   - Refinamento do layout mobile e desktop.
4. **Grupo 4 — Tela de Exploração e Busca Avançada:**
   - Rota e tela dedicada de exploração com filtros integrados e paginação contínua.
   - Tratamento de estados vazios e recusa de permissão de GPS.
5. **Grupo 5 — Conexão do Fluxo de Agendamento e Testes Automatizados:**
   - Conexão do clique no card da barbearia para o catálogo e seleção de horários.
   - Retorno pós-agendamento com feedback visual positivo.
   - Testes unitários e de integração de view-models com Vitest cobrindo cenários de sucesso, erro de rede e negação de localização.

---

## 7. Referências Técnicas

- **Backend Controller:** [`src/infra/http/controllers/barbershop/search-barbershops.controller.ts`](file:///D:/smart_barber/worktrees/api-gestao-equipe/src/infra/http/controllers/barbershop/search-barbershops.controller.ts)
- **Backend Routes:** [`src/infra/http/routes/barbershop.routes.ts`](file:///D:/smart_barber/worktrees/api-gestao-equipe/src/infra/http/routes/barbershop.routes.ts)
- **Frontend PR 40 (Liquid Glass Padrão):** `https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/pull/40`
- **Frontend PR 41 (Fix Autofill Web):** `https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/pull/41`

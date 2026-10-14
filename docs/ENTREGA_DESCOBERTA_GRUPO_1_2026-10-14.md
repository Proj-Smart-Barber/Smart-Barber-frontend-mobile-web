# Relatório de Entrega — Descoberta e Geolocalização, Grupo 1 (T1 + T2)

Data: 2026-10-14  
Branch de Trabalho: `feat/discovery-api`  
Worktree Isolada: `D:/smart_barber/Smart-Barber-frontend-mobile-web/.tmp/api-discovery`  
Base Commit: `cd25511` (PR #53 integrado na `main`)  
Status Geral: **CONCLUÍDO E APROVADO**

---

## 1. Escopo Executado e Arquivos Alterados

O Grupo 1 (T1 + T2) foi implementado na íntegra de acordo com o plano arquitetural aprovado (`2026-10-14-descoberta-home-geolocalizacao.md`) e com o prompt de execução (`PROMPT_EXECUCAO_DESCOBERTA_GRUPO_1_2026-10-14.md`).

### 1.1 Arquivos Criados e Modificados

| Arquivo | Tarefa | Papel / Descrição |
| :--- | :---: | :--- |
| `src/domain/application/services/discovery-contract.ts` | T1 | Contratos puros de domínio (`GeoPoint`, `DiscoveryInput`, `PublicShop`, `DiscoveryPage`, `Candidate`, `SetLocationCommand`, `LocationStatus`, `isValidGeoPoint`). Isento de dependências externas. |
| `src/domain/application/repositories/barbershop-locations-repository.ts` | T1 | Interface do repositório de persistência de localizações e candidatos. |
| `src/infra/drizzle/schema.ts` | T1 | Definição das tabelas `barbershop_locations`, `geocoding_candidates`, `location_maintenance_health`, `geocoding_usage_buckets` e enums/constraints. |
| `src/infra/drizzle/migrator.ts` | T1 | Seção 12 aditiva e idempotente com DDL SQL direto e suporte a `targetDb` para testes isolados. |
| `test/helpers/isolated-discovery-db.ts` & `.spec.ts` | T1 | Validador rigoroso de URL (`sb_discovery_test_*`), criação de schemas efêmeros dinâmicos e teardown seguro. |
| `src/infra/drizzle/discovery-schema.integration.spec.ts` | T1 | Suíte de testes de integração do schema e idempotência de migração contra PostgreSQL 18.1 real. |
| `src/domain/application/repositories/discovery-repository.ts` | T2 | Interface do repositório de busca pública (`search`, `isLocationServiceHealthy`). |
| `src/domain/application/use-cases/_errors/location-service-unavailable-error.ts` | T2 | Erro canônico de indisponibilidade de serviço de localização (HTTP 503). |
| `src/domain/application/use-cases/barbershop/search-barbershops/search-barbershops.ts` & `.spec.ts` | T2 | Caso de uso com suporte aos modos `ALL` e `NEARBY`, com fail-closed para manutenção de localização. |
| `src/infra/drizzle/repositories/drizzle-discovery-repository.ts` | T2 | Repositório Drizzle com cálculo esférico Haversine puro ($R=6.371.000\,\text{m}$), clamping $[0,1]$, pré-filtro de Bounding Box, escape de curingas e ordenação determinística. |
| `src/infra/http/controllers/barbershop/search-barbershops.controller.ts` & `.spec.ts` | T2 | Controllers `SearchBarbershopsController` (GET) e `SearchNearbyBarbershopsController` (POST) com validações Zod e sanitização de logs de privacidade. |
| `src/infra/http/factories/make-search-barbershops-controller.ts` | T2 | Factories para injeção de dependências dos controllers de descoberta. |
| `src/infra/http/routes/barbershop.routes.ts` | T2 | Registro das rotas públicas `GET /api/barbershops` e `POST /api/barbershops/nearby`. |
| `src/core/infra/adapters/express-route-adapter.ts` | T2 | Injeção obrigatória de cabeçalhos `Cache-Control: no-store` e `Pragma: no-cache` para rotas de proximidade. |
| `src/core/infra/http-response.ts` | T2 | Suporte a cabeçalhos customizados no tipo de resposta `HttpResponse`. |
| `src/infra/http/swagger/index.ts` | T2 | Especificação OpenAPI 3.0 documentando `GET /api/barbershops` e `POST /api/barbershops/nearby` com schemas `PublicShop` e `DiscoveryPage`. |
| `src/infra/http/discovery.integration.spec.ts` | T2 | Suíte completa com 20 testes HTTP e PostgreSQL reais, incluindo resiliência (503) e benchmark de 10.000 unidades. |

---

## 2. Matriz de Rastreabilidade e Evidências de Teste

Ambiente de teste: PostgreSQL 18.1 local em `127.0.0.1:5433`, banco descartável `sb_discovery_test_main`, Express em porta efêmera via HTTP real `fetch`.

| Requisito / Capacidade | Tipo de Teste | Arquivo de Teste | Resultado |
| :--- | :---: | :--- | :---: |
| Contratos de Domínio & Validação GeoPoint | Unitário | `test/helpers/isolated-discovery-db.spec.ts` | **PASS** (6/6) |
| Caso de Uso (Modos ALL e NEARBY) | Unitário | `search-barbershops.spec.ts` | **PASS** (4/4) |
| Controllers (Zod, Rejeição Coordenadas GET, Erros 400/503) | Unitário | `search-barbershops.controller.spec.ts` | **PASS** (9/9) |
| Idempotência da Migração de Schema | Integração (PostgreSQL Real) | `discovery-schema.integration.spec.ts` | **PASS** (8/8) |
| Preservação de Barbearias Legadas como UNCONFIRMED | Integração (PostgreSQL Real) | `discovery-schema.integration.spec.ts` | **PASS** |
| Aceitação do Par (0,0) como Válido | Integração (PostgreSQL Real) | `discovery-schema.integration.spec.ts` | **PASS** |
| Constraints de Lat/Lon e Version não-negativa | Integração (PostgreSQL Real) | `discovery-schema.integration.spec.ts` | **PASS** |
| GET `/api/barbershops` — Listagem Alfabética e Projeção Canônica | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| GET `/api/barbershops` — Busca Textual Case-Insensitive | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| GET `/api/barbershops` — Escape de `%`, `_` e `\` como Literais | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| GET `/api/barbershops` — Rejeição de Coordenadas e Raio (400) | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| GET `/api/barbershops` — Paginação Segura (`limit <= 50`, `page >= 1`) | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| GET `/api/barbershops` — Unidades sem ponto com `coordinates: null` | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| POST `/api/barbershops/nearby` — Validação de Campos Obrigatórios (400) | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| POST `/api/barbershops/nearby` — Raios Restritos a 5, 10, 25 e 50 km | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| POST `/api/barbershops/nearby` — Validação de Limites de Coordenadas | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| POST `/api/barbershops/nearby` — Cabeçalho `Cache-Control: no-store` | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| POST `/api/barbershops/nearby` — Filtro Raio 5 km e Ordenação Distance ASC | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| POST `/api/barbershops/nearby` — Filtro Raios 10 km, 25 km e 50 km | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| POST `/api/barbershops/nearby` — Exclusão de Unidades Não Confirmadas/Vencidas | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| POST `/api/barbershops/nearby` — Combinação Proximidade + Filtro Textual | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| POST `/api/barbershops/nearby` — Preservação de Privacidade (Zero Leaks) | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| POST `/api/barbershops/nearby` — Aceitação de Ponto (0,0) no Golfo da Guiné | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| Modo Manutenção / Resiliência — 503 no Nearby e 200 Preservado no GET | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** |
| Benchmark de Performance com 10.000 Unidades Sintéticas ($\le 200\,\text{ms}$) | HTTP Real + PostgreSQL | `discovery.integration.spec.ts` | **PASS** (**18.1 ms**) |

**Total de Testes:** 47 aprovados (0 falhas, 0 pulados).

---

## 3. Benchmark de Performance (10.000 Barbearias)

- **Cenário:** Inserção de 10.000 barbearias ativas com coordenadas geográficas distribuídas em uma caixa de $\pm 1.5^\circ$ ao redor da Praça da Sé (São Paulo/SP).
- **Mecanismo de Otimização:** Bounding Box pré-filtrando latitude e longitude antes do cálculo trigonométrico Haversine SQL puro:
  $$\Delta_{\text{lat}} = \frac{\text{radiusKm}}{111.32}, \quad \Delta_{\text{lon}} = \frac{\text{radiusKm}}{111.32 \cdot \cos(\text{lat})}$$
- **Métricas Observadas:**
  - Orçamento SLA: $\le 200\,\text{ms}$
  - Tempo de execução real da rota HTTP: **17.8 ms – 19.9 ms** (mais de 10x abaixo do teto orçado).

---

## 4. Pareceres das Revisões Independentes

### 4.1 Revisão Independente T1 (Persistência e Schema)
- **Status:** **APROVADO COM APONTAMENTOS**
- **Observações Incorporadas:** Validação de ausência de dependências de framework no Domain, isolamento rígido de schemas de teste, e restrição de persistência de dados brutos de provedores externos na tabela `geocoding_candidates`.

### 4.2 Revisão Independente T2 (APIs, Projeção Pública e Integração)
- **Status:** **APROVADO**
- **Observações Incorporadas:** Alinhamento estrito com os contratos canônicos `PublicShop` e `DiscoveryPage`, proteção do cabeçalho `Cache-Control: no-store`, sanitização de marcadores de posição de cliente em logs/respostas e conformidade de tipos no compilador TypeScript (`npx tsc --noEmit` zerado) e formatador Biome (`npx biome check` zerado).

---

## 5. Próximos Passos (Grupos 2 a 4)

Conforme a restrição rígida de parada após o Grupo 1:
1. **Nenhum commit, push, PR, merge ou deploy foi realizado.**
2. O diff completo e limpo encontra-se na worktree `D:/smart_barber/Smart-Barber-frontend-mobile-web/.tmp/api-discovery` (branch `feat/discovery-api`).
3. O trabalho dos próximos grupos (Grupo 2: geocodificação e gestão de localização OWNER; Grupo 3: UI/mapas no frontend; Grupo 4: jobs e rotinas de manutenção) iniciará a partir deste handoff aprovado.

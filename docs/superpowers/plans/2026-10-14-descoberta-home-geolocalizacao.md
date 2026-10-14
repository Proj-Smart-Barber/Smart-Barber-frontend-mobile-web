# Descoberta, home e geolocalização — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Preservar o método já escolhido no projeto: execução por tarefas/grupos com revisão antes do seguinte.

**Goal:** Cliente encontra barbearias ativas por texto/proximidade e entra no catálogo existente; proprietário confirma a localização comercial em Google Maps.

**Architecture:** Arquitetura atual de ports/use-cases/controllers/Drizzle na API e features/model/api/ui no frontend. Google fornece mapa/geocodificação; captura da posição usa API do dispositivo; descoberta consulta o banco do produto. Nenhum SDK de mapa participa do catálogo/agendamento existente.

**Tech Stack:** Expo 57/React Native/Expo Router/TanStack Query; expo-location e react-native-maps compatíveis instalados via Expo; Google Maps JavaScript API na web; Express/Drizzle/PostgreSQL. Sem extensão geográfica nova nesta etapa.

**Spec:** D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_DESCOBERTA_HOME_GEOLOCALIZACAO_2026-10-14.md, incluindo resoluções S1–S5, C1–C3 e U1–U2. UX, plano completo e avanço ao prompt do Grupo 1 aprovados pelo usuário em 14/10/2026; árbitro técnico APPROVED. Ver REVISAO_PLANO_DESCOBERTA_GEO_2026-10-14.md.

## Global Constraints

- FE = D:/smart_barber/Smart-Barber-frontend-mobile-web; API = D:/smart_barber/api. Os caminhos abaixo são relativos a esses roots explícitos.
- Bases mínimas integradas: FE e2889cf / API cd25511. Conferir main atual e preservar todos os checkouts sujos. Isolar trabalho em execução; não copiar src inteiro de uma branch antiga.
- Lista principal, mapa opcional; raio inicial 10 km, opções 5/10/25/50; paginação 20, máximo 50. Somente ACTIVE.
- Cliente: permissão por ação explícita, sem background, storage, URL/log ou histórico de posição; captura válida 10 minutos e invalidada ao retomar app.
- Proprietário: endereço digitado e ponto confirmado; legado sem ponto continua na busca textual. Nenhum backfill remoto automático.
- Não fabricar distância/avaliação/preço mínimo/horário livre nem substituir a seleção de vários serviços.
- Chaves de servidor fora do bundle; restrições, quotas e manutenção Google comprovadas antes de ativar ambiente real. Não contratar serviços, elevar quotas ou alterar faturamento automaticamente.
- Apenas banco descartável/schema próprio em testes. Sem DELETE/TRUNCATE global, migração de produção, merge ou deploy automático.
- Branches/commits/artefatos com nomenclatura neutra; manter componentes e tokens visuais existentes.

## Review Focus

1. Unidade criada e localização não salva: recuperar etapa sem repetir POST de cadastro — T5.
2. Job atrasado após edição OWNER: CAS impede restaurar ponto/estado anterior — T7.
3. Resposta GPS após cliente escolher Todas/logout: posição não retorna à memória/cache — T3/T6.
4. Coleção muda entre páginas/mapa: deduplicar e não prometer snapshot completo — T2/T6.
5. Quota/provedor/manutenção indisponível: busca textual continua e nenhuma coordenada é inventada — T4/T7/T8.

## Interfaces compartilhadas

API/src/domain/application/services/discovery-contract.ts define:

```ts
type GeoPoint = { latitude: number; longitude: number };
type DiscoveryInput = { mode: 'ALL'; q?: string; page: number; limit: number }
  | { mode: 'NEARBY'; point: GeoPoint; radiusKm: 5 | 10 | 25 | 50; q?: string; page: number; limit: number };
type PublicShop = { id: string; name: string; slug: string; location: string;
  avatarUrl: string | null; coordinates: GeoPoint | null; distanceMeters: number | null };
type DiscoveryPage = { items: PublicShop[]; page: number; limit: number;
  total: number; hasNext: boolean; serverTime: string };
type Candidate = { candidateId: string; displayAddress: string; point: GeoPoint;
  expiresAt: string; attribution: 'Google Maps' };
type SetLocationCommand = { actorId: string; shopId: string; address: string;
  candidateId: string; point: GeoPoint; expectedVersion: number; mutationId: string };
```

Candidate.displayAddress é conteúdo da resposta ao vivo, não persistido. Candidato guarda somente metadados e campos permitidos pela spec. `LocationState` do GET privado inclui status, version, ponto válido e `lastOwnerMutation: {id,commandHash,savedVersion}|null`; hash não contém PII em claro e exige acesso atual.

## Grupo 1 — Dados e descoberta pública

### T1. Contratos, persistência e fixture isolada

**Files:** API/src/domain/application/services/discovery-contract.ts; API/src/domain/application/repositories/barbershop-locations-repository.ts; API/src/infra/drizzle/schema.ts; API/src/infra/drizzle/migrator.ts; API/test/helpers/isolated-discovery-db.ts; API/src/infra/drizzle/discovery-schema.integration.spec.ts.

**Consumes:** entidades users/barbershops/membership atuais. **Produces:** contratos acima, tabela barbershop_locations com version/confirmacao/proveniência, tabela temporária geocoding_candidates e registro de saúde/quotas; índices por unidade, validade e estado.

- [ ] Escrever testes: legado sem localização mantém conta/unidade; par incompleto/NaN/fora de faixa rejeitado; (0,0) é valor válido; fixture recusa URL remota/nome genérico antes de mutação.
- [ ] Executar `npx vitest run src/infra/drizzle/discovery-schema.integration.spec.ts` em DB dedicado `sb_discovery_test_*`; confirmar falha inicial pertinente.
- [ ] Implementar migration aditiva e reversibilidade segura. Endereço próprio fica separado; Google somente lat/lng temporárias/placeId e metadados mínimos; nenhum JSON bruto/Google formatted_address em persistência.
- [ ] Reexecutar testes e inspecionar schema/índices, preservando todas as linhas legadas. Não instalar extensão nem executar DDL em produção.
- [ ] Revisar diff e registrar checkpoint local neutro, somente após execução autorizada e checks verdes.

### T2. Busca textual e por proximidade

**Files:** API/src/domain/application/repositories/discovery-repository.ts; API/src/domain/application/use-cases/barbershop/search-barbershops/search-barbershops.ts; API/src/infra/drizzle/repositories/drizzle-discovery-repository.ts; API/src/infra/http/controllers/barbershop/search-barbershops.controller.ts; API/src/infra/http/factories/make-search-barbershops-controller.ts; API/src/infra/http/routes/barbershop.routes.ts; API/src/infra/http/swagger/index.ts; respectivos .spec.ts e discovery.integration.spec.ts.

**Consumes:** DiscoveryInput. **Produces:** `DiscoveryRepository.search(input: DiscoveryInput): Promise<DiscoveryPage>` e `SearchBarbershopsUseCase.execute(input)` retornando Either no padrão do projeto; GET /api/barbershops (ALL), POST /api/barbershops/nearby (NEARBY, latitude/longitude somente no body). Controller converte campos wire planos em input.point; PATCH faz a mesma conversão para SetLocationCommand.point.

- [ ] Testar ACTIVE/inativa, q literal com %/_, caixa/acentos, empates/id, borda exata de 10km, latitude/longitude extremos, zero e campo desconhecido. Filtro de distância ocorre antes do LIMIT; texto sem posição retorna distanceMeters null.
- [ ] Rodar testes red e implementar Haversine SQL com R=6.371.000m/clamp. Usar parâmetros SQL, projeção pública mínima, limite 1–50/default20, q<=120 e page>=1.
- [ ] Implementar total/hasNext da consulta, ordenação e consulta limitada. Coordenadas Google vencidas/manutenção inválida não entram na proximidade; lista textual conserva dados próprios.
- [ ] Testar HTTP no schema isolado: 400/200/503 coerentes e ausência de ownerId/CPF/CNPJ/posições pessoais em logs. Executar EXPLAIN/medição com 10.000 unidades; alvo SQL <=200ms no ambiente documentado, sem declarar SLA de produção.
- [ ] Registrar paginação best-effort e teste de atualização entre páginas; checkpoint após revisão. Não prometer coleção congelada.

## Grupo 2 — Adaptadores Google e aquisição de posição

### T3. Mapa de plataforma e posição transitória

**Files:** FE/src/shared/maps/google-map.types.ts; FE/src/shared/maps/GoogleMap.web.tsx; FE/src/shared/maps/GoogleMap.native.tsx; FE/src/shared/location/use-current-location.ts; FE/src/shared/location/location-provider.web.ts; FE/src/shared/location/location-provider.native.ts; FE/app.config.ts; FE/src/shared/config/env.ts; testes de adapters/hooks.

**Consumes:** GeoPoint e markers públicos. **Produces:** `GoogleMap({mode:'BROWSE'|'PICK',points,selectedPoint,onSelect,onPointChange})`; `useCurrentLocation()` com request/clear/status/point/capturedAt/accuracy. Nenhuma dependência de auth/features nas camadas shared.

- [ ] Testar biblioteca de mapa não carregada antes da abertura, SSR sem window, chave ausente, erro de SDK, point selecionado e cleanup. Escrever regressão de GPS pendente -> clear -> resposta atrasada não repõe posição.
- [ ] Instalar somente versões compatíveis via `npx expo install expo-location react-native-maps`; SDK web pela API oficial/loader verificado na versão escolhida. Preservar app.json ao compor app.config.ts.
- [ ] Implementar adapters isolados: web Maps JS, native PROVIDER_GOOGLE, acesso ao GPS por ação. Permissão negada/timeout10s/posição aproximada/expiração10min/resume/logout são estados explícitos. `clear()` descarta posição/referências e invalida aquisições pendentes; T6 orquestra remoção das queries e markers da feature, sem dependência inversa de shared para discovery. O mapa não pede GPS por conta própria; marker pessoal usa somente a captura explícita.
- [ ] Testar chaves separadas web/Android/iOS, nenhum segredo backend no bundle, um mapa por tela e nenhuma chamada real Google em CI. App Links/maps native exigem build apropriado; não declarar prova física por viewport ou Expo Go.
- [ ] Executar testes e typecheck/export; checkpoint após revisão. Sem chaves, renderizar indisponibilidade explícita e conservar lista.

### T4. Busca comercial com Google e candidatos

**Files:** API/src/domain/application/services/geocoding-provider.ts; API/src/infra/maps/google-geocoding-provider.ts; API/src/domain/application/use-cases/barbershop/search-location-candidates/search-location-candidates.ts; API/src/infra/http/controllers/maps/search-location-candidates.controller.ts; API/src/infra/http/routes/geocoding.routes.ts; API/src/infra/env/index.ts; API/docs/GOOGLE_MAPS_SETUP.md; testes correspondentes.

**Consumes:** conta verificada e endereço próprio. **Produces:** `searchCandidates({actorId,address,shopId?}): Promise<Candidate[]>`, no máximo5; POST /api/geocoding/search. T5 consome candidateId.

- [ ] Testar conta não verificada, BARBER/CLIENT sem intenção adequada, OWNER de outra unidade, candidato de outro ator, expiração15min, timeout, 429/5xx/JSON inválido do provedor e quota indisponível sem fail-open.
- [ ] Implementar busca explícita por botão, não autocomplete. Para onboarding usar intenção OWNER autoritativa/proprietário existente; unidade existente requer membership OWNER/ACTIVE.
- [ ] Persistir candidatos sem resposta bruta/label Google; guardar endereço próprio/hash, ator/escopo, lat/lng/placeId/expiração. Exibir label ao vivo com atribuição. Chave Google server somente em env, API restrita; timeout5s e sem chamadas ao vivo em testes.
- [ ] Implementar cotas persistentes: ator5/min e20/dia; projeto100 geocodings/dia, sendo20 reservados à manutenção. Nenhuma elevação automática; configurar quotas Google suportadas e alertas por SKU antes de ativar ambiente real. 429 usa Retry-After; falha do contador retorna503.
- [ ] Rodar testes/red-green e documentar chaves, restrições de domínio/package/bundle, egress quando aplicável, quotas, atribuição e URLs públicas de termos/privacidade. Checkpoint após revisão.

## Grupo 3 — Jornadas do proprietário e cliente

### T5. Salvar ponto com autorização, concorrência e recuperação

**Files:** API/src/domain/application/use-cases/barbershop/set-barbershop-location/set-barbershop-location.ts; API/src/infra/drizzle/repositories/drizzle-barbershop-locations-repository.ts; API/src/infra/http/controllers/barbershop/barbershop-location.controller.ts; API/src/infra/http/routes/barbershop.routes.ts e API/src/infra/http/swagger/index.ts; FE/src/features/barbershop/model/use-unit-location.ts; FE/src/features/barbershop/ui/UnitLocationView.tsx; FE/src/app/(app)/barbershop-location.tsx; FE/src/app/(app)/barbershop-setup.tsx; FE/src/features/barbershop/api/barbershop.api.ts; testes .spec.ts/.test.tsx.

**Consumes:** Candidate, SetLocationCommand, GoogleMap PICK. **Produces:** GET/PATCH /api/barbershops/:shopId/location, LocationState = {shopId,address,status,version,point,confirmedAt,validUntil,lastOwnerMutation} (datas/ponto null quando ausentes) e navegação OWNER para confirmar/revisar ponto.

- [ ] Testar OWNER ativo/cross-unit/role inválido; CAS expectedVersion; idempotência mutationId+actor+commandHash antes de validar candidato consumido; mesmo id/payload distinto409. Guard de auth atual vem antes de qualquer reconciliação.
- [ ] Implementar transação de endereço/ponto/versão/consumo do candidato; não escrever credenciais/perfil. Metadata Google inclui referência arredondada7 casas/fingerprint, ajuste explícito do pin, acquiredAt e validade; fonte não muda por simples confirmação.
- [ ] Integrar criação em duas etapas: POST existente -> atualizar vínculos -> PATCH versão0. Falha mostra Unidade criada/localização pendente; retry não repete cadastro. Resposta perdida consulta GET e reconhece última mutação; edição posterior não reconhecida exige revisão explícita. Em criação ambígua consultar unidades próprias antes de novo POST.
- [ ] Implementar entrada de gestão para unidades legadas e mensagem Revisar localização; distinção entre pendência do ponto e falha temporária do provedor. Nenhuma notificação nova. Endereço editado invalida candidato anterior.
- [ ] Provar HTTP/DB rollback do método real, resposta perdida, versão concorrente e navegação browser OWNER. Checkpoint após revisão.

### T6. Home do cliente, lista e mapa opcional

**Files:** FE/src/features/discovery/api/discovery.api.ts; FE/src/features/discovery/model/discovery.types.ts; FE/src/features/discovery/model/use-discovery.ts; FE/src/features/discovery/ui/ClientHomeView.tsx; FE/src/features/discovery/ui/ShopDiscoveryCard.tsx; FE/src/app/(client)/index.tsx; FE/src/app/(client)/bookings.tsx; testes de contrato/hook/UI.

**Consumes:** DiscoveryPage, GoogleMap BROWSE e useCurrentLocation. **Produces:** home com modos ALL/NEARBY, 20 por página, filtros visíveis e entrada no catálogo existente; DiscoveryApi.search(input) usa GET(q/page/limit) para ALL e POST(q/page/limit/latitude/longitude/radiusKm) para NEARBY, sem mode na query pública.

- [ ] Testar troca de q/raio/ponto durante requests, deduplicação, carregamento parcial do mapa, ALL->NEARBY->ALL com descarte da posição/cache, negação/timeout/resume e refresh sem misturar páginas.
- [ ] Implementar busca debounce350ms/abort/generation e cache em memória isolado por ator/mode/filtros. Ao parar localização/logout, orquestrar clear() do hook compartilhado e remover queries pessoais/mapa na feature. Implementar FlatList/lista responsiva e estados de primeira carga/carregar mais/erro/vazio. q/raio/modo continuam visíveis; não trocar modo/raio silenciosamente.
- [ ] Integrar cards públicos e Ver serviços -> /barbershops/[shopId]/services. Acesso pessoal a reservas/notificações/conta e CTA de descoberta em Meus Agendamentos. Não usar memberships como diretório, nem substituir carrinho.
- [ ] Mostrar distância aproximada em linha reta, captura HH:mm/accuracy disponível, Atualizar localização e Parar de usar/Todas com clear real. Aviso pré-permissão e links públicos de privacidade/termos conforme T4. Não adicionar Próximo agendamento global baseado apenas na página carregada.
- [ ] Testar navegação com múltiplos serviços e mapa lazy, ausência de métricas falsas e mapa com mensagem Somente resultados carregados. Checkpoint após revisão.

## Grupo 4 — Manutenção e homologação

### T7. Validade, limpeza e atualização de cache Google

**Files:** API/src/domain/application/use-cases/barbershop/refresh-location-cache/refresh-location-cache.ts; API/src/infra/drizzle/repositories/drizzle-location-maintenance-repository.ts; API/src/infra/http/controllers/maps/refresh-location-cache.controller.ts; API/src/infra/http/routes/internal-location.routes.ts; API/vercel.json; testes de integração com relógio/trigger.

**Consumes:** estado/version/fingerprint T1/T5, provider/cotas T4. **Produces:** GET /api/internal/locations/refresh com Bearer CRON_SECRET, heartbeat/contagens sanitizadas e estado efetivo de validade.

- [ ] Testar refresh a partir do dia20, limpeza até dia25 com margem30, falha de provedor, quota, timeout, job duplicado, edição OWNER após leitura do job e restauração de cache vencido. Testar retenção dos campos permitidos sem JSON/label Google.
- [ ] Implementar lotes de10/concurrency2/timeout5s, reserva de20 consultas/dia e execução dentro do limite da Function confirmado no ambiente. Atualizar somente se version/fingerprint/fonte não mudaram; referência Google alterada marca NEEDS_REVIEW e não move pin. Reaplicar ajuste apenas com referência igual.
- [ ] Implementar cron diário compatível Hobby (não pressupor Pro), heartbeat/alarme >36h e sweep oportunista indexado/lote100/timeout100ms. Sem tarefa de manutenção comprovada, bloquear ativação do cache em produção. Não alegar apagamento forense/backups; invalidar cache vencido antes de servir ambiente restaurado.
- [ ] Garantir que falha da manutenção desabilita coordenadas/proximidade, conserva busca textual e orienta OWNER. SELECT filtra validade independentemente do job; limpeza não bloqueia a lista textual.
- [ ] Executar testes DB reais, CAS/rollback e consumo contado; checkpoint após revisão. Registrar limites do scheduler externo sem prometer garantia absoluta de disponibilidade.

### T8. Homologação integrada e pacote de publicação

**Files:** API/src/infra/http/discovery-flow.integration.spec.ts; API/test/helpers/isolated-discovery-db.ts; FE/src/features/discovery/tests/discovery-flow.test.tsx; FE/docs/ENTREGA_DESCOBERTA_HOME_GEOLOCALIZACAO.md; API/docs/GOOGLE_MAPS_SETUP.md.

**Consumes:** todas as entregas anteriores. **Produces:** evidências reproduzíveis e pacote revisável para publicação.

- [ ] Criar fixture isolada com unidades ativas/inativas/sem ponto, coordenadas conhecidas e bordas dos quatro raios. Proibir conexão remota/cleanup global antes de qualquer SQL.
- [ ] Executar OWNER cadastro+pino/edição, cliente GPS permitido/negado, busca textual, lista/mapa e catálogo com dois serviços até reserva; old unit->confirmar localização->aparece próximo. Simular Google sem cobrança e bloquear rede externa em CI; registrar o que depende de chave real.
- [ ] Executar testes de restore/limpeza e performance, HTTP+PostgreSQL, suíte frontend/typecheck/export e checks API. Distinguir testes isolados, viewport, navegador, dispositivo físico e Google real.
- [ ] Revisar diff inteiro, fontes de chave/dados, logs e privacidade. Conferir migration aditiva/rollback e ambiente de chaves/quota/manutenção antes de qualquer publicação.
- [ ] Entregar relatório PASS/PARTIAL/FAIL/NOT TESTED e instruções visuais. Execução/PR/merge/deploy/configuração paga somente no escopo explicitamente autorizado. Não marcar Google real/nativo físico ou visual aprovados sem evidência.

## Auto-revisão do plano

Cobertura: UX aprovada -> T3/T5/T6; descoberta e projeção -> T1/T2; Google/quotas -> T4/T7; privacidade/revogação -> T3/T6; legado/candidato/concorrência -> T1/T5/T7; cadeia catálogo/reserva -> T8. Interfaces mantêm GeoPoint/DiscoveryInput/DiscoveryPage/Candidate/LocationState. Cinco Review Focus têm regressões nas tarefas indicadas. Nenhuma tarefa promete resolver geolocalização usando memberships ou seed de produção.

## Critério de avanço

Revisão técnica do árbitro e revisão humana do plano precedem implementação. A execução preserva grupos/tarefas com revisão antes do próximo. Chaves/configuração Google ausentes bloqueiam apenas a homologação real correspondente; adapters, testes isolados e código revisável continuam possíveis, sem inventar integração aprovada ou contratar serviço.

# Execução — Descoberta e geolocalização, Grupo 1 (T1 + T2)

Implemente integralmente o Grupo 1 do plano aprovado do Smart Barber: contratos/persistência da localização comercial e APIs públicas de descoberta por texto/proximidade. Execute, teste e revise; não entregue somente um plano ou sugestões. Pare após concluir T1 + T2.

## 1. Skills e documentos obrigatórios

Ative `$using-superpowers` e `$context7`:

- `C:/Users/Wellington/.codex/skills/using-superpowers/SKILL.md`.
- `C:/Users/Wellington/.agents/skills/context7/SKILL.md`.

Leia os arquivos por mecanismo de skills da plataforma; se inexistente, leia os SKILL.md disponíveis. Use as skills aplicáveis de execução/testes/verificação. O plano já foi aprovado: não reiniciar brainstorming nem pedir aprovação do mesmo escopo. Para Drizzle/PostgreSQL/Express/Zod, consulte Context7 nas versões instaladas antes de editar; se indisponível, documentação oficial e registro explícito da limitação. Não atualizar dependências para acompanhar um exemplo.

Leia integralmente:

1. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/superpowers/plans/2026-10-14-descoberta-home-geolocalizacao.md`, especialmente T1/T2, interfaces e restrições globais.
2. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_DESCOBERTA_HOME_GEOLOCALIZACAO_2026-10-14.md`, incluindo resoluções S1–S5/C1–C3/U1–U2.
3. `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/REVISAO_PLANO_DESCOBERTA_GEO_2026-10-14.md`.

API: `D:/smart_barber/api`. Frontend: `D:/smart_barber/Smart-Barber-frontend-mobile-web`.
Este grupo altera implementação somente na API; o frontend recebe apenas o relatório de entrega.

## 2. Preparação e escopo

Leia AGENTS.md e confira status/branch/HEAD/remotos dos dois repositórios. Os checkouts antigos têm trabalho local de etapas anteriores. Preserve tudo: não resetar, limpar, copiar src inteiro nem incorporar alterações de autenticação já integradas. Use uma branch/worktree isolada da main atual, com nomenclatura neutra, por exemplo `feat/discovery-api`. API deve conter pelo menos o PR #53 integrado (cd25511); confira referências atuais.

Faça T1 e depois T2, com revisão de interface/checks entre elas. Use um executor por tarefa e revisão independente se as capacidades do ambiente permitirem esse método já adotado; sem agentes disponíveis, execute sequencialmente e registre o limite. Não inventar consenso de revisão.

Não implementar telas, captura GPS, SDKs, geocodificação Google, edição de localização OWNER, jobs/cron, quotas Google ou fluxo de reserva novo. Esses pertencem aos Grupos 2–4. Não pedir chave Google: este grupo não precisa dela nem deve chamar serviço externo. Não instalar PostGIS/unaccent/extensões novas. Não alterar produção, schema remoto, faturamento ou dados legados para preencher coordenadas.

## 3. T1 — Contratos, persistência e testes isolados

Arquivos previstos na API:

- `src/domain/application/services/discovery-contract.ts`.
- `src/domain/application/repositories/barbershop-locations-repository.ts`.
- `src/infra/drizzle/schema.ts` e migração pelo padrão real do projeto, incluindo `src/infra/drizzle/migrator.ts` quando aplicável.
- `test/helpers/isolated-discovery-db.ts`.
- `src/infra/drizzle/discovery-schema.integration.spec.ts`.

Exporte os contratos GeoPoint, DiscoveryInput, PublicShop, DiscoveryPage e demais tipos compartilhados definidos no plano. Domain não importa Express, Drizzle ou React. Declare portas futuras com tipos coerentes, sem implementar endpoints/stubs que finjam comportamentos dos próximos grupos.

Persistência aditiva:

- `barbershop_locations`: uma localização por unidade, referência à barbearia, par de coordenadas anulável, estado UNCONFIRMED/CONFIRMED/NEEDS_REVIEW, version não negativa, confirmação, fonte/proveniência, aquisição/validade Google, placeId/referência geocodificada, ajuste do pin e metadados mínimos de última mutação OWNER previstos na spec.
- `geocoding_candidates`: id opaco, ator, unidade opcional/escopo de onboarding, hash do endereço próprio, lat/lng/placeId, criação/expiração e consumo. TTL de elegibilidade de 15 minutos. Não persistir label/JSON bruto/formatted_address Google.
- Estado de saúde/manutenção e buckets de uso necessários aos contratos futuros. Reutilizar infraestrutura se semanticamente adequada; documentar nomes, tipos, defaults e índices. Não implementar contador/provedor/job completo neste grupo.
- Índices por unidade/estado/validade e constraints do par de coordenadas. O endereço digitado continua no cadastro próprio, separado dos dados Google.

Legado: sem linha de localização equivale a UNCONFIRMED. Não fabricar (0,0), converter automaticamente endereço em ponto ou retirar unidade da busca textual. Coordenadas devem ser finitas: latitude [-90,90], longitude [-180,180], par completo ou ambos null. Zero é valor geográfico válido, não ausência.

Dados Google temporários têm origem e validade explícitas, sem cache permanente irrestrito. O plano prevê refresh a partir de 20 dias e limpeza até 25, com margem para 30; T1 prepara os campos/índices, sem implementar manutenção T7. Valores vencidos jamais são elegíveis por mera presença na tabela.

Escreva primeiro regressões que falhem de maneira pertinente; execute e registre red/green. Prove migration idempotente, preservação de usuários/unidades legados, constraints, índices e estados nulos em PostgreSQL real isolado.

## 4. T2 — APIs e projeção pública

Arquivos previstos:

- `src/domain/application/repositories/discovery-repository.ts`.
- `src/domain/application/use-cases/barbershop/search-barbershops/search-barbershops.ts`.
- `src/infra/drizzle/repositories/drizzle-discovery-repository.ts`.
- `src/infra/http/controllers/barbershop/search-barbershops.controller.ts`.
- `src/infra/http/factories/make-search-barbershops-controller.ts`.
- `src/infra/http/routes/barbershop.routes.ts` e `src/infra/http/swagger/index.ts`.
- Testes de use-case/controller/repositório e HTTP/SQL `discovery.integration.spec.ts` no diretório apropriado.

Reutilize padrões existentes antes de criar abstrações. Rotas novas, sem duplicar detalhe/catálogo/profissionais/disponibilidade/reservas:

### GET /api/barbershops

Público. Query `q?`, `page?`, `limit?`. Defaults page=1, limit=20, máximo50. q trim/normalizado até120 caracteres. Somente unidades ACTIVE, inclusive as que ainda não têm ponto. Ordenação por nome normalizado e id.

Texto: busca em nome/endereço próprio, sem distinção de caixa/acentos; `%`, `_` e barra de escape são literais, não curingas arbitrários. Parametrizar SQL. Validar inteiros seguros, arrays/objetos indevidos, limites e overflow de offset. Não aceitar coordenadas nesta URL.

### POST /api/barbershops/nearby

Público. JSON `{ q?, page?, limit?, latitude, longitude, radiusKm }`; radiusKm somente5/10/25/50. Mesmos defaults de paginação/texto. Coordenadas numéricas finitas e completas; rejeitar NaN/Infinity/campos inválidos. Converter latitude/longitude de wire para `DiscoveryInput.point` no controller.

Posição do cliente é somente entrada transitória de cálculo: não gravar em tabela, histórico, URL, cache compartilhado, logs ou erros SQL devolvidos. Resposta Cache-Control no-store. Não registrar body/SQL com posição pessoal em erro de consulta; sanitize erros antes de passá-los ao adaptador HTTP genérico.

Distância Haversine em metros, R=6.371.000, clamp numérico em [0,1], filtragem por raio antes da paginação. Somente ACTIVE + ponto confirmado válido/elegível. Ordenação distância/id, inclusive empates e bordas. Não arredondar distância antes de filtrar ou ordenar.

### Resposta canônica

```ts
type PublicShop = {
  id: string; name: string; slug: string; location: string;
  avatarUrl: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  distanceMeters: number | null;
};
type DiscoveryPage = {
  items: PublicShop[]; page: number; limit: number;
  total: number; hasNext: boolean; serverTime: string;
};
```

`DiscoveryRepository.search(input): Promise<DiscoveryPage>`, com `SearchBarbershopsUseCase.execute(input)` retornando Either no padrão do projeto. Nada de ownerId, CPF, CNPJ, e-mail/telefone de conta, tokens, mutation hashes ou campos internos do Google na projeção pública.

Em ALL sem posição, distanceMeters é null. Coordenadas só aparecem se publicáveis/elegíveis; ausentes, vencidas ou com manutenção não saudável ficam null, sem impedir texto. NEARBY distingue lista vazia (200) de infraestrutura/saúde indisponível (503); não fabricar sucesso vazio ou heartbeat verde. A saúde é lida do contrato/tabela de T1; sua atualização real só vem em T7. Fixtures sintéticas podem preparar estado saudável para testar cálculo, nunca seeder isso como prova de produção.

`total` e `hasNext` devem corresponder à consulta/filtros, sem inferi-los do tamanho de uma página. Documente consistência best-effort entre requests: ordenação não congela a coleção. Inserção/edição concorrente pode mudar páginas; frontend posterior deduplica por id e oferece refresh. Não adicionar snapshot/cursor novo ou prometer completude estável sem necessidade.

## 5. Provas mínimas obrigatórias

1. Busca textual: ACTIVE/inativa, sem localização, caixa/acentos, q vazio/120/121, caracteres `%/_/\`, paginação, página sem itens e projeção mínima.
2. Proximidade: coordenadas conhecidas, metros corretos dentro da tolerância declarada, empate/id, borda inclusiva do raio, unidade longe filtrada antes do LIMIT, quatro raios, (0,0), extremos e entradas inválidas.
3. Validade/saúde: CONFIRMED vigente aparece; UNCONFIRMED/NEEDS_REVIEW/vencida não. Saúde ausente/indisponível não vira verde; ALL funciona e NEARBY retorna erro recuperável conforme contrato.
4. Privacidade: capturar logger/erro simulado contendo marcadores sintéticos e garantir que latitude/longitude do cliente e parâmetros SQL não apareçam em resposta/log público. Nenhuma persistência de posição pessoal.
5. Persistência: migration aditiva/idempotente, fixture que recusa banco remoto/genérico antes de mutação, cleanup apenas do schema criado pela suíte. Não repetir os DELETE globais das revisões anteriores.
6. HTTP real: subir Express em porta efêmera, chamar rotas via fetch/HTTP e verificar status/headers/body. Mock de Request/Response é unitário, não evidência HTTP.
7. Performance: fixture de10.000 unidades, EXPLAIN e medições da consulta própria com objetivo <=200ms no ambiente documentado. Não chamar Google para essa carga. Se não atingir, ajustar consulta/índices preservando contrato antes de declarar PASS.
8. Concorrência entre páginas: demonstrar ordenação determinística e documentar que alterações podem deslocar itens; não exigir um snapshot que o contrato não oferece.

O helper de integração exige variável dedicada, por exemplo `DISCOVERY_TEST_DATABASE_URL`, host loopback e banco explicitamente descartável `sb_discovery_test_*`. Verifique identidade da conexão. Use schema aleatório próprio com search_path e remova somente esse schema. Não importar/criar db global antes de validar o alvo. Sem a variável, a integração fica NOT TESTED/skip explícito, nunca PASS implícito. Procure PostgreSQL local já disponível antes de considerar bloqueio; não usar credenciais adivinhadas, alterar autenticação global nem iniciar serviços alheios.

## 6. Checks e revisão

Execute regressões focalizadas, unitários pertinentes, HTTP+PostgreSQL reais, TypeScript e Biome conforme scripts/AGENTS do checkout. Confira git diff --check e arquivos staged, se houver. Não executar uma suíte legada que limpe tabelas contra DATABASE_URL desconhecida; separar unitário de integração explicitamente e registrar exclusões/motivo.

Não rodar testes frontend sem alteração funcional nele. O Grupo1 não constitui prova de mapa, GPS real, geocodificação Google, manutenção, reserva integrada ou dispositivo físico. Não alterar esses módulos para silenciar falhas alheias ao escopo.

Faça revisão independente de T1 antes de T2 e do diff final. Corrija achados reais no próprio grupo; não introduza funcionalidades futuras. Dúvida técnica rotineira deve ser resolvida com contratos/código/docs; pergunte somente sobre bloqueador externo que dependa do usuário.

## 7. Entrega e parada

Salve:
`D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/ENTREGA_DESCOBERTA_GRUPO_1_2026-10-14.md`.

Inclua:

- Branch/HEAD/base e arquivos alterados, com APIs/campos/tipos publicados para os próximos grupos.
- Matriz T1/T2 -> teste -> evidência PASS/PARTIAL/FAIL/NOT TESTED; distinguir unitário, mock, SQL e HTTP reais.
- Comandos e contagens exatas, EXPLAIN/medições, garantias e limites de paginação.
- Migration preparada/testada, modo seguro de reprodução e ausência de dados remotos/Google real.
- Resultado da revisão independente e pendências concretas, sem alegar implementação dos próximos grupos.

Não fazer commit, push, PR, merge, deploy, migração de produção ou configuração de faturamento nesta execução. O checkpoint do plano é um diff local revisável neste handoff. Não avançar a T3–T8. Ao terminar, resumo breve em português e link absoluto do relatório.

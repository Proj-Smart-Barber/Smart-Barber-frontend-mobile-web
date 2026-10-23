# Plano de Implementação: Mídia, Galeria, Link Google e Avaliações Próprias

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar os fluxos integrados e testados de fotos (avatar/logo/capa/galeria), link opcional do Google Maps e avaliações próprias verificadas com moderação administrativa no Smart Barber.

**Architecture:** Clean Architecture DDD no backend Express/TypeScript com PostgreSQL/Drizzle, armazenamento de objetos compatível com S3 (Cloudflare R2) via presigned URLs com validação estrita no servidor (magic bytes, dimensões, remoção de EXIF/GPS, recusa de HEIC não convertido), e frontend universal Expo Router preservando os tokens de design Obsidian/Crimson/Ivory e componentes LiquidGlassView.

**Tech Stack:** Node.js, Express 5, TypeScript, Drizzle ORM, PostgreSQL, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, Expo SDK 57.0.19, `expo-image-picker`, TanStack Query, Vitest.

**Spec:** `docs/PLANO_AGENDAMENTO_MIDIA_AVALIACOES_2026-10-22.md`

## Global Constraints

- Preservar integralmente as regras e correções da Fase 1 (relógio PostgreSQL, filtro de passado, referência monotônica, datas no fuso da unidade, locks, idempotência, cancelamento com timeout).
- PR #51 (`feat/google-maps-config`) é independente: não mesclar, não fechar, não sobrescrever.
- Nomenclatura neutra em branches, commits e artefatos de código (`feat/...`, `fix/...`, `chore/...`), sem nomes de ferramentas ou agentes.
- Provedor de armazenamento definido: Cloudflare R2 (compatível com S3). Upload serverless direto via URL assinada; API valida objeto no storage sem manter arquivo no disco local.
- Limites de mídia: 5 MB por avatar/logo, 10 MB por foto do espaço. Dimensões máximas 4096x4096px, máx 16MP decodificados. Formatos JPEG, PNG, WebP. Recusa explícita de HEIC sem conversão comprovada.
- Remoção obrigatória de metadados EXIF/GPS e normalização de orientação.
- Unicidade de avaliação por reserva COMPLETED, nota 1 a 5 inteira, comentário até 1.000 caracteres. Autor pode editar (com detecção de versão/conflito) e remover logicamente (soft-delete).
- Moderação exclusiva por PLATFORM_ADMIN via banco de dados; proprietário e barbeiro não avaliam a própria unidade nem censuram críticas legítimas.
- Sem avaliações: exibir "Ainda sem avaliações" (sem notas, estrelas ou comentários fabricados).
- Sem redesenho: preservar tokens Obsidian/Crimson/Ivory, fontes oficiais e contratos do LiquidGlassView.

## Review Focus

1. Upload incompleto, rejeitado ou corrompido não pode sobrescrever ou apagar a foto anterior do usuário/unidade.
2. Duas requisições simultâneas de reordenação ou adição à galeria devem respeitar o limite máximo de 10 fotos e capa única.
3. Tentativa de avaliar reserva não concluída, futura, cancelada ou de outro cliente deve ser rejeitada pelo backend com código e mensagem adequados.
4. Edição de avaliação com versão desatualizada (`expectedVersion`) deve retornar HTTP 409 sem perda do comentário novo.
5. Comentários de avaliações devem ser tratados estritamente como texto puro, prevenindo injeção de HTML/XSS nas projeções públicas.

---

### Task 1: Backend Storage Service & Cloudflare R2 Presigning / Upload Verification

**Files:**
- Create: `src/domain/application/services/storage-service.ts`
- Create: `src/domain/application/services/image-processor-service.ts`
- Create: `src/infra/storage/r2-storage-service.ts`
- Create: `src/infra/storage/pure-image-processor.ts`
- Create: `test/fakes/fake-storage-service.ts`
- Create: `test/helpers/loopback-object-store.ts`
- Create: `src/infra/storage/r2-storage-service.spec.ts`

**Interfaces:**
- Consumes: `process.env.STORAGE_*`
- Produces: `StorageService` interface, `ImageProcessorService` interface, `R2StorageService`, `PureImageProcessor`

- [ ] **Step 1: Write the failing tests for storage service and image processor**
  Cobrir: geração de URL assinada de PUT, verificação de buffer real (magic bytes para JPEG, PNG, WebP), recusa de SVG/HTML/binário executável, detecção de dimensões, remoção de EXIF/GPS, e teste de upload HTTP real contra servidor de loopback S3-compatible.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test src/infra/storage/r2-storage-service.spec.ts`
  Expected: FAIL (modules not found)

- [ ] **Step 3: Implement StorageService and PureImageProcessor**
  Criar parser de cabeçalhos de imagem com validação de magic numbers, sanitização de EXIF (remoção de chunks `APP1`/`eXIf`/`EXIF`), e cliente S3 R2 configurável.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test src/infra/storage/r2-storage-service.spec.ts`
  Expected: PASS

---

### Task 2: Backend Entities, Drizzle Schema & Idempotent Migrations

**Files:**
- Modify: `src/infra/drizzle/schema.ts`
- Create: `src/domain/enterprise/entities/media.ts`
- Create: `src/domain/enterprise/entities/barbershop-gallery-item.ts`
- Create: `src/domain/enterprise/entities/review.ts`
- Create: `src/domain/enterprise/entities/review-moderation-log.ts`
- Create: `src/domain/enterprise/entities/review-report.ts`
- Create: `src/domain/application/repositories/media-repository.ts`
- Create: `src/domain/application/repositories/barbershop-gallery-repository.ts`
- Create: `src/domain/application/repositories/reviews-repository.ts`
- Modify: `src/infra/drizzle/migrator.ts`
- Create: `test/repositories/in-memory-media-repository.ts`
- Create: `test/repositories/in-memory-barbershop-gallery-repository.ts`
- Create: `test/repositories/in-memory-reviews-repository.ts`
- Create: `src/domain/enterprise/entities/media.spec.ts`
- Create: `src/domain/enterprise/entities/review.spec.ts`

**Interfaces:**
- Consumes: `Entity`, `UniqueEntityId`
- Produces: `Media`, `BarbershopGalleryItem`, `Review`, `ReviewReport`, `ReviewModerationLog` e repositórios em memória e Drizzle

- [ ] **Step 1: Write the failing tests for domain entities and repos**
  Testar validação de regras invariantes: purpose permitido, status transition (PENDING -> READY/REJECTED), rating 1-5, review status (PUBLISHED, HIDDEN_BY_MODERATION, DELETED_BY_AUTHOR), version increment.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test src/domain/enterprise/entities/media.spec.ts src/domain/enterprise/entities/review.spec.ts`
  Expected: FAIL

- [ ] **Step 3: Implement entities, schema additions and in-memory repositories**
  Adicionar tabelas `media`, `barbershop_gallery`, `reviews`, `review_reports`, `review_moderation_logs` e colunas aditivas em `barbershops`. Atualizar migrator idempotente.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test src/domain/enterprise/entities/media.spec.ts src/domain/enterprise/entities/review.spec.ts`
  Expected: PASS

---

### Task 3: Backend Media & Gallery Use Cases & HTTP Layer (Fase 2)

**Files:**
- Create: `src/domain/application/use-cases/media/initiate-upload/initiate-upload.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/media/confirm-upload/confirm-upload.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/media/update-user-avatar/update-user-avatar.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/media/remove-user-avatar/remove-user-avatar.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/media/manage-barbershop-gallery/manage-barbershop-gallery.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/barbershop/update-barbershop-google-url/update-barbershop-google-url.ts` + `.spec.ts`
- Create: `src/infra/http/controllers/media/initiate-upload.controller.ts` + `.spec.ts`
- Create: `src/infra/http/controllers/media/confirm-upload.controller.ts` + `.spec.ts`
- Create: `src/infra/http/controllers/media/update-user-avatar.controller.ts`
- Create: `src/infra/http/controllers/media/manage-barbershop-gallery.controller.ts`
- Create: `src/infra/http/controllers/barbershop/update-barbershop-google-url.controller.ts`
- Modify: `src/infra/http/routes/index.ts`
- Modify: `src/infra/http/swagger/index.ts`

**Interfaces:**
- Consumes: `MediaRepository`, `BarbershopGalleryRepository`, `BarbershopsRepository`, `UsersRepository`, `StorageService`, `ImageProcessorService`
- Produces: Rotas `/api/media/upload-intent`, `/api/media/confirm`, `/api/users/me/avatar`, `/api/barbershops/:shopId/gallery`, `/api/barbershops/:shopId/google-url`

- [ ] **Step 1: Write the failing tests for media and gallery use cases**
  Testar autorização estrita (somente próprio usuário altera avatar; somente OWNER altera galeria e Google URL), verificação de arquivo antes de ativação, limite de 10 fotos, capa única e ordenação atômica.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test src/domain/application/use-cases/media/`
  Expected: FAIL

- [ ] **Step 3: Implement use cases, controllers, routes and swagger docs**
  Implementar casos de uso com Either monad, controllers com Zod schemas, e registrar rotas.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test src/domain/application/use-cases/media/`
  Expected: PASS

---

### Task 4: Backend Reviews & Moderation Use Cases & HTTP Layer (Fase 3)

**Files:**
- Create: `src/domain/application/use-cases/reviews/create-review/create-review.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/reviews/update-review/update-review.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/reviews/delete-review/delete-review.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/reviews/list-barbershop-reviews/list-barbershop-reviews.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/reviews/get-booking-review/get-booking-review.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/reviews/report-review/report-review.ts` + `.spec.ts`
- Create: `src/domain/application/use-cases/reviews/moderate-review/moderate-review.ts` + `.spec.ts`
- Create: `src/infra/http/controllers/reviews/create-review.controller.ts` + `.spec.ts`
- Create: `src/infra/http/controllers/reviews/update-review.controller.ts`
- Create: `src/infra/http/controllers/reviews/delete-review.controller.ts`
- Create: `src/infra/http/controllers/reviews/list-barbershop-reviews.controller.ts`
- Create: `src/infra/http/controllers/reviews/get-booking-review.controller.ts`
- Create: `src/infra/http/controllers/reviews/report-review.controller.ts`
- Create: `src/infra/http/controllers/reviews/moderate-review.controller.ts`
- Modify: `src/infra/http/routes/index.ts`
- Modify: `src/infra/http/swagger/index.ts`

**Interfaces:**
- Consumes: `ReviewsRepository`, `BookingsRepository`, `BarbershopsRepository`, `MembershipsRepository`, `UsersRepository`
- Produces: Rotas `/api/bookings/:bookingId/review`, `/api/barbershops/:shopId/reviews`, `/api/reviews/:reviewId/report`, `/api/admin/reviews/moderation`

- [ ] **Step 1: Write the failing tests for reviews use cases**
  Testar:
  - Criação válida apenas por beneficiário de reserva COMPLETED.
  - Rejeição de reservas futuras, canceladas, no-show ou de outro cliente.
  - Rejeição de proprietário/barbeiro avaliando a própria unidade.
  - Unicidade: reenvio simultâneo resulta em erro ou idempotência sem duplicar.
  - Edição com expectedVersion e recusa se moderado.
  - Remoção lógica (`DELETED_BY_AUTHOR`).
  - Recálculo exato de média e contagem (apenas PUBLISHED).
  - Moderação exclusiva por PLATFORM_ADMIN com histórico de motivo.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test src/domain/application/use-cases/reviews/`
  Expected: FAIL

- [ ] **Step 3: Implement reviews and moderation use cases and HTTP controllers**
  Implementar lógica de negócio, recálculo atômico de métricas, controllers e middlewares de autenticação/autorização.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test src/domain/application/use-cases/reviews/`
  Expected: PASS

---

### Task 5: Frontend Contracts, DTOs, API Clients & State Management

**Files:**
- Create: `src/features/media/api/media.contract.ts`
- Create: `src/features/media/api/media.api.ts`
- Create: `src/features/media/model/use-avatar-upload.ts`
- Create: `src/features/media/model/use-barbershop-gallery.ts`
- Create: `src/features/reviews/api/reviews.contract.ts`
- Create: `src/features/reviews/api/reviews.api.ts`
- Create: `src/features/reviews/model/use-booking-review.ts`
- Create: `src/features/reviews/model/use-barbershop-reviews.ts`
- Create: `src/features/reviews/model/use-moderation.ts`
- Create: `src/features/media/tests/media.api.test.ts`
- Create: `src/features/reviews/tests/reviews.api.test.ts`

**Interfaces:**
- Consumes: `HttpClient`, TanStack Query `useQuery`, `useMutation`
- Produces: Hooks e clientes tipados para fotos, galeria, link Google e avaliações

- [ ] **Step 1: Write failing tests for media and review frontend API clients**
  Testar contrato de requisição, tratamento de erros HTTP (400, 401, 403, 409), payload serializado e mapeamento de resposta.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test src/features/media/tests/ src/features/reviews/tests/`
  Expected: FAIL

- [ ] **Step 3: Implement contracts, clients and custom hooks**
  Implementar chamadas HTTP tipadas, tratamento de cancelamento com timeout, e invalidação de cache cirúrgica no QueryClient.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test src/features/media/tests/ src/features/reviews/tests/`
  Expected: PASS

---

### Task 6: Frontend UI Components: Avatar, Gallery, Google Link & Reviews

**Files:**
- Create: `src/features/media/ui/avatar-uploader.tsx`
- Create: `src/features/media/ui/barbershop-gallery-manager.tsx`
- Create: `src/features/media/ui/barbershop-gallery-view.tsx`
- Create: `src/features/barbershop/ui/google-profile-link.tsx`
- Create: `src/features/reviews/ui/review-form-modal.tsx`
- Create: `src/features/reviews/ui/reviews-list.tsx`
- Create: `src/features/reviews/ui/star-rating.tsx`
- Create: `src/features/reviews/ui/report-review-modal.tsx`
- Create: `src/features/reviews/ui/moderation-queue-view.tsx`
- Modify: `src/app/(tabs)/perfil/index.tsx` (ou tela de perfil existente)
- Modify: `src/features/barbershop/ui/barbershop-details.tsx` (ou equivalente no catálogo)
- Modify: `src/features/bookings/ui/booking-card.tsx` (CTA "Avaliar atendimento")
- Create: `src/features/media/tests/avatar-uploader.test.tsx`
- Create: `src/features/reviews/tests/review-form-modal.test.tsx`
- Create: `src/features/reviews/tests/reviews-list.test.tsx`

**Interfaces:**
- Consumes: `AvatarUploader`, `BarbershopGalleryManager`, `ReviewFormModal`, `ReviewsList`
- Produces: Componentes integrados que respeitam o DESIGN.md (cores Obsidian/Crimson/Ivory, acessibilidade a11y, feedback tátil e visual)

- [ ] **Step 1: Write failing UI component tests**
  Testar estados de loading, erro com retry, formulário de avaliação com validação de nota 1-5 e limite de 1000 caracteres, exibição de "Ainda sem avaliações" quando lista vazia, e renderização de galeria.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test src/features/media/tests/avatar-uploader.test.tsx src/features/reviews/tests/`
  Expected: FAIL

- [ ] **Step 3: Implement UI components and integrate into screens**
  Implementar componentes com `LiquidGlassView`, `expo-image-picker` para web/mobile com fallback para input web, controles de toque acessíveis (min 44x44px) e suporte a teclado.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test src/features/media/tests/avatar-uploader.test.tsx src/features/reviews/tests/`
  Expected: PASS

---

### Task 7: Full System Verification, Typecheck, Real Disposable Integration Tests & Delivery Report

**Files:**
- Create: `src/infra/http/media-and-reviews.integration.spec.ts` (na API)
- Create: `docs/ENTREGA_MIDIA_AVALIACOES_2026-10-22.md`

**Interfaces:**
- Consumes: All implementations from Tasks 1-6
- Produces: Verificação ponta a ponta e relatório consolidado

- [ ] **Step 1: Write and run real disposable integration test in API**
  Executar teste com banco isolado e storage loopback cobrindo todo o ciclo: upload de avatar, verificação, associação, galeria com até 10 fotos, link Google, criação de avaliação de booking concluído, impedimento de duplicidade, edição concorrente, moderação por admin e recálculo da média.

- [ ] **Step 2: Run full typecheck and lint on API worktree**
  Commands: `npm run lint` e `npx tsc --noEmit` na API

- [ ] **Step 3: Run full typecheck and lint on Frontend worktree**
  Commands: `npm run typecheck`, `npm test` e `npm run build` (expo export -p web em diretório de teste)

- [ ] **Step 4: Generate delivery documentation in `docs/ENTREGA_MIDIA_AVALIACOES_2026-10-22.md`**
  Registrar todas as evidências, matriz de aceite, variáveis de ambiente necessárias e status PASS/NOT TESTED/BLOCKED.

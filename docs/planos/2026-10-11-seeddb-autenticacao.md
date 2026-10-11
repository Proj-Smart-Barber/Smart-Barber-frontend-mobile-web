# SeedDB compatível com autenticação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** todas as contas fictícias do seed são verificadas para login, incluindo reparo seletivo de registros antigos sem afetar usuários reais.

**Architecture:** plano de reconciliação read-only delimita identidades/ownership; apply transacional executa apenas decisões aprovadas. Engine demo reutiliza essa política e preserva INSERTs novos já verificados; auditoria de dados é separada de testes HTTP/mutações.

**Tech Stack:** TypeScript/Drizzle/PostgreSQL/Vitest, schema users.emailVerifiedAt existente e value object Cpf atual.

**Spec:** [análise atual de seed](../ANALISE_SEEDDB_AUTENTICACAO_2026-10-11.md) e [adendo D14 do desenho](../DESENHO_INTEGRACAO_E_DECISOES_2026-10-11.md).

## Global Constraints

- Exceção exclusivamente para população fictícia gerenciada pelo seed; User.create/cadastro normal não passa a verificar e-mail por default.
- Não desabilitar verificação no login nem adicionar bypass por domínio/NODE_ENV/flag global.
- Timestamp existente preservado; ID, senha, e-mail e histórico não são recriados. CPF placeholder só muda por mapa de fixture/provenance explicitamente validado, sem colisão.
- Namespace/logicalKey/recordId/identidade e ownership comprovado; e-mail ou registry isolados não bastam.
- Auditoria não emite DDL, não importa app, não gera credenciais/manifestos e não faz rollback.
- Basic db:seed é destrutivo: somente banco isolado descartável criado para a execução.
- Aplicar/migrar banco remoto/existente exige alvo e diff concretos aprovados; código e testes isolados vêm antes.

## Review Focus

- Registro adotado por e-mail pertence a outro usuário: S1 bloqueia sem auto-confirmação.
- Segunda execução altera verifiedAt/duplicados: S2 atualiza sóNULL e preserva campos e FKs.
- Dry-run escreve DDL/credenciais: S1 espiona todas as mutations/files e separa inicialização.
- Fixture CPF inválida ou conflito legacy→novo: S3 usa Cpf e não troca identidade real.
- Só staff autentica: S4 cobre clientes/profissionais/owner e gestor restrito, preservando403 para não-seed.

## Ordem e responsabilidade

Incluído pelo usuário para o agente executor do plano completo. Ler todos os planos e atualizar schema/seed coerentemente; etapas S1–S3 podem ser preparadas sem rodar banco, mas S4 ocorre após contratos de autenticação/identidade e schemas de reservas aplicados no ambiente isolado. Atribuições históricas de frontend/backend indicam revisão humana; não autorizam sobrescrever trabalho em andamento.

## Task S1 — Plano read-only e identificação de ownership

**Files API:** criar `src/infra/drizzle/demo-seed/user-reconciliation.ts`, `user-reconciliation.spec.ts`; adaptar `registry.ts`, `types.ts`, `engine.ts`, `cli.ts`. Registry read-only não chama ensureRegistryTable; DB sem registry é reportado, não inicializado em inspeção.

**Interfaces:** `planSeedUsers({fixtures,registry,users,provenance}):SeedUserPlan`; plano inclui new/reused/verificationUpdates/conflicts e mapa de identidade esperado, sem password/hash/token. `inspectSeedUsers()` somente seleciona candidatos e identidade necessária; não carrega gerador de credenciais ou app. Provenance desconhecida bloqueia candidate; legacy tableName exige resolução validada, não trust automático.

- [ ] Escrever `unmanaged_email_collision_is_not_adopted`, `registry_identity_mismatch_is_blocked`, `dry_run_has_no_db_or_file_writes`, `rollback_and_dry_run_do_not_delete`. Assertions: verificationUpdates vazio para conta externa; conflitos explícitos; spies de insert/update/delete/executeDDL/writeFile não chamados; estado fake antes/depois igual.
- [ ] Rodar `npm test -- src/infra/drizzle/demo-seed/user-reconciliation.spec.ts`; confirmar falhas antes da separação de leitura/escrita.
- [ ] Implementar validação idêntica entre planejar/aplicar, e resumo sanitizado com namespace e contagens; não selecionar hashes/senhas para relatório. Auditar caminhos de dry-run antes de anunciar “sem alteração”.
- [ ] Repetir testes/TypeScript/Biome; checkpoint `refactor: separar inspeção e aplicação do seed` no fluxo autorizado.

## Task S2 — Criação e backfill de verificação

**Files API:** criar `src/infra/drizzle/demo-seed/user-reconciliation.repository.ts` e specs; modificar engine e branch de reutilização. Preservar emailVerifiedAt presente nos INSERTs do seed básico e demo.

**Interfaces:** `applySeedUserPlan(plan):Promise<{created,reused,verifiedNow,alreadyVerified,conflicts}>`. Revalidar ownership/identidade sob transação, atualizar porIDs aprovados+email/CPF esperados+emailVerifiedAtISNULL com horaPG. Nenhum cadastro fora do conjunto entra nessa operação.

- [ ] Testar `managed_null_is_verified`, `existing_timestamp_is_preserved`, `second_apply_is_idempotent`, `non_seed_user_stays_unverified`, `failure_rolls_back`. Assertions: só confirmação nula muda; id/senha/e-mail/FKs iguais; segunda chamadaverifiedNow=0; cliente comum continuaNULL; conflito não escreve.
- [ ] Rodar specs pertinentes; confirmar falhas para branchreused atual sem reparo.
- [ ] Implementar apply seletivo e geração de credenciais apenas para registros realmente novos durante apply. Não resetar senha de usuário reutilizado, não enviar SMTP e não definir defaultNow global na coluna/users factory.
- [ ] Repetir testes/TypeScript/Biome; checkpoint `fix: verificar e-mails de contas fictícias gerenciadas` no fluxo autorizado.

## Task S3 — Fixtures e compatibilidade do plano completo

**Files API:** modificar `src/infra/drizzle/demo-seed/fixtures.ts`, `types.ts`, engine e `src/infra/drizzle/seed.ts`; criar specs de validade/unicidade da população. Adaptar entradas de membership/bookings/carts ao schema final, preservando seed lógico existente.

**Interfaces:** cada fixture tem logicalKey estável, CPF sintético válido/único, e-mail canônico e tipo global explícito quando schema disponível. Registros antigos recebem mapeamento legado conhecido, nunca alteração por similaridade. Seed de gestor somente operador/CLI restrito em ambiente isolado ou administração de seed explicitamente autorizada; nenhuma rota pública concede PLATFORM_ADMIN.

- [ ] Testar `all_fixture_cpfs_are_valid_unique`, `fixture_email_identity_is_unique`, `legacy_placeholder_repair_preserves_id`, `admin_is_not_inferred_from_email`, `normal_signup_is_unverified`. Assertions: Cpf.isValid true para todas fixtures; nenhuma duplicidade; legacyID/hash/vínculos preservados; gestor apenas fixture explícita/provisionamento restrito; signup real retorna contaNULLverificação.
- [ ] Validar base atual antes de corrigir: dois de três CPFs básicos e20de20demo falham dígitos verificadores na auditoria estática. Gerar valores sintéticos válidos; não presumir que trocar strings no fixture reparou DB antigo.
- [ ] Implementar mapa de placeholders e validação de colisões; reparar apenas registros comprovadamente fictícios e aprovados no plano, ou bloquear o registro sem prova. Não apagar/recriar população para contornar identidade.
- [ ] Preservar20contas atuais e duas unidades; gestor restrito pode acrescentarfixture de teste sem tornar contagem global de users uma prova de sucesso. Reservas se adaptam a múltiplos itens e não recebem requestId inventado como se fossem criadas por HTTP.
- [ ] Repetir specs/checks; checkpoint `fix: alinhar fixtures do seed aos contratos de autenticação` no fluxo autorizado.

## Task S4 — Auditoria e smoke em ambiente isolado

**Files API:** adaptar `demo-seed/test-verification.ts`; criar auditoria read-only separada e harness HTTP de login das identidades demo. O script atual importaapp/cancela e recria reserva; não executá-lo em banco existente como inspeção.

- [ ] Criar banco descartável nomeado para esta execução e impor env de teste antes de qualquer import; confirmar banco/host e bloquear `.env` de produção, startup migration e SMTP real no caminho de auditoria.
- [ ] Aplicar schema e seed somente nesse banco, sob transação e dados fictícios. Auditar população esperada por namespace/logicalKey, não SELECTtodo banco/classificação por existência de membership.
- [ ] Verificar novos/reutilizados antigos comNULL, já verificados e reexecução; compare IDs/hash/timestamps/FKs internamente sem mostrar seus valores sensíveis.
- [ ] Testar HTTP201 para todas as contas demo com credenciais corretas mantidas privadas; incluir12clientes, não somente8profissionais, e fixturegestor restrita quando criada. Cliente externo ao seed comNULLrecebe403email_not_verified; entrada inválida mantém401.
- [ ] Confirmar FakeEmailService sem envio para fictícios. Testes de confirmação/reset com contas normais continuam separados, sem tornar fixtures negativas verificadas.
- [ ] Rodar suíte backend, `npx --no-install tsc --noEmit`, Biome e auditoriaSQL/HTTP sanitizada. Relatar PASS/PARTIAL/FAIL/NOT TESTED por camada; fixture/PGlocal não é prova de produção.

**Estado inicial:** plano escrito; nenhuma alteração de código ou banco executada nesta etapa. Em banco existente, o agente prepara primeiro auditoria/read-only e diff de candidatos; aplicar fora do banco descartável é etapa posterior com alvo concreto autorizado.

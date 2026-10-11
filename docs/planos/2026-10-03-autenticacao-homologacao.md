# Contratos e homologação de autenticação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provar que os contratos e jornadas de autenticação funcionam juntos, separando fixture, HTTP com banco de teste, web real e dispositivo nativo.

**Architecture:** Fixtures versionadas sem segredos para desenvolvimento independente; harness HTTP que injeta banco/clock/provedor controlados; roteiro real após provisionamento de homologação autorizado. Release depende de evidência por camada, não somente de testes unitários.

**Tech Stack:** Vitest/Node fetch, Express e PostgreSQL de teste, build Expo web e aplicativos Android/iOS, runner de e-mail sandbox da equipe backend.

**Spec:** [Desenho](../DESENHO_AUTENTICACAO_2026-10-03.md), [contrato C01–C10](../CONTRATO_AUTENTICACAO_2026-10-03.md), [backend B00–B06](2026-10-03-autenticacao-backend.md) e [frontend F01–F07](2026-10-03-autenticacao-frontend.md).

## Global Constraints

- Uma conta por CPF, com um único tipo vigente: cliente, barbeiro, proprietário ou gestor da plataforma.
- Proprietário pode administrar e atender. Seu cadastro de conta/barbearia já está pronto e será preservado.
- Sessão persiste entre aberturas, até sair ou expirar; validade menor para o gestor.
- Recuperação de acesso e confirmação por e-mail nesta entrega. Google, Apple, MFA e recrutamento ficam para evolução futura.
- Cada relatório identifica ambiente, branch/HEAD, data, plataforma e se usa fixtures ou HTTP real. Sem senhas, CPF completo, tokens ou mensagens privadas.
- Nenhuma produção/migração/envio/publicação alterados nesta tarefa de planejamento. Ensaios futuros precisam de ambiente explicitamente autorizado; fixture não autoriza acesso real.
- Requisitos essenciais FAIL/BLOCKED impedem PASS do release. Sem device/browser/provedor, nomear a lacuna; não instalar/burlar controles para ocultá-la.

## Review Focus

- Cookie realmente persiste entre aberturas e proxy repassa Set-Cookie: H02.
- Clipe de estado antigo/múltiplas abas após sair não autentica de novo: H02.
- Migração preserva IDs/FKs e classifica conflitos sem merge: H03.
- Ações de e-mail realmente chegam, expiram e podem ser repetidas com resultado claro: H02.
- Leitura de reservas/agenda isola dois titulares/unidades e criação comercial continua explicitamente ausente: H01/H02.

### Task H01: Fixtures, OpenAPI e integração HTTP com PostgreSQL

**Files:** Create frontend `docs/auth/fixtures/profiles.json`, `responses.json`, `cases.json`, `src/features/auth/tests/contract-fixtures.test.ts`; backend `test/contracts/auth-contract.spec.ts`, `test/helpers/create-auth-http-fixture.ts`; Modify backend `src/infra/http/swagger/index.ts`; Create frontend `docs/auth/CONTRACT_CASES.md`.

**Interfaces:** `createAuthHttpFixture({databaseUrl,clock,messageSender}):Promise<{baseUrl,ids,close,advanceClock,readSessionState,readIdentityLinks}>` usa createApp B00, portas B02 e servidor loopback efêmero. Banco `_test` e host loopback validados antes de escrever; nenhum import de app.ts/runner de produção. Fixtures usam UUIDs sintéticos, CPF exemplo controlado e domínios `.test`; nenhuma credencial de demonstração real.

- [ ] **Step 1:** Criar casos `profile_matrix_contract`, `unknown_type_denied`, `consumer_own_records_only`, `legacy_owner_compatibility`:

```ts
expect(profile.contractVersion).toBe(1);
expect(profileForReview.personalPermissions).toEqual([]);
expect(await fixture.readIdentityLinks()).toEqual(originalLinks);
expect(responseForOtherUnit.status).toBe(404);
```

- [ ] **Step 2:** Front `npm test -- src/features/auth/tests/contract-fixtures.test.ts`; API `npm test -- test/contracts/auth-contract.spec.ts`; esperado FAIL antes da implementação e fixtures finais. HTTP não possui cookies automáticos em Node: helper gerencia jar para contrato; isso não comprova política do browser.
- [ ] **Step 3:** Versionar casos C01–C08 e OpenAPI com schemas fechados. Fixtures cobrem CLIENT pendente/ativo, BARBER multiunidade/sem vínculo, OWNER pendente/legado, gestor, suspenso/revisão, corrida de ativação, refresh perdido/duas abas/logout e erros por código. Harness exerce HTTP verdadeiro contra PG descartável, DI e clock; métodos `advanceClock` são helpers do teste, nunca rota publicada nem alteração do relógio do computador.
- [ ] **Step 4:** Comandos PASS; comparar schemas/lista de operações OpenAPI com C05/C06/C08. Ensaio HTTP testa 401/403/404/409/410/429/503, tokens reset concorrentes, replay g0→g1→g2 e revogação commitada. Provar GET de link não consome; POST explicitamente consome. Registrar criação comercial de reserva como não entregue nesse pacote.
- [ ] **Step 5:** Diff e commits condicionais neutros em cada repositório; relatório de contrato não contém segredos.

### Task H02: Persistência web/nativo, e-mail e jornadas reais

**Files:** Create frontend `docs/auth/HOMOLOGACAO_AUTENTICACAO.md`, `docs/auth/evidence/README.md`; backend runbook de B02/B04 recebe configuração do provedor/runner e origens. Executar gerador de proxy de F02 apenas com URL de homologação autorizada, preservar config anterior; nenhum valor de segredo no documento.

**Interfaces:** Consumes releases B00–B06/F01–F07 e contrato v1. Relatório por caso `{id,platform,backendHead,frontendHead,result:'PASS'|'FAIL'|'BLOCKED',evidence,limitation?}`. Evidências de headers redigem conteúdo de Cookie/Set-Cookie; podem conservar nomes/flags/path/TTL sem valor.

- [ ] **Step 1:** Preparar casos e expectativa sem marcá-los PASS:

```ts
expect(restoredUserId).toBe(originalUserId);
expect(cookieFlags).toMatchObject({httpOnly:true,secure:true,sameSite:'Lax'});
expect(afterOfflineLogoutRestart.authenticated).toBe(false);
expect(afterClientPromotion.userId).toBe(originalClientId);
```

Essas assertions são a expectativa do roteiro; coletar resultados reais antes de preenchê-las como evidência.

- [ ] **Step 2:** Confirmar API v1/HTTPS/proxy/provedor/runner/banco de homologação e destinatários de teste autorizados. Sem qualquer um, registrar BLOCKED do caso, continuar demais verificações e não apontar produção como substituto. No web, testar Chrome, Firefox e Safari; nativo Android e iOS reais ou build de homologação identificado. Emulador, Expo Go e web mobile são evidências separadas.
- [ ] **Step 3:** Executar jornadas: CLIENT cadastra/confirma/entra/recupera; OWNER existente conclui seu setup, cadastra CLIENT→BARBER, novo BARBER ativa e entra; BARBER usa duas unidades/conta pessoal, sai da última sem perder tipo; gestor entra na área privada, não recebe operações comerciais. Verificar recebido real de e-mail, reenvio/expiração/token já usado e erros de conta errada. Login persistente: fechar/reabrir browser/app; revogar sessão/alterar senha e tentar restauração. Duas abas, refresh em trânsito, logout offline/reinício online, SecureStore/cookies indisponíveis e acesso direto proibido. Nenhuma ação fictícia de reserva.
- [ ] **Step 4:** Executar checks locais apropriados uma vez após alterações finais: front `npm run typecheck`, `npm test`, `npm run build`; API `npm test`, `npx tsc --noEmit`, `npm run check`; ambos `git diff --check`. Verificar foco/teclado/autofill/tamanho de toque/loading/erro/temas; VoiceOver/TalkBack exigem execução real. Repetir testes só se uma alteração/falha justificar. Relatório mantém cada plataforma/camada separada.
- [ ] **Step 5:** Revisão do relatório/limitações e commit condicional `test: homologar jornadas de autenticacao`.

### Task H03: Migração, capacidade inicial e cutover coordenado

**Files:** Create API `test/integration/auth-cutover.spec.ts`, `scripts/benchmark-auth.ts`; Update API `docs/auth-migration-runbook.md`; Create frontend `docs/auth/CUTOVER_AUTENTICACAO.md`.

**Interfaces:** Consumes audit/migration B01/B02, janela C07 e relatórios H01/H02. Benchmark somente em destino autorizado e identificado como homologação; `benchmarkAuth({baseUrl,concurrency:20,sampleCount:100}):Promise<{loginP95Ms,profileP95Ms,refreshP95Ms}>` usa contas de teste e não loga tokens. Nenhuma mudança do relógio do host.

- [ ] **Step 1:** Testar `migration_conflicts_stop_cutover`, `legacy_window_expires_without_extension`, `rollback_preserves_post_cutover_data`:

```ts
expect(audit.conflicts).toBe(0); // requisito antes de impor UNIQUE
expect(idsAfterMigration).toEqual(idsBeforeMigration);
expect(legacyTokenAfterDeadline.status).toBe(401);
expect(dataLostByRecovery).toBe(0);
```

- [ ] **Step 2:** `npm test -- test/integration/auth-cutover.spec.ts` na API; esperado FAIL antes dos controles. Ensaio usa cópia descartável com conflitos deliberados e estado conhecido, nunca banco de produção por engano.
- [ ] **Step 3:** Inventariar schema aplicado, ensaiar migração e recuperação. Remover manutenção HTTP não autenticada, provisionar gestor internamente, habilitar API v1 com prazo C07 fixo, validar backend, publicar frontend/proxy somente quando autorizado e registrar versões reais. Monitorar códigos401/403/429/503, entrega e consistência sem dados pessoais. Revogar/retirar legado somente após confirmar versões em uso; plano de recuperação não executa downgrade destrutivo sobre contas novas.
- [ ] **Step 4:** Medir 20 sessões concorrentes/100 amostras por operação: entrada p95≤2.000ms, perfil/refresh≤1.000ms, excluindo entrega de e-mail. Documentar recurso/hardware/latência. Resultado FAIL requer ajuste/revisão; não reduzir alvo para obter PASS. Declarar limite: esse ensaio não certifica escala/SLA de produção.
- [ ] **Step 5:** Release somente com critérios essenciais PASS, responsáveis/backend/frontend/ambiente registrados e autorização específica. Comunicar distinção entre auth concluída e POST de reserva ainda dependente do domínio.

## Estado deste plano

Todas as etapas acima são futuras; nenhuma foi executada ao escrever os documentos. Publicar issues acontece antes da implementação/homologação, após revisão dos planos, conforme o [índice do pacote](../PLANO_AUTENTICACAO_2026-10-03.md). H01–H03 bloqueiam conclusão/release do software, não a preparação das issues de trabalho.

# SeedDB e confirmação de e-mail

Data: 11/10/2026. Backend main confirmado no GitHub: `23fca4f859654ef2a862f2cad28df02486208e69`. Inspeção de fonte somente; não houve leitura do banco, execução/importação de seed/app, migração ou envio de e-mail. Credenciais e hashes não são incluídos neste relatório.

## Requisito confirmado pelo usuário

Todas as contas fictícias provisionadas pelo seed devem ter `emailVerifiedAt` preenchido para permitir login sem depender de caixa de e-mail inexistente. Isso vale para contas novas e antigas comprovadamente gerenciadas pelo seed. Não alterar a regra normal de cadastro/login: conta real nova continua não verificada e deve confirmar seu e-mail.

## O que já está implementado

| Caminho | Fonte verificada | Comportamento |
| --- | --- | --- |
| Seed básico | `src/infra/drizzle/seed.ts:32–49,95–102` | Três INSERTs de usuários já definem emailVerifiedAt |
| Demo — profissionais | `demo-seed/engine.ts:160–169` | Novos usuários profissionais já recebem emailVerifiedAt |
| Demo — clientes | `demo-seed/engine.ts:398–408` | Novos clientes também recebem emailVerifiedAt |

Portanto, não pedir para acrescentar novamente o campo nesses INSERTs. Preservar e testar o comportamento existente. A população demo declarada contém oito profissionais e doze clientes, em duas unidades; ela não contém gestor da plataforma atualmente.

Fonte: [seed básico fixado](https://github.com/Proj-Smart-Barber/api/blob/23fca4f859654ef2a862f2cad28df02486208e69/src/infra/drizzle/seed.ts), [engine demo fixado](https://github.com/Proj-Smart-Barber/api/blob/23fca4f859654ef2a862f2cad28df02486208e69/src/infra/drizzle/demo-seed/engine.ts).

## Lacuna: reutilização não corrige dados antigos

- Se logicalKey existe no registry, o engine apenas reutiliza recordId, sem consultar/atualizar emailVerifiedAt: linhas141–145 e380–385.
- Sem registry, um usuário encontrado por e-mail também é reutilizado sem atualização de confirmação: linhas149–178 e389–417.
- Assim, reaplicar o seed atual não garante correção de contas fictícias antigas com confirmação NULL. Isso é conclusão sobre o código, não constatação de quantas contas no banco estão nessa condição.
- Preservar a primeira data de verificação existente; reexecução não deve alterar esse timestamp nem ID/senha/e-mail/vínculos/histórico.

## Ownership e limites da atualização

Registry tem namespace, logicalKey, tableName e recordId, mas o engine atual pode registrar um usuário adotado apenas por e-mail. Registry sozinho não prova criação pelo seed. A correção precisa validar allowlist de fixtures, namespace, logicalKey, tabela/ID, CPF e e-mail canônicos, além de provenance de criação ou adoção explicitamente reconhecida. Divergência, registry stale/ausente ou origem não comprovada vai ao relatório de conflitos; não autoriza UPDATE.

Não atualizar todos os usuários, todos os NULLs ou todos os endereços de um domínio. Seed básico não registra ownership: não reutilizar seu reset global como mecanismo de reparo. Para suas contas antigas, reconhecer proveniência de forma controlada antes de qualquer backfill; não adivinhar IDs por endereço.

## Outros achados necessários à execução segura

1. `seed.ts:16–26` apaga tabelas de negócio e users globalmente. Só pode ser executado em banco descartável criado para o teste, nunca para atualizar um banco existente.
2. O dry-run atual pode emitir DDL: engine chama safeGetRegistryMap→getExistingRecords→ensureRegistryTable, que cria tabela/índice. A leitura de registry deve ser separada da inicialização.
3. `loadOrCreateStaffCredentials` é chamado antes da guarda de dry-run e seu helper pode escrever arquivo de credenciais quando modificado (`security.ts:97–104`). Inspeção/dry-run não deve chamar esse gerador nem gravar manifesto/credenciais.
4. Colisões por e-mail são consultadas apenas no apply, então dry-run atual não representa todas as resoluções. Planejar primeiro com as mesmas validações de identidade, sem mutations; aplicar o plano somente depois.
5. Rollback é tratado antes do restante do engine; combinação rollback+dry-run precisa ser rejeitada ou permanecer estritamente simulada, nunca executar DELETE em inspeção.
6. `test-verification.ts` importa app, inicia servidor, consulta o banco inteiro e cancela/recria reservas. Não é auditoria somente leitura e pode disparar migrações no import. Login percorre oito profissionais; não testa os doze clientes nem verifica emailVerifiedAt de todas as identidades esperadas.

### CPF das fixtures

Uma verificação matemática estática dos literais, usando a mesma regra de dígitos verificadores do value object Cpf, identificou dois de três CPFs inválidos no seed básico e vinte de vinte nas fixtures demo. Os valores estão em dígitos, mas normalização não equivale a validade. Não houve chamada HTTP nem avaliação de CPF real.

Como o plano completo inclui identificação/conversão por CPF, corrigir fixtures fictícias para CPFs sintéticos válidos e únicos é necessário para testar esses fluxos. Não trocar CPFs de registros reais ou remapear contas automaticamente. Em demo antiga reconhecida, mudança de placeholder exige mapa explícito legacy→novo, validação de colisões, preservação de ID/senha/histórico e relatório antes de apply. Se não houver prova de ownership, bloquear o reparo daquele registro. Não resolver isso apagando e recriando a população.

## Alterações a implementar

- Criar planejamento/inspeção somente leitura para usuários gerenciados; relatório com números de novas contas, reutilizações, verificações pendentes e conflitos, sem credenciais.
- Em apply, preencher confirmação NULL exclusivamente dos candidatos aprovados, com hora do banco e condição atômica. Manter INSERTs novos já verificados e não enviar SMTP para dados fictícios.
- Cobrir todas as populações do seed, preservar contas reais não verificadas e limitar reparo ao conjunto autorizado.
- Validar fixtures no value object Cpf antes de escrita; alinhar accountType e novos schemas do plano sem inferir gestor por e-mail. Para cobrir PLATFORM_ADMIN, provisionar fixture fictícia restrita somente no ambiente isolado/seed explicitamente administrado; não via signup nem endpoint público.
- Separar audit read-only de smoke HTTP/mutações. Verificar todas as contas demo, não somente staff, e testar usuário não-seed com emailVerifiedAtNULL recebendo403.

## Critérios de conclusão

| Cenário | Resultado requerido |
| --- | --- |
| Contas seed novas | Confirmação preenchida, login permitido com credencial correta, sem SMTP |
| Demo antiga gerenciada com NULL | Atualização seletiva, identidade e história preservadas |
| Reexecução | Sem novas contas/vínculos, primeira verificação preservada |
| Conta real/unmanaged | Nenhuma verificação automática ou alteração de identidade |
| CPF/e-mail/registry divergente | Conflito explícito, sem adoção/merge/escrita |
| Audit/dry-run | Sem INSERT/UPDATE/DELETE/DDL, files de credencial ou manifesto |
| Todos os tipos do plano | Fixtures reconhecidas com tipo/vínculos corretos, gestor provisionado de forma restrita |
| Fluxo real de confirmação | Cadastro normal continua não verificado; tests negativos separados do seed |

Plano executável: [SeedDB compatível com autenticação](planos/2026-10-11-seeddb-autenticacao.md). Estado: fonte e regras analisadas; implementação/banco/HTTP ainda NOT EXECUTED.

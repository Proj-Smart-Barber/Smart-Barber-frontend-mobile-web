# Prompt — executar integração dos PRs28/29

Execute integralmente o plano:

`D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/planos/2026-10-12-integracao-prs-28-29.md`

Implemente as tarefas I1–I8, na ordem definida, com checkpoints e revisão independente ao final. Não pare em análise/diagnóstico nem declare conclusão parcial como entrega integral. Este pedido autoriza implementação/testes/revisão locais do pacote; publicação, mudanças nos PRs, push, merge remoto, force push, deploy e migrations de produção ficam fora da execução automática.

## Repositórios e leitura inicial

- Frontend: `D:/smart_barber/Smart-Barber-frontend-mobile-web`.
- Backend: `D:/smart_barber/api`.
- Auditoria: `D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/ANALISE_COMPATIBILIDADE_PRS_28_29_2026-10-12.md`.

Leia o plano inteiro uma vez, a auditoria e os AGENTS.md aplicáveis. Leia o desenho/planos referenciados para resolver os contratos do recorte; não repetir exploração de módulos não envolvidos. Confirme versões, branch/HEAD/diff e heads GitHub atuais. As bases registradas são históricas: não aplicar os SHAs sem confirmar que os autores não enviaram alterações depois.

Preserve alterações de terceiros: você não está sozinho no código. Faça implementação em isolamento seguro com base main atual, conforme I1. Não usar o clone `.tmp/pr-28-29-audit-20261012` como candidato aprovado; ele é somente experimento. Não sobrescrever o checkout compartilhado, reescrever branches alheias ou escolher ours/theirs para todos os conflitos. Branches/commits/artefatos têm nomes neutros.

## Entrega por bloco

1. **I1 — base:** reaplicar somente o delta Grupo4 sobre main, preservando a integração anterior por squash e os dois autores. Registrar heads, proveniência e diff. Não atualizar branch remota por force push.
2. **I2–I4 — correções:** efetivar ledger/transação/key/version nas mutations da API, execução recuperável comum no frontend, clock autoritativo, scope por vínculo, entrada real de remarcação e keys/invalidações corretas.
3. **I5–I6 — Atendimentos:** preservar UI/calendário/confirmação/overflow/menu do PR28, migrando queries/mutations/DTOs para o domínio comum. Resolver hooks ausentes e BookingCustomer duplicado. Separar `/atendimentos` operacional de `/bookings` pessoal, mantendo links/detalhes por contexto e OWNER que também atende.
4. **I7–I8 — aceite:** validar composição por testes/TypeScript/build/HTTP/PG/browser, obter revisão independente, corrigir achados e preparar diff/contratos/relatório para decisão de publicação. Não executar a publicação.

Não conservar /update como autoridade paralela no frontend. API PR50 é uma dependência/referência de outro autor, não autorização para merge/alteração daquela branch. Compatibilidade efetivamente necessária usa a mesma política de /reschedule e segue o gate do plano.

## Regras de execução

- TDD/checkpoints por unidade testável; não relaxar assertions, omitir cenários ou aumentar timeouts só para obter PASS.
- O status frontend antes de envio é submitting; PENDING é estado do ledger. Corrigir o teste inconsistente mantendo a prova de persistir antes de enviar.
- Command/key/actor/scope/version imutáveis; persistir antes do transporte. Zero request se clock/entropy/storage indispensáveis falharem. Sem Date.now/new Date como fonte substituta de serverTime.
- Criar/remarcar/cancelar/status compartilham recuperação. Timeout/404/503/resposta inválida não autorizam nova key; close de APPLIED não cancela recurso. Logout/troca de conta deixam só referências opacas e não permitem resposta tardia regravar PII.
- RESCHEDULE+UNIT faz PATCH com reserva/version originais, nunca POST de nova criação. Autoridade do servidor e papel da unidade selecionada prevalecem sobre accountType global/URL.
- Headers de idempotência precisam ser consumidos no servidor; mocks não comprovam atomicidade/ledger. Use o mesmo tx para efeito/evento/feed/tentativa e os locks/clock previstos no plano.
- Conferir ambiente API/PG antes de iniciar testes/app/migration: boot pode migrar. Só banco isolado confirmado; nenhuma credencial/token/CPF/e-mail real em logs/relatórios. Não usar produção como fixture.
- Manter arquitetura/design system/proxy/cookies/refresh/SecureStore atuais. Não iniciar cadastro profissional/homes novas/geolocalização ou grupos5–7 nesta execução.

## Controle de contexto e gasto

Um executor mantém o contexto do pacote; não criar um agente diferente para cada arquivo ou pequena tarefa. Use somente um revisor independente ao final do candidato completo; revisão corretiva adicional apenas se achados exigirem.

Mantenha `docs/STATUS_INTEGRACAO_PRS_28_29_2026-10-12.md` compacto, atualizado após cada bloco/checkpoint, com:

- base/commits e tarefas concluídas;
- arquivos/contratos modificados;
- testes relevantes e resultados;
- pendências concretas e próxima ação;
- instruções de retomada e ambiente confirmado, sem segredos.

Preserve os detalhes extensos nos arquivos do projeto. Retorne resumos de progresso curtos, sem imprimir repetidamente diffs inteiros, todos os arquivos ou logs completos. Faça pesquisas dirigidas com rg e releia somente áreas que mudaram ou precisem de esclarecimento. Faça testes focados a cada alteração e as suites/checks obrigatórios ao final; repetir suíte inteira apenas diante de nova mudança/falha relevante.

Compaction/interrupção não encerra a execução: retome pelo status e confira o estado real, sem recomeçar a exploração nem refazer trabalho validado. Se um limite real impedir continuidade, deixe checkpoint executável e comunique o que falta; não declarar completo nem deixar alterações sem registro para retomada. Não há orçamento numérico de tokens estipulado neste pedido.

Sugestão ao operador: Sol com esforço médio em I1/I4–I7; alto em I2/I3 e revisão I8. Não alterar modelo/esforço por conta própria: a configuração é escolhida pelo usuário. Se for usar uma configuração única, alto é recomendado pela criticidade das transações e recuperação. Nível de esforço não substitui testes nem garante consumo total.

## Aceite final

Cumprir todos os gates/testes do plano, incluindo:

- nenhum export/hook ausente, barrel ambíguo ou conflito residual;
- carrinho múltiplo e atendimento operacional por unidade;
- remarcação mantém ID/beneficiário/unidade e preserva original na falha;
- versões/prazos/capabilities e caches ativos corretos;
- resposta perdida após commit com recuperação, replay/close sem duplicação e troca de ator;
- notificações transacionais e legado sem preço/estado inventados;
- deep links/refresh/menus e regressão login/refresh/logout;
- tests/typecheck/build e prova HTTP/PG/browser da composição;
- Android/iOS avaliados separadamente ou NOT TESTED, sem chamar Expo Export de homologação native;
- revisão independente corrigida e relatório atual, sem reutilizar APPROVE/contagens antigas.

Se faltar ambiente/permissão/dependência externa, complete o trabalho independente e registre requisito/expected/actual sanitizados. Não inventar PASS nem contornar autorização. A conclusão integrada exige evidência dos critérios indispensáveis.

Entregue arquivos/commits locais, preservação de autoria, contratos/API/rotas, comandos/resultados por plataforma e matriz PASS/PARTIAL/FAIL/NOT TESTED, achados da revisão/correções, limitações e proposta concreta de publicação. Termine com o candidato pronto para revisão humana, sem push/merge/deploy automático.

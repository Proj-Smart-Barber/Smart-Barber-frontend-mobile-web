# Prompt — Grupo 3: contratos frontend, operações recuperáveis e recursos da conta

Execute integralmente **o Grupo 3 (R1 + G1)** do Smart Barber, em uma execução com checkpoints internos e revisão independente ao final. Entregue a base frontend para os fluxos de reservas/equipe dos próximos grupos, consumindo os contratos reais do backend dos grupos1/2.

## Base, ownership e leituras

Repositório de implementação: `D:/smart_barber/Smart-Barber-frontend-mobile-web`. Backend para consulta de contratos: `D:/smart_barber/api`.

Leia AGENTS.md aplicáveis, confira branch/HEAD/diff e preserve alterações de terceiros. Você não está sozinho no código. Não resetar/stashar trabalhos alheios nem trocar a base sem preservar as entregas. Nomes de branch/commit neutros, sem nomes de ferramentas/agentes.

Leia integralmente:

1. `docs/PLANO_EXECUCAO_AGRUPADA_AGENDAMENTO_2026-10-11.md` — Grupo3, dependências e método atualizado.
2. `docs/planos/2026-10-11-reservas-frontend.md` — R1, interfaces e constraints globais; R2–R4 somente como consumidores futuros.
3. `docs/planos/2026-10-11-equipe-conta-frontend.md` — G1 e constraints globais; G2/G3 somente como consumidores do core.
4. `docs/DESENHO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` — decisões D01–D16 e contrato comum de operações.
5. `docs/PLANO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md`, `docs/REVISAO_AGENDAMENTO_EQUIPE_E_HOMES_2026-10-11.md` e `docs/AUDITORIA_ROTAS_SWAGGER_API_2026-10-11.md` — gates e decisões de reutilização.
6. `docs/PROMPT_EXECUCAO_GRUPO_2_AGENDAMENTO_2026-10-11.md` — correções de dependências e exigências contratuais que precisam aparecer no backend real.

Os caminhos acima são relativos ao frontend; use caminhos absolutos no relatório. Uma execução por grupo prevalece sobre a troca de executor por pequena tarefa. Siga TDD/checkpoints e peça revisão independente do grupo completo ao final. Decisões de negócio aprovadas não precisam de nova confirmação.

Ownership: DTOs/parsers/adapters de reservas e disponibilidade; clock/UUID; `src/shared/operations`; composição no root; sessão/guards/contexto; recursos pessoais e resposta a convite. Não implementar carrinho/telas completas de reserva, gestão da equipe, cadastro CPF ou novas homes nesta execução. Não alterar backend silenciosamente para caber no adapter.

## Checkpoint inicial — contratos reais e limites de evidência

O relatório do Grupo2 informa testes HTTP/PG, regressões e TypeScript aprovados em banco isolado. Esses testes não foram reexecutados nesta preparação; não há comprovação de merge/deploy. Leia as factories/rotas/controllers/mappers atuais e as fixtures da entrega. Faça uma matriz sanitizada por endpoint: request, headers, envelope, DTO, erro e divergência em relação à spec. Swagger e exemplos do relatório não substituem o handler montado.

Pontos encontrados na leitura local em12/10, que exigem atenção:

- POST `/api/bookings` atende PERSONAL e UNIT. Não existe necessidade de POST operacional paralelo por unidade.
- GET `/api/bookings/me` retorna `{bookings}` e aceita page, sem metadados de paginação completa no controller lido. GET de agenda da unidade retorna `{items,...,summary}`. Não converter ausência de hasNext/total em falso/zero como se fossem dados autoritativos.
- `BookingDetailsMapper` usa `capabilities.noShow`; o relatório exemplifica `markNoShow`. Há também booleans `canMarkNoShow`/outros. Escolha um modelo interno e traduza somente variantes efetivamente documentadas/testadas, sem conceder ação por campo ausente.
- `date` vem de Date e pode ser serializada como ISO completo, apesar do exemplo YYYY-MM-DD. Separe a data civil da unidade do instante startsAt, sem aplicar fuso do aparelho ou truncar qualquer ISO indiscriminadamente.
- Availability retorna `{slots,serverTime}`, sem timezone no controller lido. Timezone pode vir de GET real da unidade; nunca inventar America/Sao_Paulo para unidade desconhecida. O adapter atual descarta metadata e aceita resposta inválida como lista vazia: corrigir isso em R1.
- GET/close de operações usa OperationAttemptResult e pode ter envelope de compatibilidade `attempt`. Resource.data de BOOKING pode conter `{booking,serverTime}`, não o BookingDto diretamente. Normalizar explicitamente, validar kind e nunca tratar `{}`/201 como confirmação.
- GET memberships retorna `{barbershops:[{id,name,role,status,timezone}]}`; id é **shopId**, status é **da loja**, não do vínculo. O repository atual filtra membership.state ACTIVE no servidor. Se não houver state explícito, documentar a garantia ACTIVE-only verificada; não fingir que status prova estado de vínculo nem exigir campo ausente e quebrar todas as contas. Se o contrato mudar para lista mista, exigir filtragem explícita.
- `OperationAttemptService.checkAccess` local devolve true se o validador lançar erro. Isso exige teste/correção do responsável backend antes de afirmar privacidade integrada na falha da revalidação; o frontend não conserta autorização do servidor escondendo um campo.

Reconfirme esses pontos, pois a base pode ter evoluído. Contratos insuficientes geram pendências específicas para o Grupo2; adapters devem falhar fechado e não fabricar dados. É permitido concluir módulos independentes com fixtures versionadas, mas integração não comprovada deve ser PARTIAL/NOT TESTED. Não liberar Grupo4 como integrado se faltar requisito indispensável. Não executar app/migrations/tests da API sem verificar ambiente: o boot pode migrar o banco.

## 1. R1 — DTOs, parsers e adapters

Modificar `src/features/bookings/api/bookings.dto.ts`, `bookings.api.ts`, `model/booking-draft.ts`; criar `api/bookings.schema.ts`, `lib/normalize-booking-error.ts` e os contratos comuns descritos abaixo.

- Validar respostas no boundary com Zod; TypeScript genérico do HttpClient não valida JSON.
- BookingDto conserva itens reais/legacyAggregate, campos nullable desconhecidos, status/version, actor/customer/professional, instantes/timezone, totais/clientRequestId/serverTime e capabilities. Não fabricar status CONFIRMED, valores0, pagamento ou nomes.
- Expor `createBooking(request,key)` e `createOperationalBooking(shopId,request,key)`, ambos POST `/api/bookings`. Pessoal envia PERSONAL sem beneficiário de terceiro; operacional UNIT/shopId/customerId. Novas mutations exigem key e alterações exigem expectedVersion na interface frontend mesmo se o backend legado permitir omitir.
- Expor consultas `getBookingById`, `fetchMyBookings`, `fetchUnitBookings`, lookup e adapters de cancel/reschedule/status para consumo futuro. Preserve envelope/metadados reais, tratando variantes legadas explicitamente. Compatibilidade de consumidores atuais não pode esconder perda de paginação ou quebrar a aplicação existente.
- Lookup POST e-mail exato OU CPF completo: dados somente em memória transitória. Não inserir no storage, query keys, URL, logs, analytics ou hash persistido local.
- `getBookingAvailability(shopId,{serviceIds,date,barbermanId})` preserva slots/serverTime e obtém timezone autoritativo da unidade quando necessário. Reuse a porta HTTP atual; não criar outro cálculo de disponibilidade nem usar mocks como confirmação de integração.
- Normalizar códigos distintos: SLOT_UNAVAILABLE, QUOTE_CHANGED, BOOKING_VERSION_CONFLICT, ACTION_DEADLINE_PASSED, MEMBERSHIP_INACTIVE, IDEMPOTENCY_PAYLOAD_MISMATCH, erros de chave/terminal,429/503 e transporte. Um409 genérico não significa QUOTE_CHANGED.
- QUOTE_CHANGED só é NOT_APPLIED comprovado quando o contrato/estado autoritativo demonstrar fence; não inferir não aplicação só por status HTTP. Resposta inválida/perdida após envio fica incerta e requer reconciliação.
- Preserve proxy web relativo, transporte native absoluto, cookies/refresh e mecanismo atual de credenciais. Não mover tokens para localStorage/AsyncStorage ou logá-los. Se o HttpClient precisa de body no DELETE, adicione suporte testado sem quebrar os outros métodos.

## 2. R1 — Relógio, UUIDv7 e storage comum

Modificar `src/features/bookings/lib/attempt-id.ts`; criar `lib/server-clock.ts` e core único em:

- `src/shared/operations/operation-attempt.types.ts`.
- `src/shared/operations/operation-attempt.api.ts`.
- `src/shared/operations/operation-attempt-store.ts`, `.web.ts`, `.native.ts` conforme resolução vigente.
- `src/shared/operations/OperationLifecycleBridge.tsx`.

Interfaces: resultado discriminado BOOKING/MEMBERSHIP/REGISTRATION/INVITATION; `findOwnAttempt(requestId)`/`closeOwnAttempt(requestId)` chamam `/api/operation-attempts/:requestId`; `prepareAttempt(actorId,operation,payload,clock)` prepara tentativa imutável; store `read/save/listReferences/clearResolved/clearPayloadsOnLogout` por ator+requestId. Publique tipos/interfaces reais para próximos grupos, sem ports duplicados por feature.

- `generateUuidV7(serverTimestampMs,entropy16)` exige tempo válido e entropy segura. Corrigir seis bytes de timestamp48bits (40/32/24/16/8/0), versão7 e variante; testar decode real, não só regex. A implementação atual desloca timestamp um byte e tem fallback Math.random/Date.now: remover esses fallbacks da preparação de novas operações.
- Web usa crypto seguro; native `expo-crypto.getRandomBytesAsync(16)`. Instale dependências por `npx expo install expo-crypto @react-native-async-storage/async-storage` se necessárias, mantendo versões compatíveis e lockfile. Confira documentação oficial atual quando houver dúvida, sem pin baseado em lembrança.
- Clock combina serverTime válido e tempo monotônico decorrido; não usar relógio de parede do aparelho como fonte autoritativa. Após reload precisa adquirir referência válida do servidor. Ausência/falha de clock/entropy/storage bloqueia novo envio, mas não bloqueia consultar/fechar referências existentes.
- Web storage sanitizado e native AsyncStorage para operações não secretas, separado do armazenamento de credenciais. Persistir antes de enviar; falha de persistência resulta em zero POST.
- Tentativa imutável por ator/requestId: várias operações/tabs não sobrescrevem entre si. Replays usam mesmo payload/key; UNKNOWN/404/timeout/503 não significam falha comprovada. Nunca gerar nova key automaticamente para operação incerta.
- Referências opacas incertas `{actorId,requestId,operation}` sobrevivem logout, sem payload/customerId/CPF/e-mail/hash sensível/token. Logout elimina payloads e resolvidas; outra conta não enumera/exibe/reconcilia referências alheias. Retorno da mesma conta consulta antes de agir; sem payload não inventar replay.
- Janela24h: remover payload vencido, preservar referência até decisão durável. Fechar operação APPLIED não cancela recurso; PENDING/UNKNOWN não autoriza repetir; NOT_APPLIED só libera nova revisão após prova de fechamento/rejeição terminal.
- REGISTRATION/INVITATION com identidade sensível usa referência apenas; nenhum formulário CPF/senha fica recuperável pelo storage. Outros resultados não são interpretados como BookingDto.
- Guards de leitura validam schema/version do storage, tratam dados corrompidos e acesso indisponível sem sucesso falso. Coordene writes/limpeza assíncrona e troca de conta para não ressuscitar payload antigo; impedir replay/novo envio se limpeza indispensável falhar.

## 3. Composição do lifecycle e sessão

A ponte recebe props genéricas `{actorId,sessionState}` do root. **Fica fora de src/app**, para não virar rota Expo. Shared não importa auth/bookings; auth não importa bookings. Root faz composição.

- Cleanup ocorre no logout efetivo/troca de ator; restoring/bootstrapping/recoveryRequired/erro temporário não apagam tentativa incerta.
- Não fazer POST/replay automático ao montar/recarregar/autenticar. Uma consulta segura de reconciliação não equivale a consentimento para nova mutation.
- Não perder actor anterior antes de limpar payloads. Verifique operação em voo→logout→resposta tardia: resultado não aparece para outra conta nem repopula dados privados limpos.
- Chaves de cache autenticado incluem ator e, quando aplicável, unidade/contexto; remover dados antigos na troca/logout. Não limpar cache global indiscriminadamente por refresh de uma unidade.

## 4. G1 — Recursos da conta, guards e vínculos

Modificar `src/features/auth/model/use-session.tsx`, `session-engine.ts`, `operational-context.ts`, tipos/mappers de Membership e `src/app/_layout.tsx`. Reaproveitar notifications/invitations e seus componentes.

- Expor `useSession().refreshIdentity():Promise<void>`. Hoje o engine possui o método, mas captura erro e ignora; o provider não o expõe para resposta a convite. Propagar falha temporária e aplicar identity/memberships coerentes, revalidando selectedShopId contra vínculos autorizados atuais.
- Não promover acesso local com base em uma query invalidada. Aceite de convite já aplicado seguido de refresh503 mantém estado de aceite aplicado, mostra falha de atualização/retry e não reenvia aceite nem afirma novo acesso.
- Troca/logout durante refresh não pode aplicar identidade antiga à nova sessão. Vínculo removido/role desconhecido falha fechado; membership inativo não habilita operação. Reconhecer somente roles válidos do contrato; não mapear qualquer string para BARBERMAN.
- OWNER global em uma unidade pode ter outro papel na selecionada. isOwner vem do vínculo selecionado; preserve distinção global BARBER vs role unitário BARBERMAN documentada.
- Recursos pessoais para qualquer conta autenticada, sem requisito de unidade: notifications, notification detail, invitations e destinos pessoais autorizados. Gestão operacional continua no guard da unidade. Não dar acesso de plataforma a outros perfis.
- Migrar rotas de conta para `src/app/(account)/notifications.tsx`, `notifications/[notificationId].tsx`, `invitations.tsx` com layout autenticado apropriado. Preserve deep links e links legados por resolução segura. Grupos Expo não mudam automaticamente o pathname: evitar manter duas telas conflitantes com o mesmo caminho público. Atualizar todos os callers/targets; não fazer loop de redirect `(app)/invitations` para BARBER sem unidade.
- `resolveAccountDestination(target)` permite somente destinos internos válidos/autorizados; recurso operacional em notificação ainda exige unidade/permissão. Não aceitar URL arbitrária externa como redirect.
- No hook/engine de resposta ao convite, substituir Promise.allSettled que esconde falha de refresh pela atualização autoritativa explícita + invalidações contextualizadas. Aceite/recusa continuam nos endpoints existentes.
- Preserve onboarding OWNER já pronto, login/recuperação, entradas CLIENT/BARBER/PLATFORM_ADMIN e estrutura visual atual. O novo retorno à revisão de reserva pertence ao Grupo4: preparar interfaces sem implementar carrinho nem POST automático nesta etapa.

## Testes e checkpoints de aceite

Use testes focados significativos; demonstre falha correspondente antes da implementação. Reuse fixtures da API com envelopes reais, sem afirmar integração HTTP por mock.

- Contratos: criação pessoal/UNIT mesmaURL, headers/key obrigatórios; itens múltiplos/null legado/version/capabilities/noShow; data civil vs instante; envelopes diferentes de listas; resposta vazia/malformada não confirma e não vira agenda vazia.
- UUID: `decode(generateUuidV7(1775900000000,bytes)) === 1775900000000`, versão/variante, entropy/clock ausentes rejeitados; plataforma native usa fonte segura.
- Store: reload mesma conta recupera payload; duas tentativas coexistem; outra conta não lê; logout remove payload/resolvidas e preserva só referências incertas;24h elimina payload sem perder referência; corrupção/storagefailure impede novo POST; concorrência de cleanup/resposta tardia não revive PII.
- API de operações: APPLIED BOOKING e outros kinds; PENDING/UNKNOWN/404/503; NOT_APPLIED fenced; accessChanged sem dados; APPLIED sem DTO não vira nova reserva e close não equivale a cancelar.
- Lifecycle: restoring/recovery não limpa; troca de ator limpa corretamente; sem autoPOST na montagem/relogin; query keys e dados anteriores isolados.
- G1: CLIENT sem unidade abre notificações/convites; BARBER sem unidade não fica em loop; OWNER por vínculo selecionado; role inválido/inativo/unidade removida negam acesso; onboarding/plataforma continuam corretos.
- Aceite: CLIENT→BARBER só após leitura autoritativa; refresh503 mostra refetchFailed/retry sem reenviar mutation; selectedShopId invalida corretamente; refresh tardio de ator anterior é descartado.
- Regressão login→reload→refresh→logout→segundo login, transporte web/proxy/cookie e native absoluto; não regressar proteção de tokens.

Arquivos previstos: `src/features/bookings/tests/attempt-id.test.ts`, `booking-attempt-store.test.ts`, `booking-contract.test.ts`; testes de core operations se melhor separados; `src/features/auth/tests/account-route-guard.test.ts`, `session-engine.test.ts`; `src/features/invitations/tests/invitation-response.test.ts`; session-transport/storage/navigation existentes.

Ao fim: `npm test`, `npm run typecheck`, `npm run build`. Rodar testes de RN/native com suporte disponível e indicar limite; build web não homologa Android/iOS. Navegador real valida recursos de conta e regressão de sessão em ambiente autorizado. Somente API/PG de teste para mutations de convite, nunca produção como fixture. Não iniciar migrator/seed/admin endpoints por conveniência.

Se backend indispensável divergir, registre endpoint/arquivo/request/expected/actual sanitizados e retorno ao responsável Grupo2. Prossiga nos módulos independentes. Não relaxe validação nem esconda indisponibilidade para obter PASS; integração pendente fica PARTIAL/NOT TESTED.

## Revisão e entrega

Peça revisão independente do diff completo: schemas/interfaces, persistência/PII, UUID/clock, lifecycle/troca de ator, guards/rotas/cache, atualizações de identidade e regressão de login. Corrija achados e repita checks afetados; relatórios/revisões dos grupos anteriores não aprovam esta entrega.

Entregue base/commits, arquivos, interfaces para Grupo4/5, matriz de contratos reais e pendências API, comandos/resultados, revisão/correções e PASS/PARTIAL/FAIL/NOT TESTED por critério/plataforma. Marque checklists por evidência. Não declarar Grupo3 completo com bloqueadores ou aceites obrigatórios não demonstrados.

Pare após R1+G1. Não fazer push, PR, merge, deploy, migração de produção ou mudanças de backend automaticamente. Não implementar Grupo4/5/6/7. Grupo4 só inicia integração completa com os contratos Grupo2 e este core aprovados; geolocalização permanece no backlog futuro.

# Revisão estruturada — descoberta e geolocalização

14/10/2026. Disposição final: APPROVED — planejamento técnico. Usuário aprovou o pacote completo e o avanço ao prompt do Grupo 1 em 14/10/2026. Não é prova de implementação, custo, desempenho ou produção.

## Processo

Skill multi-agent-brainstorming, revisores invocados sequencialmente: cético, guardião de restrições, representante do usuário e árbitro. Nenhum revisor implementou código ou adicionou funcionalidades. Spec e plano foram consolidados pelo autor, e o árbitro avaliou ambos.

## Registro de objeções e resolução

| Id | Objeção | Resolução aceita | Tarefa |
|---|---|---|---|
| S1 | Ponto de onboarding não tinha persistência/recuperação definida | Criação da unidade e confirmação são etapas distintas; falha recupera sem repetir cadastro | T5 |
| S2 | Job poderia sobrescrever edição OWNER | CAS por version/fonte/fingerprint, sem escrever dados de conta/endereço | T7 |
| S3 | Job diário e retenção sem margem/saúde | Refresh20d, limpeza25d, margem30d, cron diário compatível Hobby, sweep limitado e bloqueio de ativação sem manutenção comprovada | T1/T7/T8 |
| S4 | Ordenação não congela coleção entre páginas | Contrato best-effort, deduplicação e refresh explícito; não prometer snapshot completo | T2/T6 |
| S5 | Candidato consumido dificultava resposta perdida | mutationId/ator/hash, reconciliação antes de candidato e GET privado da última mutação | T5 |
| C1 | Campos Google persistidos eram amplos demais | Somente coordenadas temporárias/placeId e metadados; endereço próprio separado; sem JSON/label Google persistidos | T1/T4/T7 |
| C2 | Uso/revogação e política pouco explícitos | Aviso prévio, clear real e cancelamento de GPS/queries, termos/privacidade públicos antes de ativar Google real | T3/T4/T6/T8 |
| C3 | Sweep global poderia bloquear lista textual | Índice/lote100/timeout100ms; proximidade indisponível conserva texto, validade no SELECT | T2/T7 |
| U1 | OWNER não entenderia ponto vencido/revisão | Estado legível e ação Revisar localização, distinguindo falha de serviço; sem novas notificações | T5 |
| U2 | Posição antiga poderia parecer atual | Captura/precisão visíveis, validade10min, resume invalida e atualização explícita | T3/T6 |

Nenhuma objeção foi rejeitada; todas foram resolvidas por refinamento, preservando UX e provedor escolhidos. Não foi exigido plano pago da Vercel: a proposta inicial de cron mais frequente foi ajustada após consulta oficial ao limite diário do Hobby.

## Parecer do árbitro

APPROVED: plano T1–T8 cobre experiência e resoluções sem contradições materiais. Chaves Google, quotas/cron/alertas, revisão de textos públicos e homologação real/nativa são condições de ativação/publicação, não impedimentos para implementar código e testes isolados. O aceite humano do plano completo ainda precede execução.

## Artefatos

- Spec: D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/DESENHO_DESCOBERTA_HOME_GEOLOCALIZACAO_2026-10-14.md.
- Plano: D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/superpowers/plans/2026-10-14-descoberta-home-geolocalizacao.md.
- Contexto: D:/smart_barber/Smart-Barber-frontend-mobile-web/docs/CONTEXTO_DESCOBERTA_HOME_CLIENTE_2026-10-14.md.

Nesta fase só foram criados/atualizados documentos. Nenhum endpoint, SDK, chave, cron, migração ou ambiente de produção foi alterado.

# Cadastro e confirmação — fechamento técnico

14/10/2026. Escopo: cadastro CLIENT/OWNER, validação, envio, link, confirmação e login. Descoberta, carrinho após autenticação, geolocalização e tópicos seguintes continuam fora desta entrega.

## Resultado

Implementação e validação técnica local concluídas. Validação visual: PENDENTE DO USUÁRIO. Merge, configuração remota e deploy desta entrega não foram executados.

### Frontend

- Entradas CLIENT/OWNER e login único preservados; CPF e senha alinhados à API (15 caracteres e máximo de 72 bytes UTF-8).
- Criação seguida de envio; falha de envio não repete cadastro. Criação ambígua oferece recuperação explícita.
- E-mail pendente no login tem ação contextual.
- Confirmação usa geração de tentativa, trava síncrona e retry transitório; token inválido não fica disponível para retry cego.
- Corrigido problema descoberto no navegador: replace podia remontar a tela e perder o resultado. Agora setParams preserva a tela; a URL web é higienizada explicitamente sem persistir token.
- OWNER intent canônico e legado chegam ao onboarding, sem concessão de papel no cadastro.

### Backend e testes

- Link da interface explicitamente configurado; HTTPS em produção, sem fallback para domínio da API; query/fragment arbitrários removidos.
- Reenvio: 3 por e-mail/minuto e 30 por IP/minuto. Limite excedido retorna 429; armazenamento inválido/indisponível retorna 503 sem envio.
- Novos testes usam apenas SMARTBARBER_TEST_DATABASE_URL, loopback e banco sb_client_auth_test_*. Schema aleatório por teste, sem DELETE de tabelas globais.
- Suíte local obsoleta de criação com DELETE global foi arquivada em .tmp; os cenários de persistência reais já estão cobertos pela suíte segura do PR #52, integrado na main da API.
- Proteção de credenciais/papel na criação continua a do PR #52; este fechamento não regrava esses campos.

## Evidências executadas

| Verificação | Resultado |
|---|---|
| Frontend completo | PASS — 69 arquivos / 417 testes |
| TypeScript frontend e API | PASS |
| Export web | PASS — 52 rotas |
| API unitária (sem integrações) | PASS — 61 arquivos / 251 testes |
| HTTP real de cadastro + integração do limitador | PASS — 2 arquivos / 10 testes |
| Guardas, middleware e integrações focalizadas finais | PASS — 4 arquivos / 24 testes (incluem os 10 acima; não somar como independentes) |
| Biome API e diff check | PASS nos arquivos desta entrega |
| Chrome CLIENT 1280px | PASS — cadastro, captura de link, login bloqueado antes de confirmar, confirmação, URL limpa, reload sem POST e login para home CLIENT |
| Chrome OWNER 390px | PASS — cadastro, captura de link, confirmação, URL limpa, reload sem POST e login para barbershop-setup |

No navegador: duas contas sintéticas, duas confirmadas, exatamente um cadastro/envio/confirmação por jornada. API, browser e PostgreSQL 18 locais; instância descartável na porta 15437. Nenhuma mensagem externa ou dado de produção foi usado.

Os testes unitários excluem explicitamente suítes *.integration.spec.ts, *.e2e.spec.ts e duas suítes HTTP legadas nomeadas *.spec.ts (team-and-operations-http e booking-access), que dependem de schema próprio. Uma primeira tentativa de executá-las sem esse schema falhou; não são declaradas aprovadas nesta entrega. As novas integrações são executadas separadamente com isolamento obrigatório. Existem avisos de act em testes assíncronos e de configuração Vite legada; não há alegação de execução livre de avisos.

## Publicação e revisão humana

1. API: revisar PR de cadastro/links e configurar EMAIL_VERIFICATION_URL (ou FRONTEND_URL) para o domínio frontend HTTPS antes de liberar o envio em produção.
2. Frontend: revisar PR e validar visualmente cadastro CLIENT/OWNER, confirmação, erros e login.
3. O proxy web existente continua apontando à API de produção. Um preview visual não equivale à homologação funcional das duas branches em conjunto; esta foi realizada localmente.
4. Após aprovação, coordenar merge/deploy e smoke autenticado de produção. Não realizados neste fechamento.

Entrega a caixas postais externas, configurações remotas, Android/iOS físicos e app/universal links: NOT TESTED. Não são substituídos por mocks ou viewport mobile. Visual permanece com o usuário, conforme solicitado.

## Reprodução técnica

- Frontend: npm test; npm run typecheck; npm run build.
- API: npx tsc --noEmit; testes unitários com exclusões acima.
- Para integração, definir SMARTBARBER_TEST_DATABASE_URL para banco local descartável sb_client_auth_test_* e executar os arquivos client-onboarding.integration.spec.ts e send-verification-email-limit.integration.spec.ts.
- Captura de e-mail da integração é um fake injetado; endpoints, controllers, persistência, token e autenticação executam implementação real.

Referências consultadas: [transações Drizzle](https://orm.drizzle.team/docs/transactions) e [parâmetros Expo Router](https://docs.expo.dev/router/reference/url-parameters/). Context7 não estava disponível nesta sessão; documentação oficial e tipos instalados foram usados.

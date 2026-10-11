# Incidente de login em produção — 11/10/2026

## Conclusão do diagnóstico

O handoff descrevia uma falha anterior de CORS, mas seus dois PRs já estavam merged e publicados quando esta investigação começou. No navegador Chrome isolado, o login atual teve sucesso HTTP e o aplicativo encaminhou a conta de demonstração para uma rota inexistente. Separadamente, a sessão web não podia renovar nem sair no servidor porque o front chamava outro domínio sem transportar o cookie exigido pela API.

Nenhuma senha, token ou cookie de sessão é incluído neste documento. Não houve alteração de dados de usuários, seed, planos, permissões ou infraestrutura do backend.

## Entregas e publicação verificadas

Horários de Brasília (UTC−3), consultados no GitHub nesta investigação:

| Entrega | Estado atual | Hora | Revisão |
| --- | --- | --- | --- |
| API PR #45 — integração anterior | Merged | 11h58 | `e901bf1` |
| Frontend PR #24 — integração anterior | Merged | 11h58 | `a09db36` |
| Frontend PR #25 — retirada de credentials include | Merged; deployment Production success | 12h59 | `3a151b5` |
| API PR #46 — alteração de CORS | Merged; deployment Production success | 13h04 | `a1ba2da` |

Referências: [frontend #24](https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/pull/24), [frontend #25](https://github.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/pull/25), [API #45](https://github.com/Proj-Smart-Barber/api/pull/45), [API #46](https://github.com/Proj-Smart-Barber/api/pull/46).

Os aliases `smartbarber.wellingtonsp.uk` e `smart-barber-frontend-mobile-web-seven.vercel.app` entregavam o mesmo bundle `entry-7770d884f1d018e7e3fd565e2e6ad65a.js`. Esse bundle contém a URL absoluta da API e o header `X-SmartBarber-Client: web`. O domínio `smartbarber.app`, presente como fallback no código, excedeu o timeout de 15 segundos; não foi considerado o alvo validado desta recuperação.

Os registros de deployment consultados foram frontend `6998053672` e API `6998108748`, ambos com estado `success`. Isso é evidência de publicação; não substitui teste funcional. URLs exclusivas de deployment podem exigir autenticação Vercel e não foram confundidas com os aliases públicos.

## Reprodução na produção anterior à correção

Origem: `https://smartbarber.wellingtonsp.uk`. Navegador Chrome isolado, sem reutilizar cookies ou interferir no navegador do usuário.

| Verificação | Resultado | Interpretação |
| --- | --- | --- |
| OPTIONS login nas duas origens públicas | 204; origem exata refletida; credentials true | O conflito wildcard/include do handoff não ocorre na configuração atual |
| Login pela própria tela | 201 | A credencial de demonstração foi aceita |
| GET `/api/users/me` | 200 | A identidade foi carregada |
| GET `/api/users/me/barbershops` | 200; um vínculo | O vínculo autorizado foi carregado |
| Página após login | `/(app)/dashboard`; “Unmatched Route” | A falha visível atual acontece após autenticar |
| POST refresh com `{}` como o frontend | 400; refresh_token ausente | Cookie não acompanha o transporte atual |
| POST sign-out com `{}` como o frontend | 400; refresh_token ausente | A saída remota também falha |

Não foi reproduzido `Failed to fetch` no login atual. O diagnóstico de CORS fornecido pode explicar o incidente anterior; não explica sozinho os defeitos encontrados depois dos merges.

## Causas e cadeia de falha

1. `resolveEntryDestination` retorna `/(app)/dashboard` para quem possui vínculo. Não existe `src/app/(app)/dashboard.tsx`; o dashboard está em `src/app/(app)/index.tsx`. Resultado: login, perfil e vínculos funcionam, porém a navegação termina na página de rota inexistente.
2. `ENV.API_URL` usa o domínio absoluto `api-black-theta-13.vercel.app` também no web. O `vercel.json` anterior só tinha fallback SPA, sem proxy `/api`.
3. O adapter Express já implementa cookie web: remove refresh do JSON, emite `smartbarber_refresh_token` HttpOnly, Secure em produção, SameSite=Strict, Path `/api/users/sessions`, sem Domain; também extrai o cookie na renovação/saída. Portanto, afirmar que a API não possui cookies seria incorreto.
4. O fetch atual usa o comportamento padrão same-origin. Chamadas para outro domínio não transportam esse cookie. Mesmo forçar include não resolve a topologia entre sites com SameSite=Strict. Controllers recebem refresh ausente e respondem 400.
5. O storage web anterior persistia accessToken apesar de comentar que não armazenava segredos. Isso mascarava a falta de refresh até a expiração do token. O engine também mantinha marcador de saída pendente mesmo depois de sucesso remoto.

## Plano de recuperação e correções aplicadas

- Redirecionar vínculos autorizados para `/(app)`, a rota operacional existente.
- Configurar rewrite `/api/:path*` para a API antes do fallback SPA. O navegador permanece no domínio do app, e o cookie passa a pertencer a esse domínio.
- Produção web usa origem do app mesmo quando EXPO_PUBLIC_API_URL contém endereço absoluto. Native e desenvolvimento preservam URL explícita.
- Guardar somente indícios não secretos no storage web. Ignorar accessToken legado na restauração e renovar pelo cookie protegido; access fica em memória.
- Limpar persistência e marcador após saída remota confirmada; falha offline preserva o bloqueio local existente.
- Executar testes de regressão, TypeScript, export web, browser com API real, publicar o patch e repetir a homologação nos aliases públicos.

Configuração de proxy apoiada pela [documentação oficial de rewrites externos da Vercel](https://vercel.com/docs/routing/rewrites). A transmissão de cookie pelo hosting é verificada funcionalmente no deployment, não presumida apenas a partir da documentação.

## Evidência local com backend real

O build de produção corrigido foi servido em `http://127.0.0.1:4173` com relay isolado para a API de produção. A conta de demonstração foi usada somente para autenticação/leitura e renovação/saída das sessões de teste.

| Fluxo | Resultado |
| --- | --- |
| Login na tela | 201; dashboard operacional renderizado |
| Perfil e vínculos | 200 / 200 |
| Cookie | HttpOnly=true; Secure=true; SameSite=Strict; Path correto; domínio do relay |
| Recarga do navegador | Refresh 200; perfil/vínculos 200; dashboard preservado |
| Agenda consumida pelo dashboard | GET schedule/details 200 |
| Segredos em localStorage após login/recarga | Não encontrados |
| Renovação explícita com corpo `{}` e cookie | 200 |
| Saída explícita com corpo `{}` e cookie | 204 |
| Recarga após saída | Tela de login, sem acesso restaurado |

Regressões foram executadas antes do patch e falharam pelos defeitos esperados: rota inexistente, URL absoluta no web, token persistido e marcador de saída que não era limpo. Após o patch passaram. Suíte completa final: 201 testes, 34 arquivos, todos aprovados, incluindo compatibilidade native. TypeScript passou após completar a fixture de identidade. Exportação web passou, 39 rotas. Há avisos de ambiente sobre tsconfig do diretório pai e NO_COLOR/FORCE_COLOR; não houve erro de build.

## Limites, acompanhamentos e rollback

- Logs internos completos da função Vercel não estavam disponíveis por um conector autenticado. Foram usados código atual, registros de deployment, erros do navegador e respostas reais de API; não se afirma que logs internos completos foram consultados.
- A identidade da conta demo vem como CLIENT, mas seu vínculo concede OWNER. O patch respeita o vínculo retornado e não altera esse dado. Reconciliar tipo global e seed exige inventário específico.
- O patch recupera login e transporte de sessão; não certifica toda a implementação anterior contra o plano. Permanecem revisão de allowlist/Origin e proteção de mutations no backend, metadados autoritativos de expiração, concorrência entre abas e tratamento completo de revogação offline/refresh ambíguo. Testes de componente anteriores não provaram esses contratos em produção.
- Testar somente a conta demo não certifica cadastro/recuperação/e-mail nem login real de todos os papéis; não houve envio de e-mails ou criação de contas nesta investigação.
- Sessões antigas podem exigir novo login, pois cookies emitidos no domínio antigo não migram para o domínio do app. Não é necessário alterar senhas ou o banco.
- Rollback: reverter o commit de recuperação ou selecionar o deployment anterior na Vercel. Isso reintroduz os defeitos demonstrados; usar apenas se surgir regressão confirmada.

## Estado da publicação

Correção validada localmente contra backend real. A seção de homologação pública será atualizada após publicação; até isso ocorrer, não declarar produção recuperada.

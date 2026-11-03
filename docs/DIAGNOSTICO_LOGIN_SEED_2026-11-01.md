# Diagnóstico de login e seed — 01/11/2026

## Causa confirmada

Os dados do seed atualizado estavam no banco local `smartbarber`, mas a API que atende o celular usava a base isolada `sb_mobile_sdk58_20261101`. A segunda base ainda tinha os aliases temporários do primeiro teste mobile.

Antes da sincronização: banco principal tinha as 20 contas esperadas, 20 senhas compatíveis com o seed atualizado e 20 e-mails verificados; a base ativa não tinha nenhum dos 20 e-mails esperados. A API respondia 401 para as credenciais novas e 201 para a conta temporária anterior. Isso confirmou divergência de base/dados, sem evidência de defeito no transporte de login.

## Correção aplicada

Criado backup privado de `sb_mobile_sdk58_20261101` antes da alteração. O seed atualizado de `D:/smart_barber/api` foi executado com destino explicitamente limitado à base mobile local. O banco principal não foi alterado nesta correção.

O seed terminou com sucesso. Depois dele, a base ativa continha as 20 contas esperadas com senhas e verificação compatíveis. As antigas credenciais temporárias de `cliente@example.invalid` deixaram de ser válidas; usar os logins do seed atualizado.

## Verificação real

Requests enviados para `http://192.168.18.56:3333` com `X-SmartBarber-Client: native`:

| Papel | Login HTTP 201 | Perfil HTTP 200 |
| --- | --- | --- |
| OWNER | 2 | 2 |
| BARBERMAN | 6 | 6 |
| CLIENT | 12 | 12 |
| Total | 20 | 20 |

Nenhum token, senha ou valor de `.env` foi publicado no relatório. Os processos de API 3333 e Expo 8081 permaneceram ativos; não foi necessário reiniciar a API para ler os dados atualizados.

Logs privados: `.tmp/mobile58-updated-seed.log`. Backup privado: `.tmp/api-mobile58/.tmp/antes-seed-atualizado-*.sql`. Diagnóstico e verificação reproduzíveis: `.tmp/api-mobile58/diagnose-seed.ts` e `verify-mobile-accounts.ts`.

# Integração Availability — frontend x `feat/availability-engine`

Este documento registra o contrato observado diretamente na branch de backend
`feat/availability-engine` recebida em 11/09/2026 e as adaptações feitas apenas
no frontend.

## Contrato HTTP real observado

Base: `/api/barbershops/:shopId`

| Ação | Método | Endpoint | Contrato atual |
|---|---|---|---|
| Ler jornada | GET | `/schedules?barbermanId=` | responde `{ schedules: [] }` fixo |
| Gravar intervalo | PUT | `/schedules` | **um intervalo por request**: `dayOfWeek`, `openTime`, `closeTime`, `barbermanId?` |
| Ler exceções | GET | `/schedule-exceptions?barbermanId=` | responde `{ exceptions: [] }` fixo |
| Criar exceção | POST | `/schedule-exceptions` | `date`, `startTime`, `endTime`, `reason`, `barbermanId?` |
| Editar exceção | PATCH | `/schedule-exceptions/:exceptionId` | responde mensagem mock; não persiste alteração |
| Remover exceção | DELETE | `/schedule-exceptions/:exceptionId` | remove do repository em memória |
| Calcular slots | GET | `/availability` | query `date`, `serviceIds`, `barbermanId?`; resposta `{ slots }` |

## Adaptações feitas somente no frontend

- `AvailabilityHttpAdapter` implementado para o contrato camelCase real.
- `openTime/closeTime` do domínio são traduzidos para `startTime/endTime` apenas
  no transporte de exceções.
- `serviceId` foi corrigido para `serviceIds: string[]`; o adapter envia lista
  separada por vírgulas, formato aceito pelo controller atual.
- `PUT /schedules` é chamado uma vez para cada intervalo, pois o backend não
  aceita array no body.
- Query cache e espelho em memória preservam o que acabou de ser salvo porque
  os GETs atuais devolvem listas vazias.
- Edição de exceção usa DELETE + POST quando o item está no espelho, pois o
  PATCH atual não altera o repository.
- O `barbershopId`, nome e timezone deixaram de depender do mock e passaram a
  ser configuráveis por variáveis `EXPO_PUBLIC_*`.
- A escolha `mock`/`http` também é configurável, sem alterar UI/ViewModel.

## Limitações que NÃO podem ser eliminadas corretamente só pelo frontend

1. **Jornada não possui operação de replace/delete no backend.** O PUT sempre
   cria uma nova entidade. Alterar novamente um dia ou desativá-lo deixa a
   jornada antiga no repository do servidor.
2. **O cálculo usa apenas o primeiro intervalo encontrado do dia.** Se houver
   dois intervalos (ex.: 08–12 e 13–18), o motor atual considera apenas o
   primeiro.
3. **GET de jornadas e exceções não lê o repository.** Em reload completo do
   app, o frontend não consegue reconstruir os dados do servidor.
4. **Não há GET `/barbershops/:id` nem barbershopId/timezone em `/staffs/me`.**
   Portanto a unidade usada pela feature precisa ser configurada no frontend.
5. **Repositories da feature são InMemory.** Reiniciar o servidor apaga os
   dados de disponibilidade.

Esses itens são limitações do contrato/implementação atual do backend. O
frontend possui compatibilidade para desenvolvimento e integração HTTP, mas não
pode tornar persistente ou recuperável uma informação que a API não expõe.

## Como ativar a integração HTTP

No `.env` do frontend:

```env
EXPO_PUBLIC_API_URL=http://SEU_HOST:PORT
EXPO_PUBLIC_AVAILABILITY_SOURCE=http
EXPO_PUBLIC_BARBERSHOP_ID=barbershop-seed-0001
EXPO_PUBLIC_BARBERSHOP_NAME=Barbearia Exemplo
EXPO_PUBLIC_BARBERSHOP_TIMEZONE=America/Sao_Paulo
```

Em aparelho físico, `localhost` aponta para o próprio celular. Use o IP da
máquina na rede local quando o backend estiver rodando no computador.

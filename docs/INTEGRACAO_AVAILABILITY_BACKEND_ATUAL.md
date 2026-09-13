# Integração Availability — auditoria frontend x backend

**Auditoria do código real:** 13/09/2026  
**Backend analisado:** `api-feat-availability-engine`  
**Frontend analisado:** `feature/4-sprint-2-definicao-disponibilidade`

## Estado confirmado do backend

Base HTTP: `/api/barbershops/:shopId`

| Ação | Método | Estado real observado |
|---|---|---|
| Ler barbearia | GET `/:shopId` | ✅ Drizzle, retorna `{ barbershop }` com timezone |
| Ler jornada | GET `/schedules` | ✅ Drizzle, retorna jornadas reais |
| Salvar jornada | PUT `/schedules` | ⚠️ Ainda cria **uma entrada por request**; não substitui a grade antiga |
| Ler exceções | GET `/schedule-exceptions` | ✅ Drizzle |
| Criar exceção | POST `/schedule-exceptions` | ✅ Drizzle |
| Editar exceção | PATCH `/schedule-exceptions/:id` | ✅ Drizzle, persiste alteração |
| Excluir exceção | DELETE `/schedule-exceptions/:id` | ✅ Drizzle |
| Calcular slots | GET `/availability` | ✅ múltiplos turnos/exceções; bookings ainda InMemory |

## Correções feitas no frontend nesta auditoria

- `GET /barbershops/:shopId` passou a ser usado de verdade; nome/timezone não vêm mais do `.env`.
- Removidos os espelhos em memória de jornadas/exceções: os GETs do backend agora são autoritativos.
- `PATCH` de exceção passou a usar o endpoint real e recarregar a entidade persistida.
- `dayOfWeek` recebido do backend é normalizado de forma case-insensitive (`monday` → `MONDAY`), necessário porque o seed atual usa minúsculas.
- Sem `barbermanId`, o adapter mantém a semântica do frontend de "jornada geral", filtrando registros de profissionais que o GET do backend também pode retornar.
- O `createdBy` do PUT atual passa a receber o `staff.id` autenticado através da camada `app`, evitando o fallback inválido `mock-user-id` do backend.
- Cache do TanStack Query voltou a ser revalidável, pois os endpoints GET agora leem dados reais.
- `EXPO_PUBLIC_BARBERSHOP_NAME` e `EXPO_PUBLIC_BARBERSHOP_TIMEZONE` foram removidos; apenas o ID temporário da unidade permanece configurável.

## Bloqueador para integração definitiva

O repositório `DrizzleSchedulesRepository` já possui `bulkReplace`, porém o controller/use case atual de `PUT /schedules` ainda chama `create()` para **uma única jornada**.

Isso significa que o frontend não consegue, por HTTP:

- desativar um dia que já tinha horários;
- remover um intervalo existente;
- substituir `09:00–18:00` por `10:00–17:00` sem deixar o registro antigo;
- salvar a grade semanal repetidamente sem acumular duplicatas.

Não existe endpoint DELETE de schedules, então esse comportamento não pode ser corrigido corretamente apenas no frontend.

### Ajuste mínimo necessário no backend antes de ativar HTTP

Fazer `PUT /barbershops/:shopId/schedules` receber a grade do escopo e executar `bulkReplace` de forma atômica. O documento técnico final já descreve essa intenção, mas o ZIP atual ainda não a conecta ao controller/use case.

Também é recomendável que `createdBy` seja obtido do usuário autenticado no backend em vez de vir do body. Enquanto isso não ocorrer, o frontend envia o `staff.id` para compatibilidade.

## Pendências não bloqueantes para a tela de configuração

- `/staffs/me` ainda não informa `barbershopId`; por isso `EXPO_PUBLIC_BARBERSHOP_ID` continua necessário temporariamente.
- O motor de disponibilidade ainda monta ISO com offset `-03:00` fixo, apesar de a barbearia possuir `timezone`.
- O cálculo usa `InMemoryBookingsRepository`; conflitos com bookings reais ainda não são lidos do banco.

## Como deixar o frontend preparado

Desenvolvimento isolado:

```env
EXPO_PUBLIC_AVAILABILITY_SOURCE=mock
```

Quando o backend corrigir o replace da jornada:

```env
EXPO_PUBLIC_API_URL=http://SEU_HOST:PORT
EXPO_PUBLIC_AVAILABILITY_SOURCE=http
EXPO_PUBLIC_BARBERSHOP_ID=<UUID_REAL_DA_BARBEARIA>
```

Em Expo Go, não use `localhost` para um backend executando no PC; use o IP local da máquina na mesma rede.

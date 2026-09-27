# Integração Availability — frontend x backend atualizado

**Auditoria do código real:** 13/09/2026  
**Backend analisado:** `api-feat-availability-engine` (versão atualizada)  
**Frontend atualizado:** `feature/4-sprint-2-definicao-disponibilidade`

## Estado confirmado do backend

Base HTTP: `/api/barbershops/:shopId`

| Ação | Método | Estado observado |
|---|---|---|
| Perfil autenticado | GET `/api/staffs/me` | ✅ retorna `staff` e, para OWNER, `barbershop { id, name, timezone }` |
| Ler barbearia | GET `/:shopId` | ✅ Drizzle, retorna `{ barbershop }` |
| Ler jornada | GET `/schedules` | ✅ Drizzle |
| Salvar jornada | PUT `/schedules` | ✅ batch `schedules[]` + `bulkReplace` atômico |
| Escopo profissional | `?barbermanId=UUID` | ✅ separa jornada geral da jornada do profissional |
| Limpar jornada | PUT `/schedules` com `schedules: []` | ✅ remove apenas o escopo solicitado |
| Ler exceções | GET `/schedule-exceptions` | ✅ Drizzle |
| Criar exceção | POST `/schedule-exceptions` | ✅ autenticado + ownership |
| Editar exceção | PATCH `/schedule-exceptions/:id` | ✅ autenticação, ownership e validação de horários |
| Excluir exceção | DELETE `/schedule-exceptions/:id` | ✅ autenticação + ownership |
| Calcular slots | GET `/availability` | ✅ usa timezone da barbearia; bookings ainda InMemory |

## Ajustes aplicados no frontend

- `PUT /schedules` agora envia **um único batch**, em vez de uma requisição por intervalo.
- `createdBy` foi removido do payload; o backend usa o usuário autenticado do JWT.
- `barbermanId` passou a ser tratado como escopo da query string.
- `schedules: []` é enviado normalmente, permitindo apagar toda a jornada do escopo.
- Após o `PUT`, o frontend recarrega a jornada pelo `GET` e mantém o backend como fonte autoritativa.
- `/api/staffs/me` agora alimenta a sessão com `barbershop`, removendo a dependência de `EXPO_PUBLIC_BARBERSHOP_ID` no modo HTTP.
- O ViewModel recebe o `barbershop.id` da sessão autenticada.
- O adapter rejeita batches que misturem múltiplos `barbermanId`.
- O botão voltar da tela de disponibilidade passou a usar fallback para `/(app)` quando não há histórico.
- A rota fantasma `agenda` foi removida do `(app)/_layout.tsx`, eliminando o warning do Expo Router enquanto `agenda.tsx` não existir.
- Testes do adapter HTTP foram atualizados para o novo contrato batch e para o caso de limpeza de jornada profissional.

## Contrato usado pelo frontend

### Jornada geral

```http
PUT /api/barbershops/:shopId/schedules
Authorization: Bearer <token>
```

```json
{
  "schedules": [
    {
      "dayOfWeek": "MONDAY",
      "openTime": "08:00",
      "closeTime": "12:00"
    },
    {
      "dayOfWeek": "MONDAY",
      "openTime": "13:00",
      "closeTime": "18:00"
    }
  ]
}
```

### Jornada de profissional

```http
PUT /api/barbershops/:shopId/schedules?barbermanId=UUID
Authorization: Bearer <token>
```

O body continua com o mesmo formato de `schedules[]`.

### Limpar jornada geral

```json
{ "schedules": [] }
```

### Limpar jornada de um profissional

```http
PUT /api/barbershops/:shopId/schedules?barbermanId=UUID
```

```json
{ "schedules": [] }
```

## Configuração para integração HTTP

```env
EXPO_PUBLIC_API_URL=http://SEU_HOST:PORT
EXPO_PUBLIC_AVAILABILITY_SOURCE=http
```

`EXPO_PUBLIC_BARBERSHOP_ID` não é mais necessário no modo HTTP. O ID vem de `/api/staffs/me`.

Em Expo Go, não use `localhost` quando o backend estiver rodando no PC; use o IP local da máquina na mesma rede.

## Pendência conhecida no backend

O `CalculateAvailabilityUseCase` já consulta a timezone da barbearia, porém o factory ainda injeta `InMemoryBookingsRepository`. Portanto, bookings reais persistidos no PostgreSQL ainda não bloqueiam slots até a integração do repositório Drizzle correspondente.

## Observação de status HTTP

Os use cases aplicam ownership e retornam `NotAllowedError`, mas alguns controllers ainda convertem qualquer erro de domínio usando `clientError(...)` (HTTP 400). Se o contrato desejado for realmente `403 Forbidden`, o mapeamento do controller deve usar `forbidden(...)` para `NotAllowedError`.

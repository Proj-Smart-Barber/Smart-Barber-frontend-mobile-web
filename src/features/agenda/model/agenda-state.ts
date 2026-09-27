/**
 * Parâmetros de sincronização da Agenda, confirmados em planejamento:
 * - polling: 60s
 * - lentidão de sincronização: > 5s em andamento
 * - dado desatualizado: > 5 min desde a última atualização
 * - staleTime do cache: 60s
 * - navegação entre dias: máximo de ±90 dias a partir de hoje
 */
export const AGENDA_SYNC_CONFIG = {
  staleTimeMs: 60_000,
  pollingIntervalMs: 60_000,
  slowSyncThresholdMs: 5_000,
  staleDataThresholdMs: 5 * 60_000,
  navigationLimitDays: 90,
} as const;

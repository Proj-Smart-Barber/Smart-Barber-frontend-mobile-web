-- Inventário somente leitura. Preparado em 11/11/2026; NÃO executado nesta auditoria.
-- Usar somente conexão/ambiente explicitamente autorizados.
-- Não carrega credenciais, não instala extensões e não executa consultas de negócio.
-- Confirmar compatibilidade das views/colunas com a versão efetiva antes de usar.

BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';

-- Versão e limites/configuração pertinentes, sem URL, senha ou conninfo.
SELECT version() AS postgres_version;
SELECT name, setting, unit, source
FROM pg_settings
WHERE name IN (
  'max_connections', 'shared_buffers', 'work_mem', 'effective_cache_size',
  'maintenance_work_mem', 'autovacuum', 'autovacuum_analyze_scale_factor',
  'autovacuum_vacuum_scale_factor', 'statement_timeout', 'lock_timeout',
  'idle_in_transaction_session_timeout', 'track_io_timing'
)
ORDER BY name;

-- Extensões presentes; consulta não instala nenhuma.
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pg_stat_statements', 'pg_trgm', 'postgis', 'btree_gist')
ORDER BY extname;

-- Índices efetivos, predicados e sinais de construção incompleta.
SELECT t.relname AS table_name, i.relname AS index_name,
       x.indisvalid, x.indisready, x.indisunique,
       pg_size_pretty(pg_relation_size(i.oid)) AS index_size,
       pg_get_indexdef(i.oid) AS definition
FROM pg_index x
JOIN pg_class t ON t.oid = x.indrelid
JOIN pg_class i ON i.oid = x.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN (
    'bookings', 'booking_service_items', 'booking_events', 'membership',
    'barbershop_schedules', 'barbershop_schedule_scopes', 'schedule_exceptions',
    'notifications', 'services', 'barbershops', 'barbershop_locations',
    'reviews', 'barbershop_gallery', 'service_media', 'media',
    'finance_entries', 'explore_feed_snapshots', 'operation_attempts'
  )
ORDER BY t.relname, i.relname;

-- Estatísticas estimadas. n_dead_tup não mede bloat exato.
SELECT relname, n_live_tup, n_dead_tup, seq_scan, idx_scan,
       n_tup_ins, n_tup_upd, n_tup_del,
       last_autovacuum, last_autoanalyze,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Uso de índices depende da janela desde o reset; zero não autoriza remoção.
SELECT relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY relname, indexrelname;

SELECT stats_reset
FROM pg_stat_database
WHERE datname = current_database();

-- Esperas agregadas; sem textos SQL, nomes de usuários ou endereços de clientes.
SELECT state, wait_event_type, wait_event, count(*) AS connections,
       max(EXTRACT(EPOCH FROM (clock_timestamp() - xact_start))) AS max_xact_age_seconds
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid()
GROUP BY state, wait_event_type, wait_event
ORDER BY connections DESC;

ROLLBACK;

-- OPCIONAL: executar separadamente somente se pg_stat_statements estiver presente
-- e acessível. Schema da extensão pode não ser public/search_path.
-- Não seleciona query text ou parâmetros; queryid serve para correlação interna.
-- BEGIN READ ONLY;
-- SET LOCAL statement_timeout = '5s';
-- SELECT queryid, calls, total_exec_time, mean_exec_time, rows,
--        shared_blks_hit, shared_blks_read, temp_blks_written
-- FROM pg_stat_statements
-- WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
-- ORDER BY total_exec_time DESC
-- LIMIT 25;
-- ROLLBACK;

-- Planos de execução ficam para a fase de medição em banco isolado.
-- Antes de cada EXPLAIN ANALYZE, inspecionar o SELECT e seus efeitos possíveis.
-- Usar binds sintéticos e limites/timeouts explícitos; não analisar DML de negócio.

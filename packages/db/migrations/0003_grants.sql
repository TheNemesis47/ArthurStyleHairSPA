-- 0003_grants.sql — permessi del ruolo applicativo (docs/05 §5). Il ruolo si crea fuori dalle migrazioni (infra).
-- app_api: niente DDL, niente BYPASSRLS, non proprietario delle tabelle → la Row-Level Security gli si applica.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN
    GRANT USAGE ON SCHEMA public TO app_api;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_api;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_api;
    ALTER ROLE app_api SET statement_timeout = '5s';
  ELSE
    RAISE NOTICE 'Ruolo app_api assente: permessi non assegnati (ambiente di sviluppo?)';
  END IF;
END $$;

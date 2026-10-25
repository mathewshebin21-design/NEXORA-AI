-- One-time database bootstrap (run as a PostgreSQL superuser).
-- Creates the owner role (runs migrations) and the runtime role (subject to RLS).
-- Replace the passwords outside local development.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexora_owner') THEN
    CREATE ROLE nexora_owner LOGIN PASSWORD 'nexora_owner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexora_app') THEN
    CREATE ROLE nexora_app LOGIN PASSWORD 'nexora_app' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

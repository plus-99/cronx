-- Initialize PostgreSQL database for Cronx
-- This script is automatically executed when the PostgreSQL container starts

-- Ensure the cronx database exists (already created by POSTGRES_DB)
-- CREATE DATABASE IF NOT EXISTS cronx;

-- Connect to cronx database
\c cronx;

-- Create schema for Cronx tables (tables will be auto-created by Cronx)
-- The Cronx library will automatically create the required tables:
-- - jobs
-- - job_runs
-- - locks

-- Create indexes for better performance
-- Note: These will be created after Cronx creates the tables

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE cronx TO cronx;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cronx;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cronx;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cronx;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO cronx;

-- Optimize PostgreSQL for Cronx workload
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET log_statement = 'none';
ALTER SYSTEM SET log_duration = off;
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Restart required for some settings, but container handles this
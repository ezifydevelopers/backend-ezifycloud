-- Fix Database Permissions Script
-- Run this as postgres user: sudo -u postgres psql -d ezifycloud -f scripts/fix-permissions.sql
-- Or copy and paste these commands into psql

-- Grant schema permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO ezifyuser;
GRANT USAGE, CREATE ON SCHEMA public TO ezifyuser;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ezifyuser;

-- Grant database permissions
GRANT ALL PRIVILEGES ON DATABASE ezifycloud TO ezifyuser;

-- Grant permissions on existing tables (if any)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ezifyuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ezifyuser;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ezifyuser;

-- Verify permissions
\du ezifyuser
\dn+ public


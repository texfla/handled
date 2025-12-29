#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  COMPLETE SCHEMA RESET${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

DB_URL="postgresql://donkey@localhost:5432/handled_dev"

echo -e "\n${RED}WARNING: This will DROP config, company, and customer schemas!${NC}"
echo "Press CTRL+C within 3 seconds to cancel..."
sleep 3

echo -e "\n${GREEN}[1/3] Dropping schemas...${NC}"
PGUSER=donkey psql -h localhost -d handled_dev << SQL
DROP SCHEMA IF EXISTS customer CASCADE;
DROP SCHEMA IF EXISTS company CASCADE;
DROP SCHEMA IF EXISTS config CASCADE;
SQL

echo -e "\n${GREEN}[2/3] Clearing migration history...${NC}"
PGUSER=donkey psql -h localhost -d handled_dev << SQL
DELETE FROM public.schema_migrations WHERE schema_name IN ('config', 'company', 'customer');
SQL

echo -e "\n${GREEN}[3/3] Re-running migrations...${NC}"
cd /Users/donkey/Desktop/Projects/handled
bash database/run-migrations-dev.sh -dev

echo -e "\n${GREEN}✓ Complete reset successful!${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

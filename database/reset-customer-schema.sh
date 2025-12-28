#!/bin/bash
# ============================================================================
# Reset Customer Schema - Helper Script
# ============================================================================
# This script drops the customer schema and clears migration history,
# then re-runs migrations. Useful when consolidating migrations or making
# major schema changes.
# ============================================================================

set -e  # Exit on error

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Customer Schema Reset${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if we're in development
if [[ "$1" != "-dev" ]]; then
  echo -e "${RED}ERROR: This script requires -dev flag for safety${NC}"
  echo "Usage: bash reset-customer-schema.sh -dev"
  exit 1
fi

# Get database URL
DB_URL="${PRIMARY_DATABASE_URL:-postgresql://donkey@localhost:5432/handled_dev}"

echo -e "${BLUE}Target Database:${NC} $DB_URL"
echo ""
echo -e "${RED}WARNING: This will DROP the customer schema and all its data!${NC}"
echo -e "Press CTRL+C within 3 seconds to cancel..."
sleep 3

echo ""
echo -e "${BLUE}[1/3] Dropping customer schema...${NC}"
psql "$DB_URL" -c "DROP SCHEMA IF EXISTS customer CASCADE;"

echo -e "${BLUE}[2/3] Clearing migration history...${NC}"
psql "$DB_URL" -c "DELETE FROM config.schema_migrations WHERE schema_name = 'customer';"

echo -e "${BLUE}[3/3] Re-running migrations...${NC}"
echo ""
PRIMARY_DATABASE_URL="$DB_URL" bash "$(dirname "$0")/run-migrations-dev.sh" -dev

echo ""
echo -e "${GREEN}✓ Customer schema reset complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"


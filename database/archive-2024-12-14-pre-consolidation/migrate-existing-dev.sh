#!/bin/bash
# ============================================================================
# Migrate Existing Development Database to New System
# ============================================================================
# Run this ONCE on existing handled_dev/handled_test to switch to new system
#
# Usage:
#   bash database/migrate-existing-dev.sh                    # Uses .env
#   bash database/migrate-existing-dev.sh handled_test       # Override DB
# ============================================================================

set -e

SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env
ENV_FILE="${PROJECT_ROOT}/apps/backoffice/api/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env file not found at $ENV_FILE"
    exit 1
fi

# Load environment variables (properly handle quotes)
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Remove surrounding quotes from value
    value="${value%\"}"
    value="${value#\"}"
    
    # Export the variable
    export "$key=$value"
done < <(grep -v '^#' "$ENV_FILE" | grep -v '^$')

# Override database if provided as argument
if [ -n "$1" ]; then
    DB_NAME="$1"
    PRIMARY_DATABASE_URL="postgresql://donkey@localhost:5432/$DB_NAME"
    echo "Override: Using database '$DB_NAME'"
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Migrate Existing Database to New System${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Database: $PRIMARY_DATABASE_URL"
echo ""

# Step 1: Update tracking schema
echo -e "${YELLOW}Step 1: Update tracking table schema...${NC}"
psql "$PRIMARY_DATABASE_URL" -f "$SCRIPT_DIR/update-tracking-schema.sql"
echo -e "${GREEN}✓ Tracking schema updated${NC}"
echo ""

# Step 2: Clear legacy entries
echo -e "${YELLOW}Step 2: Clear old migration tracking entries...${NC}"
DELETED=$(psql "$PRIMARY_DATABASE_URL" -tAc "WITH deleted AS (DELETE FROM config.schema_migrations WHERE schema_name = 'legacy' RETURNING *) SELECT COUNT(*) FROM deleted;")
echo -e "${GREEN}✓ Cleared $DELETED legacy entries${NC}"
echo ""

# Step 3: Run new migrations (idempotent)
echo -e "${YELLOW}Step 3: Run new baseline migrations...${NC}"
bash "$SCRIPT_DIR/run-migrations-dev.sh"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Migration to new system complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  - Verify: psql -d handled_dev -c 'SELECT version, schema_name, description FROM config.schema_migrations ORDER BY applied_at DESC LIMIT 10;'"
echo "  - Test app: cd apps/backoffice/api && pnpm dev"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

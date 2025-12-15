#!/bin/bash
# ============================================================================
# Migrate Production Databases to New System
# ============================================================================
# ONE-TIME script to migrate production databases to schema-folder system
#
# Usage:
#   # From local machine (connects to remote DBs)
#   bash database/migrate-production.sh PRIMARY  # Migrates PRIMARY DB (config, customer)
#   bash database/migrate-production.sh DATA     # Migrates DATA DB (workspace, reference)
#
# IMPORTANT: Run with .env loaded, or set these manually:
#   PRIMARY_DATABASE_URL - DBaaS connection string
#   DATA_DATABASE_URL - VPS connection string
# ============================================================================

set -e

SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check argument
if [ "$#" -ne 1 ]; then
    echo "Usage: bash database/migrate-production.sh [PRIMARY|DATA]"
    echo ""
    echo "  PRIMARY - Migrate PRIMARY DB (config, customer schemas)"
    echo "  DATA    - Migrate DATA DB (workspace, reference schemas)"
    exit 1
fi

TARGET="$1"

# Load .env if available (for connection strings)
ENV_FILE="${PROJECT_ROOT}/apps/backoffice/api/.env"
if [ -f "$ENV_FILE" ]; then
    while IFS='=' read -r key value; do
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        value="${value%\"}"
        value="${value#\"}"
        export "$key=$value"
    done < <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
fi

# Select database
if [ "$TARGET" = "PRIMARY" ]; then
    DB_URL="$PRIMARY_DATABASE_URL"
    DB_NAME="PRIMARY (config, customer)"
    SCHEMAS=("config" "customer")
elif [ "$TARGET" = "DATA" ]; then
    DB_URL="$DATA_DATABASE_URL"
    DB_NAME="DATA (workspace, reference)"
    SCHEMAS=("workspace" "reference")
else
    echo -e "${RED}ERROR: Invalid target '$TARGET'. Must be PRIMARY or DATA${NC}"
    exit 1
fi

# Verify connection string
if [ -z "$DB_URL" ]; then
    echo -e "${RED}ERROR: Database URL not set!${NC}"
    echo "Set PRIMARY_DATABASE_URL or DATA_DATABASE_URL environment variable"
    exit 1
fi

# Production safety check
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  PRODUCTION DATABASE MIGRATION${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Target: $DB_NAME"
echo "URL: $DB_URL"
echo ""
echo -e "${RED}This will modify production database schema!${NC}"
read -p "Type 'MIGRATE PRODUCTION' to continue: " confirm

if [ "$confirm" != "MIGRATE PRODUCTION" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Starting Production Migration: $DB_NAME${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Update tracking schema
echo -e "${YELLOW}Step 1: Update tracking table schema...${NC}"
if psql "$DB_URL" -f "$SCRIPT_DIR/update-tracking-schema.sql"; then
    echo -e "${GREEN}✓ Tracking schema updated${NC}"
else
    echo -e "${RED}✗ Failed to update tracking schema${NC}"
    exit 1
fi
echo ""

# Step 2: Clear legacy entries
echo -e "${YELLOW}Step 2: Clear old migration tracking entries...${NC}"
DELETED=$(psql "$DB_URL" -tAc "WITH deleted AS (DELETE FROM config.schema_migrations WHERE schema_name = 'legacy' RETURNING *) SELECT COUNT(*) FROM deleted;")
echo -e "${GREEN}✓ Cleared $DELETED legacy entries${NC}"
echo ""

# Step 3: Mark baseline migrations as applied (DON'T re-run them!)
echo -e "${YELLOW}Step 3: Mark baseline migrations as already applied...${NC}"

if [ "$TARGET" = "PRIMARY" ]; then
    psql "$DB_URL" <<SQL
    INSERT INTO config.schema_migrations (version, schema_name, description, applied_by, applied_at)
    VALUES 
      ('001', 'config', 'structure 2024-12-14', 'baseline_marker', NOW()),
      ('002', 'config', 'permissions 2024-12-14', 'baseline_marker', NOW()),
      ('003', 'config', 'seed data 2024-12-14', 'baseline_marker', NOW()),
      ('001', 'customer', 'structure 2024-12-14', 'baseline_marker', NOW()),
      ('002', 'customer', 'permissions 2024-12-14', 'baseline_marker', NOW())
    ON CONFLICT DO NOTHING;
SQL
else
    psql "$DB_URL" <<SQL
    INSERT INTO config.schema_migrations (version, schema_name, description, applied_by, applied_at)
    VALUES 
      ('001', 'workspace', 'structure 2024-12-14', 'baseline_marker', NOW()),
      ('002', 'workspace', 'permissions 2024-12-14', 'baseline_marker', NOW()),
      ('001', 'reference', 'structure 2024-12-14', 'baseline_marker', NOW()),
      ('002', 'reference', 'permissions 2024-12-14', 'baseline_marker', NOW()),
      ('003', 'reference', 'seed data 2024-12-14', 'baseline_marker', NOW())
    ON CONFLICT DO NOTHING;
SQL
fi

echo -e "${GREEN}✓ Baseline migrations marked as applied${NC}"
echo ""

# Step 4: Verify
echo -e "${YELLOW}Step 4: Verify migration status...${NC}"
echo ""
psql "$DB_URL" -c "SELECT version, schema_name, description, applied_at FROM config.schema_migrations WHERE schema_name != 'legacy' ORDER BY schema_name, version;"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Production migration complete: $DB_NAME${NC}"
echo ""
echo -e "${BLUE}Next step:${NC}"
echo "  Run any new migrations with: bash database/run-migrations-prod.sh"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

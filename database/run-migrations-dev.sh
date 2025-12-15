#!/bin/bash
# ============================================================================
# DEVELOPMENT Migration Runner
# ============================================================================
# Runs BOTH baseline migrations AND dev-only seed data (_dev.sql files)
#
# Usage: bash database/run-migrations-dev.sh
# ============================================================================

set -e  # Exit on any error

# =============================================================================
# SAFETY CHECK: Warn if NODE_ENV suggests this is production
# =============================================================================

if [ "$NODE_ENV" = "production" ]; then
    echo "WARNING: NODE_ENV=production detected!"
    echo "This script includes DEV SEED DATA and should not be run in production."
    read -p "Are you sure you want to continue? (type 'yes'): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 1
    fi
fi

# =============================================================================
# LOAD ENVIRONMENT
# =============================================================================

SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/apps/backoffice/api/.env"

if [ -f "$ENV_FILE" ]; then
    # Load environment variables (properly handle quotes)
    while IFS='=' read -r key value; do
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        value="${value%\"}"
        value="${value#\"}"
        export "$key=$value"
    done < <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
else
    echo "WARNING: .env file not found at $ENV_FILE"
fi

# =============================================================================
# CONFIGURATION
# =============================================================================

# Dev environments usually use single DB mode
SPLIT_DB_MODE="${SPLIT_DB_MODE:-false}"

# Remove pgbouncer/connection_limit params for psql
PRIMARY_DB=$(echo "$PRIMARY_DATABASE_URL" | sed -E 's/[?&]pgbouncer=[^&]*//g' | sed -E 's/[?&]connection_limit=[^&]*//g' | sed -E 's/\?$//' | sed -E 's/&$//')
DATA_DB=$(echo "$DATA_DATABASE_URL" | sed -E 's/[?&]pgbouncer=[^&]*//g' | sed -E 's/[?&]connection_limit=[^&]*//g' | sed -E 's/\?$//' | sed -E 's/&$//')

PRIMARY_SCHEMAS=("config" "customer")
DATA_SCHEMAS=("workspace" "reference")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}DEVELOPMENT Migration Runner${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Split DB Mode: $SPLIT_DB_MODE"
echo "Includes: Baseline + Dev Seed Data"
echo ""

# =============================================================================
# RUN MIGRATIONS FOR EACH SCHEMA
# =============================================================================

TOTAL_RUN=0
DEV_FILES_RUN=0

for SCHEMA in config customer workspace reference; do
    # Determine target database for migrations
    if [[ " ${PRIMARY_SCHEMAS[@]} " =~ " ${SCHEMA} " ]]; then
        DB_URL="$PRIMARY_DB"
        DB_NAME="PRIMARY"
    elif [ "$SPLIT_DB_MODE" = "true" ]; then
        DB_URL="$DATA_DB"
        DB_NAME="DATA"
    else
        DB_URL="$PRIMARY_DB"
        DB_NAME="PRIMARY"
    fi
    
    # Tracking always happens in PRIMARY's config.schema_migrations
    TRACKING_DB="$PRIMARY_DB"
    
    echo -e "${BLUE}Processing schema: ${SCHEMA} (on ${DB_NAME} DB)${NC}"
    
    # Run ALL .sql files in order (baseline + dev seed data)
    for MIGRATION_FILE in "$SCRIPT_DIR/schemas/$SCHEMA"/*.sql; do
        [ -f "$MIGRATION_FILE" ] || continue
        
        FILENAME=$(basename "$MIGRATION_FILE")
        VERSION=$(echo "$FILENAME" | grep -oE '^[0-9]+')
        
        # Check if already applied (always check PRIMARY's tracking table)
        APPLIED=$(psql "$TRACKING_DB" -tAc \
            "SELECT COUNT(*) FROM config.schema_migrations WHERE version = '$VERSION' AND schema_name = '$SCHEMA';" 2>/dev/null || echo "0")
        
        if [ "$APPLIED" != "0" ]; then
            echo -e "  ${GREEN}[APPLIED]${NC} $FILENAME"
            continue
        fi
        
        # Highlight dev files
        if [[ "$FILENAME" == *"_dev.sql" ]]; then
            echo -e "  ${CYAN}[RUNNING DEV]${NC} $FILENAME"
            DEV_FILES_RUN=$((DEV_FILES_RUN + 1))
        else
            echo -e "  ${YELLOW}[RUNNING]${NC} $FILENAME"
        fi
        
        START_TIME=$(date +%s%N)
        
        if psql "$DB_URL" -f "$MIGRATION_FILE" -q; then
            END_TIME=$(date +%s%N)
            EXECUTION_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
            
            # Track it (always in PRIMARY's config.schema_migrations)
            DESCRIPTION=$(echo "$FILENAME" | sed 's/^[0-9]*_//; s/\.sql$//' | tr '_' ' ')
            psql "$TRACKING_DB" -tAc \
                "INSERT INTO config.schema_migrations (version, schema_name, description, applied_by, execution_time_ms) 
                 VALUES ('$VERSION', '$SCHEMA', '$DESCRIPTION', CURRENT_USER, $EXECUTION_TIME);" > /dev/null
            
            echo -e "  ${GREEN}[SUCCESS]${NC} $FILENAME (${EXECUTION_TIME}ms)"
            TOTAL_RUN=$((TOTAL_RUN + 1))
        else
            echo -e "  ${RED}[FAILED]${NC} $FILENAME"
            echo "Migration aborted. Database may be in inconsistent state."
            exit 1
        fi
    done
    echo ""
done

# =============================================================================
# SUMMARY
# =============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$TOTAL_RUN" -eq 0 ]; then
    echo -e "${GREEN}✓ DEVELOPMENT database is up to date!${NC}"
else
    echo -e "${GREEN}✓ Successfully applied $TOTAL_RUN migration(s)!${NC}"
    if [ "$DEV_FILES_RUN" -gt 0 ]; then
        echo -e "${CYAN}  (including $DEV_FILES_RUN dev seed data file(s))${NC}"
    fi
fi
echo ""
echo -e "${BLUE}Next steps for large datasets:${NC}"
echo "  1. Import CSV files: bash database/setup-dev-data.sh"
echo "  2. Or use the web UI: http://localhost:3000/integrations/imports"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

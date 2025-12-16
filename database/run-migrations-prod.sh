#!/bin/bash
# ============================================================================
# PRODUCTION Migration Runner
# ============================================================================
# Runs ONLY dated baseline files (*_YYYY-MM-DD.sql)
# Skips dev seed data files (*_dev.sql)
#
# Usage: 
#   bash database/run-migrations-prod.sh -prod  (uses PRIMARY_DATABASE_URL - production)
#   bash database/run-migrations-prod.sh -dev   (uses PRIMARY_DATABASE_URL - development)
#   bash database/run-migrations-prod.sh -test  (uses TEST_DATABASE_URL)
#
# IMPORTANT: Argument is REQUIRED for safety
# ============================================================================

set -e  # Exit on any error

# =============================================================================
# PARSE ARGUMENTS
# =============================================================================

if [ -z "$1" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "ERROR: Target environment required"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "This script runs PRODUCTION migrations (baseline files only)."
    echo "You must specify which environment to target:"
    echo ""
    echo "  bash database/run-migrations-prod.sh -prod  → production (no dev data)"
    echo "  bash database/run-migrations-prod.sh -dev   → local development (no dev data)"
    echo "  bash database/run-migrations-prod.sh -test  → local testing (no dev data)"
    echo ""
    echo "For development WITH dev seed data, use:"
    echo "  bash database/run-migrations-dev.sh -dev"
    echo ""
    exit 1
fi

TARGET_ENV="$1"

case "$TARGET_ENV" in
    -prod)
        ENV_NAME="PRODUCTION"
        # Extra safety check for production
        if [ "$NODE_ENV" = "development" ] || [ "$NODE_ENV" = "test" ]; then
            echo "ERROR: NODE_ENV=$NODE_ENV conflicts with -prod target!"
            echo "Set NODE_ENV=production or use -dev/-test flag instead."
            exit 1
        fi
        ;;
    -dev)
        ENV_NAME="DEVELOPMENT"
        ;;
    -test)
        ENV_NAME="TEST"
        ;;
    *)
        echo "Error: Invalid argument '$TARGET_ENV'"
        echo "Usage: bash database/run-migrations-prod.sh [-prod|-dev|-test]"
        exit 1
        ;;
esac

# =============================================================================
# LOAD ENVIRONMENT
# =============================================================================

SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/apps/backoffice/api/.env"

# Try production path if local not found
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="/var/www/handled/apps/backoffice/api/.env"
fi

if [ -f "$ENV_FILE" ]; then
    # Load environment variables (properly handle quotes)
    # Only set variables that aren't already set (preserve command-line overrides)
    while IFS='=' read -r key value; do
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        value="${value%\"}"
        value="${value#\"}"
        # Only export if not already set
        if [ -z "${!key}" ]; then
            export "$key=$value"
        fi
    done < <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
else
    echo "WARNING: .env file not found at $ENV_FILE"
fi

# =============================================================================
# CONFIGURATION
# =============================================================================

# Select database URL based on target environment
case "$TARGET_ENV" in
    -test)
        if [ -z "$TEST_DATABASE_URL" ]; then
            echo "Error: TEST_DATABASE_URL not set in .env"
            exit 1
        fi
        # For test, use TEST_DATABASE_URL for both PRIMARY and DATA (single DB)
        SELECTED_PRIMARY_URL="$TEST_DATABASE_URL"
        SELECTED_DATA_URL="$TEST_DATABASE_URL"
        SPLIT_DB_MODE="false"
        ;;
    -prod)
        # For production, use production URLs
        SELECTED_PRIMARY_URL="$PRIMARY_DATABASE_URL"
        SELECTED_DATA_URL="${DATA_DATABASE_URL:-$PRIMARY_DATABASE_URL}"
        SPLIT_DB_MODE="${SPLIT_DB_MODE:-false}"
        ;;
    -dev)
        # For dev, use dev URLs
        SELECTED_PRIMARY_URL="$PRIMARY_DATABASE_URL"
        SELECTED_DATA_URL="${DATA_DATABASE_URL:-$PRIMARY_DATABASE_URL}"
        SPLIT_DB_MODE="${SPLIT_DB_MODE:-false}"
        ;;
esac

# Remove pgbouncer/connection_limit params for psql
PRIMARY_DB=$(echo "$SELECTED_PRIMARY_URL" | sed -E 's/[?&]pgbouncer=[^&]*//g' | sed -E 's/[?&]connection_limit=[^&]*//g' | sed -E 's/\?$//' | sed -E 's/&$//')
DATA_DB=$(echo "$SELECTED_DATA_URL" | sed -E 's/[?&]pgbouncer=[^&]*//g' | sed -E 's/[?&]connection_limit=[^&]*//g' | sed -E 's/\?$//' | sed -E 's/&$//')

# Schema folder routing
PRIMARY_SCHEMAS=("config" "company" "customer")
DATA_SCHEMAS=("workspace" "reference")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}${ENV_NAME} Migration Runner (Production Mode)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Target: $ENV_NAME"
echo "Split DB Mode: $SPLIT_DB_MODE"
echo "Baseline Files Only: *_YYYY-MM-DD.sql (no dev seed data)"
echo ""

# =============================================================================
# RUN MIGRATIONS FOR EACH SCHEMA
# =============================================================================

TOTAL_RUN=0

# Process PRIMARY schemas first, then DATA schemas
ALL_SCHEMAS=("${PRIMARY_SCHEMAS[@]}" "${DATA_SCHEMAS[@]}")

for SCHEMA in "${ALL_SCHEMAS[@]}"; do
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
    
    # Run migrations in order
    # PRODUCTION: Only run dated baseline files (*_YYYY-MM-DD.sql)
    for MIGRATION_FILE in "$SCRIPT_DIR/schemas/$SCHEMA"/*_[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].sql; do
        [ -f "$MIGRATION_FILE" ] || continue  # Skip if no files match
        
        FILENAME=$(basename "$MIGRATION_FILE")
        VERSION=$(echo "$FILENAME" | grep -oE '^[0-9]+')
        
        # Check if already applied (always check PRIMARY's tracking table)
        APPLIED=$(psql "$TRACKING_DB" -tAc \
            "SELECT COUNT(*) FROM config.schema_migrations WHERE version = '$VERSION' AND schema_name = '$SCHEMA';" 2>/dev/null || echo "0")
        
        if [ "$APPLIED" != "0" ]; then
            echo -e "  ${GREEN}[APPLIED]${NC} $FILENAME"
            continue
        fi
        
        # Run migration
        echo -e "  ${YELLOW}[RUNNING]${NC} $FILENAME"
        
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
    echo -e "${GREEN}✓ ${ENV_NAME} database is up to date!${NC}"
else
    echo -e "${GREEN}✓ Successfully applied $TOTAL_RUN baseline migration(s) to ${ENV_NAME}!${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

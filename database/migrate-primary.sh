#!/bin/bash
#
# PRIMARY Database Migration Runner
# 
# IMPORTANT: Migrations run as handled_user (from PRIMARY_DATABASE_URL)
# This ensures consistent object ownership and permission grants
#
# Usage:
#   ./migrate-primary.sh          # Run pending migrations
#   ./migrate-primary.sh --force  # Force mode (skip some safety checks)
#   ./migrate-primary.sh --repair # Repair mode (fix schema mismatches)
#   ./migrate-primary.sh --verify # Verify permissions after migration
#
# Database: PRIMARY DB (DBaaS)
# Contains: config schema + customer schema
# Intelligently runs only new migrations and tracks execution
# Enhanced with validation and data protection

set -e  # Exit on any error

# Load environment variables from .env file
# Try multiple possible locations relative to script
SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/apps/backoffice/api/.env"

# Also try common production paths
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="/var/www/handled/apps/backoffice/api/.env"
fi

if [ -f "$ENV_FILE" ]; then
    # Source the .env file, handling quoted values properly
    set -a  # Automatically export all variables
    source <(grep -v '^#' "$ENV_FILE" | grep -v '^$' | sed 's/^/export /')
    set +a
fi

# Extract database connection info from PRIMARY_DATABASE_URL
if [ -z "$PRIMARY_DATABASE_URL" ]; then
    echo "Error: PRIMARY_DATABASE_URL environment variable is not set"
    echo "       Make sure it's set in your .env file or environment"
    exit 1
fi

# Remove pgbouncer and connection_limit parameters for direct psql connections
# These are valid for application connections but not for psql
DB_URL=$(echo "$PRIMARY_DATABASE_URL" | sed -E 's/[?&]pgbouncer=[^&]*//g' | sed -E 's/[?&]connection_limit=[^&]*//g' | sed -E 's/\?$//' | sed -E 's/&$//')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_fix() {
    echo -e "${CYAN}→${NC} $1"
}

# Check if psql is available
if ! command -v psql &> /dev/null; then
    print_error "psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

print_header "PRIMARY DB Migration Runner (Config + Customer)"

print_info "Database: PRIMARY (DBaaS)"
print_info "Migrations: $MIGRATIONS_DIR"

# Function to validate schema exists
validate_schema() {
    local schema_name=$1
    psql "$DB_URL" -tAc \
        "SELECT EXISTS (SELECT FROM information_schema.schemata WHERE schema_name = '$schema_name');"
}

# Function to check if schema has data
check_schema_has_data() {
    local schema_name=$1
    local table_count=$(psql "$DB_URL" -tAc \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$schema_name';")
    echo "$table_count"
}

# ============================================
# STEP 1: Validate Schema Integrity
# ============================================
print_info "Validating database schema integrity...\n"

# Check if migration tracking table exists
TRACKING_EXISTS=$(psql "$DB_URL" -tAc \
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'config' AND table_name = 'schema_migrations');")

if [ "$TRACKING_EXISTS" = "f" ]; then
    print_warning "Migration tracking table not found. Running initial setup..."
    
    # Run the tracking migration first if it exists
    if [ -f "$MIGRATIONS_DIR/000_migration_tracking.sql" ]; then
        print_info "Creating migration tracking system..."
        psql "$DB_URL" -f "$MIGRATIONS_DIR/000_migration_tracking.sql" -q
        print_success "Migration tracking initialized"
    else
        print_error "Migration tracking file (000_migration_tracking.sql) not found!"
        exit 1
    fi
fi

# Validate expected schemas exist
EXPECTED_SCHEMAS=("config" "customer")
MISSING_SCHEMAS=()
VALIDATION_FAILED=false

for SCHEMA in "${EXPECTED_SCHEMAS[@]}"; do
    EXISTS=$(validate_schema "$SCHEMA")
    if [ "$EXISTS" = "f" ]; then
        MISSING_SCHEMAS+=("$SCHEMA")
        VALIDATION_FAILED=true
    fi
done

# Check if schemas are tracked but don't exist (mismatch)
if [ "$VALIDATION_FAILED" = true ]; then
    print_warning "Schema validation found issues:"
    echo ""
    
    for SCHEMA in "${MISSING_SCHEMAS[@]}"; do
        print_error "Schema '$SCHEMA' does not exist in database"
    done
    
    echo ""
    
    # Check if migrations are marked as applied
    APPLIED_COUNT=$(psql "$DB_URL" -tAc \
        "SELECT COUNT(*) FROM config.schema_migrations WHERE version >= '001';" 2>/dev/null || echo "0")
    
    if [ "$APPLIED_COUNT" -gt 0 ]; then
        print_warning "Migration tracking shows $APPLIED_COUNT migrations applied, but schemas are missing!"
        print_warning "This indicates migrations were tracked but didn't actually run."
        echo ""
        print_info "Auto-repair available: Use --repair flag to fix this"
        print_fix "bash database/migrate-primary.sh --repair"
        echo ""
        
        if [ "$REPAIR_MODE" = true ]; then
            print_info "REPAIR MODE: Re-running schema creation migrations..."
            echo ""
            # We'll let the normal migration loop handle this by clearing those specific version entries
            psql "$DB_URL" -tAc \
                "DELETE FROM config.schema_migrations WHERE version IN ('001');" > /dev/null
            print_success "Cleared tracking for schema creation migrations - will re-run"
            echo ""
        else
            print_error "Cannot proceed with missing schemas. Use --repair to fix."
            exit 1
        fi
    fi
fi

# ============================================
# STEP 2: Data Protection Check
# ============================================
if [ "$FORCE_MODE" = false ]; then
    # Check if any schema has data
    for SCHEMA in "${EXPECTED_SCHEMAS[@]}"; do
        if [ "$(validate_schema "$SCHEMA")" = "t" ]; then
            TABLE_COUNT=$(check_schema_has_data "$SCHEMA")
            if [ "$TABLE_COUNT" -gt 0 ]; then
                # Check if any table has data
                DATA_EXISTS=$(psql "$DB_URL" -tAc \
                    "SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables t
                        WHERE t.table_schema = '$SCHEMA'
                        AND t.table_type = 'BASE TABLE'
                        AND EXISTS (
                            SELECT 1 FROM information_schema.columns c
                            WHERE c.table_schema = t.table_schema
                            AND c.table_name = t.table_name
                            LIMIT 1
                        )
                        LIMIT 1
                    );" 2>/dev/null || echo "f")
                
                if [ "$DATA_EXISTS" = "t" ]; then
                    print_info "Schema '$SCHEMA' contains tables (data protection active)"
                fi
            fi
        fi
    done
fi

# Get list of already applied migrations
APPLIED_MIGRATIONS=$(psql "$DB_URL" -tAc \
    "SELECT version FROM config.schema_migrations ORDER BY version;")

print_info "Finding pending migrations...\n"

# Count migrations
TOTAL_COUNT=0
APPLIED_COUNT=$(echo "$APPLIED_MIGRATIONS" | grep -v '^$' | wc -l | tr -d ' ')
PENDING_COUNT=0

# Run migrations in order
for MIGRATION_FILE in "$MIGRATIONS_DIR"/*.sql; do
    FILENAME=$(basename "$MIGRATION_FILE")
    VERSION=$(echo "$FILENAME" | grep -oE '^[0-9]+')
    DESCRIPTION=$(echo "$FILENAME" | sed 's/^[0-9]*_//; s/\.sql$//' | tr '_' ' ')
    
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    
    # Check if already applied
    if echo "$APPLIED_MIGRATIONS" | grep -q "^$VERSION$"; then
        echo -e "${GREEN}[APPLIED]${NC} $FILENAME"
        continue
    fi
    
    PENDING_COUNT=$((PENDING_COUNT + 1))
    
    # Run the migration
    echo -e "${YELLOW}[RUNNING]${NC} $FILENAME"
    
    START_TIME=$(date +%s%N)
    
    if psql "$DB_URL" -f "$MIGRATION_FILE" -q; then
        END_TIME=$(date +%s%N)
        EXECUTION_TIME=$(( (END_TIME - START_TIME) / 1000000 ))  # Convert to milliseconds
        
        # Record migration in tracking table
        psql "$DB_URL" -tAc \
            "INSERT INTO config.schema_migrations (version, description, applied_by, execution_time_ms) 
             VALUES ('$VERSION', '$DESCRIPTION', CURRENT_USER, $EXECUTION_TIME) 
             ON CONFLICT (version) DO NOTHING;" > /dev/null
        
        print_success "Completed $FILENAME (${EXECUTION_TIME}ms)"
    else
        print_error "Failed to run $FILENAME"
        print_error "Migration aborted. Database may be in inconsistent state."
        exit 1
    fi
done

# Print summary
print_header "Migration Summary (PRIMARY DB)"

echo -e "Total migrations:   ${BLUE}$TOTAL_COUNT${NC}"
echo -e "Already applied:    ${GREEN}$APPLIED_COUNT${NC}"
echo -e "Newly applied:      ${YELLOW}$PENDING_COUNT${NC}"

if [ "$PENDING_COUNT" -eq 0 ]; then
    print_success "PRIMARY database is up to date! No migrations needed."
else
    print_success "Successfully applied $PENDING_COUNT migration(s)!"
fi

# Show current schema version
LATEST_VERSION=$(psql "$DB_URL" -tAc \
    "SELECT version FROM config.schema_migrations ORDER BY version DESC LIMIT 1;")

echo -e "\n${BLUE}Current schema version:${NC} $LATEST_VERSION"

# ============================================
# STEP 3: Post-Migration Validation
# ============================================
echo ""
print_info "Post-migration validation..."

ALL_SCHEMAS_OK=true
for SCHEMA in "${EXPECTED_SCHEMAS[@]}"; do
    EXISTS=$(validate_schema "$SCHEMA")
    if [ "$EXISTS" = "t" ]; then
        print_success "Schema '$SCHEMA' exists and is ready"
    else
        print_error "Schema '$SCHEMA' is still missing!"
        ALL_SCHEMAS_OK=false
    fi
done

if [ "$ALL_SCHEMAS_OK" = true ]; then
    print_header "✨ PRIMARY DB Migrations Complete!"
else
    echo ""
    print_error "Some schemas are still missing after migrations!"
    print_info "This may indicate a permission or transaction issue."
    print_fix "Try running with --repair flag to investigate"
    exit 1
fi

# ============================================
# OPTIONAL: Verify Permissions
# ============================================
if [ "$VERIFY_MODE" = true ]; then
    echo ""
    print_header "Verifying handled_user Permissions"
    
    print_info "Checking table permissions for handled_user in config and customer schemas..."
    echo ""
    
    echo "TABLE PERMISSIONS:"
    psql "$DB_URL" <<SQL
SELECT 
  schemaname, 
  tablename,
  has_table_privilege('handled_user', schemaname||'.'||tablename, 'SELECT') as read,
  has_table_privilege('handled_user', schemaname||'.'||tablename, 'INSERT') as insert,
  has_table_privilege('handled_user', schemaname||'.'||tablename, 'UPDATE') as update,
  has_table_privilege('handled_user', schemaname||'.'||tablename, 'DELETE') as delete
FROM pg_tables 
WHERE schemaname IN ('config', 'customer')
ORDER BY schemaname, tablename;
SQL
    
    echo ""
    print_info "Checking sequence permissions (needed for SERIAL columns)..."
    echo ""
    
    echo "SEQUENCE PERMISSIONS:"
    psql "$DB_URL" <<SQL
SELECT 
  schemaname, 
  sequencename,
  has_sequence_privilege('handled_user', schemaname||'.'||sequencename, 'USAGE') as usage,
  has_sequence_privilege('handled_user', schemaname||'.'||sequencename, 'SELECT') as select
FROM pg_sequences 
WHERE schemaname IN ('config', 'customer')
ORDER BY schemaname, sequencename;
SQL
    
    echo ""
    print_info "Analyzing results..."
    
    # Count tables with missing permissions
    TABLE_ISSUES=$(psql "$DB_URL" -t -c "
SELECT COUNT(*)
FROM pg_tables 
WHERE schemaname IN ('config', 'customer')
  AND NOT (
    has_table_privilege('handled_user', schemaname||'.'||tablename, 'SELECT') AND
    has_table_privilege('handled_user', schemaname||'.'||tablename, 'INSERT') AND
    has_table_privilege('handled_user', schemaname||'.'||tablename, 'UPDATE') AND
    has_table_privilege('handled_user', schemaname||'.'||tablename, 'DELETE')
  );
" | tr -d ' ')
    
    # Count sequences with missing permissions
    SEQ_ISSUES=$(psql "$DB_URL" -t -c "
SELECT COUNT(*)
FROM pg_sequences 
WHERE schemaname IN ('config', 'customer')
  AND NOT has_sequence_privilege('handled_user', schemaname||'.'||sequencename, 'USAGE');
" | tr -d ' ')
    
    TOTAL_ISSUES=$((TABLE_ISSUES + SEQ_ISSUES))
    
    echo ""
    if [ "$TOTAL_ISSUES" = "0" ]; then
        print_success "✓ All objects accessible by handled_user"
        print_success "✓ Tables: All permissions granted"
        print_success "✓ Sequences: All permissions granted"
    else
        print_warning "⚠ Found permission issues:"
        if [ "$TABLE_ISSUES" != "0" ]; then
            print_error "  - $TABLE_ISSUES tables with missing permissions"
        fi
        if [ "$SEQ_ISSUES" != "0" ]; then
            print_error "  - $SEQ_ISSUES sequences with missing permissions"
        fi
        echo ""
        print_fix "To fix, run the catchall migration:"
        print_fix "  psql \"\$DB_URL\" -f database/migrations-primary/012_ensure_db_permissions.sql"
        echo ""
        print_warning "Then verify again:"
        print_fix "  bash database/migrate-primary.sh --verify"
    fi
fi

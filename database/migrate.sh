#!/bin/bash
# Database Migration Runner for Handled Platform
# Intelligently runs only new migrations and tracks execution

set -e  # Exit on any error

# Configuration
MIGRATIONS_DIR="$(dirname "$0")/migrations"
DB_USER="${DB_USER:-handled_user}"
DB_NAME="${DB_NAME:-handled}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if psql is available
if ! command -v psql &> /dev/null; then
    print_error "psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Check if database exists
if ! psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    print_error "Database '$DB_NAME' does not exist."
    print_info "Create it with: createdb -U $DB_USER $DB_NAME"
    exit 1
fi

print_header "Handled Database Migration Runner"

print_info "Database: $DB_NAME"
print_info "User: $DB_USER"
print_info "Host: $DB_HOST:$DB_PORT"
print_info "Migrations: $MIGRATIONS_DIR"

# Check if migration tracking table exists
TRACKING_EXISTS=$(psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -tAc \
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'config' AND table_name = 'schema_migrations');")

if [ "$TRACKING_EXISTS" = "f" ]; then
    print_warning "Migration tracking table not found. Running initial setup..."
    
    # Run the tracking migration first if it exists
    if [ -f "$MIGRATIONS_DIR/000_migration_tracking.sql" ]; then
        print_info "Creating migration tracking system..."
        psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f "$MIGRATIONS_DIR/000_migration_tracking.sql" -q
        print_success "Migration tracking initialized"
    else
        print_error "Migration tracking file (000_migration_tracking.sql) not found!"
        exit 1
    fi
fi

# Get list of already applied migrations
APPLIED_MIGRATIONS=$(psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -tAc \
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
    
    if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f "$MIGRATION_FILE" -q; then
        END_TIME=$(date +%s%N)
        EXECUTION_TIME=$(( (END_TIME - START_TIME) / 1000000 ))  # Convert to milliseconds
        
        # Record migration in tracking table
        psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -tAc \
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
print_header "Migration Summary"

echo -e "Total migrations:   ${BLUE}$TOTAL_COUNT${NC}"
echo -e "Already applied:    ${GREEN}$APPLIED_COUNT${NC}"
echo -e "Newly applied:      ${YELLOW}$PENDING_COUNT${NC}"

if [ "$PENDING_COUNT" -eq 0 ]; then
    print_success "Database is up to date! No migrations needed."
else
    print_success "Successfully applied $PENDING_COUNT migration(s)!"
fi

# Show current schema version
LATEST_VERSION=$(psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -tAc \
    "SELECT version FROM config.schema_migrations ORDER BY version DESC LIMIT 1;")

echo -e "\n${BLUE}Current schema version:${NC} $LATEST_VERSION"

print_header "✨ All Done!"


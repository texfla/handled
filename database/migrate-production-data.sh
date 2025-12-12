#!/bin/bash
# Production Data Migration Script
# Migrates data from single database to split PRIMARY + DATA databases
# 
# Usage:
#   export OLD_DATABASE_URL="postgresql://localhost:5432/handled"
#   export PRIMARY_DATABASE_URL="postgresql://dbaas-host/handled_primary"
#   export DATA_DATABASE_URL="postgresql://localhost:5432/handled_data"
#   bash migrate-production-data.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Validate required environment variables
if [ -z "$OLD_DATABASE_URL" ]; then
    print_error "OLD_DATABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$PRIMARY_DATABASE_URL" ]; then
    print_error "PRIMARY_DATABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$DATA_DATABASE_URL" ]; then
    print_error "DATA_DATABASE_URL environment variable is not set"
    exit 1
fi

print_header "Production Data Migration: Single → Split Databases"

print_info "Source:  $OLD_DATABASE_URL"
print_info "Target:  PRIMARY (config + customer) + DATA (workspace + reference)"
echo ""

# Step 1: Backup current database
print_header "Step 1: Backup Current Database"

BACKUP_FILE="backup_pre_split_$(date +%Y%m%d_%H%M%S).sql"
print_info "Creating full backup: $BACKUP_FILE"

if pg_dump "$OLD_DATABASE_URL" > "$BACKUP_FILE"; then
    print_success "Backup created successfully"
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    print_info "Backup size: $BACKUP_SIZE"
else
    print_error "Backup failed!"
    exit 1
fi

# Step 2: Initialize PRIMARY database
print_header "Step 2: Initialize PRIMARY Database (DBaaS)"

print_info "Running PRIMARY migrations..."
if bash "$(dirname "$0")/migrate-primary.sh"; then
    print_success "PRIMARY database initialized"
else
    print_error "PRIMARY migration failed!"
    exit 1
fi

# Step 3: Migrate config schema data to PRIMARY
print_header "Step 3: Migrate Config Schema to PRIMARY"

print_info "Exporting config schema from old database..."
TEMP_CONFIG="temp_config_data.sql"

if pg_dump "$OLD_DATABASE_URL" --schema=config --data-only > "$TEMP_CONFIG"; then
    print_success "Config data exported"
    
    print_info "Importing to PRIMARY database..."
    if psql "$PRIMARY_DATABASE_URL" < "$TEMP_CONFIG"; then
        print_success "Config data imported to PRIMARY"
        rm "$TEMP_CONFIG"
    else
        print_error "Failed to import config data!"
        exit 1
    fi
else
    print_error "Failed to export config data!"
    exit 1
fi

# Step 4: Initialize DATA database
print_header "Step 4: Initialize DATA Database (VPS Local)"

print_info "Running DATA migrations..."
if bash "$(dirname "$0")/migrate-data.sh"; then
    print_success "DATA database initialized"
else
    print_error "DATA migration failed!"
    exit 1
fi

# Step 5: Migrate workspace and reference schemas to DATA
print_header "Step 5: Migrate Workspace + Reference Schemas to DATA"

print_info "Exporting workspace and reference schemas from old database..."
TEMP_DATA="temp_data_schemas.sql"

if pg_dump "$OLD_DATABASE_URL" --schema=workspace --schema=reference --data-only > "$TEMP_DATA"; then
    print_success "Data schemas exported"
    
    print_info "Importing to DATA database..."
    if psql "$DATA_DATABASE_URL" < "$TEMP_DATA"; then
        print_success "Data schemas imported to DATA"
        rm "$TEMP_DATA"
    else
        print_error "Failed to import data schemas!"
        exit 1
    fi
else
    print_error "Failed to export data schemas!"
    exit 1
fi

# Step 6: Validation
print_header "Step 6: Data Validation"

print_info "Checking row counts..."

# Check config tables
print_info "Config schema (PRIMARY):"
psql "$PRIMARY_DATABASE_URL" -c "
  SELECT 'users' as table, COUNT(*) as count FROM config.users
  UNION ALL
  SELECT 'roles', COUNT(*) FROM config.roles
  UNION ALL
  SELECT 'permissions', COUNT(*) FROM config.permissions
  UNION ALL
  SELECT 'sessions', COUNT(*) FROM config.sessions
  UNION ALL
  SELECT 'integration_runs', COUNT(*) FROM config.integration_runs
  ORDER BY table;
"

echo ""
print_info "Reference schema (DATA):"
psql "$DATA_DATABASE_URL" -c "
  SELECT 'carriers' as table, COUNT(*) as count FROM reference.carriers
  UNION ALL
  SELECT 'services', COUNT(*) FROM reference.services
  UNION ALL
  SELECT 'delivery_matrix', COUNT(*) FROM reference.delivery_matrix
  ORDER BY table;
"

echo ""
print_info "Workspace schema (DATA):"
psql "$DATA_DATABASE_URL" -c "
  SELECT 'us_zips' as table, COUNT(*) as count FROM workspace.us_zips
  UNION ALL
  SELECT 'ups_zones', COUNT(*) FROM workspace.ups_zones
  ORDER BY table;
"

print_header "✨ Migration Complete!"

print_success "Data has been split into PRIMARY and DATA databases"
print_warning "Important: Keep backup file $BACKUP_FILE for at least 1 week"
print_info "Next steps:"
print_info "  1. Update application .env with SPLIT_DB_MODE=true"
print_info "  2. Update PRIMARY_DATABASE_URL and DATA_DATABASE_URL"
print_info "  3. Restart application: pm2 restart backoffice-api"
print_info "  4. Test all functionality"
print_info "  5. Monitor for errors for 24-48 hours"

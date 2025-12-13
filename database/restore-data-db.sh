#!/bin/bash
# Restore script for DATA DB (VPS Local PostgreSQL)
# Restores workspace and reference schemas from backup
# WARNING: This will DROP existing data in workspace and reference schemas!

set -e

# Load environment variables from .env file
ENV_FILE="/var/www/handled/apps/backoffice/api/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Configuration (use env vars if available, otherwise use defaults)
BACKUP_DIR="/var/backups/handled/data"
DB_NAME="${DATA_DB_NAME:-handled}"
DB_USER="${DATA_DB_USER:-handled_user}"
DB_HOST="${DATA_DB_HOST:-localhost}"
DB_PORT="${DATA_DB_PORT:-5432}"

# Set password for psql/pg_restore
export PGPASSWORD="${DATA_DB_PASSWORD}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Handled DATA DB Restore (Workspace + Reference)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if backup file was provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No backup file specified${NC}\n"
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/handled_data_*.sql.gz 2>/dev/null | awk '{print "  " $9, "(" $5 ")"}'
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try with backup directory prefix
    BACKUP_FILE="${BACKUP_DIR}/${1}"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}Error: Backup file not found: $1${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}⚠ WARNING: This will DROP all data in workspace and reference schemas!${NC}"
echo -e "${YELLOW}⚠ Make sure the application is stopped before restoring.${NC}\n"
echo -e "Backup file: ${BACKUP_FILE}"
echo -e "Target database: ${DB_NAME}\n"

read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Restore cancelled${NC}"
    exit 1
fi

# Drop and recreate schemas
echo -e "\n${BLUE}→${NC} Dropping existing schemas..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
DROP SCHEMA IF EXISTS workspace CASCADE;
DROP SCHEMA IF EXISTS reference CASCADE;
CREATE SCHEMA workspace;
CREATE SCHEMA reference;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Schemas recreated"
else
    echo -e "${RED}✗${NC} Failed to recreate schemas!"
    exit 1
fi

# Restore from backup
echo -e "${BLUE}→${NC} Restoring data from backup..."
gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Data restored successfully"
else
    echo -e "${RED}✗${NC} Restore failed!"
    exit 1
fi

# Verify restoration
echo -e "${BLUE}→${NC} Verifying restoration..."
WORKSPACE_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='workspace';")
REFERENCE_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='reference';")

echo -e "${GREEN}✓${NC} Workspace schema: ${WORKSPACE_TABLES} tables"
echo -e "${GREEN}✓${NC} Reference schema: ${REFERENCE_TABLES} tables"

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ DATA DB Restore Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}Remember to restart your application:${NC}"
echo -e "  pm2 restart handled-api"

#!/bin/bash
# Backup script for DATA DB (VPS Local PostgreSQL)
# Backs up workspace and reference schemas only
# Run this daily via cron

set -e

# Load environment variables from .env file
ENV_FILE="/var/www/handled/apps/backoffice/api/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Configuration (use env vars if available, otherwise use defaults)
BACKUP_DIR="/var/backups/handled/data"
DB_NAME="${DATA_DB_NAME:-handled_dev}"
DB_USER="${DATA_DB_USER:-handled_user}"
DB_HOST="${DATA_DB_HOST:-localhost}"
DB_PORT="${DATA_DB_PORT:-5432}"
RETENTION_DAYS=14
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="handled_data_${DATE}.sql.gz"

# Set password for pg_dump
export PGPASSWORD="${DATA_DB_PASSWORD}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Handled DATA DB Backup (Workspace + Reference)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup workspace and reference schemas
echo -e "${BLUE}→${NC} Backing up workspace and reference schemas..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --schema=workspace \
  --schema=reference \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo -e "${GREEN}✓${NC} Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    echo -e "${RED}✗${NC} Backup failed!"
    exit 1
fi

# Cleanup old backups
echo -e "${BLUE}→${NC} Cleaning up backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "handled_data_*.sql.gz" -mtime +${RETENTION_DAYS} -type f -delete -print | wc -l)
echo -e "${GREEN}✓${NC} Deleted ${DELETED} old backup(s)"

# Show backup summary
echo -e "\n${BLUE}Backup Summary:${NC}"
echo "  Location: ${BACKUP_DIR}"
echo "  Latest: ${BACKUP_FILE}"
echo "  Total backups: $(ls -1 ${BACKUP_DIR}/handled_data_*.sql.gz 2>/dev/null | wc -l)"
echo "  Total size: $(du -sh ${BACKUP_DIR} | cut -f1)"

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ DATA DB Backup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

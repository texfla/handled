#!/bin/bash
# Run all database migrations (PRIMARY + DATA)
# Handles both split-DB and single-DB modes

set -e  # Exit on any error

SCRIPT_DIR="$(dirname "$0")"

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_header "Handled Database Migration Runner - ALL"

# Check if we're in split mode
if [ "$SPLIT_DB_MODE" = "true" ]; then
    echo -e "${BLUE}Mode:${NC} SPLIT (PRIMARY + DATA databases)"
    echo ""
    
    # Run PRIMARY migrations first
    if [ -z "$PRIMARY_DATABASE_URL" ]; then
        echo "Error: SPLIT_DB_MODE=true but PRIMARY_DATABASE_URL is not set"
        exit 1
    fi
    
    bash "$SCRIPT_DIR/migrate-primary.sh"
    echo ""
    
    # Run DATA migrations second
    if [ -z "$DATA_DATABASE_URL" ]; then
        echo "Error: SPLIT_DB_MODE=true but DATA_DATABASE_URL is not set"
        exit 1
    fi
    
    bash "$SCRIPT_DIR/migrate-data.sh"
    
else
    echo -e "${BLUE}Mode:${NC} SINGLE (all schemas in one database)"
    echo -e "${BLUE}Note:${NC} Both migration sets will run against PRIMARY_DATABASE_URL"
    echo ""
    
    # In single-DB mode, run both migration sets against the same database
    if [ -z "$PRIMARY_DATABASE_URL" ]; then
        echo "Error: PRIMARY_DATABASE_URL is not set"
        exit 1
    fi
    
    # Run PRIMARY migrations (config schema)
    bash "$SCRIPT_DIR/migrate-primary.sh"
    echo ""
    
    # Run DATA migrations (workspace + reference schemas)
    # DATA_DATABASE_URL will fall back to PRIMARY_DATABASE_URL
    bash "$SCRIPT_DIR/migrate-data.sh"
fi

print_header "✨ All Database Migrations Complete!"

print_success "Both PRIMARY and DATA databases are up to date"

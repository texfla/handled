#!/bin/bash
# ============================================================================
# Setup Development Data - Import Large CSV Files
# ============================================================================
# Uses the app's import API to load workspace tables with large datasets
#
# Usage: bash database/setup-dev-data.sh
# Requires: API server running at API_URL (default: http://localhost:3000)
# ============================================================================

set -e

API_URL="${API_URL:-http://localhost:3000}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Development Data Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "API: $API_URL"
echo ""

# =============================================================================
# CHECK IF API IS RUNNING
# =============================================================================

echo "Checking API availability..."
if ! curl -s "$API_URL/api/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: API is not running at $API_URL${NC}"
    echo ""
    echo "Start the API server first:"
    echo "  cd apps/backoffice/api && pnpm dev"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ API is running${NC}"
echo ""

# =============================================================================
# IMPORT LARGE DATASETS
# =============================================================================

SCRIPT_DIR="$(dirname "$0")"
SAMPLE_DATA_DIR="$SCRIPT_DIR/sample-data"

# US ZIP Codes (~40K rows)
echo -e "${YELLOW}Importing US ZIP codes...${NC}"
if [ -f "$SAMPLE_DATA_DIR/us_zips.csv" ]; then
    if curl -X POST "$API_URL/api/upload/us-zips" \
         -F "file=@$SAMPLE_DATA_DIR/us_zips.csv" \
         -H "Accept: application/json" 2>&1 | grep -q "success"; then
        echo -e "${GREEN}✓ US ZIPs imported successfully${NC}"
    else
        echo -e "${YELLOW}⚠ US ZIPs import may have failed - check API logs${NC}"
    fi
else
    echo -e "${YELLOW}⚠ us_zips.csv not found in sample-data/ - skipping${NC}"
    echo "  Download from: https://simplemaps.com/data/us-zips"
fi
echo ""

# UPS Zones (~1K rows)
echo -e "${YELLOW}Importing UPS zones...${NC}"
if [ -f "$SAMPLE_DATA_DIR/ups_zones.csv" ]; then
    if curl -X POST "$API_URL/api/upload/ups-zones" \
         -F "file=@$SAMPLE_DATA_DIR/ups_zones.csv" \
         -H "Accept: application/json" 2>&1 | grep -q "success"; then
        echo -e "${GREEN}✓ UPS zones imported successfully${NC}"
    else
        echo -e "${YELLOW}⚠ UPS zones import may have failed - check API logs${NC}"
    fi
else
    echo -e "${YELLOW}⚠ ups_zones.csv not found in sample-data/ - skipping${NC}"
    echo "  Contact UPS for zone chart data"
fi
echo ""

# Census ZCTA Data (~33K rows)
echo -e "${YELLOW}Importing Census ZCTA data...${NC}"
if [ -f "$SAMPLE_DATA_DIR/gaz_zcta_national.csv" ]; then
    if curl -X POST "$API_URL/api/upload/gaz-zcta" \
         -F "file=@$SAMPLE_DATA_DIR/gaz_zcta_national.csv" \
         -H "Accept: application/json" 2>&1 | grep -q "success"; then
        echo -e "${GREEN}✓ Census ZCTA imported successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Census ZCTA import may have failed - check API logs${NC}"
    fi
else
    echo -e "${YELLOW}⚠ gaz_zcta_national.csv not found in sample-data/ - skipping${NC}"
    echo "  Download from: https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html"
fi
echo ""

# =============================================================================
# SUMMARY
# =============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Development data setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Run transformations to populate reference tables:"
echo "     Visit: $API_URL/integrations/transformations"
echo ""
echo "  2. Verify data was imported:"
echo "     psql \$PRIMARY_DATABASE_URL -c 'SELECT COUNT(*) FROM workspace.us_zips;'"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

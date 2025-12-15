# Sample Data for Development

This folder holds large CSV files used to populate the `workspace` schema for development and testing.

## What Goes Here

Large datasets that are **too big for SQL seed data** (~40K+ rows):

- `us_zips.csv` - ZIP code reference data (~40K rows)
- `gaz_zcta_national.csv` - Census ZCTA geographic data (~33K rows)
- `ups_zones.csv` - UPS zone charts (~1K rows)
- `ups_ground_service_zip5.csv` - UPS ground transit times (optional, very large)
- `usps_3d_base_service.csv` - USPS delivery standards (~1K rows)

## How to Populate

### Option 1: Use the Setup Script (Recommended)

```bash
# 1. Start the API server
cd apps/backoffice/api
pnpm dev

# 2. Run the setup script
cd ../../../database
bash setup-dev-data.sh
```

### Option 2: Use the Web UI

1. Start the app: `pnpm dev`
2. Visit: http://localhost:3000/integrations/imports
3. Upload CSV files through the UI

### Option 3: Manual API Calls

```bash
curl -X POST http://localhost:3000/api/upload/us-zips \
  -F "file=@database/sample-data/us_zips.csv"
```

## Where to Get the Data

### US ZIP Codes
- Source: [SimpleMaps US ZIP Codes Database](https://simplemaps.com/data/us-zips)
- File: `us_zips.csv`
- Size: ~40K rows

### Census ZCTA Data
- Source: [US Census Bureau Gazetteer Files](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html)
- File: `gaz_zcta_national.csv`
- Size: ~33K rows

### UPS Zone Charts
- Source: UPS (contact your UPS account rep)
- File: `ups_zones.csv`
- Size: ~1K rows (3-digit origin to 3-digit destination)

### USPS Service Standards
- Source: USPS Service Standards documentation
- File: `usps_3d_base_service.csv`
- Size: ~1K rows

## .gitignore

These CSV files should be in `.gitignore` because they are:
- Large (can be several MB each)
- Potentially proprietary (UPS data)
- Easily re-imported from original sources

Only commit this README and any small sample/test files.

## After Import

After importing workspace data, run **transformations** to populate the `reference` schema:

1. Visit: http://localhost:3000/integrations/transformations
2. Run transformations to create:
   - `reference.zip3_reference` (aggregated ZIP3 data)
   - `reference.delivery_matrix` (the crown jewel - unified transit times)

## Testing Without Large Data

If you don't have access to the full datasets, you can:

1. Create small sample CSVs with 10-20 rows for structure testing
2. Use the SQL seed data in the migration files (carriers, services)
3. Manually insert a few test rows into `workspace` tables for transformation testing

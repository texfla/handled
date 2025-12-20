# Adding Real Warehouse Coordinates to the Map

## Current State
The map is fully functional but uses placeholder coordinates for warehouses. To show real coverage data, you need to add actual warehouse coordinates to your database.

## Step 1: Update Database Schema

Add coordinate columns to the `company.warehouses` table:

```sql
-- Add coordinate columns to warehouses table
ALTER TABLE company.warehouses 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS zip3 VARCHAR(3);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_warehouses_coordinates 
ON company.warehouses(latitude, longitude);
```

## Step 2: Populate Warehouse Coordinates

### Option A: Manual Entry (Quick Start)
Update existing warehouses with their coordinates:

```sql
-- Example: Update Chicago warehouse
UPDATE company.warehouses 
SET 
  latitude = 41.8781,
  longitude = -87.6298,
  zip3 = '606'
WHERE code = 'CHI01';

-- Example: Update Los Angeles warehouse
UPDATE company.warehouses 
SET 
  latitude = 34.0522,
  longitude = -118.2437,
  zip3 = '900'
WHERE code = 'LAX01';
```

### Option B: Geocoding Service (Automated)
If you have warehouse addresses, use a geocoding service:

```typescript
// Example using a geocoding service
import { geocodeAddress } from './services/geocoding';

async function updateWarehouseCoordinates(warehouseId: string, address: string) {
  const { lat, lng, zip3 } = await geocodeAddress(address);
  
  await prisma.warehouse.update({
    where: { id: warehouseId },
    data: {
      latitude: lat,
      longitude: lng,
      zip3: zip3,
    },
  });
}
```

## Step 3: Update Prisma Schema

Add the new fields to your Prisma schema:

```prisma
// In apps/backoffice/api/prisma/schema-primary.prisma
model Warehouse {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  // ... existing fields ...
  
  // Add these fields:
  latitude  Decimal? @db.Decimal(10, 8)
  longitude Decimal? @db.Decimal(11, 8)
  zip3      String?  @db.VarChar(3)
  
  // ... rest of model ...
}
```

Then regenerate Prisma client:

```bash
cd apps/backoffice/api
pnpm db:generate
```

## Step 4: Update Warehouse API Endpoint

Modify the warehouse endpoint to include coordinates:

```typescript
// In apps/backoffice/api/src/routes/warehouses.ts

// Update the warehouse query to include coordinates
const warehouses = await prismaPrimary.warehouse.findMany({
  select: {
    id: true,
    code: true,
    name: true,
    capacity: true,
    latitude: true,    // Add this
    longitude: true,   // Add this
    zip3: true,        // Add this
    // ... other fields
  },
});
```

## Step 5: Update Frontend Data Transformation

Modify the ClientDetailPage to use real coordinates:

```typescript
// In apps/backoffice/web/src/pages/clients/ClientDetailPage.tsx

// Replace the placeholder transformation with:
const mapWarehouses = useMemo(() => {
  if (!client.warehouseAllocations || client.warehouseAllocations.length === 0) {
    return [];
  }

  return client.warehouseAllocations
    .map((alloc) => {
      const wh = alloc.warehouse;
      
      // Skip warehouses without coordinates
      if (!wh.latitude || !wh.longitude || !wh.zip3) {
        console.warn(`Warehouse ${wh.code} missing coordinates`);
        return null;
      }

      return {
        zip3: wh.zip3,
        lat: Number(wh.latitude),
        lng: Number(wh.longitude),
        city: wh.city || 'Unknown',
        state: wh.state || 'Unknown',
        name: wh.name,
        isRequired: alloc.isPrimary,
      };
    })
    .filter((wh): wh is WarehouseLocation => wh !== null);
}, [client.warehouseAllocations]);
```

## Step 6: Update TypeScript Interfaces

Update the warehouse interface to include coordinates:

```typescript
// In apps/backoffice/web/src/pages/clients/ClientDetailPage.tsx

interface WarehouseAllocation {
  id: string;
  customerId: string;
  companyWarehouseId: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
    latitude?: number;    // Add this
    longitude?: number;   // Add this
    zip3?: string;        // Add this
    city?: string;        // Add this
    state?: string;       // Add this
    capacity?: {
      usable_pallets?: number;
    };
  };
  // ... rest of interface
}
```

## Step 7: Test the Map

1. Start the dev servers:
   ```bash
   pnpm -r run dev
   ```

2. Navigate to a client with warehouse allocations

3. Check the "Overview" tab

4. Verify:
   - Warehouse markers appear at correct locations
   - Coverage zones are colored correctly
   - Tooltips show warehouse information
   - No console errors

## Example: Complete Warehouse Data

Here's what a complete warehouse record should look like:

```json
{
  "id": "wh_chicago_01",
  "code": "CHI01",
  "name": "Chicago Distribution Center",
  "latitude": 41.8781,
  "longitude": -87.6298,
  "zip3": "606",
  "city": "Chicago",
  "state": "IL",
  "capacity": {
    "usable_pallets": 10000
  }
}
```

## Geocoding Resources

If you need to geocode addresses:

### Free Options
- **Nominatim (OpenStreetMap)**: https://nominatim.org/
- **US Census Geocoder**: https://geocoding.geo.census.gov/

### Paid Options (with free tiers)
- **Google Maps Geocoding API**: https://developers.google.com/maps/documentation/geocoding
- **Mapbox Geocoding API**: https://docs.mapbox.com/api/search/geocoding/
- **HERE Geocoding API**: https://developer.here.com/documentation/geocoding-search-api

## Common ZIP3 Codes (for reference)

| ZIP3 | City | State |
|------|------|-------|
| 606 | Chicago | IL |
| 900-908 | Los Angeles | CA |
| 100-102 | New York | NY |
| 770-772 | Houston | TX |
| 850-853 | Phoenix | AZ |
| 191-195 | Philadelphia | PA |
| 750-753 | Dallas | TX |
| 331-334 | Miami | FL |
| 980-986 | Seattle | WA |
| 021-024 | Boston | MA |

## Troubleshooting

### Map shows no warehouses
- Check that warehouses have `latitude`, `longitude`, and `zip3` populated
- Check browser console for warnings about missing coordinates
- Verify API response includes coordinate fields

### Warehouses appear in wrong location
- Verify latitude/longitude are not swapped (lat is Y, lng is X)
- Check that coordinates are in decimal degrees (not DMS)
- Ensure coordinates are for the correct warehouse location

### Coverage zones don't appear
- Verify `zone-matrix.json` has entries for your warehouse ZIP3 codes
- Check that warehouse `zip3` values match keys in zone matrix
- Look for console errors during coverage calculation

## Next Steps

After adding warehouse coordinates:

1. **Add Customer Facility Geocoding**
   - Geocode customer facility addresses
   - Store coordinates in `customer.facilities` table
   - Update facility markers on map

2. **Add Coverage Statistics**
   - Calculate population covered
   - Show percentage within delivery goal
   - Display average transit time

3. **Add Interactive Features**
   - Drag & drop warehouse repositioning
   - Real-time coverage recalculation
   - Display mode controls (shaded/outlines/dots)

## Summary

Once you add real warehouse coordinates, the map will:
- ✅ Show warehouses at their actual locations
- ✅ Calculate accurate transit times
- ✅ Display correct coverage zones
- ✅ Provide meaningful logistics insights

The map component is fully functional and waiting for real data!


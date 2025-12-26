This is a single, comprehensive overview document for the **Contracts & Rate Cards Structure** in a 3PL back office system. This covers the proposed JSON structure for storing rate cards as blobs, a comprehensive list of common service types (drawn from standard industry practices), and detailed explanations of the key fields/definitions used in the structure.

### 1. Overview & Purpose
Rate cards define how a 3PL bills clients for services. Storing them as JSON blobs allows:
- Easy versioning and effective date ranges
- Client-specific customization
- Automated billing/invoicing integration with WMS data
- Support for tiers, zones, surcharges, minimums, and notes

The structure supports multi-client warehouses with flexible, granular pricing.

### 2. Proposed JSON Structure
```json
{
  "rateCards": [
    {
      "clientId": "CLIENT001",                  // Unique client identifier
      "clientName": "Example Retailer",         // Human-readable name
      "effectiveFrom": "2024-01-01",            // ISO date when rates start applying
      "effectiveTo": "2024-12-31",              // ISO date when rates expire (null for ongoing)
      "currency": "USD",                        // ISO 4217 currency code
      "services": [                             // Array of billable services
        // See examples below for different patterns
      ],
      "minimums": {                             // Guaranteed billing floors
        "monthlyMinimum": 500.00,
        "orderMinimum": 10.00
      },
      "surcharges": [                           // Percentage-based or conditional add-ons
        {
          "type": "FuelSurcharge",
          "percentage": 5.0
        },
        {
          "type": "PeakSeason",
          "percentage": 10.0,
          "appliesFrom": "2024-11-01",
          "appliesTo": "2024-12-31"
        }
      ],
      "notes": "Rates subject to annual review. Volume discounts apply after 1000 orders/month."
    }
  ]
}
```

### 3. Service Examples (within "services" array)
Different service types use slightly different sub-structures:

**Flat-rate service** (e.g., Receiving)
```json
{
  "serviceType": "Receiving",
  "description": "Fee for inbound receiving per unit",
  "unit": "unit",
  "baseRate": 0.50
}
```

**Tiered service** (e.g., Storage or Picking)
```json
{
  "serviceType": "Storage",
  "description": "Monthly storage fee per pallet",
  "unit": "pallet/month",
  "baseRate": 20.00,
  "tiers": [
    { "minQuantity": 1,   "maxQuantity": 100, "rate": 20.00 },
    { "minQuantity": 101, "maxQuantity": null, "rate": 18.00 }
  ]
}
```

**Zone/weight-based** (e.g., Shipping)
```json
{
  "serviceType": "Shipping",
  "description": "Outbound shipping based on zones and weight",
  "unit": "kg",
  "zones": [
    {
      "zone": "Domestic",
      "tiers": [
        { "minWeight": 0,     "maxWeight": 5,    "rate": 5.00 },
        { "minWeight": 5.01,  "maxWeight": null, "rate": 1.00 }
      ]
    }
    // Additional zones...
  ]
}
```

**Itemized / Value-Added or Materials**
```json
{
  "serviceType": "PackagingMaterials",
  "description": "Charges for outbound packaging supplies",
  "items": [
    { "item": "Small Box (8x6x4)", "unit": "each", "rate": 0.80 },
    { "item": "Poly Mailer",       "unit": "each", "rate": 0.50 },
    { "item": "Custom Branded Box","unit": "each", "rate": 3.50 }
  ],
  "markup": "cost_plus_15_percent"  // Optional for variable-cost items
}
```

### 4. Comprehensive List of Common Service Types
Grouped by category (add as new objects in the "services" array):

**Core Warehousing & Handling**
- Storage (pallet, bin, shelf, cubic foot, SKU)
- Receiving / Inbound Handling (per pallet, case, unit, hour)
- Putaway
- Picking (per order, line item, unit)
- Packing / Pick & Pack
- Shipping / Outbound (often zone/weight/carrier-based)
- Cross-Docking

**Value-Added Services (VAS)**
- Kitting / Assembly / Bundling
- Labeling (barcodes, custom tags, compliance)
- Custom Packaging / Repackaging
- Branded Inserts / Marketing Materials
- Quality Inspection / QC Checks
- Pallet Restacking / Rework
- Special Projects / Manual Handling

**Reverse Logistics**
- Returns Processing (inspection, restock, repack)

**Materials & Supplies**
- PackagingMaterials (boxes, poly mailers, tape, dunnage, labels)
- Client-Supplied Materials (flag to waive charges)

**Transportation & Freight**
- Freight Management (LTL, TL, parcel – often cost-plus)
- Freight Forwarding / International

**Administrative & Other**
- Account Management / Onboarding / Setup (monthly or one-time)
- Long-Term Storage / Slow-Moving Inventory Fees
- Minimums Enforcement (monthly, per-order)
- Peak Season / Holiday Surcharges
- Fuel Surcharge
- Special Accessorials (e.g., HAZMAT, oversized, residential delivery)

### 5. Field Definitions & Explanations
| Field                  | Type          | Description / Usage                                                                 | Required? | Notes / Examples |
|------------------------|---------------|-------------------------------------------------------------------------------------|-----------|------------------|
| serviceType            | string        | Unique identifier for the service (used for matching in billing logic)              | Yes       | "Storage", "Picking", "PackagingMaterials" |
| description            | string        | Human-readable explanation of what the service covers                               | Yes       | "Monthly storage fee per pallet position" |
| unit                   | string        | Billing unit of measure                                                             | Usually   | "pallet/month", "line_item", "order", "each", "kg", "hour" |
| baseRate               | number        | Default or starting rate (decimal)                                                  | For flat  | 0.75 (for picking per line) |
| tiers                  | array<object> | Volume/quantity-based discounts                                                     | Optional  | Array of {minQuantity, maxQuantity (null = unlimited), rate} |
| zones                  | array<object> | Geographic or carrier zone breakdowns (mainly for shipping)                         | Optional  | Array of {zone: "Domestic", tiers: [...]} |
| items                  | array<object> | Sub-list for itemized services (VAS, materials)                                     | Optional  | Array of {item, unit, rate, optional note} |
| markup                 | string        | For variable-cost items (e.g., materials bought at cost + %)                        | Optional  | "cost_plus_15_percent" |
| minimums               | object        | Contract-level billing floors                                                       | Optional  | {monthlyMinimum: 500.00, orderMinimum: 10.00} |
| surcharges             | array<object> | Add-on percentages or conditional fees                                              | Optional  | {type, percentage, appliesFrom/To} |
| notes                  | string        | Any additional contract terms, exceptions, review dates                             | Optional  | Free text for special conditions |

This structure is flexible, scalable, and aligns with common 3PL billing practices. Use effective dates to manage rate changes without breaking historical invoices. For implementation, add validation rules (e.g., ensure tiers are non-overlapping) and integrate with our RBAC/WMS system for role-based visibility and automated calculations.
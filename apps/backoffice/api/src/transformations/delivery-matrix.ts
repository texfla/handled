/**
 * Delivery Matrix Transformation
 * 
 * Combines carrier transit data from multiple sources into a unified
 * delivery matrix for the coverage optimizer.
 * 
 * Sources:
 * - workspace.ups_ground_service_zip5 → UPS Ground (aggregated to zip3)
 * - workspace.ups_zones → UPS zone-based services
 * - workspace.usps_3d_base_service → USPS service standards (all 8 services)
 * 
 * Uses carrier_code/service_code as stable identifiers (not integer IDs).
 */

import type { Transformation } from './types.js';

export const deliveryMatrix: Transformation = {
  id: 'delivery-matrix',
  name: 'Delivery Matrix',
  description: 'Builds unified transit time matrix from all carrier sources',
  
  sources: [
    'workspace.ups_ground_service_zip5',
    'workspace.ups_zones',
    'workspace.usps_3d_base_service',
  ],
  targetTable: 'reference.delivery_matrix',
  
  // Run after zip3_reference so we have valid zip3 list
  dependencies: ['zip3-reference'],
  
  getSql() {
    return `
      WITH 
      -- UPS Ground: Aggregate zip5 transit times to zip3 level (using mode/most common)
      -- Priority 1: Most accurate source (actual transit times from 5-digit data)
      ups_ground_zip5 AS (
        SELECT
          LEFT(origin_zip, 3) as origin_zip3,
          LEFT(dest_zip, 3) as dest_zip3,
          'UPS' as carrier_code,
          'GND' as service_code,
          MODE() WITHIN GROUP (ORDER BY transit_days) as transit_days,
          NULL::text as zone,
          1 as source_priority  -- Highest priority (5-digit aggregated)
        FROM workspace.ups_ground_service_zip5
        WHERE transit_days IS NOT NULL
        GROUP BY LEFT(origin_zip, 3), LEFT(dest_zip, 3)
      ),
      
      -- UPS Zone-based services (zones translated to transit days)
      -- Priority 2: Estimated from zone charts (3-digit data)
      -- 
      -- Zone code translation:
      -- - Non-Ground (3DS, 2DA, 2AM, NDS, NDA): First digit = transit days
      --   e.g., "202" → 2 days, "125" → 1 day
      -- - Ground: Last digit = transit days, except "045" = 5 days
      --   e.g., "002" → 2 days, "003" → 3 days, "045" → 5 days
      --
      ups_zones_ground AS (
        SELECT 
          origin_zip as origin_zip3, 
          dest_zip as dest_zip3, 
          'UPS' as carrier_code, 
          'GND' as service_code,
          CASE 
            WHEN ground_zone = '045' THEN 5
            WHEN ground_zone ~ '^[0-9]+$' THEN CAST(RIGHT(ground_zone, 1) AS INTEGER)
            ELSE NULL
          END as transit_days,
          ground_zone as zone,
          2 as source_priority
        FROM workspace.ups_zones 
        WHERE ground_zone IS NOT NULL AND ground_zone != ''
      ),
      
      ups_zones_express AS (
        SELECT origin_zip3, dest_zip3, carrier_code, service_code,
               CASE 
                 WHEN zone ~ '^[0-9]' THEN CAST(LEFT(zone, 1) AS INTEGER)
                 ELSE NULL
               END as transit_days,
               zone,
               2 as source_priority
        FROM (
          SELECT origin_zip as origin_zip3, dest_zip as dest_zip3, 'UPS' as carrier_code, '3DS' as service_code, three_day_zone as zone
          FROM workspace.ups_zones WHERE three_day_zone IS NOT NULL AND three_day_zone != ''
          UNION ALL
          SELECT origin_zip, dest_zip, 'UPS', '2DA', two_day_zone
          FROM workspace.ups_zones WHERE two_day_zone IS NOT NULL AND two_day_zone != ''
          UNION ALL
          SELECT origin_zip, dest_zip, 'UPS', '2AM', two_day_am_zone
          FROM workspace.ups_zones WHERE two_day_am_zone IS NOT NULL AND two_day_am_zone != ''
          UNION ALL
          SELECT origin_zip, dest_zip, 'UPS', 'NDS', nda_saver_zone
          FROM workspace.ups_zones WHERE nda_saver_zone IS NOT NULL AND nda_saver_zone != ''
          UNION ALL
          SELECT origin_zip, dest_zip, 'UPS', 'NDA', next_day_zone
          FROM workspace.ups_zones WHERE next_day_zone IS NOT NULL AND next_day_zone != ''
        ) zones
      ),
      
      -- USPS services from 3D base (all 8 service columns)
      -- Priority 1: Direct from USPS data
      -- Column mapping:
      --   pri_service_standard → PRI (Priority Mail)
      --   gal_service_standard → GAL (Ground Advantage Large)
      --   mkt_service_standard → MKT (Marketing Mail)
      --   per_service_standard → PER (Periodicals)
      --   pkg_service_standard → PKG (Package Services)
      --   fcm_service_standard → FCM (First-Class Mail)
      --   gah_service_standard → GAH (Ground Advantage Heavy)
      --   pfc_service_standard → PFC (Parcel First Class)
      usps_services AS (
        -- PRI - Priority Mail
        SELECT origin_zip_code as origin_zip3, destination_zip_code as dest_zip3,
               'USPS' as carrier_code, 'PRI' as service_code, 
               pri_service_standard as transit_days, NULL::text as zone,
               1 as source_priority
        FROM workspace.usps_3d_base_service
        WHERE pri_service_standard IS NOT NULL
        UNION ALL
        -- GAL - Ground Advantage Large
        SELECT origin_zip_code, destination_zip_code, 'USPS', 'GAL', 
               gal_service_standard, NULL, 1
        FROM workspace.usps_3d_base_service
        WHERE gal_service_standard IS NOT NULL
        UNION ALL
        -- MKT - Marketing Mail
        SELECT origin_zip_code, destination_zip_code, 'USPS', 'MKT', 
               mkt_service_standard, NULL, 1
        FROM workspace.usps_3d_base_service
        WHERE mkt_service_standard IS NOT NULL
        UNION ALL
        -- PER - Periodicals
        SELECT origin_zip_code, destination_zip_code, 'USPS', 'PER', 
               per_service_standard, NULL, 1
        FROM workspace.usps_3d_base_service
        WHERE per_service_standard IS NOT NULL
        UNION ALL
        -- PKG - Package Services
        SELECT origin_zip_code, destination_zip_code, 'USPS', 'PKG', 
               pkg_service_standard, NULL, 1
        FROM workspace.usps_3d_base_service
        WHERE pkg_service_standard IS NOT NULL
        UNION ALL
        -- FCM - First-Class Mail
        SELECT origin_zip_code, destination_zip_code, 'USPS', 'FCM', 
               fcm_service_standard, NULL, 1
        FROM workspace.usps_3d_base_service
        WHERE fcm_service_standard IS NOT NULL
        UNION ALL
        -- GAH - Ground Advantage Heavy
        SELECT origin_zip_code, destination_zip_code, 'USPS', 'GAH', 
               gah_service_standard, NULL, 1
        FROM workspace.usps_3d_base_service
        WHERE gah_service_standard IS NOT NULL
        UNION ALL
        -- PFC - Parcel First Class
        SELECT origin_zip_code, destination_zip_code, 'USPS', 'PFC', 
               pfc_service_standard, NULL, 1
        FROM workspace.usps_3d_base_service
        WHERE pfc_service_standard IS NOT NULL
      ),
      
      -- Combine all sources
      combined AS (
        SELECT * FROM ups_ground_zip5
        UNION ALL
        SELECT * FROM ups_zones_ground WHERE transit_days IS NOT NULL
        UNION ALL
        SELECT * FROM ups_zones_express WHERE transit_days IS NOT NULL
        UNION ALL
        SELECT * FROM usps_services
      ),
      
      -- Add delivery score (no join needed - we use codes directly)
      scored AS (
        SELECT 
          c.origin_zip3, 
          c.dest_zip3, 
          c.carrier_code,
          c.service_code,
          c.transit_days, 
          c.zone, 
          c.source_priority,
          CASE 
            WHEN c.transit_days <= 1 THEN 100
            WHEN c.transit_days = 2 THEN 95
            WHEN c.transit_days = 3 THEN 60
            WHEN c.transit_days = 4 THEN 20
            ELSE 0
          END as delivery_score
        FROM combined c
        WHERE c.origin_zip3 IS NOT NULL 
          AND c.dest_zip3 IS NOT NULL 
          AND c.transit_days IS NOT NULL
          AND c.transit_days > 0
      )
      
      INSERT INTO reference.delivery_matrix (
        origin_zip3, dest_zip3, carrier_code, service_code, transit_days, delivery_score, zone,
        created_at, updated_at
      )
      SELECT DISTINCT ON (origin_zip3, dest_zip3, carrier_code, service_code)
        origin_zip3, dest_zip3, carrier_code, service_code, transit_days, delivery_score, zone,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM scored
      -- Order by source_priority FIRST so 5-digit data wins over zone estimates
      ORDER BY origin_zip3, dest_zip3, carrier_code, service_code, source_priority, transit_days
    `;
  },
};

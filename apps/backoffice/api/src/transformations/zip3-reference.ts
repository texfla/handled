/**
 * ZIP3 Reference Transformation
 * 
 * Combines demographic data (from us_zips) and geographic data (from gaz_zcta)
 * into a single reference table keyed by 3-digit ZIP prefix.
 */

import type { Transformation } from './types.js';

export const zip3Reference: Transformation = {
  id: 'zip3-reference',
  name: 'ZIP3 Reference',
  description: 'Aggregates 5-digit ZIP data into 3-digit ZIP reference with demographics and centroids',
  
  sources: ['workspace.us_zips', 'workspace.gaz_zcta_national'],
  targetTable: 'reference.zip3_reference',
  
  getSql() {
    return `
      WITH demographics AS (
        SELECT
          LEFT(zip, 3) as zip3,
          SUM(population) as total_population,
          COUNT(*) as zip_count,
          MODE() WITHIN GROUP (ORDER BY state_id) as primary_state,
          -- Population-weighted centroid
          CASE 
            WHEN SUM(population) > 0 THEN SUM(lat * population) / SUM(population)
            ELSE AVG(lat)
          END as pop_weighted_lat,
          CASE 
            WHEN SUM(population) > 0 THEN SUM(lng * population) / SUM(population)
            ELSE AVG(lng)
          END as pop_weighted_lng
        FROM workspace.us_zips
        WHERE zip IS NOT NULL AND LENGTH(zip) = 5
        GROUP BY LEFT(zip, 3)
      ),
      -- Get the city from the most populous ZIP in each ZIP3
      primary_cities AS (
        SELECT DISTINCT ON (LEFT(zip, 3))
          LEFT(zip, 3) as zip3,
          city as primary_city
        FROM workspace.us_zips
        WHERE zip IS NOT NULL AND LENGTH(zip) = 5 AND city IS NOT NULL
        ORDER BY LEFT(zip, 3), population DESC NULLS LAST
      ),
      centroids AS (
        SELECT
          LEFT(geoid, 3) as zip3,
          SUM(aland_sqmi) as total_land_sqmi,
          SUM(awater_sqmi) as total_water_sqmi,
          -- Area-weighted centroid
          CASE 
            WHEN SUM(aland_sqmi) > 0 THEN SUM(intptlat * aland_sqmi) / SUM(aland_sqmi)
            ELSE AVG(intptlat)
          END as geo_centroid_lat,
          CASE 
            WHEN SUM(aland_sqmi) > 0 THEN SUM(intptlong * aland_sqmi) / SUM(aland_sqmi)
            ELSE AVG(intptlong)
          END as geo_centroid_lng
        FROM workspace.gaz_zcta_national
        WHERE geoid IS NOT NULL AND LENGTH(geoid) = 5
        GROUP BY LEFT(geoid, 3)
      )
      INSERT INTO reference.zip3_reference (
        zip3,
        total_population,
        zip_count,
        primary_state,
        primary_city,
        pop_weighted_lat,
        pop_weighted_lng,
        geo_centroid_lat,
        geo_centroid_lng,
        total_land_sqmi,
        total_water_sqmi,
        created_at,
        updated_at
      )
      SELECT
        COALESCE(d.zip3, c.zip3) as zip3,
        COALESCE(d.total_population, 0) as total_population,
        COALESCE(d.zip_count, 0) as zip_count,
        d.primary_state,
        pc.primary_city,
        d.pop_weighted_lat,
        d.pop_weighted_lng,
        c.geo_centroid_lat,
        c.geo_centroid_lng,
        COALESCE(c.total_land_sqmi, 0) as total_land_sqmi,
        COALESCE(c.total_water_sqmi, 0) as total_water_sqmi,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM demographics d
      FULL OUTER JOIN centroids c ON d.zip3 = c.zip3
      LEFT JOIN primary_cities pc ON COALESCE(d.zip3, c.zip3) = pc.zip3
      WHERE COALESCE(d.zip3, c.zip3) IS NOT NULL
    `;
  },
};


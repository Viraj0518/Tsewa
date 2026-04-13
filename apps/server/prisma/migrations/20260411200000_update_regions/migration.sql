-- Migration: update_regions
-- Migrate Region enum from Tibetan-internal regions to diaspora-focused locations

-- 1. Create the new enum type
CREATE TYPE "Region_new" AS ENUM ('INDIA', 'NEPAL', 'NORTH_AMERICA', 'EUROPE', 'AUSTRALIA_NZ', 'EAST_ASIA', 'TIBET');

-- 2. Convert regionFilter array to text[] first (must be done before region column)
ALTER TABLE "Profile" ALTER COLUMN "regionFilter" TYPE TEXT[] USING "regionFilter"::TEXT[];

-- 3. Convert region column to text
ALTER TABLE "Profile" ALTER COLUMN "region" TYPE TEXT USING "region"::TEXT;

-- 4. Update existing data in Profile.region column
UPDATE "Profile" SET "region" = 'TIBET' WHERE "region" IN ('U_TSANG', 'KHAM', 'AMDO');
UPDATE "Profile" SET "region" = 'INDIA' WHERE "region" = 'DIASPORA';

-- 5. Update existing data in Profile.regionFilter array column
UPDATE "Profile" SET "regionFilter" = array_replace("regionFilter", 'U_TSANG', 'TIBET') WHERE 'U_TSANG' = ANY("regionFilter");
UPDATE "Profile" SET "regionFilter" = array_replace("regionFilter", 'KHAM', 'TIBET') WHERE 'KHAM' = ANY("regionFilter");
UPDATE "Profile" SET "regionFilter" = array_replace("regionFilter", 'AMDO', 'TIBET') WHERE 'AMDO' = ANY("regionFilter");
UPDATE "Profile" SET "regionFilter" = array_replace("regionFilter", 'DIASPORA', 'INDIA') WHERE 'DIASPORA' = ANY("regionFilter");

-- 6. Deduplicate regionFilter entries (e.g. multiple old regions mapped to TIBET)
UPDATE "Profile" SET "regionFilter" = (
  SELECT ARRAY(SELECT DISTINCT unnest("regionFilter"))
)
WHERE array_length("regionFilter", 1) > 0;

-- 7. Convert columns to new enum type
ALTER TABLE "Profile" ALTER COLUMN "region" TYPE "Region_new" USING "region"::"Region_new";
ALTER TABLE "Profile" ALTER COLUMN "regionFilter" TYPE "Region_new"[] USING "regionFilter"::"Region_new"[];

-- 8. Drop old enum and rename new one
DROP TYPE "Region";
ALTER TYPE "Region_new" RENAME TO "Region";

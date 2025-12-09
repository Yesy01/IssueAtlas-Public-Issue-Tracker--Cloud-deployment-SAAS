-- Enable PostGIS extension (noop if already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column for Issue location
ALTER TABLE "Issue"
ADD COLUMN IF NOT EXISTS "location" geometry(Point, 4326);

-- Backfill existing rows from lat/lon
UPDATE "Issue"
SET "location" = ST_SetSRID(ST_MakePoint("lon", "lat"), 4326)
WHERE "location" IS NULL AND "lon" IS NOT NULL AND "lat" IS NOT NULL;

-- Spatial index
CREATE INDEX IF NOT EXISTS "Issue_location_idx"
ON "Issue" USING GIST ("location");

-- Trigger to keep location in sync with lat/lon changes
CREATE OR REPLACE FUNCTION update_issue_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW."location" = ST_SetSRID(ST_MakePoint(NEW."lon", NEW."lat"), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS issue_location_trigger ON "Issue";
CREATE TRIGGER issue_location_trigger
BEFORE INSERT OR UPDATE OF "lat", "lon" ON "Issue"
FOR EACH ROW
EXECUTE FUNCTION update_issue_location();

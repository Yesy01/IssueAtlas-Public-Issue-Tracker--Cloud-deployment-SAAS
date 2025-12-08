import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export async function findIssuesWithinRadius(lat: number, lon: number, radiusMeters: number) {
  return prisma.$queryRaw`
    SELECT *,
      ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
      ) AS distance
    FROM "Issue"
    WHERE location IS NOT NULL
      AND ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
    ORDER BY distance ASC
  `;
}

export async function updateIssueLocation(id: string, lat: number, lon: number) {
  return prisma.$executeRaw`
    UPDATE "Issue"
    SET location = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
    WHERE id = ${id}
  `;
}

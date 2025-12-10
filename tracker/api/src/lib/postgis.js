"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findIssuesWithinRadius = findIssuesWithinRadius;
exports.updateIssueLocation = updateIssueLocation;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function findIssuesWithinRadius(lat, lon, radiusMeters) {
    return prisma.$queryRaw `
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
async function updateIssueLocation(id, lat, lon) {
    return prisma.$executeRaw `
    UPDATE "Issue"
    SET location = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
    WHERE id = ${id}
  `;
}
//# sourceMappingURL=postgis.js.map
export interface BoundingBox {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
}
export declare function findIssuesWithinRadius(lat: number, lon: number, radiusMeters: number): Promise<unknown>;
export declare function updateIssueLocation(id: string, lat: number, lon: number): Promise<number>;
//# sourceMappingURL=postgis.d.ts.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Seeding database...");
    // Plain passwords just for dev; they are hashed before storing
    const adminPasswordPlain = "Passw0rd!";
    const userPasswordPlain = "user12345";
    const [adminPasswordHash, userPasswordHash] = await Promise.all([
        bcrypt_1.default.hash(adminPasswordPlain, 10),
        bcrypt_1.default.hash(userPasswordPlain, 10),
    ]);
    // Upsert admin
    const admin = await prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: {
            password: adminPasswordHash,
            role: "admin",
        },
        create: {
            email: "admin@example.com",
            password: adminPasswordHash,
            role: "admin",
        },
    });
    // Upsert normal users
    const user1 = await prisma.user.upsert({
        where: { email: "user1@example.com" },
        update: {
            password: userPasswordHash,
            role: "user",
        },
        create: {
            email: "user1@example.com",
            password: userPasswordHash,
            role: "user",
        },
    });
    const user2 = await prisma.user.upsert({
        where: { email: "user2@example.com" },
        update: {
            password: userPasswordHash,
            role: "user",
        },
        create: {
            email: "user2@example.com",
            password: userPasswordHash,
            role: "user",
        },
    });
    console.log("Users upserted:", {
        admin: admin.email,
        user1: user1.email,
        user2: user2.email,
    });
    // Clear issue-related data so the seed is idempotent
    await prisma.$transaction([
        prisma.issueUpvote.deleteMany(),
        prisma.comment.deleteMany(),
        prisma.statusHistory.deleteMany(),
        prisma.issue.deleteMany(),
    ]);
    console.log("Cleared existing issues, comments, upvotes, history");
    // Create sample issues with different types/statuses
    const issue1 = await prisma.issue.create({
        data: {
            reporterId: user1.id,
            title: "Large pothole near market junction",
            description: "Deep pothole on the main road near the central market. Causes traffic jams and is unsafe for bikes.",
            status: "new",
            type: "pothole",
            lat: 19.0760,
            lon: 72.8777,
            address: "Main Market Road",
            areaName: "Market Junction",
            imageUrl: null,
        },
    });
    const issue2 = await prisma.issue.create({
        data: {
            reporterId: user2.id,
            title: "Streetlight not working on residential lane",
            description: "Streetlight has been off for over a week. Lane is very dark at night and unsafe for pedestrians.",
            status: "triaged",
            type: "streetlight",
            lat: 12.9716,
            lon: 77.5946,
            address: "12th Cross, Residential Layout",
            areaName: "North Block",
            imageUrl: null,
        },
    });
    const issue3 = await prisma.issue.create({
        data: {
            reporterId: user1.id,
            title: "Blocked drainage causing stagnant water",
            description: "Drain is blocked and stagnant water is accumulating. Mosquitoes breeding in the area.",
            status: "in_progress",
            type: "drainage",
            lat: 13.0827,
            lon: 80.2707,
            address: "Near Community Hall",
            areaName: "East Ward",
            imageUrl: null,
        },
    });
    const issue4 = await prisma.issue.create({
        data: {
            reporterId: admin.id,
            title: "Broken footpath slabs near school",
            description: "Several slabs are broken, children walking to school are at risk of tripping.",
            status: "resolved",
            type: "other",
            lat: 28.7041,
            lon: 77.1025,
            address: "School Road",
            areaName: "Central Zone",
            imageUrl: null,
        },
    });
    const issue5 = await prisma.issue.create({
        data: {
            reporterId: user2.id,
            title: "Overflowing garbage bin",
            description: "Garbage bin has not been cleared for days, trash spilling onto street.",
            status: "new",
            type: "other",
            lat: 22.5726,
            lon: 88.3639,
            address: "Corner of 3rd Street",
            areaName: "West Sector",
            imageUrl: null,
        },
    });
    console.log("Created issues:", [
        issue1.id,
        issue2.id,
        issue3.id,
        issue4.id,
        issue5.id,
    ]);
    // Basic comments
    await prisma.comment.create({
        data: {
            issueId: issue1.id,
            userId: admin.id,
            body: "Reported to roadworks department, will be inspected this week.",
        },
    });
    await prisma.comment.create({
        data: {
            issueId: issue3.id,
            userId: user2.id,
            body: "This has been a problem for months, thank you for raising it.",
        },
    });
    // Upvotes (idempotent because of composite PK)
    await prisma.issueUpvote.create({
        data: {
            issueId: issue1.id,
            userId: user1.id,
        },
    });
    await prisma.issueUpvote.create({
        data: {
            issueId: issue1.id,
            userId: user2.id,
        },
    });
    await prisma.issueUpvote.create({
        data: {
            issueId: issue2.id,
            userId: user1.id,
        },
    });
    console.log("Seed completed.");
}
main()
    .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seeds.js.map
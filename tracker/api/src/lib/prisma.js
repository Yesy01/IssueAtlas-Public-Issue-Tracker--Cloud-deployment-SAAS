"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// src/lib/prisma.ts
const client_1 = require("@prisma/client");
const globalAny = global;
// Avoid creating multiple clients in dev with ts-node-dev
exports.prisma = globalAny.prisma ??
    new client_1.PrismaClient({
        log: ['warn', 'error'],
    });
if (!globalAny.prisma) {
    globalAny.prisma = exports.prisma;
}
//# sourceMappingURL=prisma.js.map
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalAny = global as unknown as { prisma?: PrismaClient };

// Avoid creating multiple clients in dev with ts-node-dev
export const prisma =
  globalAny.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  });

if (!globalAny.prisma) {
  globalAny.prisma = prisma;
}

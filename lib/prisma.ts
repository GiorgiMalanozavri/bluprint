import type { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { _prisma: PrismaClient | null; _prismaChecked: boolean };

function getPrismaClient(): PrismaClient | null {
  if (globalForPrisma._prismaChecked) return globalForPrisma._prisma;
  globalForPrisma._prismaChecked = true;

  if (!process.env.DATABASE_URL) {
    globalForPrisma._prisma = null;
    return null;
  }

  try {
    // Lazy require to avoid crash when DATABASE_URL is missing
    const { PrismaClient: PC } = require("@prisma/client");
    const client = new PC();
    globalForPrisma._prisma = client;
    return client;
  } catch {
    globalForPrisma._prisma = null;
    return null;
  }
}

export const prisma = getPrismaClient();

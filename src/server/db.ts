import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton.
 *
 * Next.js hot-reloads modules in dev, which would otherwise open a new pool on
 * every edit until Postgres refuses connections. Caching on globalThis keeps a
 * single pool alive across reloads.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

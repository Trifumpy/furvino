import { PrismaClient } from "../generated/prisma"
import { withAccelerate } from "@prisma/extension-accelerate"

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient
}

function buildPrismaClient() {
  const useAccelerate = process.env.USE_ACCELERATE === "true";
  if (useAccelerate) {
    return new PrismaClient().$extends(withAccelerate());
  }
  return new PrismaClient();
}

type AnyPrisma = PrismaClient & Record<string, unknown>;
let prismaAny = (globalForPrisma as unknown as { prisma?: AnyPrisma }).prisma;

// If schema changed and cached client lacks new delegates, rebuild the client
if (!prismaAny || !('authorFollow' in prismaAny) || !('novelUpdateRead' in prismaAny)) {
  prismaAny = buildPrismaClient() as unknown as AnyPrisma;
}

if (process.env.NODE_ENV !== 'production') (globalForPrisma as unknown as { prisma?: AnyPrisma }).prisma = prismaAny;

export default (prismaAny as unknown) as PrismaClient

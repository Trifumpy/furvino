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

let prisma: PrismaClient = globalForPrisma.prisma;

// If schema changed and cached client lacks new delegates, rebuild the client
if (!prisma || !(prisma as unknown as Record<string, unknown>).authorFollow || !(prisma as unknown as Record<string, unknown>).novelUpdateRead) {
  prisma = buildPrismaClient();
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma as PrismaClient;

export default prisma

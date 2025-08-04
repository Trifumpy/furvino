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

const prisma = globalForPrisma.prisma || buildPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma
import { PrismaClient } from "../generated/prisma"
import { withAccelerate } from "@prisma/extension-accelerate"

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient
}

// Expand DATABASE_URL if it contains ${VAR} syntax
function expandDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  // Check if the URL contains variable references
  if (dbUrl.includes('${')) {
    const expanded = dbUrl.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      return process.env[varName] || '';
    });
    
    // Only update if expansion actually resolved variables
    if (!expanded.includes('${')) {
      console.log('Expanded DATABASE_URL with environment variables');
      process.env.DATABASE_URL = expanded;
    } else {
      console.warn('DATABASE_URL contains unresolved variables:', expanded);
    }
  }
}

// Expand env vars before creating Prisma client
expandDatabaseUrl();

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

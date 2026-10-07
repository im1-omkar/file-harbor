import { PrismaClient } from "@prisma/client";

// Global BigInt JSON serialization fix
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const prisma = new PrismaClient();

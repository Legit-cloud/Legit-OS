import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient() as PrismaClient & {
  emailOtp: (PrismaClient extends { emailOtp: infer T } ? T : any);
};

import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

type UserWithRegions = Prisma.UserGetPayload<{ include: { regions: true } }>;

export function findUserByEmail(email: string): Promise<UserWithRegions | null> {
  return prisma.user.findUnique({
    where: { email },
    include: { regions: true },
  });
}

export function findUserById(id: number): Promise<UserWithRegions | null> {
  return prisma.user.findUnique({
    where: { id },
    include: { regions: true },
  });
}

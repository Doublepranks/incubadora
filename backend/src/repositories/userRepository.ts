import { prisma } from "../config/prisma";
import { User } from "@prisma/client";

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

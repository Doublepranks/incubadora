import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { hashPassword } from "../services/authService";

const ROLES = ["admin_global", "system_admin", "admin_regional", "admin_estadual"];

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    include: { regions: true },
    orderBy: { id: "asc" },
  });
  return res.json({
    error: false,
    data: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      regions: u.regions.map((r) => r.uf),
      createdAt: u.createdAt,
    })),
  });
}

export async function createUser(req: Request, res: Response) {
  const { name, email, password, role, regions } = req.body ?? {};
  if (!name || !email || !password || !role || !ROLES.includes(role)) {
    return res.status(400).json({ error: true, message: "Invalid payload" });
  }

  const passwordHash = await hashPassword(password);
  const ufs = Array.isArray(regions)
    ? regions.map((r: string) => r.trim().toUpperCase()).filter(Boolean)
    : [];

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      regions: {
        create: ufs.map((uf) => ({ uf })),
      },
    },
    include: { regions: true },
  });

  return res.status(201).json({
    error: false,
    data: { id: user.id, role: user.role, regions: user.regions.map((r) => r.uf) },
  });
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { name, email, password, role, regions } = req.body ?? {};
  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ error: true, message: "Invalid role" });
  }

  const data: any = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (role) data.role = role;
  if (password) data.passwordHash = await hashPassword(password);

  const ufs = Array.isArray(regions)
    ? regions.map((r: string) => r.trim().toUpperCase()).filter(Boolean)
    : null;

  const updated = await prisma.user.update({
    where: { id: Number(id) },
    data,
    include: { regions: true },
  });

  if (ufs) {
    await prisma.userRegion.deleteMany({ where: { userId: updated.id } });
    if (ufs.length > 0) {
      await prisma.userRegion.createMany({
        data: ufs.map((uf) => ({ userId: updated.id, uf })),
        skipDuplicates: true,
      });
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: updated.id },
    include: { regions: true },
  });

  return res.json({
    error: false,
    data: { id: user?.id, role: user?.role, regions: user?.regions.map((r) => r.uf) ?? [] },
  });
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  const targetId = Number(id);

  // Prevent self-deletion
  if (req.user?.id === targetId) {
    return res.status(400).json({ error: true, message: "Você não pode excluir a própria conta." });
  }

  try {
    await prisma.user.delete({ where: { id: targetId } });
    return res.json({ error: false, message: "Deleted" });
  } catch (err: any) {
    // Foreign key constraint (e.g. user created goals that reference them)
    if (err?.code === "P2003" || err?.code === "P2014") {
      return res.status(409).json({
        error: true,
        message: "Este usuário possui registros associados (metas criadas, etc.) e não pode ser excluído. Considere desativar a conta.",
      });
    }
    console.error("Error deleting user:", err);
    return res.status(500).json({ error: true, message: "Erro ao excluir usuário." });
  }
}

import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";

type Role = "admin_global" | "admin_regional" | "admin_estadual";

type AuthorizeOptions = {
  roles?: Role[];
  scopeUF?: "byUser" | "all";
};

export function authorize(options: AuthorizeOptions = {}) {
  const { roles, scopeUF = "byUser" } = options;

  return async function (req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ error: true, message: "Unauthorized" });
    }

    const role = req.user.role as Role | undefined;

    if (roles && roles.length > 0 && (!role || !roles.includes(role))) {
      return res.status(403).json({ error: true, message: "Access denied" });
    }

    // admin_global bypass
    if (role === "admin_global" || scopeUF === "all") {
      return next();
    }

    // For regional/estadual, load regions
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { regions: true },
    });

    const regions = user?.regions?.map((r) => r.uf.toUpperCase()) ?? [];

    if (regions.length === 0) {
      return res.status(403).json({ error: true, message: "Acesso restrito às UF autorizadas" });
    }

    // attach to request for downstream use
    (req as any).userRegions = regions;

    next();
  };
}

export function applyRegionFilter<T extends { state?: string }>(query: T, regions?: string[]) {
  if (!regions || regions.length === 0) return query;
  return { ...query, state: { in: regions } } as any;
}

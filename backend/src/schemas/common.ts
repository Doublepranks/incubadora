import { z } from 'zod';

// ── Prisma Enum Mirrors ──────────────────────────────────────────
export const platformEnum = z.enum([
    'instagram', 'tiktok', 'youtube', 'x', 'kwai',
]);

export const seriesEnum = z.enum([
    'Elite', 'A2', 'A3', 'Institucional', 'Cortes', 'Noticias',
]);

export const sexEnum = z.enum(['masculino', 'feminino']);

export const roleEnum = z.enum([
    'admin_global', 'system_admin', 'admin_regional', 'admin_estadual',
]);

export const goalTypeEnum = z.enum(['followers', 'posts']);

export const goalStatusEnum = z.enum([
    'active', 'achieved', 'failed', 'cancelled',
]);

// ── Reusable Primitives ──────────────────────────────────────────
export const idParam = z.object({
    id: z.coerce.number().int().positive(),
});

/** UF code, e.g. "CE", "SP" — exactly 2 uppercase letters */
export const ufString = z.string().length(2).toUpperCase();

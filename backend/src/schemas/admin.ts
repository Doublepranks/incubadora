import { z } from 'zod';

export const stateSyncSchema = z.object({
    state: z.string().min(1, 'State is required').max(5),
});

export const retrySchema = z.object({
    profileIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const clientErrorSchema = z.object({
    message: z.string().max(2000).default('Unknown error'),
    stack: z.string().max(2000).nullable().optional(),
    componentStack: z.string().max(2000).nullable().optional(),
    url: z.string().max(500).nullable().optional(),
    userAgent: z.string().max(500).nullable().optional(),
});

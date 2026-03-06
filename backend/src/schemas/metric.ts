import { z } from 'zod';
import { platformEnum } from './common';

export const addMetricSchema = z.object({
    socialProfileId: z.coerce.number().int().positive().optional(),
    influencerId: z.coerce.number().int().positive().optional(),
    platform: platformEnum,
    date: z.string().min(1, 'Data é obrigatória'),
    followersCount: z.coerce.number().int().min(0),
    postsCount: z.coerce.number().int().min(0),
});

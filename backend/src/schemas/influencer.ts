import { z } from 'zod';
import { platformEnum, seriesEnum, sexEnum } from './common';

const socialProfileSchema = z.object({
    platform: platformEnum,
    handle: z.string().max(200).default(''),
    url: z.string().max(500).nullable().optional(),
    externalId: z.string().max(200).nullable().optional(),
});

export const createInfluencerSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(200),
    state: z.string().min(1, 'Estado é obrigatório').max(5),
    city: z.string().max(200).default(''),
    avatarUrl: z.string().max(500).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    series: seriesEnum.nullable().optional(),
    sex: sexEnum.nullable().optional(),
    profiles: z.array(socialProfileSchema).default([]),
});

export const updateInfluencerSchema = createInfluencerSchema;

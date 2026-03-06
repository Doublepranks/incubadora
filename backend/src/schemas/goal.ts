import { z } from 'zod';
import { goalTypeEnum, goalStatusEnum, platformEnum, seriesEnum } from './common';

export const createGoalSchema = z.object({
    influencerId: z.coerce.number().int().positive(),
    type: goalTypeEnum,
    targetValue: z.coerce.number().positive('Valor alvo deve ser positivo'),
    platform: platformEnum.optional(),
    deadline: z.string().min(1, 'Deadline é obrigatória'),
    description: z.string().max(500).optional(),
}).refine(
    (data: { type: string; platform?: string }) => (data.type === 'followers' || data.type === 'posts') ? !!data.platform : true,
    { message: 'Platform é obrigatória para metas de followers/posts', path: ['platform'] },
);

export const createSeriesGoalSchema = z.object({
    series: seriesEnum,
    type: goalTypeEnum,
    targetValue: z.coerce.number().positive(),
    platform: platformEnum.optional(),
    deadline: z.string().min(1, 'Deadline é obrigatória'),
    description: z.string().max(500).optional(),
}).refine(
    (data: { type: string; platform?: string }) => (data.type === 'followers' || data.type === 'posts') ? !!data.platform : true,
    { message: 'Platform é obrigatória para metas de followers/posts', path: ['platform'] },
);

export const updateGoalSchema = z.object({
    targetValue: z.coerce.number().positive().optional(),
    deadline: z.string().optional(),
    description: z.string().max(500).optional(),
    status: goalStatusEnum.optional(),
});

export const batchIdsSchema = z.object({
    ids: z.array(z.coerce.number().int().positive()).min(1, 'ids deve ser um array não-vazio'),
});

export const batchUpdateSchema = z.object({
    ids: z.array(z.coerce.number().int().positive()).min(1, 'ids deve ser um array não-vazio'),
    changes: z.object({
        deadline: z.string().optional(),
        targetValue: z.coerce.number().positive().optional(),
    }).refine(
        (c: { deadline?: string; targetValue?: number }) => c.deadline !== undefined || c.targetValue !== undefined,
        { message: 'Deve informar ao menos deadline ou targetValue' },
    ),
});

import type { Request, Response } from 'express';
import * as goalsService from '../services/goalsService';
import { prisma } from '../config/prisma';
import type { GoalType, GoalStatus, Series } from '@prisma/client';

/**
 * Helper: Verify that a goal's influencer belongs to the user's region scope.
 * Returns the goal if authorized, or sends a 403/404 response and returns null.
 */
async function verifyGoalAccess(req: Request, res: Response, goalId: number) {
    const regions = (req as any).userRegions as string[] | undefined;

    const goal = await prisma.influencerGoal.findUnique({
        where: { id: goalId },
        include: {
            influencer: { select: { id: true, name: true, state: true } },
            creator: { select: { id: true, name: true } },
        },
    });

    if (!goal) {
        res.status(404).json({ success: false, error: 'Goal not found' });
        return null;
    }

    // If user has regional restrictions, check the influencer's state
    if (regions && regions.length > 0 && !regions.includes(goal.influencer.state)) {
        res.status(403).json({ success: false, error: 'Meta fora do seu escopo de acesso' });
        return null;
    }

    return goal;
}

/**
 * GET /api/goals
 * Listar metas com filtros opcionais
 */
export async function listGoalsHandler(req: Request, res: Response) {
    try {
        const { influencerId, status, type, state } = req.query;
        const regions = (req as any).userRegions as string[] | undefined;

        const filters: any = {};
        if (influencerId) filters.influencerId = Number(influencerId);
        if (status) filters.status = status as GoalStatus;
        if (type) filters.type = type as GoalType;
        if (state) filters.state = state as string;

        const goals = await goalsService.listGoals(filters, regions);

        return res.json({ success: true, data: goals });
    } catch (error) {
        console.error('Error listing goals:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to list goals',
        });
    }
}

/**
 * POST /api/goals
 * Criar nova meta
 */
export async function createGoalHandler(req: Request, res: Response) {
    try {
        const { influencerId, type, targetValue, platform, deadline, description } = req.body;
        const userId = req.user?.id;
        const regions = (req as any).userRegions as string[] | undefined;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        if (!influencerId || !type || !targetValue || !deadline) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: influencerId, type, targetValue, deadline',
            });
        }

        // Validar que o influenciador pertence ao escopo do usuário
        if (regions && regions.length > 0) {
            const inf = await prisma.influencer.findFirst({
                where: { id: Number(influencerId), state: { in: regions } },
                select: { id: true },
            });
            if (!inf) {
                return res.status(403).json({
                    success: false,
                    error: 'Influenciador fora do seu escopo de acesso',
                });
            }
        }

        // Validar tipo
        if (!['followers', 'posts'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid goal type' });
        }

        // Platform é obrigatória para metas de followers/posts
        if ((type === 'followers' || type === 'posts') && !platform) {
            return res.status(400).json({
                success: false,
                error: 'Platform is required for followers and posts goals',
            });
        }

        const goal = await goalsService.createGoal({
            influencerId: Number(influencerId),
            type: type as GoalType,
            targetValue: Number(targetValue),
            platform,
            deadline: new Date(deadline + 'T12:00:00.000Z'),
            description,
            createdBy: userId,
        });

        return res.status(201).json({ success: true, data: goal });
    } catch (error: any) {
        // Check for business-rule errors from the service
        if (error?.message?.startsWith('METRICS_REQUIRED:')) {
            return res.status(400).json({
                success: false,
                error: error.message.replace('METRICS_REQUIRED:', ''),
            });
        }
        console.error('Error creating goal:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create goal',
        });
    }
}

/**
 * POST /api/goals/series
 * Criar metas para todos os influenciadores de uma série
 */
export async function createSeriesGoalHandler(req: Request, res: Response) {
    try {
        const { series, type, targetValue, platform, deadline, description } = req.body;
        const userId = req.user?.id;
        const regions = (req as any).userRegions as string[] | undefined;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        if (!series || !type || !targetValue || !deadline) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: series, type, targetValue, deadline',
            });
        }

        const validSeries: Series[] = ['Elite', 'A2', 'A3', 'Institucional', 'Cortes', 'Noticias'];
        if (!validSeries.includes(series as Series)) {
            return res.status(400).json({ success: false, error: 'Invalid series' });
        }

        if (!['followers', 'posts'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid goal type' });
        }

        if ((type === 'followers' || type === 'posts') && !platform) {
            return res.status(400).json({
                success: false,
                error: 'Platform is required for followers and posts goals',
            });
        }

        const result = await goalsService.createGoalsForSeries({
            series: series as Series,
            type: type as GoalType,
            targetValue: Number(targetValue),
            platform,
            deadline: new Date(deadline + 'T12:00:00.000Z'),
            description,
            createdBy: userId,
            regions,
        });

        const skippedCount = result.skipped ?? 0;
        const skippedMsg = skippedCount > 0
            ? ` (${skippedCount} ignorado(s) por falta de métricas)`
            : '';

        return res.status(201).json({
            success: true,
            message: `${result.created} metas criadas para a série ${series}${skippedMsg}`,
            data: result,
        });
    } catch (error) {
        console.error('Error creating series goals:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create series goals',
        });
    }
}

/**
 * GET /api/goals/:id
 * Buscar meta por ID
 */
export async function getGoalHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const goal = await verifyGoalAccess(req, res, Number(id));
        if (!goal) return; // response already sent

        return res.json({ success: true, data: goal });
    } catch (error) {
        console.error('Error fetching goal:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch goal',
        });
    }
}

/**
 * PUT /api/goals/:id
 * Atualizar meta existente
 */
export async function updateGoalHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { targetValue, deadline, description, status } = req.body;

        const goal = await verifyGoalAccess(req, res, Number(id));
        if (!goal) return; // response already sent

        const updateData: any = {};
        if (targetValue !== undefined) updateData.targetValue = Number(targetValue);
        if (deadline !== undefined) updateData.deadline = new Date(deadline);
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status as GoalStatus;

        const updated = await goalsService.updateGoal(Number(id), updateData);

        return res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error updating goal:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update goal',
        });
    }
}

/**
 * DELETE /api/goals/:id
 * Cancelar meta
 */
export async function cancelGoalHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const goal = await verifyGoalAccess(req, res, Number(id));
        if (!goal) return; // response already sent

        const cancelled = await goalsService.cancelGoal(Number(id));

        return res.json({ success: true, data: cancelled });
    } catch (error) {
        console.error('Error cancelling goal:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to cancel goal',
        });
    }
}

/**
 * DELETE /api/goals/:id/permanent
 * Excluir permanentemente uma meta cancelada
 */
export async function deleteGoalHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const goal = await verifyGoalAccess(req, res, Number(id));
        if (!goal) return; // response already sent

        const result = await goalsService.deleteGoal(Number(id));

        return res.json({ success: true, data: result });
    } catch (error: any) {
        const message = error?.message || 'Failed to delete goal';
        const status = message.includes('não encontrada') ? 404 : 400;
        console.error('Error deleting goal:', error);
        return res.status(status).json({
            success: false,
            error: message,
        });
    }
}

/**
 * POST /api/goals/batch/cancel
 * Cancelar múltiplas metas em lote
 */
export async function batchCancelHandler(req: Request, res: Response) {
    try {
        const { ids } = req.body;
        const userId = req.user?.id;
        const regions = (req as any).userRegions as string[] | undefined;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'ids must be a non-empty array' });
        }

        const result = await goalsService.batchCancelGoals(ids.map(Number), regions);

        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error batch cancelling goals:', error);
        return res.status(500).json({ success: false, error: 'Failed to batch cancel goals' });
    }
}

/**
 * POST /api/goals/batch/delete
 * Excluir permanentemente múltiplas metas canceladas em lote
 */
export async function batchDeleteHandler(req: Request, res: Response) {
    try {
        const { ids } = req.body;
        const userId = req.user?.id;
        const regions = (req as any).userRegions as string[] | undefined;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'ids must be a non-empty array' });
        }

        const result = await goalsService.batchDeleteGoals(ids.map(Number), regions);

        return res.json({ success: true, data: result });
    } catch (error: any) {
        const message = error?.message || 'Failed to batch delete goals';
        console.error('Error batch deleting goals:', error);
        return res.status(400).json({ success: false, error: message });
    }
}

/**
 * POST /api/goals/batch/update
 * Editar múltiplas metas em lote (deadline e/ou targetValue)
 */
export async function batchUpdateHandler(req: Request, res: Response) {
    try {
        const { ids, changes } = req.body;
        const userId = req.user?.id;
        const regions = (req as any).userRegions as string[] | undefined;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'ids must be a non-empty array' });
        }

        if (!changes || typeof changes !== 'object') {
            return res.status(400).json({ success: false, error: 'changes must be an object' });
        }

        const parsedChanges: { deadline?: Date; targetValue?: number } = {};
        if (changes.deadline) parsedChanges.deadline = new Date(changes.deadline + 'T12:00:00.000Z');
        if (changes.targetValue) parsedChanges.targetValue = Number(changes.targetValue);

        const result = await goalsService.batchUpdateGoals(ids.map(Number), parsedChanges, regions);

        return res.json({ success: true, data: result });
    } catch (error: any) {
        const message = error?.message || 'Failed to batch update goals';
        console.error('Error batch updating goals:', error);
        return res.status(400).json({ success: false, error: message });
    }
}

/**
 * GET /api/influencers/:id/goals
 * Buscar metas de um influenciador específico
 */
export async function getInfluencerGoalsHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { status } = req.query;
        const regions = (req as any).userRegions as string[] | undefined;

        const filters: any = { influencerId: Number(id) };
        if (status) filters.status = status as GoalStatus;

        const goals = await goalsService.listGoals(filters, regions);

        return res.json({ success: true, data: goals });
    } catch (error) {
        console.error('Error fetching influencer goals:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch influencer goals',
        });
    }
}

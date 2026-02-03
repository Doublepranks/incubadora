import type { Request, Response } from 'express';
import * as goalsService from '../services/goalsService';
import type { GoalType, GoalStatus } from '@prisma/client';

/**
 * GET /api/goals
 * Listar metas com filtros opcionais
 */
export async function listGoalsHandler(req: Request, res: Response) {
    try {
        const { influencerId, status, type } = req.query;

        const filters: any = {};
        if (influencerId) filters.influencerId = Number(influencerId);
        if (status) filters.status = status as GoalStatus;
        if (type) filters.type = type as GoalType;

        const goals = await goalsService.listGoals(filters);

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

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        if (!influencerId || !type || !targetValue || !deadline) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: influencerId, type, targetValue, deadline',
            });
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
            deadline: new Date(deadline),
            description,
            createdBy: userId,
        });

        return res.status(201).json({ success: true, data: goal });
    } catch (error) {
        console.error('Error creating goal:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create goal',
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

        const goal = await goalsService.getGoalById(Number(id));

        if (!goal) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
        }

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

        const updateData: any = {};
        if (targetValue !== undefined) updateData.targetValue = Number(targetValue);
        if (deadline !== undefined) updateData.deadline = new Date(deadline);
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status as GoalStatus;

        const goal = await goalsService.updateGoal(Number(id), updateData);

        return res.json({ success: true, data: goal });
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

        const goal = await goalsService.cancelGoal(Number(id));

        return res.json({ success: true, data: goal });
    } catch (error) {
        console.error('Error cancelling goal:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to cancel goal',
        });
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

        const filters: any = { influencerId: Number(id) };
        if (status) filters.status = status as GoalStatus;

        const goals = await goalsService.listGoals(filters);

        return res.json({ success: true, data: goals });
    } catch (error) {
        console.error('Error fetching influencer goals:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch influencer goals',
        });
    }
}

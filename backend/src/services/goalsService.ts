import { prisma } from '../config/prisma';
import type { GoalType, GoalStatus, Platform } from '@prisma/client';

interface CreateGoalInput {
    influencerId: number;
    type: GoalType;
    targetValue: number;
    platform?: Platform;
    deadline: Date;
    description?: string;
    createdBy: number;
}

interface UpdateGoalInput {
    targetValue?: number;
    deadline?: Date;
    description?: string;
    status?: GoalStatus;
}

interface GoalFilters {
    influencerId?: number;
    status?: GoalStatus;
    type?: GoalType;
}

/**
 * Buscar valor inicial (última métrica disponível) para uma meta
 */
async function getInitialValue(influencerId: number, type: GoalType, platform?: Platform): Promise<number | null> {
    if (type === 'followers') {
        if (!platform) return null;

        const profile = await prisma.socialProfile.findFirst({
            where: { influencerId, platform },
            include: {
                metrics: {
                    orderBy: { date: 'desc' },
                    take: 1,
                },
            },
        });

        return profile?.metrics[0]?.followersCount ?? null;
    }

    if (type === 'posts') {
        if (!platform) return null;

        const profile = await prisma.socialProfile.findFirst({
            where: { influencerId, platform },
            include: {
                metrics: {
                    orderBy: { date: 'desc' },
                    take: 1,
                },
            },
        });

        return profile?.metrics[0]?.postsCount ?? null;
    }

    return null;
}

/**
 * Criar uma nova meta
 */
export async function createGoal(input: CreateGoalInput) {
    const initialValue = await getInitialValue(input.influencerId, input.type, input.platform);

    const goal = await prisma.influencerGoal.create({
        data: {
            influencerId: input.influencerId,
            type: input.type,
            targetValue: input.targetValue,
            platform: input.platform,
            deadline: input.deadline,
            description: input.description,
            createdBy: input.createdBy,
            initialValue,
            currentValue: initialValue,
        },
        include: {
            influencer: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
        },
    });

    return goal;
}

/**
 * Listar metas com filtros
 */
export async function listGoals(filters: GoalFilters = {}) {
    const where: any = {};

    if (filters.influencerId) where.influencerId = filters.influencerId;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    const goals = await prisma.influencerGoal.findMany({
        where,
        include: {
            influencer: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return goals;
}

/**
 * Buscar meta por ID
 */
export async function getGoalById(id: number) {
    const goal = await prisma.influencerGoal.findUnique({
        where: { id },
        include: {
            influencer: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
        },
    });

    return goal;
}

/**
 * Atualizar uma meta
 */
export async function updateGoal(id: number, input: UpdateGoalInput) {
    const data: any = {};

    if (input.targetValue !== undefined) data.targetValue = input.targetValue;
    if (input.deadline !== undefined) data.deadline = input.deadline;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;

    const goal = await prisma.influencerGoal.update({
        where: { id },
        data,
        include: {
            influencer: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
        },
    });

    return goal;
}

/**
 * Cancelar uma meta
 */
export async function cancelGoal(id: number) {
    const goal = await prisma.influencerGoal.update({
        where: { id },
        data: { status: 'cancelled' },
        include: {
            influencer: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
        },
    });

    return goal;
}

/**
 * Atualizar metas ativas após sync bem-sucedido
 */
export async function updateGoalsAfterSync(influencerId: number) {
    // Buscar metas ativas do influenciador
    const activeGoals = await prisma.influencerGoal.findMany({
        where: {
            influencerId,
            status: 'active',
        },
    });

    for (const goal of activeGoals) {
        const currentValue = await getInitialValue(influencerId, goal.type, goal.platform ?? undefined);

        if (currentValue !== null) {
            const updateData: any = { currentValue };

            // Verificar se a meta foi alcançada
            if (currentValue >= goal.targetValue) {
                updateData.status = 'achieved';
                updateData.achievedAt = new Date();
            }

            await prisma.influencerGoal.update({
                where: { id: goal.id },
                data: updateData,
            });
        }
    }
}

/**
 * Marcar metas expiradas como failed (para cron job)
 */
export async function checkExpiredGoals() {
    const now = new Date();

    const result = await prisma.influencerGoal.updateMany({
        where: {
            status: 'active',
            deadline: { lt: now },
        },
        data: {
            status: 'failed',
        },
    });

    return result.count;
}

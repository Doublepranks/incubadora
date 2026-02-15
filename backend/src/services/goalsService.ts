import { prisma } from '../config/prisma';
import type { GoalType, GoalStatus, Platform, Series } from '@prisma/client';

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
 * targetValue do input é tratado como INCREMENTO (quanto crescer)
 * O valor salvo no banco é absoluto: initialValue + incremento
 */
export async function createGoal(input: CreateGoalInput) {
    const initialValue = await getInitialValue(input.influencerId, input.type, input.platform);

    // targetValue no banco = valor absoluto a atingir (initial + incremento desejado)
    const absoluteTarget = (initialValue ?? 0) + input.targetValue;

    const goal = await prisma.influencerGoal.create({
        data: {
            influencerId: input.influencerId,
            type: input.type,
            targetValue: absoluteTarget,
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

interface CreateSeriesGoalInput {
    series: Series;
    type: GoalType;
    targetValue: number;
    platform?: Platform;
    deadline: Date;
    description?: string;
    createdBy: number;
    regions?: string[];
}

/**
 * Criar metas para todos os influenciadores de uma Série (fan-out)
 * Quando regions é fornecido, cria apenas para influenciadores das UFs autorizadas.
 */
export async function createGoalsForSeries(input: CreateSeriesGoalInput) {
    const where: any = { series: input.series };
    if (input.regions && input.regions.length > 0) {
        where.state = { in: input.regions };
    }

    const influencers = await prisma.influencer.findMany({
        where,
        select: { id: true, name: true },
    });

    if (influencers.length === 0) {
        return { created: 0, goals: [] };
    }

    const goals = [];
    for (const inf of influencers) {
        const goal = await createGoal({
            influencerId: inf.id,
            type: input.type,
            targetValue: input.targetValue,
            platform: input.platform,
            deadline: input.deadline,
            description: input.description ?? `Meta por série (${input.series})`,
            createdBy: input.createdBy,
        });
        goals.push(goal);
    }

    return { created: goals.length, goals };
}

/**
 * Listar metas com filtros
 * Quando regions é fornecido, retorna apenas metas de influenciadores das UFs autorizadas.
 */
export async function listGoals(filters: GoalFilters = {}, regions?: string[]) {
    const where: any = {};

    if (filters.influencerId) where.influencerId = filters.influencerId;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (regions && regions.length > 0) {
        where.influencer = { state: { in: regions } };
    }

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
 * Excluir permanentemente uma meta cancelada
 */
export async function deleteGoal(id: number) {
    const goal = await prisma.influencerGoal.findUnique({ where: { id } });

    if (!goal) {
        throw new Error('Meta não encontrada');
    }

    if (goal.status !== 'cancelled') {
        throw new Error('Apenas metas canceladas podem ser excluídas');
    }

    await prisma.influencerGoal.delete({ where: { id } });

    return { deleted: true };
}

/**
 * Cancelar múltiplas metas ativas em lote
 */
export async function batchCancelGoals(ids: number[], regions?: string[]) {
    const where: any = {
        id: { in: ids },
        status: 'active',
    };
    if (regions && regions.length > 0) {
        where.influencer = { state: { in: regions } };
    }

    const result = await prisma.influencerGoal.updateMany({
        where,
        data: { status: 'cancelled' },
    });

    return { cancelled: result.count };
}

/**
 * Excluir permanentemente múltiplas metas canceladas em lote
 */
export async function batchDeleteGoals(ids: number[], regions?: string[]) {
    const scopeFilter: any = {
        id: { in: ids },
    };
    if (regions && regions.length > 0) {
        scopeFilter.influencer = { state: { in: regions } };
    }

    // Validar que todas as metas são canceladas
    const nonCancelled = await prisma.influencerGoal.findMany({
        where: {
            ...scopeFilter,
            status: { not: 'cancelled' },
        },
        select: { id: true, status: true },
    });

    if (nonCancelled.length > 0) {
        throw new Error(`${nonCancelled.length} meta(s) não estão canceladas e não podem ser excluídas`);
    }

    const result = await prisma.influencerGoal.deleteMany({
        where: {
            ...scopeFilter,
            status: 'cancelled',
        },
    });

    return { deleted: result.count };
}

/**
 * Editar múltiplas metas em lote (deadline e/ou targetValue)
 */
export async function batchUpdateGoals(ids: number[], changes: { deadline?: Date; targetValue?: number }, regions?: string[]) {
    const data: any = {};
    if (changes.deadline !== undefined) data.deadline = changes.deadline;
    if (changes.targetValue !== undefined) data.targetValue = changes.targetValue;

    if (Object.keys(data).length === 0) {
        throw new Error('Nenhum campo para atualizar');
    }

    const where: any = { id: { in: ids } };
    if (regions && regions.length > 0) {
        where.influencer = { state: { in: regions } };
    }

    const result = await prisma.influencerGoal.updateMany({
        where,
        data,
    });

    return { updated: result.count };
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

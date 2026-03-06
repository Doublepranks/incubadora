import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { createGoalSchema, createSeriesGoalSchema, updateGoalSchema, batchIdsSchema, batchUpdateSchema } from '../schemas/goal';
import {
    listGoalsHandler,
    createGoalHandler,
    createSeriesGoalHandler,
    getGoalHandler,
    updateGoalHandler,
    cancelGoalHandler,
    deleteGoalHandler,
    batchCancelHandler,
    batchDeleteHandler,
    batchUpdateHandler,
} from '../controllers/goalsController';

const goalsRouter = Router();

// Todas as rotas requerem autenticação e permissão (todas as roles)
const allAdmins = authorize({
    roles: ['admin_global', 'system_admin', 'admin_regional', 'admin_estadual'],
});

goalsRouter.get('/', requireAuth, allAdmins, listGoalsHandler);
goalsRouter.post('/', requireAuth, allAdmins, validate(createGoalSchema), createGoalHandler);
goalsRouter.post('/series', requireAuth, allAdmins, validate(createSeriesGoalSchema), createSeriesGoalHandler);
goalsRouter.post('/batch/cancel', requireAuth, allAdmins, validate(batchIdsSchema), batchCancelHandler);
goalsRouter.post('/batch/delete', requireAuth, allAdmins, validate(batchIdsSchema), batchDeleteHandler);
goalsRouter.post('/batch/update', requireAuth, allAdmins, validate(batchUpdateSchema), batchUpdateHandler);
goalsRouter.get('/:id', requireAuth, allAdmins, getGoalHandler);
goalsRouter.put('/:id', requireAuth, allAdmins, validate(updateGoalSchema), updateGoalHandler);
goalsRouter.delete('/:id', requireAuth, allAdmins, cancelGoalHandler);
goalsRouter.delete('/:id/permanent', requireAuth, allAdmins, deleteGoalHandler);

export { goalsRouter };


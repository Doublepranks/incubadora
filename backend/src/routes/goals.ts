import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth';
import { authorize } from '../middlewares/authorize';
import {
    listGoalsHandler,
    createGoalHandler,
    getGoalHandler,
    updateGoalHandler,
    cancelGoalHandler,
} from '../controllers/goalsController';

const goalsRouter = Router();

// Todas as rotas requerem autenticação e permissão (todas as roles)
const allAdmins = authorize({
    roles: ['admin_global', 'system_admin', 'admin_regional', 'admin_estadual'],
});

goalsRouter.get('/', requireAuth, allAdmins, listGoalsHandler);
goalsRouter.post('/', requireAuth, allAdmins, createGoalHandler);
goalsRouter.get('/:id', requireAuth, allAdmins, getGoalHandler);
goalsRouter.put('/:id', requireAuth, allAdmins, updateGoalHandler);
goalsRouter.delete('/:id', requireAuth, allAdmins, cancelGoalHandler);

export { goalsRouter };

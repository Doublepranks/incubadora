import { Router } from "express";
import { authorize } from "../middlewares/authorize";
import { listUsers, createUser, updateUser, deleteUser } from "../controllers/userController";
import { requireAuth } from "../middlewares/requireAuth";
import { validate } from "../middlewares/validate";
import { createUserSchema, updateUserSchema } from "../schemas/user";

export const usersRouter = Router();

// Admin global ou system_admin
usersRouter.use(requireAuth, authorize({ roles: ["admin_global", "system_admin"], scopeUF: "all" }));

usersRouter.get("/", listUsers);
usersRouter.post("/", validate(createUserSchema), createUser);
usersRouter.put("/:id", validate(updateUserSchema), updateUser);
usersRouter.delete("/:id", deleteUser);


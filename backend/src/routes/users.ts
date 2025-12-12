import { Router } from "express";
import { authorize } from "../middlewares/authorize";
import { listUsers, createUser, updateUser, deleteUser } from "../controllers/userController";
import { requireAuth } from "../middlewares/requireAuth";

export const usersRouter = Router();

// Admin global ou system_admin
usersRouter.use(requireAuth, authorize({ roles: ["admin_global", "system_admin"], scopeUF: "all" }));

usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
usersRouter.put("/:id", updateUser);
usersRouter.delete("/:id", deleteUser);

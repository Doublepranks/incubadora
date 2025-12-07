import { Router } from "express";
import { authorize } from "../middlewares/authorize";
import { listUsers, createUser, updateUser, deleteUser } from "../controllers/userController";
import { requireAuth } from "../middlewares/requireAuth";

export const usersRouter = Router();

// Admin global only
usersRouter.use(requireAuth, authorize({ roles: ["admin_global"], scopeUF: "all" }));

usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
usersRouter.put("/:id", updateUser);
usersRouter.delete("/:id", deleteUser);

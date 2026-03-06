import { Router } from "express";
import { login, logout, me, refresh } from "../controllers/authController";
import { optionalAuth } from "../middlewares/requireAuth";
import { validate } from "../middlewares/validate";
import { loginSchema } from "../schemas/auth";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), login);
authRouter.get("/me", optionalAuth, me);
authRouter.post("/logout", logout);
authRouter.post("/refresh", refresh);

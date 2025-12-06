import { Router } from "express";
import { login, logout, me } from "../controllers/authController";
import { requireAuth } from "../middlewares/requireAuth";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/me", requireAuth, me);
authRouter.post("/logout", logout);

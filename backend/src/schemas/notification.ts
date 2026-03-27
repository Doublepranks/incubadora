import { z } from "zod";

export const createNotificationBodySchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(120, "Título deve ter no máximo 120 caracteres"),
  body: z.string().min(1, "Conteúdo é obrigatório"),
});

export const updateNotificationBodySchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(120, "Título deve ter no máximo 120 caracteres"),
  body: z.string().min(1, "Conteúdo é obrigatório"),
});

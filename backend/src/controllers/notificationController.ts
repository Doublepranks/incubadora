import { Request, Response } from "express";
import {
  listNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  deleteNotification,
  getUnreadCount,
  markAllRead,
} from "../services/notificationService";

export async function listNotificationsHandler(_req: Request, res: Response) {
  try {
    const data = await listNotifications();
    return res.json({ error: false, data });
  } catch (err) {
    console.error("Error in listNotificationsHandler:", err);
    return res.status(500).json({ error: true, message: "Falha ao listar notificações" });
  }
}

export async function createNotificationHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: true, message: "Não autenticado" });

    const { title, body } = req.body;
    const data = await createNotification({ title, body, createdBy: userId });
    return res.status(201).json({ error: false, data });
  } catch (err: any) {
    const message = err?.message || "Falha ao criar notificação";
    const status = message.includes("Limite") ? 409 : 500;
    return res.status(status).json({ error: true, message });
  }
}

export async function updateNotificationHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: true, message: "ID inválido" });

    const existing = await getNotificationById(id);
    if (!existing) return res.status(404).json({ error: true, message: "Notificação não encontrada" });

    const { title, body } = req.body;
    const data = await updateNotification(id, { title, body });
    return res.json({ error: false, data });
  } catch (err) {
    console.error("Error in updateNotificationHandler:", err);
    return res.status(500).json({ error: true, message: "Falha ao atualizar notificação" });
  }
}

export async function deleteNotificationHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: true, message: "ID inválido" });

    const existing = await getNotificationById(id);
    if (!existing) return res.status(404).json({ error: true, message: "Notificação não encontrada" });

    await deleteNotification(id);
    return res.json({ error: false, message: "Notificação removida" });
  } catch (err) {
    console.error("Error in deleteNotificationHandler:", err);
    return res.status(500).json({ error: true, message: "Falha ao remover notificação" });
  }
}

export async function getUnreadCountHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: true, message: "Não autenticado" });

    const count = await getUnreadCount(userId);
    return res.json({ error: false, data: { count } });
  } catch (err) {
    console.error("Error in getUnreadCountHandler:", err);
    return res.status(500).json({ error: true, message: "Falha ao obter contagem" });
  }
}

export async function markAllReadHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: true, message: "Não autenticado" });

    const result = await markAllRead(userId);
    return res.json({ error: false, data: result });
  } catch (err) {
    console.error("Error in markAllReadHandler:", err);
    return res.status(500).json({ error: true, message: "Falha ao marcar como lidas" });
  }
}

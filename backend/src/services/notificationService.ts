import { prisma } from "../config/prisma";

const MAX_NOTIFICATIONS = 5;

export async function listNotifications() {
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_NOTIFICATIONS,
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { reads: true } },
    },
  });
}

export async function getNotificationById(id: number) {
  return prisma.notification.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function createNotification(data: { title: string; body: string; createdBy: number }) {
  const count = await prisma.notification.count();
  if (count >= MAX_NOTIFICATIONS) {
    throw new Error(`Limite de ${MAX_NOTIFICATIONS} notificações atingido. Remova uma antes de criar outra.`);
  }

  return prisma.notification.create({
    data: {
      title: data.title,
      body: data.body,
      createdBy: data.createdBy,
    },
    include: {
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function updateNotification(id: number, data: { title: string; body: string }) {
  // When a notification is updated, clear all reads so users see it as "new" again
  await prisma.notificationRead.deleteMany({ where: { notificationId: id } });

  return prisma.notification.update({
    where: { id },
    data: {
      title: data.title,
      body: data.body,
    },
    include: {
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function deleteNotification(id: number) {
  return prisma.notification.delete({ where: { id } });
}

export async function getUnreadCount(userId: number) {
  const total = await prisma.notification.count();
  const read = await prisma.notificationRead.count({
    where: { userId },
  });
  return Math.max(total - read, 0);
}

export async function markAllRead(userId: number) {
  const notifications = await prisma.notification.findMany({
    select: { id: true },
  });

  const existing = await prisma.notificationRead.findMany({
    where: { userId },
    select: { notificationId: true },
  });

  const readIds = new Set(existing.map((r) => r.notificationId));
  const toCreate = notifications
    .filter((n) => !readIds.has(n.id))
    .map((n) => ({
      notificationId: n.id,
      userId,
    }));

  if (toCreate.length > 0) {
    await prisma.notificationRead.createMany({ data: toCreate });
  }

  return { marked: toCreate.length };
}

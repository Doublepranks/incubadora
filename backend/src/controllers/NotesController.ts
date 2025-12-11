import { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function getNotesHandler(req: Request, res: Response) {
    const { id } = req.params;
    const { cursor } = req.query;
    const limit = 10;

    try {
        const influencerId = Number(id);
        if (isNaN(influencerId)) {
            return res.status(400).json({ error: true, message: "Invalid influencer ID" });
        }

        const notes = await prisma.influencerNote.findMany({
            where: { influencerId },
            orderBy: { createdAt: "desc" },
            take: limit + 1, // Fetch one extra to determine if there are more
            cursor: cursor ? { id: Number(cursor) } : undefined,
            skip: cursor ? 1 : 0,
            include: {
                user: {
                    select: { name: true, email: true, role: true },
                },
            },
        });

        let nextCursor: number | undefined = undefined;
        if (notes.length > limit) {
            const nextItem = notes.pop();
            nextCursor = nextItem?.id;
        }

        return res.json({
            error: false,
            data: notes,
            nextCursor,
        });
    } catch (err: any) {
        console.error("Error fetching notes:", err);
        return res.status(500).json({ error: true, message: "Failed to fetch notes" });
    }
}

export async function addNoteHandler(req: Request, res: Response) {
    const { id } = req.params;
    const { content } = req.body;
    const userId = (req as any).user?.id; // Assuming auth middleware populates user

    try {
        const influencerId = Number(id);
        if (isNaN(influencerId)) {
            return res.status(400).json({ error: true, message: "Invalid influencer ID" });
        }

        if (!content || typeof content !== "string" || !content.trim()) {
            return res.status(400).json({ error: true, message: "Content is required" });
        }

        const note = await prisma.influencerNote.create({
            data: {
                content: content.trim(),
                influencerId,
                userId: userId || null,
            },
            include: {
                user: { select: { name: true } },
            },
        });

        return res.status(201).json({ error: false, data: note });
    } catch (err: any) {
        console.error("Error adding note:", err);
        return res.status(500).json({ error: true, message: "Failed to add note" });
    }
}

import { z } from 'zod';

export const addNoteSchema = z.object({
    content: z.string().min(1, 'Conteúdo é obrigatório').max(5000).trim(),
});

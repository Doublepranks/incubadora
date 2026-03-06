import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

type Target = 'body' | 'query' | 'params';

/**
 * Express middleware that validates req[target] against a Zod schema.
 * On success, replaces req[target] with the parsed (typed + coerced) data.
 * On failure, responds 400 with structured error details.
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            return res.status(400).json({
                error: true,
                message: 'Dados inválidos',
                details: result.error.flatten().fieldErrors,
            });
        }
        // Replace with parsed data (typed, coerced, defaults applied)
        (req as any)[target] = result.data;
        next();
    };
}

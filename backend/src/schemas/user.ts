import { z } from 'zod';
import { roleEnum, ufString } from './common';

export const createUserSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(200),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(128),
    role: roleEnum,
    regions: z.array(ufString).default([]),
});

export const updateUserSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).max(128).optional(),
    role: roleEnum.optional(),
    regions: z.array(ufString).optional(),
});

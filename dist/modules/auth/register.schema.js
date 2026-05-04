"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPersonalSchema = exports.registerStudentSchema = void 0;
const zod_1 = require("zod");
// ─── Shared ──────────────────────────────────
const baseUserSchema = zod_1.z.object({
    name: zod_1.z.string({ message: 'Nome é obrigatório' }).min(3),
    cpf: zod_1.z.string({ message: 'CPF é obrigatório' }).min(11),
    email: zod_1.z.string({ message: 'E-mail é obrigatório' }).email(),
    phone: zod_1.z.string({ message: 'Telefone é obrigatório' }).min(10),
    password: zod_1.z.string({ message: 'Senha é obrigatória' }).min(6),
    // Endereço
    cep: zod_1.z.string().optional(),
    street: zod_1.z.string().optional(),
    number: zod_1.z.string().optional(),
    neighborhood: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
});
// ─── Student ─────────────────────────────────
exports.registerStudentSchema = baseUserSchema.extend({
    role: zod_1.z.literal('STUDENT'),
    sex: zod_1.z.string({ message: 'Sexo é obrigatório' }).min(1),
    birthDate: zod_1.z.string({ message: 'Data de nascimento é obrigatória' }).min(1),
    weight: zod_1.z.string({ message: 'Peso é obrigatório' }).min(1),
    height: zod_1.z.string({ message: 'Altura é obrigatória' }).min(1),
    goal: zod_1.z.string({ message: 'Objetivo é obrigatório' }).min(1),
    focusMuscle: zod_1.z.string({ message: 'Músculo foco é obrigatório' }).min(1),
    experience: zod_1.z.enum(['beginner', 'intermediate', 'advanced'], {
        message: 'Nível de experiência é obrigatório',
    }),
    gymType: zod_1.z.enum(['basic', 'advanced'], {
        message: 'Tipo de academia é obrigatório',
    }),
    cardio: zod_1.z.enum(['include', 'exclude'], {
        message: 'Preferência de cardio é obrigatória',
    }),
    trainingDays: zod_1.z.array(zod_1.z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).min(1, 'Selecione ao menos um dia'),
    personalId: zod_1.z.string().uuid('ID do personal inválido').optional(),
});
// ─── Personal ────────────────────────────────
exports.registerPersonalSchema = baseUserSchema.extend({
    role: zod_1.z.literal('PERSONAL'),
    sex: zod_1.z.string({ message: 'Sexo é obrigatório' }).min(1),
    birthDate: zod_1.z.string({ message: 'Data de nascimento é obrigatória' }).min(1),
    weight: zod_1.z.string({ message: 'Peso é obrigatório' }).min(1),
    height: zod_1.z.string({ message: 'Altura é obrigatória' }).min(1),
    course: zod_1.z.string({ message: 'Curso é obrigatório' }).min(3, 'Informe o curso'),
    university: zod_1.z.string({ message: 'Universidade é obrigatória' }).min(3, 'Informe a universidade'),
    educationLevel: zod_1.z.string({ message: 'Nível de formação é obrigatório' }).min(1),
    cref: zod_1.z.string({ message: 'CREF é obrigatório' }).min(3, 'CREF inválido'),
    classFormat: zod_1.z.enum(['presential', 'online', 'hybrid'], {
        message: 'Formato das aulas é obrigatório',
    }),
    availableDays: zod_1.z.array(zod_1.z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).min(1, 'Selecione ao menos um dia disponível'),
});
//# sourceMappingURL=register.schema.js.map
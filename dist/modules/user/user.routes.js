"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const zod_1 = require("zod");
const date_1 = require("../../utils/date");
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, 'Nome deve ter ao menos 3 caracteres').optional(),
    phone: zod_1.z.string().min(10, 'Telefone inválido').optional(),
    sex: zod_1.z.string().min(1).optional(),
    birthDate: zod_1.z.string()
        .refine(v => !v || (0, date_1.isValidDate)(v), { message: 'Data de nascimento inválida' })
        .optional(),
    cep: zod_1.z.string().optional(),
    street: zod_1.z.string().optional(),
    number: zod_1.z.string().optional(),
    neighborhood: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
});
const updateMetricsSchema = zod_1.z.object({
    weight: zod_1.z.string().min(1, 'Peso obrigatório'),
    height: zod_1.z.string().min(1, 'Altura obrigatória'),
});
async function updateProfileController(req, reply) {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({
            message: 'Dados inválidos.',
            errors: parsed.error.flatten().fieldErrors,
        });
    }
    const userId = req.user.sub;
    const role = req.user.role;
    const { sex, birthDate, ...userFields } = parsed.data;
    const user = await req.server.prisma.user.update({
        where: { id: userId },
        data: userFields,
        select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            phone: true,
            role: true,
            avatar: true,
            userCode: true,
            cep: true,
            street: true,
            number: true,
            neighborhood: true,
            city: true,
            state: true,
        },
    });
    if (sex !== undefined || birthDate !== undefined) {
        const profileData = {
            ...(sex !== undefined && { sex }),
            ...(birthDate !== undefined && { birthDate }),
        };
        if (role === 'STUDENT') {
            await req.server.prisma.studentProfile.update({ where: { userId }, data: profileData });
        }
        else if (role === 'PERSONAL') {
            await req.server.prisma.personalProfile.update({ where: { userId }, data: profileData });
        }
    }
    const profile = role === 'STUDENT'
        ? await req.server.prisma.studentProfile.findUnique({
            where: { userId }, select: { sex: true, birthDate: true },
        })
        : await req.server.prisma.personalProfile.findUnique({
            where: { userId }, select: { sex: true, birthDate: true },
        });
    return reply.status(200).send({ ...user, ...profile });
}
async function updateMetricsController(req, reply) {
    const parsed = updateMetricsSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({
            message: 'Dados inválidos.',
            errors: parsed.error.flatten().fieldErrors,
        });
    }
    const userId = req.user.sub;
    const role = req.user.role;
    if (role === 'STUDENT') {
        const updated = await req.server.prisma.studentProfile.update({
            where: { userId },
            data: { weight: parsed.data.weight, height: parsed.data.height },
            select: {
                weight: true, height: true, goal: true,
                focusMuscle: true, experience: true,
                gymType: true, cardio: true, trainingDays: true,
                sex: true, birthDate: true,
            },
        });
        return reply.status(200).send({ studentProfile: updated });
    }
    if (role === 'PERSONAL') {
        const updated = await req.server.prisma.personalProfile.update({
            where: { userId },
            data: { weight: parsed.data.weight, height: parsed.data.height },
            select: {
                weight: true, height: true,
                sex: true, birthDate: true,
                cref: true, course: true,
                classFormat: true, availableDays: true,
            },
        });
        return reply.status(200).send({ personalProfile: updated });
    }
    return reply.status(403).send({ message: 'Acesso negado.' });
}
async function userRoutes(app) {
    app.put('/user/profile', { preHandler: [app.authenticate] }, updateProfileController);
    app.put('/user/metrics', { preHandler: [app.authenticate] }, updateMetricsController);
    // Busca usuário por código
    app.get('/user/search', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { code } = req.query;
        if (!code?.trim()) {
            return reply.status(400).send({ message: 'Informe o código de usuário.' });
        }
        const user = await req.server.prisma.user.findUnique({
            where: { userCode: code.trim().toUpperCase() },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                userCode: true,
                city: true,
                state: true,
                personalProfile: {
                    select: { cref: true, classFormat: true },
                },
                studentProfile: {
                    select: { goal: true, experience: true },
                },
            },
        });
        if (!user) {
            return reply.status(404).send({ message: 'Usuário não encontrado.' });
        }
        return reply.status(200).send(user);
    });
    // Retorna todos os alunos do personal
    app.get('/user/my-students', { preHandler: [app.authenticate] }, async (req, reply) => {
        if (req.user.role !== 'PERSONAL') {
            return reply.status(403).send({ message: 'Acesso negado.' });
        }
        const students = await req.server.prisma.user.findMany({
            where: { personalId: req.user.sub },
            select: {
                id: true,
                name: true,
                avatar: true,
                active: true,
                userCode: true,
                city: true,
                state: true,
                studentProfile: {
                    select: {
                        goal: true,
                        experience: true,
                        weight: true,
                        height: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        return reply.status(200).send(students);
    });
    // Inativar aluno
    app.put('/user/student/:studentId/deactivate', { preHandler: [app.authenticate] }, async (req, reply) => {
        if (req.user.role !== 'PERSONAL') {
            return reply.status(403).send({ message: 'Acesso negado.' });
        }
        const { studentId } = req.params;
        const personalId = req.user.sub;
        const student = await req.server.prisma.user.findUnique({ where: { id: studentId } });
        if (!student || student.personalId !== personalId) {
            return reply.status(404).send({ message: 'Aluno não encontrado ou não vinculado a você.' });
        }
        await req.server.prisma.user.update({ where: { id: studentId }, data: { active: false } });
        return reply.status(200).send({ message: 'Aluno inativado com sucesso.' });
    });
    // Reativar aluno
    app.put('/user/student/:studentId/activate', { preHandler: [app.authenticate] }, async (req, reply) => {
        if (req.user.role !== 'PERSONAL') {
            return reply.status(403).send({ message: 'Acesso negado.' });
        }
        const { studentId } = req.params;
        const personalId = req.user.sub;
        const student = await req.server.prisma.user.findUnique({ where: { id: studentId } });
        if (!student || student.personalId !== personalId) {
            return reply.status(404).send({ message: 'Aluno não encontrado ou não vinculado a você.' });
        }
        await req.server.prisma.user.update({ where: { id: studentId }, data: { active: true } });
        return reply.status(200).send({ message: 'Aluno reativado com sucesso.' });
    });
}
//# sourceMappingURL=user.routes.js.map
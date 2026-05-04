"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personalRequestRoutes = personalRequestRoutes;
const zod_1 = require("zod");
// ─── GET /personals ───────────────────────────────────
async function listPersonalsController(req, reply) {
    const personals = await req.server.prisma.user.findMany({
        where: { role: 'PERSONAL', active: true },
        select: {
            id: true,
            name: true,
            avatar: true,
            city: true,
            state: true,
            personalProfile: {
                select: { cref: true, classFormat: true, course: true },
            },
        },
        orderBy: { name: 'asc' },
    });
    const userId = req.user.sub;
    //Busca o personalId atual do aluno
    const student = await req.server.prisma.user.findUnique({
        where: { id: userId },
        select: { personalId: true },
    });
    // Busca todas as solicitações do aluno
    const requests = await req.server.prisma.personalRequest.findMany({
        where: { studentId: userId },
        select: { personalId: true, status: true },
    });
    const requestMap = new Map(requests.map(r => [r.personalId, r.status]));
    const result = personals.map(p => {
        //Se este personal é o vinculado atualmente, sempre mostra ACCEPTED
        if (student?.personalId === p.id) {
            return { ...p, requestStatus: 'ACCEPTED' };
        }
        return { ...p, requestStatus: requestMap.get(p.id) ?? null };
    });
    return reply.status(200).send(result);
}
// ─── POST /personal-request ───────────────────────────
const sendRequestSchema = zod_1.z.object({
    personalId: zod_1.z.string().uuid(),
    message: zod_1.z.string().max(300).optional(),
});
async function sendRequestController(req, reply) {
    const parsed = sendRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({
            message: 'Dados inválidos.',
            errors: parsed.error.flatten().fieldErrors,
        });
    }
    const studentId = req.user.sub;
    const { personalId, message } = parsed.data;
    if (req.user.role !== 'STUDENT') {
        return reply.status(403).send({ message: 'Apenas alunos podem enviar solicitações.' });
    }
    // Verifica se o aluno já tem um personal vinculado
    const student = await req.server.prisma.user.findUnique({
        where: { id: studentId },
        select: { personalId: true },
    });
    if (student?.personalId) {
        return reply.status(409).send({
            message: 'Você já possui um personal vinculado. Desvincule-se primeiro para solicitar outro.',
        });
    }
    // Verifica se já existe solicitação PENDING para qualquer personal
    const pendingRequest = await req.server.prisma.personalRequest.findFirst({
        where: { studentId, status: 'PENDING' },
    });
    if (pendingRequest) {
        return reply.status(409).send({
            message: 'Você já possui uma solicitação pendente. Aguarde a resposta antes de solicitar outro personal.',
        });
    }
    // Verifica se personal existe
    const personal = await req.server.prisma.user.findUnique({
        where: { id: personalId },
    });
    if (!personal || personal.role !== 'PERSONAL') {
        return reply.status(404).send({ message: 'Personal não encontrado.' });
    }
    // Verifica se já existe solicitação para este personal específico
    const existing = await req.server.prisma.personalRequest.findUnique({
        where: { studentId_personalId: { studentId, personalId } },
    });
    if (existing) {
        if (existing.status === 'ACCEPTED') {
            return reply.status(409).send({ message: 'Você já está vinculado a este personal.' });
        }
        // Se foi rejeitado, permite reenviar
        const updated = await req.server.prisma.personalRequest.update({
            where: { studentId_personalId: { studentId, personalId } },
            data: { status: 'PENDING', message: message ?? null },
        });
        return reply.status(200).send(updated);
    }
    const request = await req.server.prisma.personalRequest.create({
        data: { studentId, personalId, message: message ?? null },
    });
    return reply.status(201).send(request);
}
// ─── GET /personal-requests ───────────────────────────
async function listRequestsController(req, reply) {
    if (req.user.role !== 'PERSONAL') {
        return reply.status(403).send({ message: 'Acesso negado.' });
    }
    const personalId = req.user.sub;
    const requests = await req.server.prisma.personalRequest.findMany({
        where: { personalId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
            student: {
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                    city: true,
                    state: true,
                    studentProfile: {
                        select: { goal: true, experience: true },
                    },
                },
            },
        },
    });
    return reply.status(200).send(requests);
}
// ─── PUT /personal-request/:id/accept ────────────────
async function acceptRequestController(req, reply) {
    if (req.user.role !== 'PERSONAL') {
        return reply.status(403).send({ message: 'Acesso negado.' });
    }
    const { id } = req.params;
    const personalId = req.user.sub;
    const request = await req.server.prisma.personalRequest.findUnique({ where: { id } });
    if (!request || request.personalId !== personalId) {
        return reply.status(404).send({ message: 'Solicitação não encontrada.' });
    }
    if (request.status !== 'PENDING') {
        return reply.status(409).send({ message: 'Solicitação já foi processada.' });
    }
    await req.server.prisma.$transaction([
        req.server.prisma.personalRequest.update({
            where: { id },
            data: { status: 'ACCEPTED' },
        }),
        req.server.prisma.user.update({
            where: { id: request.studentId },
            data: { personalId },
        }),
    ]);
    return reply.status(200).send({ message: 'Solicitação aceita com sucesso.' });
}
// ─── PUT /personal-request/:id/reject ────────────────
async function rejectRequestController(req, reply) {
    if (req.user.role !== 'PERSONAL') {
        return reply.status(403).send({ message: 'Acesso negado.' });
    }
    const { id } = req.params;
    const personalId = req.user.sub;
    const request = await req.server.prisma.personalRequest.findUnique({ where: { id } });
    if (!request || request.personalId !== personalId) {
        return reply.status(404).send({ message: 'Solicitação não encontrada.' });
    }
    if (request.status !== 'PENDING') {
        return reply.status(409).send({ message: 'Solicitação já foi processada.' });
    }
    await req.server.prisma.personalRequest.update({
        where: { id },
        data: { status: 'REJECTED' },
    });
    return reply.status(200).send({ message: 'Solicitação recusada.' });
}
// ─── GET /personal-request/my-status ─────────────────
async function myRequestStatusController(req, reply) {
    const studentId = req.user.sub;
    const requests = await req.server.prisma.personalRequest.findMany({
        where: { studentId },
        orderBy: { updatedAt: 'desc' },
        include: {
            personal: {
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                    personalProfile: { select: { cref: true, classFormat: true } },
                },
            },
        },
    });
    return reply.status(200).send(requests);
}
// ─── POST /personal-request/unlink — aluno se desvincula ─
async function unlinkPersonalController(req, reply) {
    if (req.user.role !== 'STUDENT') {
        return reply.status(403).send({ message: 'Acesso negado.' });
    }
    const studentId = req.user.sub;
    const student = await req.server.prisma.user.findUnique({
        where: { id: studentId },
        select: { personalId: true },
    });
    if (!student?.personalId) {
        return reply.status(409).send({ message: 'Você não possui um personal vinculado.' });
    }
    // Remove vínculo e atualiza status da solicitação para REJECTED
    await req.server.prisma.$transaction([
        req.server.prisma.user.update({
            where: { id: studentId },
            data: { personalId: null },
        }),
        req.server.prisma.personalRequest.updateMany({
            where: { studentId, status: 'ACCEPTED' },
            data: { status: 'REJECTED' },
        }),
    ]);
    return reply.status(200).send({ message: 'Desvinculado com sucesso.' });
}
// ─── Register routes ──────────────────────────────────
async function personalRequestRoutes(app) {
    app.get('/personals', { preHandler: [app.authenticate] }, listPersonalsController);
    app.post('/personal-request', { preHandler: [app.authenticate] }, sendRequestController);
    app.post('/personal-request/unlink', { preHandler: [app.authenticate] }, unlinkPersonalController);
    app.get('/personal-requests', { preHandler: [app.authenticate] }, listRequestsController);
    app.get('/personal-request/my-status', { preHandler: [app.authenticate] }, myRequestStatusController);
    app.put('/personal-request/:id/accept', { preHandler: [app.authenticate] }, acceptRequestController);
    app.put('/personal-request/:id/reject', { preHandler: [app.authenticate] }, rejectRequestController);
}
//# sourceMappingURL=personal-request.routes.js.map
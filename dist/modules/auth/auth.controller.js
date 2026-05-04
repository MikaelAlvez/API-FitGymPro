"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginController = loginController;
exports.refreshController = refreshController;
exports.logoutController = logoutController;
exports.meController = meController;
exports.meProfileController = meProfileController;
exports.checkEmailController = checkEmailController;
exports.checkCpfController = checkCpfController;
const auth_schema_1 = require("./auth.schema");
const auth_service_1 = require("./auth.service");
async function loginController(req, reply) {
    const parsed = auth_schema_1.loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({
            message: 'Dados inválidos.',
            errors: parsed.error.flatten().fieldErrors,
        });
    }
    try {
        const result = await (0, auth_service_1.loginService)(req.server, parsed.data);
        return reply.status(200).send(result);
    }
    catch (err) {
        return reply.status(err.statusCode ?? 500).send({
            message: err.message ?? 'Erro interno.',
        });
    }
}
async function refreshController(req, reply) {
    const parsed = auth_schema_1.refreshSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({
            message: 'Refresh token ausente.',
            errors: parsed.error.flatten().fieldErrors,
        });
    }
    try {
        const result = await (0, auth_service_1.refreshTokenService)(req.server, parsed.data.refreshToken);
        return reply.status(200).send(result);
    }
    catch (err) {
        return reply.status(err.statusCode ?? 500).send({
            message: err.message ?? 'Erro interno.',
        });
    }
}
async function logoutController(req, reply) {
    const parsed = auth_schema_1.refreshSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ message: 'Refresh token ausente.' });
    }
    await (0, auth_service_1.logoutService)(req.server, parsed.data.refreshToken);
    return reply.status(204).send();
}
async function meController(req, reply) {
    const userId = req.user.sub;
    const role = req.user.role;
    const user = await req.server.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            role: true,
            avatar: true,
            phone: true,
            userCode: true,
            cep: true,
            street: true,
            number: true,
            neighborhood: true,
            city: true,
            state: true,
            studentProfile: role === 'STUDENT' ? {
                select: { sex: true, birthDate: true },
            } : false,
            personalProfile: role === 'PERSONAL' ? {
                select: { sex: true, birthDate: true },
            } : false,
        },
    });
    if (!user) {
        return reply.status(404).send({ message: 'Usuário não encontrado.' });
    }
    const { studentProfile, personalProfile, ...base } = user;
    const profile = studentProfile ?? personalProfile ?? {};
    return reply.status(200).send({ ...base, ...profile });
}
async function meProfileController(req, reply) {
    const userId = req.user.sub;
    const role = req.user.role;
    const user = await req.server.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            userCode: true,
            personalId: true,
            studentProfile: role === 'STUDENT' ? true : false,
            personalProfile: role === 'PERSONAL' ? true : false,
            personal: role === 'STUDENT' ? {
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                    userCode: true,
                    city: true,
                    state: true,
                    personalProfile: {
                        select: { cref: true, classFormat: true },
                    },
                },
            } : false,
        },
    });
    if (!user) {
        return reply.status(404).send({ message: 'Usuário não encontrado.' });
    }
    return reply.status(200).send(user);
}
async function checkEmailController(req, reply) {
    const { email } = req.body;
    if (!email) {
        return reply.status(400).send({ message: 'E-mail é obrigatório.' });
    }
    const existing = await req.server.prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });
    return reply.status(200).send({ available: !existing });
}
async function checkCpfController(req, reply) {
    const { cpf } = req.body;
    if (!cpf) {
        return reply.status(400).send({ message: 'CPF é obrigatório.' });
    }
    const digits = cpf.replace(/\D/g, '');
    const existing = await req.server.prisma.user.findFirst({
        where: { OR: [{ cpf }, { cpf: digits }] },
        select: { id: true },
    });
    return reply.status(200).send({ available: !existing });
}
//# sourceMappingURL=auth.controller.js.map
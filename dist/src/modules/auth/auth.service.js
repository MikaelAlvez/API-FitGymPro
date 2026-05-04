"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginService = loginService;
exports.refreshTokenService = refreshTokenService;
exports.logoutService = logoutService;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
async function loginService(app, input) {
    const { email, password } = input;
    const user = await app.prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            role: true,
            avatar: true,
            phone: true,
            cep: true,
            street: true,
            number: true,
            neighborhood: true,
            city: true,
            state: true,
            active: true,
            password: true,
            studentProfile: {
                select: { sex: true, birthDate: true },
            },
            personalProfile: {
                select: { sex: true, birthDate: true },
            },
        },
    });
    if (!user || !user.active) {
        throw { statusCode: 401, message: 'E-mail ou senha inválidos.' };
    }
    const passwordMatch = await bcryptjs_1.default.compare(password, user.password);
    if (!passwordMatch) {
        throw { statusCode: 401, message: 'E-mail ou senha inválidos.' };
    }
    const accessToken = app.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
    });
    const refreshToken = (0, crypto_1.randomUUID)();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await app.prisma.refreshToken.create({
        data: { token: refreshToken, userId: user.id, expiresAt },
    });
    const { password: _, studentProfile, personalProfile, ...base } = user;
    const profile = studentProfile ?? personalProfile ?? {};
    return {
        user: { ...base, ...profile },
        accessToken,
        refreshToken,
    };
}
async function refreshTokenService(app, token) {
    const stored = await app.prisma.refreshToken.findUnique({
        where: { token },
        include: { user: { select: { id: true, email: true, role: true, active: true } } },
    });
    if (!stored || stored.expiresAt < new Date() || !stored.user.active) {
        throw { statusCode: 401, message: 'Refresh token inválido ou expirado.' };
    }
    await app.prisma.refreshToken.delete({ where: { token } });
    const accessToken = app.jwt.sign({
        sub: stored.user.id,
        email: stored.user.email,
        role: stored.user.role,
    });
    const newRefreshToken = (0, crypto_1.randomUUID)();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await app.prisma.refreshToken.create({
        data: { token: newRefreshToken, userId: stored.user.id, expiresAt },
    });
    return { accessToken, refreshToken: newRefreshToken };
}
async function logoutService(app, token) {
    await app.prisma.refreshToken.deleteMany({ where: { token } });
}
//# sourceMappingURL=auth.service.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPersonalService = registerPersonalService;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const generateUserCode_1 = require("../../utils/generateUserCode");
async function registerPersonalService(app, input) {
    const { name, email, cpf, phone, password, cep, street, number, neighborhood, city, state, sex, birthDate, weight, height, course, university, educationLevel, cref, classFormat, availableDays, } = input;
    // Verifica e-mail duplicado
    const existing = await app.prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw { statusCode: 409, message: 'E-mail já cadastrado.' };
    }
    // Verifica CPF duplicado
    const existingCpf = await app.prisma.user.findUnique({ where: { cpf } });
    if (existingCpf) {
        throw { statusCode: 409, message: 'CPF já cadastrado.' };
    }
    // Verifica CREF duplicado
    const existingCref = await app.prisma.personalProfile.findFirst({ where: { cref } });
    if (existingCref) {
        throw { statusCode: 409, message: 'CREF já cadastrado.' };
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const cpfDigits = cpf.replace(/\D/g, '');
    // Gera código único para o personal
    const userCode = await (0, generateUserCode_1.generateUserCode)(app.prisma, 'PERSONAL');
    const user = await app.prisma.user.create({
        data: {
            name,
            email,
            cpf: cpfDigits,
            phone,
            password: hashedPassword,
            role: 'PERSONAL',
            userCode,
            cep,
            street,
            number,
            neighborhood,
            city,
            state,
            personalProfile: {
                create: {
                    sex,
                    birthDate,
                    weight,
                    height,
                    course,
                    university,
                    educationLevel,
                    cref,
                    classFormat,
                    availableDays,
                },
            },
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            userCode: true,
            createdAt: true,
            personalProfile: {
                select: {
                    cref: true,
                    course: true,
                    classFormat: true,
                    availableDays: true,
                },
            },
        },
    });
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
    return { user, accessToken, refreshToken };
}
//# sourceMappingURL=register-personal.service.js.map
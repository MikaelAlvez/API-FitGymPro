"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStudentService = registerStudentService;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const generateUserCode_1 = require("../../utils/generateUserCode");
async function registerStudentService(app, input) {
    const { name, email, cpf, phone, password, personalId, sex, birthDate, cep, street, number, neighborhood, city, state, weight, height, goal, focusMuscle, experience, gymType, cardio, trainingDays, } = input;
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
    // Valida se o personal existe (quando informado)
    if (personalId) {
        const personal = await app.prisma.user.findUnique({ where: { id: personalId } });
        if (!personal || personal.role !== 'PERSONAL') {
            throw { statusCode: 404, message: 'Personal trainer não encontrado.' };
        }
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const cpfDigits = cpf.replace(/\D/g, '');
    // Gera código único para o aluno
    const userCode = await (0, generateUserCode_1.generateUserCode)(app.prisma, 'STUDENT');
    const user = await app.prisma.user.create({
        data: {
            name,
            email,
            cpf: cpfDigits,
            phone,
            password: hashedPassword,
            role: 'STUDENT',
            userCode,
            personalId: personalId ?? null,
            cep,
            street,
            number,
            neighborhood,
            city,
            state,
            studentProfile: {
                create: {
                    sex,
                    birthDate,
                    weight,
                    height,
                    goal,
                    focusMuscle,
                    experience,
                    gymType,
                    cardio,
                    trainingDays,
                },
            },
        },
        select: {
            id: true,
            name: true,
            email: true,
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
            createdAt: true,
            studentProfile: {
                select: {
                    sex: true,
                    birthDate: true,
                    goal: true,
                    experience: true,
                    trainingDays: true,
                },
            },
        },
    });
    const accessToken = app.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
    });
    const { randomUUID } = await Promise.resolve().then(() => __importStar(require('crypto')));
    const refreshToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await app.prisma.refreshToken.create({
        data: { token: refreshToken, userId: user.id, expiresAt },
    });
    return { user, accessToken, refreshToken };
}
//# sourceMappingURL=register-student.service.js.map
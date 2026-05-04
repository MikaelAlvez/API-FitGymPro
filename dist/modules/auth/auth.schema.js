"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string({ message: 'E-mail é obrigatório' })
        .email('E-mail inválido'),
    password: zod_1.z.string({ message: 'Senha é obrigatória' })
        .min(6, 'Senha deve ter ao menos 6 caracteres'),
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string({ message: 'Refresh token é obrigatório' }),
});
//# sourceMappingURL=auth.schema.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStudentController = registerStudentController;
exports.registerPersonalController = registerPersonalController;
const register_schema_1 = require("./register.schema");
const register_student_service_1 = require("./register-student.service");
const register_personal_service_1 = require("./register-personal.service");
async function registerStudentController(req, reply) {
    const parsed = register_schema_1.registerStudentSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({
            message: 'Dados inválidos.',
            errors: parsed.error.flatten().fieldErrors,
        });
    }
    try {
        const result = await (0, register_student_service_1.registerStudentService)(req.server, parsed.data);
        return reply.status(201).send(result);
    }
    catch (err) {
        return reply.status(err.statusCode ?? 500).send({
            message: err.message ?? 'Erro interno.',
        });
    }
}
async function registerPersonalController(req, reply) {
    const parsed = register_schema_1.registerPersonalSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({
            message: 'Dados inválidos.',
            errors: parsed.error.flatten().fieldErrors,
        });
    }
    try {
        const result = await (0, register_personal_service_1.registerPersonalService)(req.server, parsed.data);
        return reply.status(201).send(result);
    }
    catch (err) {
        return reply.status(err.statusCode ?? 500).send({
            message: err.message ?? 'Erro interno.',
        });
    }
}
//# sourceMappingURL=register.controller.js.map
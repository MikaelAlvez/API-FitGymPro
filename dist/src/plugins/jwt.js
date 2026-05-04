"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const jwtPlugin = (0, fastify_plugin_1.default)(async (server) => {
    server.register(jwt_1.default, {
        secret: process.env.JWT_SECRET,
        sign: {
            expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
        },
    });
    // Decorator reutilizável nas rotas protegidas
    server.decorate('authenticate', async (req, reply) => {
        try {
            await req.jwtVerify();
        }
        catch {
            reply.status(401).send({ message: 'Token inválido ou expirado.' });
        }
    });
});
exports.default = jwtPlugin;
//# sourceMappingURL=jwt.js.map
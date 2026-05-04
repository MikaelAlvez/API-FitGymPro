import { FastifyPluginAsync } from 'fastify';
declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: {
            sub: string;
            email: string;
            role: string;
        };
        user: {
            sub: string;
            email: string;
            role: string;
        };
    }
}
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
declare const jwtPlugin: FastifyPluginAsync;
export default jwtPlugin;
//# sourceMappingURL=jwt.d.ts.map
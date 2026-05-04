import { FastifyRequest, FastifyReply } from 'fastify';
export declare function loginController(req: FastifyRequest, reply: FastifyReply): Promise<never>;
export declare function refreshController(req: FastifyRequest, reply: FastifyReply): Promise<never>;
export declare function logoutController(req: FastifyRequest, reply: FastifyReply): Promise<never>;
export declare function meController(req: FastifyRequest, reply: FastifyReply): Promise<never>;
export declare function meProfileController(req: FastifyRequest, reply: FastifyReply): Promise<never>;
export declare function checkEmailController(req: FastifyRequest<{
    Body: {
        email: string;
    };
}>, reply: FastifyReply): Promise<never>;
export declare function checkCpfController(req: FastifyRequest<{
    Body: {
        cpf: string;
    };
}>, reply: FastifyReply): Promise<never>;
//# sourceMappingURL=auth.controller.d.ts.map
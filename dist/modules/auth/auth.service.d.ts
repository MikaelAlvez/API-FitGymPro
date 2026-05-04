import { FastifyInstance } from 'fastify';
import type { LoginInput } from './auth.schema';
export declare function loginService(app: FastifyInstance, input: LoginInput): Promise<{
    user: {
        number: string | null;
        name: string;
        id: string;
        email: string;
        cpf: string;
        phone: string;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        active: boolean;
        cep: string | null;
        street: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
    };
    accessToken: string;
    refreshToken: `${string}-${string}-${string}-${string}-${string}`;
}>;
export declare function refreshTokenService(app: FastifyInstance, token: string): Promise<{
    accessToken: string;
    refreshToken: `${string}-${string}-${string}-${string}-${string}`;
}>;
export declare function logoutService(app: FastifyInstance, token: string): Promise<void>;
//# sourceMappingURL=auth.service.d.ts.map
import { FastifyInstance } from 'fastify';
import type { RegisterPersonalInput } from './register.schema';
export declare function registerPersonalService(app: FastifyInstance, input: RegisterPersonalInput): Promise<{
    user: {
        name: string;
        id: string;
        email: string;
        phone: string;
        role: import("@prisma/client").$Enums.Role;
        userCode: string | null;
        createdAt: Date;
        personalProfile: {
            course: string;
            cref: string;
            classFormat: string;
            availableDays: string[];
        } | null;
    };
    accessToken: string;
    refreshToken: `${string}-${string}-${string}-${string}-${string}`;
}>;
//# sourceMappingURL=register-personal.service.d.ts.map
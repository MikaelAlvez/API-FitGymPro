import { FastifyInstance } from 'fastify';
import type { RegisterStudentInput } from './register.schema';
export declare function registerStudentService(app: FastifyInstance, input: RegisterStudentInput): Promise<{
    user: {
        number: string | null;
        name: string;
        id: string;
        email: string;
        phone: string;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        userCode: string | null;
        cep: string | null;
        street: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
        createdAt: Date;
        studentProfile: {
            sex: string;
            birthDate: string;
            goal: string;
            experience: string;
            trainingDays: string[];
        } | null;
    };
    accessToken: string;
    refreshToken: `${string}-${string}-${string}-${string}-${string}`;
}>;
//# sourceMappingURL=register-student.service.d.ts.map
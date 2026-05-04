import { z } from 'zod';
export declare const registerStudentSchema: z.ZodObject<{
    name: z.ZodString;
    cpf: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    cep: z.ZodOptional<z.ZodString>;
    street: z.ZodOptional<z.ZodString>;
    number: z.ZodOptional<z.ZodString>;
    neighborhood: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"STUDENT">;
    sex: z.ZodString;
    birthDate: z.ZodString;
    weight: z.ZodString;
    height: z.ZodString;
    goal: z.ZodString;
    focusMuscle: z.ZodString;
    experience: z.ZodEnum<{
        beginner: "beginner";
        intermediate: "intermediate";
        advanced: "advanced";
    }>;
    gymType: z.ZodEnum<{
        advanced: "advanced";
        basic: "basic";
    }>;
    cardio: z.ZodEnum<{
        include: "include";
        exclude: "exclude";
    }>;
    trainingDays: z.ZodArray<z.ZodEnum<{
        monday: "monday";
        tuesday: "tuesday";
        wednesday: "wednesday";
        thursday: "thursday";
        friday: "friday";
        saturday: "saturday";
        sunday: "sunday";
    }>>;
    personalId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const registerPersonalSchema: z.ZodObject<{
    name: z.ZodString;
    cpf: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    cep: z.ZodOptional<z.ZodString>;
    street: z.ZodOptional<z.ZodString>;
    number: z.ZodOptional<z.ZodString>;
    neighborhood: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"PERSONAL">;
    sex: z.ZodString;
    birthDate: z.ZodString;
    weight: z.ZodString;
    height: z.ZodString;
    course: z.ZodString;
    university: z.ZodString;
    educationLevel: z.ZodString;
    cref: z.ZodString;
    classFormat: z.ZodEnum<{
        presential: "presential";
        online: "online";
        hybrid: "hybrid";
    }>;
    availableDays: z.ZodArray<z.ZodEnum<{
        monday: "monday";
        tuesday: "tuesday";
        wednesday: "wednesday";
        thursday: "thursday";
        friday: "friday";
        saturday: "saturday";
        sunday: "sunday";
    }>>;
}, z.core.$strip>;
export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
export type RegisterPersonalInput = z.infer<typeof registerPersonalSchema>;
//# sourceMappingURL=register.schema.d.ts.map
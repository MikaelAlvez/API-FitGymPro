import { z } from 'zod'

// ─── Shared ──────────────────────────────────
const baseUserSchema = z.object({
  name:     z.string({ message: 'Nome é obrigatório' }).min(3, 'Nome deve ter ao menos 3 caracteres'),
  email:    z.string({ message: 'E-mail é obrigatório' }).email('E-mail inválido'),
  phone:    z.string({ message: 'Telefone é obrigatório' }).min(10, 'Telefone inválido'),
  password: z.string({ message: 'Senha é obrigatória' }).min(6, 'Mínimo 6 caracteres'),
})

// ─── Student ─────────────────────────────────
export const registerStudentSchema = baseUserSchema.extend({
  role: z.literal('STUDENT'),

  //Perfil corporal
  sex:          z.string({ message: 'Sexo é obrigatório' }).min(1),
  birthDate:    z.string({ message: 'Data de nascimento é obrigatória' }).min(1),
  weight:       z.string({ message: 'Peso é obrigatório' }).min(1),
  height:       z.string({ message: 'Altura é obrigatória' }).min(1),
  goal:         z.string({ message: 'Objetivo é obrigatório' }).min(1),
  focusMuscle:  z.string({ message: 'Músculo foco é obrigatório' }).min(1),

  //Preferências de treino
  experience:   z.enum(['beginner', 'intermediate', 'advanced'], {
    message: 'Nível de experiência é obrigatório',
  }),
  gymType:      z.enum(['basic', 'advanced'], {
    message: 'Tipo de academia é obrigatório',
  }),
  cardio:       z.enum(['include', 'exclude'], {
    message: 'Preferência de cardio é obrigatória',
  }),
  trainingDays: z.array(
    z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
  ).min(1, 'Selecione ao menos um dia'),

  //Opcional — vincula ao personal no cadastro
  personalId: z.string().uuid('ID do personal inválido').optional(),
})

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>
import { z } from 'zod'

// ─── Shared ──────────────────────────────────
const baseUserSchema = z.object({
  name:         z.string({ message: 'Nome é obrigatório' }).min(3),
  cpf:          z.string({ message: 'CPF é obrigatório' }).min(11),
  email:        z.string({ message: 'E-mail é obrigatório' }).email(),
  phone:        z.string({ message: 'Telefone é obrigatório' }).min(10),
  password:     z.string({ message: 'Senha é obrigatória' }).min(6),
  // Endereço
  cep:          z.string().optional(),
  street:       z.string().optional(),
  number:       z.string().optional(),
  neighborhood: z.string().optional(),
  city:         z.string().optional(),
  state:        z.string().optional(),
})

// ─── Student ─────────────────────────────────
export const registerStudentSchema = baseUserSchema.extend({
  role: z.literal('STUDENT'),

  sex:          z.string({ message: 'Sexo é obrigatório' }).min(1),
  birthDate:    z.string({ message: 'Data de nascimento é obrigatória' }).min(1),
  weight:       z.string({ message: 'Peso é obrigatório' }).min(1),
  height:       z.string({ message: 'Altura é obrigatória' }).min(1),
  goal:         z.string({ message: 'Objetivo é obrigatório' }).min(1),
  focusMuscle:  z.string({ message: 'Músculo foco é obrigatório' }).min(1),

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

  personalId: z.string().uuid('ID do personal inválido').optional(),
})

// ─── Personal ────────────────────────────────
export const registerPersonalSchema = baseUserSchema.extend({
  role: z.literal('PERSONAL'),

  sex:            z.string({ message: 'Sexo é obrigatório' }).min(1),
  birthDate:      z.string({ message: 'Data de nascimento é obrigatória' }).min(1),
  weight:         z.string({ message: 'Peso é obrigatório' }).min(1),
  height:         z.string({ message: 'Altura é obrigatória' }).min(1),
  course:         z.string({ message: 'Curso é obrigatório' }).min(3, 'Informe o curso'),
  university:     z.string({ message: 'Universidade é obrigatória' }).min(3, 'Informe a universidade'),
  educationLevel: z.string({ message: 'Nível de formação é obrigatório' }).min(1),
  cref:           z.string({ message: 'CREF é obrigatório' }).min(3, 'CREF inválido'),

  classFormat:   z.enum(['presential', 'online', 'hybrid'], {
    message: 'Formato das aulas é obrigatório',
  }),
  availableDays: z.array(
    z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
  ).min(1, 'Selecione ao menos um dia disponível'),
})

export type RegisterStudentInput  = z.infer<typeof registerStudentSchema>
export type RegisterPersonalInput = z.infer<typeof registerPersonalSchema>
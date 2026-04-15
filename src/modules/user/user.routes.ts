import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { isValidDate } from '../../utils/date'

const updateProfileSchema = z.object({
  name:         z.string().min(3, 'Nome deve ter ao menos 3 caracteres').optional(),
  phone:        z.string().min(10, 'Telefone inválido').optional(),
  sex:          z.string().min(1).optional(),
  birthDate:    z.string()
                  .refine(v => !v || isValidDate(v), { message: 'Data de nascimento inválida' })
                  .optional(),
  cep:          z.string().optional(),
  street:       z.string().optional(),
  number:       z.string().optional(),
  neighborhood: z.string().optional(),
  city:         z.string().optional(),
  state:        z.string().optional(),
})

// Schema para métricas do aluno
const updateStudentMetricsSchema = z.object({
  weight: z.string().min(1, 'Peso obrigatório'),
  height: z.string().min(1, 'Altura obrigatória'),
})

async function updateProfileController(req: FastifyRequest, reply: FastifyReply) {
  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  const userId = req.user.sub
  const role   = req.user.role

  const { sex, birthDate, ...userFields } = parsed.data

  const user = await req.server.prisma.user.update({
    where:  { id: userId },
    data:   userFields,
    select: {
      id:           true,
      name:         true,
      email:        true,
      cpf:          true,
      phone:        true,
      role:         true,
      avatar:       true,
      cep:          true,
      street:       true,
      number:       true,
      neighborhood: true,
      city:         true,
      state:        true,
    },
  })

  if (sex !== undefined || birthDate !== undefined) {
    const profileData = {
      ...(sex       !== undefined && { sex }),
      ...(birthDate !== undefined && { birthDate }),
    }

    if (role === 'STUDENT') {
      await req.server.prisma.studentProfile.update({ where: { userId }, data: profileData })
    } else if (role === 'PERSONAL') {
      await req.server.prisma.personalProfile.update({ where: { userId }, data: profileData })
    }
  }

  const profile = role === 'STUDENT'
    ? await req.server.prisma.studentProfile.findUnique({
        where:  { userId },
        select: { sex: true, birthDate: true },
      })
    : await req.server.prisma.personalProfile.findUnique({
        where:  { userId },
        select: { sex: true, birthDate: true },
      })

  return reply.status(200).send({ ...user, ...profile })
}

// Atualizar peso e altura
async function updateStudentMetricsController(req: FastifyRequest, reply: FastifyReply) {
  const parsed = updateStudentMetricsSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  const userId = req.user.sub

  // Garante que é aluno
  if (req.user.role !== 'STUDENT') {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }

  const updated = await req.server.prisma.studentProfile.update({
    where:  { userId },
    data:   { weight: parsed.data.weight, height: parsed.data.height },
    select: {
      weight:       true,
      height:       true,
      goal:         true,
      focusMuscle:  true,
      experience:   true,
      gymType:      true,
      cardio:       true,
      trainingDays: true,
      sex:          true,
      birthDate:    true,
    },
  })

  return reply.status(200).send({ studentProfile: updated })
}

export async function userRoutes(app: FastifyInstance) {
  app.put(
    '/user/profile',
    { preHandler: [app.authenticate] },
    updateProfileController,
  )

  app.put(
    '/user/student-metrics',
    { preHandler: [app.authenticate] },
    updateStudentMetricsController,
  )
}
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

const updateMetricsSchema = z.object({
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
        where: { userId }, select: { sex: true, birthDate: true },
      })
    : await req.server.prisma.personalProfile.findUnique({
        where: { userId }, select: { sex: true, birthDate: true },
      })

  return reply.status(200).send({ ...user, ...profile })
}

async function updateMetricsController(req: FastifyRequest, reply: FastifyReply) {
  const parsed = updateMetricsSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  const userId = req.user.sub
  const role   = req.user.role

  if (role === 'STUDENT') {
    const updated = await req.server.prisma.studentProfile.update({
      where:  { userId },
      data:   { weight: parsed.data.weight, height: parsed.data.height },
      select: {
        weight: true, height: true, goal: true,
        focusMuscle: true, experience: true,
        gymType: true, cardio: true, trainingDays: true,
        sex: true, birthDate: true,
      },
    })
    return reply.status(200).send({ studentProfile: updated })
  }

  if (role === 'PERSONAL') {
    const updated = await req.server.prisma.personalProfile.update({
      where:  { userId },
      data:   { weight: parsed.data.weight, height: parsed.data.height },
      select: {
        weight: true, height: true,
        sex: true, birthDate: true,
        cref: true, course: true,
        classFormat: true, availableDays: true,
      },
    })
    return reply.status(200).send({ personalProfile: updated })
  }

  return reply.status(403).send({ message: 'Acesso negado.' })
}

export async function userRoutes(app: FastifyInstance) {
  app.put(
    '/user/profile',
    { preHandler: [app.authenticate] },
    updateProfileController,
  )

  app.put(
    '/user/metrics',
    { preHandler: [app.authenticate] },
    updateMetricsController,
  )

  // Retorna todos os alunos (ativos e inativos) com campo active
  app.get(
    '/user/my-students',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      if (req.user.role !== 'PERSONAL') {
        return reply.status(403).send({ message: 'Acesso negado.' })
      }
      const students = await req.server.prisma.user.findMany({
        where:   { personalId: req.user.sub },
        select:  {
          id:     true,
          name:   true,
          avatar: true,
          active: true, // ✅ incluído
          city:   true,
          state:  true,
          studentProfile: {
            select: {
              goal:       true,
              experience: true,
              weight:     true,
              height:     true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })
      return reply.status(200).send(students)
    },
  )

  // Inativar aluno
  app.put(
    '/user/student/:studentId/deactivate',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      if (req.user.role !== 'PERSONAL') {
        return reply.status(403).send({ message: 'Acesso negado.' })
      }
      const { studentId } = req.params as { studentId: string }
      const personalId    = req.user.sub

      const student = await req.server.prisma.user.findUnique({
        where: { id: studentId },
      })
      if (!student || student.personalId !== personalId) {
        return reply.status(404).send({ message: 'Aluno não encontrado ou não vinculado a você.' })
      }

      await req.server.prisma.user.update({
        where: { id: studentId },
        data:  { active: false },
      })

      return reply.status(200).send({ message: 'Aluno inativado com sucesso.' })
    },
  )

  // Reativar aluno
  app.put(
    '/user/student/:studentId/activate',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      if (req.user.role !== 'PERSONAL') {
        return reply.status(403).send({ message: 'Acesso negado.' })
      }
      const { studentId } = req.params as { studentId: string }
      const personalId    = req.user.sub

      const student = await req.server.prisma.user.findUnique({
        where: { id: studentId },
      })
      if (!student || student.personalId !== personalId) {
        return reply.status(404).send({ message: 'Aluno não encontrado ou não vinculado a você.' })
      }

      await req.server.prisma.user.update({
        where: { id: studentId },
        data:  { active: true },
      })

      return reply.status(200).send({ message: 'Aluno reativado com sucesso.' })
    },
  )
}
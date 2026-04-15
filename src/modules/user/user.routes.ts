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
      await req.server.prisma.studentProfile.update({
        where: { userId },
        data:  profileData,
      })
    } else if (role === 'PERSONAL') {
      await req.server.prisma.personalProfile.update({
        where: { userId },
        data:  profileData,
      })
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

export async function userRoutes(app: FastifyInstance) {
  app.put(
    '/user/profile',
    { preHandler: [app.authenticate] },
    updateProfileController,
  )
}
import { FastifyRequest, FastifyReply } from 'fastify'
import { loginSchema, refreshSchema } from './auth.schema'
import {
  loginService,
  refreshTokenService,
  logoutService,
} from './auth.service'

export async function loginController(req: FastifyRequest, reply: FastifyReply) {
  const parsed = loginSchema.safeParse(req.body)

  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  try {
    const result = await loginService(req.server, parsed.data)
    return reply.status(200).send(result)
  } catch (err: any) {
    return reply.status(err.statusCode ?? 500).send({
      message: err.message ?? 'Erro interno.',
    })
  }
}

export async function refreshController(req: FastifyRequest, reply: FastifyReply) {
  const parsed = refreshSchema.safeParse(req.body)

  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Refresh token ausente.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  try {
    const result = await refreshTokenService(req.server, parsed.data.refreshToken)
    return reply.status(200).send(result)
  } catch (err: any) {
    return reply.status(err.statusCode ?? 500).send({
      message: err.message ?? 'Erro interno.',
    })
  }
}

export async function logoutController(req: FastifyRequest, reply: FastifyReply) {
  const parsed = refreshSchema.safeParse(req.body)

  if (!parsed.success) {
    return reply.status(400).send({ message: 'Refresh token ausente.' })
  }

  await logoutService(req.server, parsed.data.refreshToken)
  return reply.status(204).send()
}

export async function meController(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user.sub
  const role   = req.user.role

  const user = await req.server.prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id:           true,
      name:         true,
      email:        true,
      cpf:          true,
      role:         true,
      avatar:       true,
      phone:        true,
      cep:          true,
      street:       true,
      number:       true,
      neighborhood: true,
      city:         true,
      state:        true,
      studentProfile: role === 'STUDENT' ? {
        select: { sex: true, birthDate: true },
      } : false,
      personalProfile: role === 'PERSONAL' ? {
        select: { sex: true, birthDate: true },
      } : false,
    },
  })

  if (!user) {
    return reply.status(404).send({ message: 'Usuário não encontrado.' })
  }

  const { studentProfile, personalProfile, ...base } = user
  const profile = studentProfile ?? personalProfile ?? {}

  return reply.status(200).send({ ...base, ...profile })
}

export async function meProfileController(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user.sub
  const role   = req.user.role

  const user = await req.server.prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id:              true,
      name:            true,
      email:           true,
      role:            true,
      avatar:          true,
      personalId:      true, 
      studentProfile:  role === 'STUDENT'  ? true : false,
      personalProfile: role === 'PERSONAL' ? true : false,

      // Retorna dados do personal vinculado para alunos
      personal: role === 'STUDENT' ? {
        select: {
          id:     true,
          name:   true,
          avatar: true,
          city:   true,
          state:  true,
          personalProfile: {
            select: { cref: true, classFormat: true },
          },
        },
      } : false,
    },
  })

  if (!user) {
    return reply.status(404).send({ message: 'Usuário não encontrado.' })
  }

  return reply.status(200).send(user)
}

export async function checkEmailController(
  req: FastifyRequest<{ Body: { email: string } }>,
  reply: FastifyReply,
) {
  const { email } = req.body

  if (!email) {
    return reply.status(400).send({ message: 'E-mail é obrigatório.' })
  }

  const existing = await req.server.prisma.user.findUnique({
    where:  { email },
    select: { id: true },
  })

  return reply.status(200).send({ available: !existing })
}

export async function checkCpfController(
  req: FastifyRequest<{ Body: { cpf: string } }>,
  reply: FastifyReply,
) {
  const { cpf } = req.body

  if (!cpf) {
    return reply.status(400).send({ message: 'CPF é obrigatório.' })
  }

  const digits = cpf.replace(/\D/g, '')

  const existing = await req.server.prisma.user.findFirst({
    where: {
      OR: [
        { cpf: cpf },
        { cpf: digits },
      ],
    },
    select: { id: true },
  })

  return reply.status(200).send({ available: !existing })
}
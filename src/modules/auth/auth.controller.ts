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

  const user = await req.server.prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, email: true, role: true, avatar: true },
  })

  if (!user) {
    return reply.status(404).send({ message: 'Usuário não encontrado.' })
  }

  return reply.status(200).send(user)
}

export async function meProfileController(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user.sub
  const role   = req.user.role

  const user = await req.server.prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id:     true,
      name:   true,
      email:  true,
      role:   true,
      avatar: true,
      studentProfile:  role === 'STUDENT'  ? true : false,
      personalProfile: role === 'PERSONAL' ? true : false,
    },
  })

  if (!user) {
    return reply.status(404).send({ message: 'Usuário não encontrado.' })
  }

  return reply.status(200).send(user)
}
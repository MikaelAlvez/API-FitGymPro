import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import type { LoginInput } from './auth.schema'

export async function loginService(app: FastifyInstance, input: LoginInput) {
  const { email, password } = input

  const user = await app.prisma.user.findUnique({
    where:  { email },
    select: {
      id:           true,
      name:         true,
      email:        true,
      role:         true,
      avatar:       true,
      phone:        true,
      cep:          true,
      street:       true,
      number:       true,
      neighborhood: true,
      city:         true,
      state:        true,
      active:       true,
      password:     true,
      studentProfile: {
        select: {
          sex:       true,
          birthDate: true,
        },
      },
      personalProfile: {
        select: {
          sex:       true,
          birthDate: true,
        },
      },
    },
  })

  if (!user || !user.active) {
    throw { statusCode: 401, message: 'E-mail ou senha inválidos.' }
  }

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    throw { statusCode: 401, message: 'E-mail ou senha inválidos.' }
  }

  const accessToken = app.jwt.sign({
    sub:   user.id,
    email: user.email,
    role:  user.role,
  })

  const refreshToken = randomUUID()
  const expiresAt    = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  await app.prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  })

  const { password: _, studentProfile, personalProfile, ...base } = user
  const profile = studentProfile ?? personalProfile ?? {}

  return {
    user: { ...base, ...profile },
    accessToken,
    refreshToken,
  }
}

export async function refreshTokenService(app: FastifyInstance, token: string) {
  const stored = await app.prisma.refreshToken.findUnique({
    where:   { token },
    include: { user: { select: { id: true, email: true, role: true, active: true } } },
  })

  if (!stored || stored.expiresAt < new Date() || !stored.user.active) {
    throw { statusCode: 401, message: 'Refresh token inválido ou expirado.' }
  }

  await app.prisma.refreshToken.delete({ where: { token } })

  const accessToken = app.jwt.sign({
    sub:   stored.user.id,
    email: stored.user.email,
    role:  stored.user.role,
  })

  const newRefreshToken = randomUUID()
  const expiresAt       = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  await app.prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: stored.user.id, expiresAt },
  })

  return { accessToken, refreshToken: newRefreshToken }
}

export async function logoutService(app: FastifyInstance, token: string) {
  await app.prisma.refreshToken.deleteMany({ where: { token } })
}
import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import type { LoginInput } from './auth.schema'

export async function loginService(app: FastifyInstance, input: LoginInput) {
  const { email, password } = input

  // 1. Busca usuário com todos os campos do perfil
  const user = await app.prisma.user.findUnique({
    where:  { email },
    select: {
      id:           true,
      name:         true,
      email:        true,
      role:         true,
      avatar:       true,
      phone:        true,
      sex:          true,
      birthDate:    true,
      cep:          true,
      street:       true,
      number:       true,
      neighborhood: true,
      city:         true,
      state:        true,
      active:       true,
      password:     true,
    },
  })

  if (!user || !user.active) {
    throw { statusCode: 401, message: 'E-mail ou senha inválidos.' }
  }

  // 2. Valida senha
  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    throw { statusCode: 401, message: 'E-mail ou senha inválidos.' }
  }

  // 3. Gera access token
  const accessToken = app.jwt.sign({
    sub:   user.id,
    email: user.email,
    role:  user.role,
  })

  // 4. Gera refresh token e persiste no banco
  const refreshToken = randomUUID()
  const expiresAt    = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30 dias

  await app.prisma.refreshToken.create({
    data: {
      token:     refreshToken,
      userId:    user.id,
      expiresAt,
    },
  })

  // 5. Retorna dados sem a senha
  const { password: _, ...userWithoutPassword } = user

  return {
    user:         userWithoutPassword,
    accessToken,
    refreshToken,
  }
}

export async function refreshTokenService(app: FastifyInstance, token: string) {
  // 1. Busca token no banco
  const stored = await app.prisma.refreshToken.findUnique({
    where:   { token },
    include: { user: { select: { id: true, email: true, role: true, active: true } } },
  })

  if (!stored || stored.expiresAt < new Date() || !stored.user.active) {
    throw { statusCode: 401, message: 'Refresh token inválido ou expirado.' }
  }

  // 2. Revoga o token usado (rotação de refresh token)
  await app.prisma.refreshToken.delete({ where: { token } })

  // 3. Gera novo par de tokens
  const accessToken = app.jwt.sign({
    sub:   stored.user.id,
    email: stored.user.email,
    role:  stored.user.role,
  })

  const newRefreshToken = randomUUID()
  const expiresAt       = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  await app.prisma.refreshToken.create({
    data: {
      token:     newRefreshToken,
      userId:    stored.user.id,
      expiresAt,
    },
  })

  return { accessToken, refreshToken: newRefreshToken }
}

export async function logoutService(app: FastifyInstance, token: string) {
  await app.prisma.refreshToken.deleteMany({ where: { token } })
}
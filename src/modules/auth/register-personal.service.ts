import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import type { RegisterPersonalInput } from './register.schema'
import { generateUserCode } from '../../utils/generateUserCode'

export async function registerPersonalService(
  app: FastifyInstance,
  input: RegisterPersonalInput,
) {
  const {
    name, email, cpf, phone, password,
    cep, street, number, neighborhood, city, state,
    sex, birthDate, weight, height,
    course, university, educationLevel, cref,
    classFormat, availableDays,
  } = input

  // Verifica e-mail duplicado
  const existing = await app.prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw { statusCode: 409, message: 'E-mail já cadastrado.' }
  }

  // Verifica CPF duplicado
  const existingCpf = await app.prisma.user.findUnique({ where: { cpf } })
  if (existingCpf) {
    throw { statusCode: 409, message: 'CPF já cadastrado.' }
  }

  // Verifica CREF duplicado
  const existingCref = await app.prisma.personalProfile.findFirst({ where: { cref } })
  if (existingCref) {
    throw { statusCode: 409, message: 'CREF já cadastrado.' }
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const cpfDigits      = cpf.replace(/\D/g, '')

  // Gera código único para o personal
  const userCode = await generateUserCode(app.prisma as any, 'PERSONAL')

  const user = await app.prisma.user.create({
    data: {
      name,
      email,
      cpf:      cpfDigits,
      phone,
      password: hashedPassword,
      role:     'PERSONAL',
      userCode,               
      cep,
      street,
      number,
      neighborhood,
      city,
      state,
      personalProfile: {
        create: {
          sex,
          birthDate,
          weight,
          height,
          course,
          university,
          educationLevel,
          cref,
          classFormat,
          availableDays,
        },
      },
    },
    select: {
      id:       true,
      name:     true,
      email:    true,
      phone:    true,
      role:     true,
      userCode: true,         
      createdAt: true,
      personalProfile: {
        select: {
          cref:          true,
          course:        true,
          classFormat:   true,
          availableDays: true,
        },
      },
    },
  })

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

  return { user, accessToken, refreshToken }
}
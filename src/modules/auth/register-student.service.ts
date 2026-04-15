import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import type { RegisterStudentInput } from './register.schema'

export async function registerStudentService(
  app: FastifyInstance,
  input: RegisterStudentInput,
) {
  const {
    name, email, cpf, phone, password, personalId,
    sex, birthDate,
    cep, street, number, neighborhood, city, state,
    weight, height, goal, focusMuscle,
    experience, gymType, cardio, trainingDays,
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

  // Valida se o personal existe (quando informado)
  if (personalId) {
    const personal = await app.prisma.user.findUnique({
      where: { id: personalId },
    })
    if (!personal || personal.role !== 'PERSONAL') {
      throw { statusCode: 404, message: 'Personal trainer não encontrado.' }
    }
  }

  // Hash da senha
  const hashedPassword = await bcrypt.hash(password, 10)

  // Normaliza CPF — salva sempre sem máscara
  const cpfDigits = cpf.replace(/\D/g, '')

  // Cria usuário + perfil em uma transação
  const user = await app.prisma.user.create({
    data: {
      name,
      email,
      cpf: cpfDigits,
      phone,
      password:   hashedPassword,
      role:       'STUDENT',
      personalId: personalId ?? null,
      cep,
      street,
      number,
      neighborhood,
      city,
      state,
      studentProfile: {
        create: {
          sex,        // ✅ movido para StudentProfile
          birthDate,  // ✅ movido para StudentProfile
          weight,
          height,
          goal,
          focusMuscle,
          experience,
          gymType,
          cardio,
          trainingDays,
        },
      },
    },
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
      createdAt:    true,
      studentProfile: {
        select: {
          sex:          true,
          birthDate:    true,
          goal:         true,
          experience:   true,
          trainingDays: true,
        },
      },
    },
  })

  // Gera tokens
  const accessToken = app.jwt.sign({
    sub:   user.id,
    email: user.email,
    role:  user.role,
  })

  const { randomUUID } = await import('crypto')
  const refreshToken = randomUUID()
  const expiresAt    = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  await app.prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  })

  return { user, accessToken, refreshToken }
}
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'

// ─── GET /personals — lista personais disponíveis ─────
async function listPersonalsController(req: FastifyRequest, reply: FastifyReply) {
  const personals = await req.server.prisma.user.findMany({
    where:  { role: 'PERSONAL', active: true },
    select: {
      id:     true,
      name:   true,
      avatar: true,
      city:   true,
      state:  true,
      personalProfile: {
        select: {
          cref:        true,
          classFormat: true,
          course:      true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Busca status da solicitação do aluno logado para cada personal
  const userId   = req.user.sub
  const requests = await req.server.prisma.personalRequest.findMany({
    where:  { studentId: userId },
    select: { personalId: true, status: true },
  })

  const requestMap = new Map(requests.map(r => [r.personalId, r.status]))

  const result = personals.map(p => ({
    ...p,
    requestStatus: requestMap.get(p.id) ?? null,
  }))

  return reply.status(200).send(result)
}

// ─── POST /personal-request — aluno envia solicitação ─
const sendRequestSchema = z.object({
  personalId: z.string().uuid(),
  message:    z.string().max(300).optional(),
})

async function sendRequestController(req: FastifyRequest, reply: FastifyReply) {
  const parsed = sendRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  const studentId  = req.user.sub
  const { personalId, message } = parsed.data

  // Garante que é aluno
  if (req.user.role !== 'STUDENT') {
    return reply.status(403).send({ message: 'Apenas alunos podem enviar solicitações.' })
  }

  // Verifica se personal existe
  const personal = await req.server.prisma.user.findUnique({
    where: { id: personalId },
  })
  if (!personal || personal.role !== 'PERSONAL') {
    return reply.status(404).send({ message: 'Personal não encontrado.' })
  }

  // Verifica se já existe solicitação
  const existing = await req.server.prisma.personalRequest.findUnique({
    where: { studentId_personalId: { studentId, personalId } },
  })
  if (existing) {
    if (existing.status === 'PENDING') {
      return reply.status(409).send({ message: 'Você já enviou uma solicitação para este personal.' })
    }
    if (existing.status === 'ACCEPTED') {
      return reply.status(409).send({ message: 'Você já está vinculado a este personal.' })
    }
    // Se foi rejeitado, permite reenviar — atualiza para PENDING
    const updated = await req.server.prisma.personalRequest.update({
      where: { studentId_personalId: { studentId, personalId } },
      data:  { status: 'PENDING', message: message ?? null },
    })
    return reply.status(200).send(updated)
  }

  const request = await req.server.prisma.personalRequest.create({
    data: { studentId, personalId, message: message ?? null },
  })

  return reply.status(201).send(request)
}

// ─── GET /personal-requests — personal vê solicitações ─
async function listRequestsController(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'PERSONAL') {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }

  const personalId = req.user.sub

  const requests = await req.server.prisma.personalRequest.findMany({
    where:   { personalId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: {
      student: {
        select: {
          id:     true,
          name:   true,
          avatar: true,
          city:   true,
          state:  true,
          studentProfile: {
            select: {
              goal:       true,
              experience: true,
            },
          },
        },
      },
    },
  })

  return reply.status(200).send(requests)
}

// ─── PUT /personal-request/:id/accept ─────────────────
async function acceptRequestController(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'PERSONAL') {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }

  const { id }     = req.params as { id: string }
  const personalId = req.user.sub

  const request = await req.server.prisma.personalRequest.findUnique({
    where: { id },
  })

  if (!request || request.personalId !== personalId) {
    return reply.status(404).send({ message: 'Solicitação não encontrada.' })
  }
  if (request.status !== 'PENDING') {
    return reply.status(409).send({ message: 'Solicitação já foi processada.' })
  }

  await req.server.prisma.$transaction([
    req.server.prisma.personalRequest.update({
      where: { id },
      data:  { status: 'ACCEPTED' },
    }),
    req.server.prisma.user.update({
      where: { id: request.studentId },
      data:  { personalId },
    }),
  ])

  return reply.status(200).send({ message: 'Solicitação aceita com sucesso.' })
}

  // Aceita a solicitação e vincula o aluno ao personal
  await req.server.prisma.$transaction([
    req.server.prisma.personalRequest.update({
      where: { id },
      data:  { status: 'ACCEPTED' },
    }),
    req.server.prisma.user.update({
      where: { id: request.studentId },
      data:  { personalId },
    }),
  ])

  return reply.status(200).send({ message: 'Solicitação aceita com sucesso.' })
}

// ─── PUT /personal-request/:id/reject ─────────────────
async function rejectRequestController(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'PERSONAL') {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }

  const { id }     = req.params as { id: string }  // ✅ cast aqui
  const personalId = req.user.sub

  const request = await req.server.prisma.personalRequest.findUnique({
    where: { id },
  })

  if (!request || request.personalId !== personalId) {
    return reply.status(404).send({ message: 'Solicitação não encontrada.' })
  }
  if (request.status !== 'PENDING') {
    return reply.status(409).send({ message: 'Solicitação já foi processada.' })
  }

  await req.server.prisma.personalRequest.update({
    where: { id },
    data:  { status: 'REJECTED' },
  })

  return reply.status(200).send({ message: 'Solicitação recusada.' })
}

// ─── GET /personal-request/my-status — aluno vê status ─
async function myRequestStatusController(req: FastifyRequest, reply: FastifyReply) {
  const studentId = req.user.sub

  const requests = await req.server.prisma.personalRequest.findMany({
    where:   { studentId },
    orderBy: { updatedAt: 'desc' },
    include: {
      personal: {
        select: {
          id:     true,
          name:   true,
          avatar: true,
          personalProfile: { select: { cref: true, classFormat: true } },
        },
      },
    },
  })

  return reply.status(200).send(requests)
}

// ─── Register routes ──────────────────────────────────
export async function personalRequestRoutes(app: FastifyInstance) {
  app.get(
    '/personals',
    { preHandler: [app.authenticate] },
    listPersonalsController,
  )
  app.post(
    '/personal-request',
    { preHandler: [app.authenticate] },
    sendRequestController,
  )
  app.get(
    '/personal-requests',
    { preHandler: [app.authenticate] },
    listRequestsController,
  )
  app.get(
    '/personal-request/my-status',
    { preHandler: [app.authenticate] },
    myRequestStatusController,
  )
  app.put(
    '/personal-request/:id/accept',
    { preHandler: [app.authenticate] },
    acceptRequestController,
  )
  app.put(
    '/personal-request/:id/reject',
    { preHandler: [app.authenticate] },
    rejectRequestController,
  )
}
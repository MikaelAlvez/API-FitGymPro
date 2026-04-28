import { FastifyInstance } from 'fastify'

export async function friendRoutes(app: FastifyInstance) {

  // ─── POST /friends/request/:userId ── Enviar solicitação
  app.post('/friends/request/:userId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const senderId   = req.user.sub
    const { userId: receiverId } = req.params as { userId: string }

    if (senderId === receiverId) {
      return reply.status(400).send({ message: 'Você não pode se adicionar.' })
    }

    const receiver = await req.server.prisma.user.findUnique({ where: { id: receiverId } })
    if (!receiver) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' })
    }

    // Verifica se já existe solicitação em qualquer direção
    const existing = await req.server.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    })

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return reply.status(409).send({ message: 'Vocês já são amigos.' })
      }
      if (existing.status === 'PENDING') {
        return reply.status(409).send({ message: 'Solicitação já enviada.' })
      }
      // REJECTED — permite reenviar
      const updated = await req.server.prisma.friendRequest.update({
        where: { id: existing.id },
        data:  { status: 'PENDING', senderId, receiverId },
      })
      return reply.status(200).send(updated)
    }

    const request = await req.server.prisma.friendRequest.create({
      data: { senderId, receiverId },
    })

    return reply.status(201).send(request)
  })

  // ─── PUT /friends/request/:requestId/accept ── Aceitar
  app.put('/friends/request/:requestId/accept', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { requestId } = req.params as { requestId: string }
    const userId        = req.user.sub

    const request = await req.server.prisma.friendRequest.findUnique({ where: { id: requestId } })
    if (!request || request.receiverId !== userId) {
      return reply.status(404).send({ message: 'Solicitação não encontrada.' })
    }
    if (request.status !== 'PENDING') {
      return reply.status(409).send({ message: 'Solicitação já processada.' })
    }

    const updated = await req.server.prisma.friendRequest.update({
      where: { id: requestId },
      data:  { status: 'ACCEPTED' },
    })

    return reply.status(200).send(updated)
  })

  // ─── PUT /friends/request/:requestId/reject ── Recusar
  app.put('/friends/request/:requestId/reject', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { requestId } = req.params as { requestId: string }
    const userId        = req.user.sub

    const request = await req.server.prisma.friendRequest.findUnique({ where: { id: requestId } })
    if (!request || request.receiverId !== userId) {
      return reply.status(404).send({ message: 'Solicitação não encontrada.' })
    }

    await req.server.prisma.friendRequest.update({
      where: { id: requestId },
      data:  { status: 'REJECTED' },
    })

    return reply.status(200).send({ message: 'Solicitação recusada.' })
  })

  // ─── DELETE /friends/:userId ── Desfazer amizade
  app.delete('/friends/:userId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const myId              = req.user.sub
    const { userId: otherId } = req.params as { userId: string }

    await req.server.prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: myId,    receiverId: otherId },
          { senderId: otherId, receiverId: myId    },
        ],
      },
    })

    return reply.status(200).send({ message: 'Amizade desfeita.' })
  })

  // ─── GET /friends ── Lista amigos aceitos
  app.get('/friends', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub

    const requests = await req.server.prisma.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender:   { select: { id: true, name: true, avatar: true, userCode: true, role: true } },
        receiver: { select: { id: true, name: true, avatar: true, userCode: true, role: true } },
      },
    })

    const friends = requests.map(r =>
      r.senderId === userId ? r.receiver : r.sender
    )

    return reply.status(200).send(friends)
  })

  // ─── GET /friends/requests/pending ── Solicitações recebidas pendentes
  app.get('/friends/requests/pending', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub

    const requests = await req.server.prisma.friendRequest.findMany({
      where:   { receiverId: userId, status: 'PENDING' },
      include: {
        sender: { select: { id: true, name: true, avatar: true, userCode: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return reply.status(200).send(requests)
  })

  // ─── GET /friends/status/:userId ── Status com um usuário específico
  app.get('/friends/status/:userId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const myId              = req.user.sub
    const { userId: otherId } = req.params as { userId: string }

    const request = await req.server.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: myId,    receiverId: otherId },
          { senderId: otherId, receiverId: myId    },
        ],
      },
    })

    if (!request) return reply.status(200).send({ status: null })

    return reply.status(200).send({
      status:    request.status,
      requestId: request.id,
      isSender:  request.senderId === myId,
    })
  })

  // ─── GET /friends/feed ── Feed de amigos + próprio
  app.get('/friends/feed', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub
    const { page = '1' } = req.query as { page?: string }
    const take   = 20
    const skip   = (parseInt(page) - 1) * take

    // Busca IDs dos amigos
    const friendRequests = await req.server.prisma.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: { senderId: true, receiverId: true },
    })

    const friendIds = friendRequests.map(r =>
      r.senderId === userId ? r.receiverId : r.senderId
    )

    // Busca sessões do próprio + amigos
    const sessions = await req.server.prisma.workoutSession.findMany({
      where: {
        finishedAt: { not: null },
        studentId:  { in: [userId, ...friendIds] },
      },
      include: {
        workout: { select: { id: true, name: true } },
        student: { select: { id: true, name: true, avatar: true, userCode: true } },
      },
      orderBy: { startedAt: 'desc' },
      take,
      skip,
    })

    return reply.status(200).send(sessions)
  })
}
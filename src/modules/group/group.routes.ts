import { FastifyInstance } from 'fastify'
import { generateGroupCode } from '../../utils/generateGroupCode'

export async function groupRoutes(app: FastifyInstance) {

  // ─── POST /groups ── Criar grupo
  app.post('/groups', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub
    const { name, description, avatar } = req.body as { name: string; description?: string; avatar?: string }
    if (!name?.trim()) return reply.status(400).send({ message: 'Nome é obrigatório.' })

    const code  = await generateGroupCode(app.prisma as any)
    const group = await req.server.prisma.group.create({
      data: {
        name:        name.trim(),
        description: description?.trim(),
        avatar:      avatar ?? null,   
        code,
        creatorId: userId,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true, userCode: true } } } },
        _count:  { select: { members: true, challenges: true } },
      },
    })

    return reply.status(201).send(group)
  })

  // ─── GET /groups/my ── Meus grupos
  app.get('/groups/my', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub

    const memberships = await req.server.prisma.groupMember.findMany({
      where:   { userId },
      include: {
        group: {
          include: {
            creator: { select: { id: true, name: true, avatar: true } },
            _count:  { select: { members: true, challenges: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    return reply.status(200).send(memberships.map(m => ({ ...m.group, myRole: m.role })))
  })

  // ─── GET /groups/search?code= ── Buscar grupo por código
  app.get('/groups/search', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { code } = req.query as { code?: string }
    if (!code?.trim()) return reply.status(400).send({ message: 'Informe o código do grupo.' })

    const group = await req.server.prisma.group.findUnique({
      where:   { code: code.trim().toUpperCase() },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        _count:  { select: { members: true, challenges: true } },
      },
    })

    if (!group) return reply.status(404).send({ message: 'Grupo não encontrado.' })
    return reply.status(200).send(group)
  })

  // ─── GET /groups/:groupId ── Detalhes do grupo
  app.get('/groups/:groupId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { groupId } = req.params as { groupId: string }
    const userId      = req.user.sub

    const group = await req.server.prisma.group.findUnique({
      where:   { id: groupId },
      include: {
        creator:    { select: { id: true, name: true, avatar: true, userCode: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true, userCode: true, role: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        challenges: {
          orderBy: { startDate: 'desc' },
          include: { _count: { select: { checkins: true } } },
        },
        _count: { select: { members: true, challenges: true } },
      },
    })

    if (!group) return reply.status(404).send({ message: 'Grupo não encontrado.' })

    const myMembership = group.members.find(m => m.userId === userId)
    return reply.status(200).send({ ...group, myRole: myMembership?.role ?? null })
  })

  // ─── POST /groups/:groupId/join ── Entrar no grupo
  app.post('/groups/:groupId/join', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId      = req.user.sub
    const { groupId } = req.params as { groupId: string }

    const group = await req.server.prisma.group.findUnique({ where: { id: groupId } })
    if (!group) return reply.status(404).send({ message: 'Grupo não encontrado.' })

    const existing = await req.server.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    if (existing) return reply.status(409).send({ message: 'Você já é membro deste grupo.' })

    await req.server.prisma.groupMember.create({ data: { groupId, userId, role: 'MEMBER' } })
    return reply.status(201).send({ message: 'Entrou no grupo com sucesso.' })
  })

  // ─── POST /groups/join-by-code ── Entrar por código
  app.post('/groups/join-by-code', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub
    const { code } = req.body as { code: string }

    if (!code?.trim()) return reply.status(400).send({ message: 'Informe o código do grupo.' })

    const group = await req.server.prisma.group.findUnique({
      where: { code: code.trim().toUpperCase() },
    })
    if (!group) return reply.status(404).send({ message: 'Grupo não encontrado.' })

    const existing = await req.server.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    })
    if (existing) return reply.status(409).send({ message: 'Você já é membro deste grupo.' })

    await req.server.prisma.groupMember.create({ data: { groupId: group.id, userId, role: 'MEMBER' } })
    return reply.status(201).send({ message: 'Entrou no grupo com sucesso.', groupId: group.id })
  })

  // ─── DELETE /groups/:groupId/leave ── Sair do grupo
  app.delete('/groups/:groupId/leave', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId      = req.user.sub
    const { groupId } = req.params as { groupId: string }

    const membership = await req.server.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    if (!membership) return reply.status(404).send({ message: 'Você não é membro deste grupo.' })
    if (membership.role === 'OWNER') return reply.status(400).send({ message: 'O criador não pode sair do grupo. Delete o grupo.' })

    await req.server.prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId } } })
    return reply.status(200).send({ message: 'Você saiu do grupo.' })
  })

  // ─── DELETE /groups/:groupId ── Deletar grupo (só owner)
  app.delete('/groups/:groupId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId      = req.user.sub
    const { groupId } = req.params as { groupId: string }

    const group = await req.server.prisma.group.findUnique({ where: { id: groupId } })
    if (!group || group.creatorId !== userId)
      return reply.status(403).send({ message: 'Apenas o criador pode deletar o grupo.' })

    await req.server.prisma.group.delete({ where: { id: groupId } })
    return reply.status(200).send({ message: 'Grupo deletado.' })
  })

  // ─── PUT /groups/:groupId ── Editar grupo (só owner)
  app.put('/groups/:groupId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId      = req.user.sub
    const { groupId } = req.params as { groupId: string }
    const { name, description } = req.body as { name?: string; description?: string }

    const group = await req.server.prisma.group.findUnique({ where: { id: groupId } })
    if (!group || group.creatorId !== userId)
      return reply.status(403).send({ message: 'Apenas o criador pode editar o grupo.' })

    const updated = await req.server.prisma.group.update({
      where: { id: groupId },
      data:  { name: name?.trim(), description: description?.trim() },
    })
    return reply.status(200).send(updated)
  })

  // ═══════════════════════════════════════════
  // DESAFIOS
  // ═══════════════════════════════════════════

  // ─── POST /groups/:groupId/challenges ── Criar desafio
  app.post('/groups/:groupId/challenges', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId      = req.user.sub
    const { groupId } = req.params as { groupId: string }
    const { title, description, goal, startDate, endDate } =
      req.body as { title: string; description?: string; goal: number; startDate: string; endDate: string }

    const group = await req.server.prisma.group.findUnique({ where: { id: groupId } })
    if (!group || group.creatorId !== userId)
      return reply.status(403).send({ message: 'Apenas o criador pode criar desafios.' })

    if (!title?.trim()) return reply.status(400).send({ message: 'Título é obrigatório.' })
    if (!goal || goal < 1) return reply.status(400).send({ message: 'Meta deve ser ao menos 1 treino.' })
    if (!startDate || !endDate) return reply.status(400).send({ message: 'Datas são obrigatórias.' })
    if (new Date(endDate) <= new Date(startDate))
      return reply.status(400).send({ message: 'Data de fim deve ser após a data de início.' })

    const challenge = await req.server.prisma.groupChallenge.create({
      data: {
        groupId,
        title:       title.trim(),
        description: description?.trim(),
        goal,
        startDate:   new Date(startDate),
        endDate:     new Date(endDate),
      },
      include: { _count: { select: { checkins: true } } },
    })

    return reply.status(201).send(challenge)
  })

  // ─── GET /groups/:groupId/challenges ── Listar desafios do grupo
  app.get('/groups/:groupId/challenges', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId      = req.user.sub
    const { groupId } = req.params as { groupId: string }

    const challenges = await req.server.prisma.groupChallenge.findMany({
      where:   { groupId },
      include: {
        _count:   { select: { checkins: true } },
        checkins: {
          where:   { userId },
          select:  { id: true, checkedAt: true },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    return reply.status(200).send(challenges)
  })

  // ─── GET /groups/:groupId/challenges/:challengeId/ranking ── Ranking do desafio
  app.get('/groups/:groupId/challenges/:challengeId/ranking', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { groupId, challengeId } = req.params as { groupId: string; challengeId: string }

    const challenge = await req.server.prisma.groupChallenge.findUnique({
      where: { id: challengeId },
    })
    if (!challenge || challenge.groupId !== groupId)
      return reply.status(404).send({ message: 'Desafio não encontrado.' })

    // Busca todos os membros do grupo
    const members = await req.server.prisma.groupMember.findMany({
      where:   { groupId },
      include: { user: { select: { id: true, name: true, avatar: true, userCode: true } } },
    })

    // Busca checkins do desafio agrupados por usuário
    const checkins = await req.server.prisma.challengeCheckin.findMany({
      where: { challengeId },
    })

    const countByUser = checkins.reduce<Record<string, number>>((acc, c) => {
      acc[c.userId] = (acc[c.userId] ?? 0) + 1
      return acc
    }, {})

    // Monta ranking
    const ranking = members
      .map(m => ({
        user:     m.user,
        checkins: countByUser[m.userId] ?? 0,
        done:     (countByUser[m.userId] ?? 0) >= challenge.goal,
      }))
      .sort((a, b) => b.checkins - a.checkins)

    return reply.status(200).send({ challenge, ranking })
  })

  // ─── POST /groups/:groupId/challenges/:challengeId/checkin ── Fazer checkin
  app.post('/groups/:groupId/challenges/:challengeId/checkin', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId                  = req.user.sub
    const { groupId, challengeId } = req.params as { groupId: string; challengeId: string }
    const { sessionId, note }      = req.body as { sessionId?: string; note?: string }

    // Verifica se é membro
    const membership = await req.server.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    if (!membership) return reply.status(403).send({ message: 'Você não é membro deste grupo.' })

    const challenge = await req.server.prisma.groupChallenge.findUnique({ where: { id: challengeId } })
    if (!challenge || challenge.groupId !== groupId)
      return reply.status(404).send({ message: 'Desafio não encontrado.' })

    // Verifica se desafio está ativo
    const now = new Date()
    if (now < challenge.startDate) return reply.status(400).send({ message: 'O desafio ainda não começou.' })
    if (now > challenge.endDate)   return reply.status(400).send({ message: 'O desafio já encerrou.' })

    const checkin = await req.server.prisma.challengeCheckin.create({
      data: { challengeId, userId, sessionId: sessionId ?? null, note: note?.trim() ?? null },
    })

    // Conta checkins do usuário neste desafio
    const total = await req.server.prisma.challengeCheckin.count({ where: { challengeId, userId } })

    return reply.status(201).send({ checkin, total, goal: challenge.goal, completed: total >= challenge.goal })
  })

  // ─── DELETE /groups/:groupId/challenges/:challengeId/checkin/:checkinId ── Remover checkin
  app.delete('/groups/:groupId/challenges/:challengeId/checkin/:checkinId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId      = req.user.sub
    const { checkinId } = req.params as { groupId: string; challengeId: string; checkinId: string }

    const checkin = await req.server.prisma.challengeCheckin.findUnique({ where: { id: checkinId } })
    if (!checkin || checkin.userId !== userId)
      return reply.status(403).send({ message: 'Sem permissão.' })

    await req.server.prisma.challengeCheckin.delete({ where: { id: checkinId } })
    return reply.status(200).send({ message: 'Checkin removido.' })
  })

  // ─── GET /groups/active-challenges ── Grupos com desafios ativos do usuário
  app.get('/groups/active-challenges', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub
    const now    = new Date()

    const memberships = await req.server.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            challenges: {
              where: {
                startDate: { lte: now },
                endDate:   { gte: now },
              },
              include: {
                checkins: {
                  where:  { userId },
                  select: { id: true },
                },
                _count: { select: { checkins: true } },
              },
            },
          },
        },
      },
    })

    // Filtra só grupos que têm ao menos 1 desafio ativo
    const result = memberships
      .filter(m => m.group.challenges.length > 0)
      .map(m => ({
        groupId:   m.group.id,
        groupName: m.group.name,
        groupCode: m.group.code,
        challenges: m.group.challenges.map(c => ({
          id:          c.id,
          title:       c.title,
          goal:        c.goal,
          myCheckins:  c.checkins.length,
          totalCheckins: c._count.checkins,
          endDate:     c.endDate,
        })),
      }))

    return reply.status(200).send(result)
  })
}
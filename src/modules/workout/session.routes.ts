import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import path from 'path'
import fs   from 'fs'

const checkinSchema = z.object({
  workoutId:  z.string().uuid(),
  caption:    z.string().min(1, 'Legenda obrigatória'),
  notes:      z.string().optional(),
  location:   z.string().optional(),
  photoStart: z.string().optional(),
})

const checkoutSchema = z.object({
  caption:  z.string().min(1, 'Legenda obrigatória'),
  notes:    z.string().optional(),
  notesEnd: z.string().optional(), 
  location: z.string().optional(),
  photoEnd: z.string().optional(),
})

const updateSessionSchema = z.object({
  caption:    z.string().min(1).optional(),
  captionEnd: z.string().optional().nullable(),
  notes:      z.string().optional().nullable(),
  notesEnd:   z.string().optional().nullable(), 
  location:   z.string().optional().nullable(),
})

const removeFile = (urlPath: string | null | undefined) => {
  if (!urlPath) return
  const filepath = path.join(process.cwd(), 'src', urlPath.replace(/^\//, ''))
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
}

export async function sessionRoutes(app: FastifyInstance) {

  // ─── POST /sessions/checkin ───────────────
  app.post('/sessions/checkin', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STUDENT') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const parsed = checkinSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors })
    }

    const studentId = req.user.sub
    const { workoutId, caption, notes, location, photoStart } = parsed.data

    const active = await req.server.prisma.workoutSession.findFirst({
      where: { studentId, finishedAt: null },
    })
    if (active) {
      return reply.status(409).send({ message: 'Você já tem um treino em andamento.', sessionId: active.id })
    }

    const session = await req.server.prisma.workoutSession.create({
      data: { workoutId, studentId, caption, notes, location, photoStart },
    })

    return reply.status(201).send(session)
  })

  // ─── PUT /sessions/:id/checkout ──────────
  app.put('/sessions/:id/checkout', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STUDENT') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const { id } = req.params as { id: string }
    const parsed  = checkoutSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors })
    }

    const session = await req.server.prisma.workoutSession.findUnique({ where: { id } })
    if (!session || session.studentId !== req.user.sub) {
      return reply.status(404).send({ message: 'Sessão não encontrada.' })
    }
    if (session.finishedAt) {
      return reply.status(409).send({ message: 'Sessão já finalizada.' })
    }

    const finishedAt = new Date()
    const duration   = Math.floor((finishedAt.getTime() - session.startedAt.getTime()) / 1000)

    const updated = await req.server.prisma.workoutSession.update({
      where: { id },
      data:  {
        finishedAt,
        duration,
        captionEnd: parsed.data.caption,          
        notes:      parsed.data.notes,
        notesEnd:   parsed.data.notesEnd,         
        location:   parsed.data.location,
        photoEnd:   parsed.data.photoEnd,
      },
    })

    return reply.status(200).send(updated)
  })

  // ─── GET /sessions/active ─────────────────
  app.get('/sessions/active', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STUDENT') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const session = await req.server.prisma.workoutSession.findFirst({
      where:   { studentId: req.user.sub, finishedAt: null },
      include: { workout: { select: { id: true, name: true } } },
    })

    return reply.status(200).send(session ?? null)
  })

  // ─── GET /sessions/history ────────────────
  app.get('/sessions/history', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STUDENT') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const sessions = await req.server.prisma.workoutSession.findMany({
      where:   { studentId: req.user.sub, finishedAt: { not: null } },
      include: { workout: { select: { id: true, name: true } } },
      orderBy: { startedAt: 'desc' },
      take:    20,
    })

    return reply.status(200).send(sessions)
  })

  // ─── GET /sessions/:id/exercises-done ────
  app.get('/sessions/:id/exercises-done', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STUDENT') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const { id } = req.params as { id: string }

    const session = await req.server.prisma.workoutSession.findUnique({ where: { id } })
    if (!session || session.studentId !== req.user.sub) {
      return reply.status(404).send({ message: 'Sessão não encontrada.' })
    }

    const done = await req.server.prisma.sessionExerciseDone.findMany({
      where:  { sessionId: id },
      select: { exerciseId: true },
    })

    return reply.status(200).send(done.map(d => d.exerciseId))
  })

  // ─── POST /sessions/:id/exercises-done/:exerciseId ── toggle
  app.post('/sessions/:id/exercises-done/:exerciseId', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STUDENT') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const { id, exerciseId } = req.params as { id: string; exerciseId: string }

    const session = await req.server.prisma.workoutSession.findUnique({ where: { id } })
    if (!session || session.studentId !== req.user.sub) {
      return reply.status(404).send({ message: 'Sessão não encontrada.' })
    }

    const existing = await req.server.prisma.sessionExerciseDone.findUnique({
      where: { sessionId_exerciseId: { sessionId: id, exerciseId } },
    })

    if (existing) {
      await req.server.prisma.sessionExerciseDone.delete({
        where: { sessionId_exerciseId: { sessionId: id, exerciseId } },
      })
      return reply.status(200).send({ done: false })
    } else {
      await req.server.prisma.sessionExerciseDone.create({
        data: { sessionId: id, exerciseId },
      })
      return reply.status(200).send({ done: true })
    }
  })

  // ─── GET /sessions/today-done/:workoutId ─
  app.get('/sessions/today-done/:workoutId', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STUDENT') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const { workoutId } = req.params as { workoutId: string }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const session = await req.server.prisma.workoutSession.findFirst({
      where: {
        studentId: req.user.sub,
        workoutId,
        startedAt: { gte: today },
      },
      orderBy: { startedAt: 'desc' },
      include: { exercisesDone: { select: { exerciseId: true } } },
    })

    if (!session) return reply.status(200).send([])

    return reply.status(200).send(session.exercisesDone.map(e => e.exerciseId))
  })

  // ─── PUT /sessions/:id ── Editar sessão ──
  app.put('/sessions/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STUDENT') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const { id } = req.params as { id: string }
    const parsed  = updateSessionSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors })
    }

    const session = await req.server.prisma.workoutSession.findUnique({ where: { id } })
    if (!session || session.studentId !== req.user.sub) {
      return reply.status(404).send({ message: 'Sessão não encontrada.' })
    }

    const updated = await req.server.prisma.workoutSession.update({
      where: { id },
      data:  {
        ...(parsed.data.caption    !== undefined && { caption:    parsed.data.caption }),
        ...(parsed.data.captionEnd !== undefined && { captionEnd: parsed.data.captionEnd }),
        ...(parsed.data.notes      !== undefined && { notes:      parsed.data.notes }),
        ...(parsed.data.notesEnd   !== undefined && { notesEnd:   parsed.data.notesEnd }),
        ...(parsed.data.location   !== undefined && { location:   parsed.data.location }),
      },
      include: { workout: { select: { id: true, name: true } } },
    })

    return reply.status(200).send(updated)
  })

  // ─── DELETE /sessions/:id ─────────────────
  app.delete('/sessions/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STUDENT') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const { id } = req.params as { id: string }

    const session = await req.server.prisma.workoutSession.findUnique({ where: { id } })
    if (!session || session.studentId !== req.user.sub) {
      return reply.status(404).send({ message: 'Sessão não encontrada.' })
    }

    removeFile(session.photoStart)
    removeFile(session.photoEnd)

    await req.server.prisma.workoutSession.delete({ where: { id } })

    return reply.status(204).send()
  })
}
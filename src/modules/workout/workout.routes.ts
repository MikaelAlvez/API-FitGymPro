import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'

// ─── Schemas ─────────────────────────────────
const exerciseSchema = z.object({
  name:  z.string().min(1),
  sets:  z.string().min(1),
  reps:  z.string().min(1),
  order: z.number().int().default(0),
})

const createWorkoutSchema = z.object({
  studentId: z.string().uuid(),
  name:      z.string().min(1, 'Nome do treino obrigatório'),
  days:      z.array(z.string()).min(1, 'Selecione ao menos um dia'),
  notes:     z.string().max(500).optional(),
  exercises: z.array(exerciseSchema).min(1, 'Adicione ao menos um exercício'),
})

const updateWorkoutSchema = z.object({
  name:      z.string().min(1).optional(),
  days:      z.array(z.string()).min(1).optional(),
  notes:     z.string().max(500).optional(),
  exercises: z.array(exerciseSchema).optional(),
})

// ─── GET /workouts/student/:studentId ────────
async function listWorkoutsController(req: FastifyRequest, reply: FastifyReply) {
  const { studentId } = req.params as { studentId: string }
  const personalId    = req.user.sub

  // Verifica vínculo
  const student = await req.server.prisma.user.findUnique({
    where: { id: studentId },
  })
  if (!student || student.personalId !== personalId) {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }

  const workouts = await req.server.prisma.workout.findMany({
    where:   { studentId, personalId },
    include: { exercises: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })

  return reply.status(200).send(workouts)
}

// ─── POST /workouts ───────────────────────────
async function createWorkoutController(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'PERSONAL') {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }

  const parsed = createWorkoutSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  const personalId                          = req.user.sub
  const { studentId, name, days, notes, exercises } = parsed.data

  // Verifica vínculo
  const student = await req.server.prisma.user.findUnique({ where: { id: studentId } })
  if (!student || student.personalId !== personalId) {
    return reply.status(403).send({ message: 'Este aluno não está vinculado a você.' })
  }

  const workout = await req.server.prisma.workout.create({
    data: {
      name,
      days,
      notes:     notes ?? null,
      personalId,
      studentId,
      exercises: {
        create: exercises.map((e, i) => ({
          name:  e.name,
          sets:  e.sets,
          reps:  e.reps,
          order: e.order ?? i,
        })),
      },
    },
    include: { exercises: { orderBy: { order: 'asc' } } },
  })

  return reply.status(201).send(workout)
}

// ─── PUT /workouts/:id ────────────────────────
async function updateWorkoutController(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'PERSONAL') {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }

  const { id }    = req.params as { id: string }
  const personalId = req.user.sub

  const parsed = updateWorkoutSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  const existing = await req.server.prisma.workout.findUnique({ where: { id } })
  if (!existing || existing.personalId !== personalId) {
    return reply.status(404).send({ message: 'Treino não encontrado.' })
  }

  const { exercises, ...workoutData } = parsed.data

  // Atualiza treino e recria exercícios se enviados
  const workout = await req.server.prisma.$transaction(async (tx) => {
    if (exercises) {
      await tx.exercise.deleteMany({ where: { workoutId: id } })
      await tx.exercise.createMany({
        data: exercises.map((e, i) => ({
          workoutId: id,
          name:      e.name,
          sets:      e.sets,
          reps:      e.reps,
          order:     e.order ?? i,
        })),
      })
    }
    return tx.workout.update({
      where:   { id },
      data:    workoutData,
      include: { exercises: { orderBy: { order: 'asc' } } },
    })
  })

  return reply.status(200).send(workout)
}

// ─── DELETE /workouts/:id ─────────────────────
async function deleteWorkoutController(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'PERSONAL') {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }

  const { id }     = req.params as { id: string }
  const personalId = req.user.sub

  const existing = await req.server.prisma.workout.findUnique({ where: { id } })
  if (!existing || existing.personalId !== personalId) {
    return reply.status(404).send({ message: 'Treino não encontrado.' })
  }

  await req.server.prisma.workout.delete({ where: { id } })
  return reply.status(204).send()
}

// ─── Register routes ──────────────────────────
export async function workoutRoutes(app: FastifyInstance) {
  app.get(
    '/workouts/student/:studentId',
    { preHandler: [app.authenticate] },
    listWorkoutsController,
  )
  app.post(
    '/workouts',
    { preHandler: [app.authenticate] },
    createWorkoutController,
  )
  app.put(
    '/workouts/:id',
    { preHandler: [app.authenticate] },
    updateWorkoutController,
  )
  app.delete(
    '/workouts/:id',
    { preHandler: [app.authenticate] },
    deleteWorkoutController,
  )
}
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'

const exerciseSchema = z.object({
  name:       z.string().min(1),
  sets:       z.string().default(''),
  reps:       z.string().default(''),
  order:      z.number().int().default(0),
  type:       z.enum(['exercise', 'cardio']).default('exercise'),
  groupId:    z.string().optional(),
  groupLabel: z.string().optional(),
  duration:   z.string().optional(),
  load:       z.string().optional(),
  restTime:   z.string().optional(),
  isDrop:     z.boolean().optional(),  
  dropSets:   z.string().optional(),    
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

const mapExercisesCreate = (exercises: z.infer<typeof exerciseSchema>[]) =>
  exercises.map((e, i) => ({
    name:       e.name,
    sets:       e.sets,
    reps:       e.reps,
    order:      e.order ?? i,
    type:       e.type       ?? 'exercise',
    groupId:    e.groupId    ?? null,
    groupLabel: e.groupLabel ?? null,
    duration:   e.duration   ?? null,
    load:       e.load       ?? null,
    restTime:   e.restTime   ?? null,
    isDrop:     e.isDrop     ?? false,  
    dropSets:   e.dropSets   ?? null,   
  }))

const mapExercisesCreateMany = (exercises: z.infer<typeof exerciseSchema>[], workoutId: string) =>
  exercises.map((e, i) => ({
    workoutId,
    name:       e.name,
    sets:       e.sets,
    reps:       e.reps,
    order:      e.order ?? i,
    type:       e.type       ?? 'exercise',
    groupId:    e.groupId    ?? null,
    groupLabel: e.groupLabel ?? null,
    duration:   e.duration   ?? null,
    load:       e.load       ?? null,
    restTime:   e.restTime   ?? null,
    isDrop:     e.isDrop     ?? false,  
    dropSets:   e.dropSets   ?? null,   
  }))

// ─── GET /workouts/student/:studentId ────────
async function listWorkoutsController(req: FastifyRequest, reply: FastifyReply) {
  const { studentId } = req.params as { studentId: string }
  const personalId    = req.user.sub

  const student = await req.server.prisma.user.findUnique({ where: { id: studentId } })
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
  const parsed = createWorkoutSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  const userId = req.user.sub
  const role   = req.user.role
  const { studentId, name, days, notes, exercises } = parsed.data

  if (role === 'PERSONAL') {
    const student = await req.server.prisma.user.findUnique({ where: { id: studentId } })
    if (!student || student.personalId !== userId) {
      return reply.status(403).send({ message: 'Este aluno não está vinculado a você.' })
    }

    const workout = await req.server.prisma.workout.create({
      data: {
        name, days, notes: notes ?? null,
        personalId: userId,
        studentId,
        exercises: { create: mapExercisesCreate(exercises) },
      },
      include: {
        exercises: { orderBy: { order: 'asc' } },
        personal:  { select: { id: true, name: true, personalProfile: { select: { cref: true } } } },
      },
    })
    return reply.status(201).send(workout)
  }

  if (role === 'STUDENT') {
    const workout = await req.server.prisma.workout.create({
      data: {
        name, days, notes: notes ?? null,
        personalId: null,
        studentId:  userId,
        exercises: { create: mapExercisesCreate(exercises) },
      },
      include: {
        exercises: { orderBy: { order: 'asc' } },
        personal:  { select: { id: true, name: true, personalProfile: { select: { cref: true } } } },
      },
    })
    return reply.status(201).send(workout)
  }

  return reply.status(403).send({ message: 'Acesso negado.' })
}

// ─── PUT /workouts/:id ────────────────────────
async function updateWorkoutController(req: FastifyRequest, reply: FastifyReply) {
  const { id }  = req.params as { id: string }
  const userId  = req.user.sub
  const role    = req.user.role

  const parsed = updateWorkoutSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  const existing = await req.server.prisma.workout.findUnique({ where: { id } })
  if (!existing) return reply.status(404).send({ message: 'Treino não encontrado.' })

  if (role === 'PERSONAL' && existing.personalId !== userId) {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }
  if (role === 'STUDENT' && (existing.studentId !== userId || existing.personalId !== null)) {
    return reply.status(403).send({ message: 'Você só pode editar seus próprios treinos.' })
  }

  const { exercises, ...workoutData } = parsed.data

  const workout = await req.server.prisma.$transaction(async (tx) => {
    if (exercises) {
      await tx.exercise.deleteMany({ where: { workoutId: id } })
      await tx.exercise.createMany({
        data: mapExercisesCreateMany(exercises, id),
      })
    }
    return tx.workout.update({
      where:   { id },
      data:    workoutData,
      include: {
        exercises: { orderBy: { order: 'asc' } },
        personal:  { select: { id: true, name: true, personalProfile: { select: { cref: true } } } },
      },
    })
  })

  return reply.status(200).send(workout)
}

// ─── DELETE /workouts/:id ─────────────────────
async function deleteWorkoutController(req: FastifyRequest, reply: FastifyReply) {
  const { id }  = req.params as { id: string }
  const userId  = req.user.sub
  const role    = req.user.role

  const existing = await req.server.prisma.workout.findUnique({ where: { id } })
  if (!existing) return reply.status(404).send({ message: 'Treino não encontrado.' })

  if (role === 'PERSONAL' && existing.personalId !== userId) {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }
  if (role === 'STUDENT' && (existing.studentId !== userId || existing.personalId !== null)) {
    return reply.status(403).send({ message: 'Você só pode excluir seus próprios treinos.' })
  }

  await req.server.prisma.workout.delete({ where: { id } })
  return reply.status(204).send()
}

// ─── GET /workouts/my ─────────────────────────
async function myWorkoutsController(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'STUDENT') {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }

  const workouts = await req.server.prisma.workout.findMany({
    where:   { studentId: req.user.sub },
    include: {
      exercises: { orderBy: { order: 'asc' } },
      personal: {
        select: {
          id:   true,
          name: true,
          personalProfile: { select: { cref: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return reply.status(200).send(workouts)
}

// ─── PUT /workouts/:id/deactivate ────────────
async function deactivateWorkoutController(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const userId = req.user.sub
  const role   = req.user.role

  const existing = await req.server.prisma.workout.findUnique({ where: { id } })
  if (!existing) return reply.status(404).send({ message: 'Treino não encontrado.' })

  if (role === 'PERSONAL' && existing.personalId !== userId) {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }
  if (role === 'STUDENT' && (existing.studentId !== userId || existing.personalId !== null)) {
    return reply.status(403).send({ message: 'Você só pode inativar seus próprios treinos.' })
  }

  await req.server.prisma.workout.update({ where: { id }, data: { active: false } })
  return reply.status(200).send({ message: 'Treino inativado.' })
}

// ─── PUT /workouts/:id/activate ──────────────
async function activateWorkoutController(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string }
  const userId = req.user.sub
  const role   = req.user.role

  const existing = await req.server.prisma.workout.findUnique({ where: { id } })
  if (!existing) return reply.status(404).send({ message: 'Treino não encontrado.' })

  if (role === 'PERSONAL' && existing.personalId !== userId) {
    return reply.status(403).send({ message: 'Acesso negado.' })
  }
  if (role === 'STUDENT' && (existing.studentId !== userId || existing.personalId !== null)) {
    return reply.status(403).send({ message: 'Você só pode ativar seus próprios treinos.' })
  }

  await req.server.prisma.workout.update({ where: { id }, data: { active: true } })
  return reply.status(200).send({ message: 'Treino ativado.' })
}

// ─── Register routes ──────────────────────────
export async function workoutRoutes(app: FastifyInstance) {
  app.get('/workouts/student/:studentId', { preHandler: [app.authenticate] }, listWorkoutsController)
  app.post('/workouts',                   { preHandler: [app.authenticate] }, createWorkoutController)
  app.put('/workouts/:id',                { preHandler: [app.authenticate] }, updateWorkoutController)
  app.delete('/workouts/:id',             { preHandler: [app.authenticate] }, deleteWorkoutController)
  app.get('/workouts/my',                 { preHandler: [app.authenticate] }, myWorkoutsController)
  app.put('/workouts/:id/deactivate',     { preHandler: [app.authenticate] }, deactivateWorkoutController)
  app.put('/workouts/:id/activate',       { preHandler: [app.authenticate] }, activateWorkoutController)
}
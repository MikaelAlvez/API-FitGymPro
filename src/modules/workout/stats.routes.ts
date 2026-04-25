import { FastifyInstance } from 'fastify'

export async function statsRoutes(app: FastifyInstance) {

  // ─── GET /stats/workouts?from=&to= ───────
  app.get('/stats/workouts', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STUDENT') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const studentId = req.user.sub
    const { from, to } = req.query as { from?: string; to?: string }

    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to)   dateFilter.lte = new Date(to)

    const where = {
      studentId,
      finishedAt: { not: null, ...(Object.keys(dateFilter).length ? dateFilter : {}) },
    }

    const sessions = await req.server.prisma.workoutSession.findMany({
      where,
      include: { workout: { select: { id: true, name: true, days: true } } },
      orderBy: { startedAt: 'asc' },
    })

    // ─── Tempo médio de treino ────────────
    const durations    = sessions.filter(s => s.duration).map(s => s.duration!)
    const avgDuration  = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0
    const totalDuration = durations.reduce((a, b) => a + b, 0)
    const maxDuration   = durations.length ? Math.max(...durations) : 0

    // ─── Frequência por dia da semana ──────
    const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const byWeekday = Array(7).fill(0)
    sessions.forEach(s => {
      const d = new Date(s.startedAt).getDay()
      byWeekday[d]++
    })
    const weekdayData = DAY_NAMES.map((name, i) => ({ name, count: byWeekday[i] }))

    // ─── Frequência semanal (últimas 8 semanas)
    const weeklyMap: Record<string, number> = {}
    sessions.forEach(s => {
      const d    = new Date(s.startedAt)
      const year = d.getFullYear()
      // Número da semana ISO
      const startOfYear = new Date(year, 0, 1)
      const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
      const key  = `${year}-W${String(week).padStart(2, '0')}`
      weeklyMap[key] = (weeklyMap[key] ?? 0) + 1
    })
    const weeklyData = Object.entries(weeklyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, count]) => ({ week: week.split('-W')[1] ? `S${week.split('-W')[1]}` : week, count }))

    // ─── Streak (sequência de dias consecutivos) ──
    const sessionDays = [...new Set(
      sessions.map(s => new Date(s.startedAt).toISOString().split('T')[0])
    )].sort()

    let currentStreak = 0
    let maxStreak     = 0
    let tempStreak    = 1

    for (let i = 1; i < sessionDays.length; i++) {
      const prev = new Date(sessionDays[i - 1])
      const curr = new Date(sessionDays[i])
      const diff = (curr.getTime() - prev.getTime()) / 86400000
      if (diff === 1) {
        tempStreak++
      } else {
        maxStreak  = Math.max(maxStreak, tempStreak)
        tempStreak = 1
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak)

    // Streak atual — verifica se o último dia foi hoje ou ontem
    if (sessionDays.length > 0) {
      const lastDay  = new Date(sessionDays[sessionDays.length - 1])
      const today    = new Date()
      today.setHours(0, 0, 0, 0)
      const diff = (today.getTime() - lastDay.getTime()) / 86400000
      if (diff <= 1) {
        // Conta de trás pra frente
        currentStreak = 1
        for (let i = sessionDays.length - 2; i >= 0; i--) {
          const curr = new Date(sessionDays[i + 1])
          const prev = new Date(sessionDays[i])
          if ((curr.getTime() - prev.getTime()) / 86400000 === 1) {
            currentStreak++
          } else break
        }
      }
    }

    // ─── Busca histórico de métricas corporais ──
    const student = await req.server.prisma.user.findUnique({
      where:  { id: studentId },
      select: { studentProfile: { select: { weight: true, height: true } } },
    })

    return reply.status(200).send({
      totalSessions:  sessions.length,
      totalDuration,
      avgDuration,
      maxDuration,
      currentStreak,
      maxStreak,
      weekdayData,
      weeklyData,
      bodyMetrics: {
        weight: student?.studentProfile?.weight ?? null,
        height: student?.studentProfile?.height ?? null,
      },
    })
  })
}
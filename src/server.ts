import 'dotenv/config'
import Fastify      from 'fastify'

import prismaPlugin    from './plugins/prisma'
import jwtPlugin       from './plugins/jwt'
import multipartPlugin from './plugins/multipart'

import { authRoutes }            from './modules/auth/auth.routes'
import { uploadRoutes }          from './modules/upload/upload.routes'
import { userRoutes }            from './modules/user/user.routes'
import { personalRequestRoutes } from './modules/personal-request/personal-request.routes'
import { workoutRoutes }         from './modules/workout/workout.routes'
import { sessionRoutes }         from './modules/workout/session.routes'
import { statsRoutes }  from './modules/workout/stats.routes'
import { friendRoutes } from './modules/friend/friend.routes'
import { groupRoutes } from './modules/group/group.routes'

const app = Fastify({ logger: true })

// ─── Plugins ─────────────────────────────────
app.register(prismaPlugin)
app.register(jwtPlugin)
app.register(multipartPlugin)

// ─── Rotas ───────────────────────────────────
app.register(authRoutes,            { prefix: '/auth' })
app.register(uploadRoutes)
app.register(userRoutes)
app.register(personalRequestRoutes)
app.register(workoutRoutes)
app.register(sessionRoutes)
app.register(statsRoutes)
app.register(friendRoutes)
app.register(groupRoutes)

app.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// ─── Start ────────────────────────────────────
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Server running on http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
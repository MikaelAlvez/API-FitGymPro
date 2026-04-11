import 'dotenv/config'
import Fastify       from 'fastify'
import staticFiles   from '@fastify/static'
import path          from 'path'
import prismaPlugin  from './plugins/prisma'
import jwtPlugin     from './plugins/jwt'
import multipartPlugin from './plugins/multipart'
import { authRoutes }   from './modules/auth/auth.routes'
import { uploadRoutes } from './modules/upload/upload.routes'

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

// ─── Plugins ─────────────────────────────────
app.register(prismaPlugin)
app.register(jwtPlugin)
app.register(multipartPlugin)

// Serve arquivos estáticos (avatares)
app.register(staticFiles, {
  root:   path.join(__dirname, '..', 'src', 'uploads'),
  prefix: '/uploads/',
})

// ─── Rotas ───────────────────────────────────
app.register(authRoutes,   { prefix: '/auth' })
app.register(uploadRoutes)

// Health check
app.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// ─── Start ───────────────────────────────────
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 Server running on http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
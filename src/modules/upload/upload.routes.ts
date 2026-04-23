import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { pipeline }      from 'stream/promises'
import { createWriteStream } from 'fs'
import { randomUUID }    from 'crypto'
import path from 'path'
import fs   from 'fs'

// ─── Diretórios ──────────────────────────────
const UPLOAD_BASE    = path.join(process.cwd(), 'src', 'uploads')
const AVATAR_DIR     = path.join(UPLOAD_BASE, 'avatars')
const SESSION_DIR    = path.join(UPLOAD_BASE, 'sessions')

// Garante que todas as pastas existem na inicialização
for (const dir of [AVATAR_DIR, SESSION_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// ─── Avatar ───────────────────────────────────
async function uploadAvatarController(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user.sub
  const data   = await req.file()

  if (!data) {
    return reply.status(400).send({ message: 'Nenhuma imagem enviada.' })
  }

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowed.includes(data.mimetype)) {
    return reply.status(400).send({ message: 'Formato inválido. Use JPG, PNG ou WebP.' })
  }

  const ext      = path.extname(data.filename) || '.jpg'
  const filename = `${userId}-${randomUUID()}${ext}`
  const filepath = path.join(AVATAR_DIR, filename)

  await pipeline(data.file, createWriteStream(filepath))

  // Remove avatar antigo
  const user = await req.server.prisma.user.findUnique({
    where:  { id: userId },
    select: { avatar: true },
  })
  if (user?.avatar) {
    const oldPath = path.join(process.cwd(), 'src', user.avatar.replace(/^\//, ''))
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }

  const avatarUrl = `/uploads/avatars/${filename}`
  await req.server.prisma.user.update({
    where: { id: userId },
    data:  { avatar: avatarUrl },
  })

  return reply.status(200).send({ url: avatarUrl })
}

// ─── Foto de sessão ───────────────────────────
async function uploadSessionController(req: FastifyRequest, reply: FastifyReply) {
  const data = await req.file()

  if (!data) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
  }

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowed.includes(data.mimetype)) {
    return reply.status(400).send({ message: 'Formato inválido. Use JPG, PNG ou WebP.' })
  }

  const ext      = path.extname(data.filename) || '.jpg'
  const filename = `session_${req.user.sub}_${Date.now()}${ext}`
  const filepath = path.join(SESSION_DIR, filename)

  await pipeline(data.file, createWriteStream(filepath))

  return reply.status(200).send({ url: `/uploads/sessions/${filename}` })
}

// ─── Rotas ────────────────────────────────────
export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload/avatar',  { preHandler: [app.authenticate] }, uploadAvatarController)
  app.post('/upload/session', { preHandler: [app.authenticate] }, uploadSessionController)
}
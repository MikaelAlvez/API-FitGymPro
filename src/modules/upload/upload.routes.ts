import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { pipeline } from 'stream/promises'
import { createWriteStream } from 'fs'
import { randomUUID } from 'crypto'
import path from 'path'
import fs   from 'fs'

const UPLOAD_DIR = path.join(process.cwd(), 'src', 'uploads', 'avatars')

// Garante que a pasta existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

async function uploadAvatarController(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user.sub

  const data = await req.file()

  if (!data) {
    return reply.status(400).send({ message: 'Nenhuma imagem enviada.' })
  }

  // Valida tipo
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowed.includes(data.mimetype)) {
    return reply.status(400).send({ message: 'Formato inválido. Use JPG, PNG ou WebP.' })
  }

  // Gera nome único
  const ext      = path.extname(data.filename) || '.jpg'
  const filename = `${userId}-${randomUUID()}${ext}`
  const filepath = path.join(UPLOAD_DIR, filename)

  // Salva arquivo
  await pipeline(data.file, createWriteStream(filepath))

  // Remove avatar antigo se existir
  const user = await req.server.prisma.user.findUnique({
    where:  { id: userId },
    select: { avatar: true },
  })

  if (user?.avatar) {
    const oldPath = path.join(process.cwd(), user.avatar.replace(/^\//, ''))
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }

  // Salva URL no banco
  const avatarUrl = `/uploads/avatars/${filename}`

  await req.server.prisma.user.update({
    where: { id: userId },
    data:  { avatar: avatarUrl },
  })

  return reply.status(200).send({ url: avatarUrl })
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post(
    '/upload/avatar',
    { preHandler: [app.authenticate] },
    uploadAvatarController,
  )
}
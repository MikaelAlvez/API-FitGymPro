import { PrismaClient } from '@prisma/client'

export async function generateGroupCode(prisma: PrismaClient): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code: string
  let exists = true

  do {
    const random = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    code   = `GRP-${random}`
    exists = !!(await prisma.group.findUnique({ where: { code } }))
  } while (exists)

  return code
}
import { PrismaClient } from '@prisma/client'

// Gera código no formato: STU-ABC123 ou PER-ABC123
export async function generateUserCode(
  prisma: PrismaClient,
  role: 'STUDENT' | 'PERSONAL',
): Promise<string> {
  const prefix = role === 'STUDENT' ? 'STU' : 'PER'
  const chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  let code: string
  let exists = true

  do {
    const random = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    code   = `${prefix}-${random}`
    exists = !!(await prisma.user.findUnique({ where: { userCode: code } }))
  } while (exists)

  return code
}
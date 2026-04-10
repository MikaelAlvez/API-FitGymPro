import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

// Instância global do Prisma (evita múltiplas conexões em dev)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'warn', 'error']
    : ['error'],
})

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  await prisma.$connect()

  server.decorate('prisma', prisma)

  server.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})

export default prismaPlugin
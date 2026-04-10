import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fastifyJwt from '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub:   string   // userId
      email: string
      role:  string
    }
    user: {
      sub:   string
      email: string
      role:  string
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const jwtPlugin: FastifyPluginAsync = fp(async (server) => {
  server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET as string,
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
  })

  // Decorator reutilizável nas rotas protegidas
  server.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch {
      reply.status(401).send({ message: 'Token inválido ou expirado.' })
    }
  })
})

export default jwtPlugin
import fp             from 'fastify-plugin'
import multipart      from '@fastify/multipart'
import { FastifyPluginAsync } from 'fastify'

const multipartPlugin: FastifyPluginAsync = fp(async (server) => {
  server.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files:    1,
    },
  })
})

export default multipartPlugin
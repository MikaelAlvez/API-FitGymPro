import { FastifyInstance } from 'fastify'
import {
  loginController,
  refreshController,
  logoutController,
  meController,
} from './auth.controller'

export async function authRoutes(app: FastifyInstance) {
  //Públicas
  app.post('/login',   loginController)
  app.post('/refresh', refreshController)
  app.post('/logout',  logoutController)

  //Protegida — retorna dados do usuário logado
  app.get('/me', { preHandler: [app.authenticate] }, meController)
}
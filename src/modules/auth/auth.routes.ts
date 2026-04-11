import { FastifyInstance } from 'fastify'
import {
  loginController,
  refreshController,
  logoutController,
  meController,
} from './auth.controller'
import { registerStudentController, registerPersonalController } from './register.controller'

export async function authRoutes(app: FastifyInstance) {
  // Cadastro
  app.post('/register/student',  registerStudentController)
  app.post('/register/personal', registerPersonalController)

  // Públicas
  app.post('/login',   loginController)
  app.post('/refresh', refreshController)
  app.post('/logout',  logoutController)

  // Protegida
  app.get('/me', { preHandler: [app.authenticate] }, meController)
}
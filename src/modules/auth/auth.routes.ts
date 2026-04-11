import { FastifyInstance } from 'fastify'
import {
  loginController,
  refreshController,
  logoutController,
  meController,
  meProfileController,
  checkEmailController,
  checkCpfController,
} from './auth.controller'
import { registerStudentController, registerPersonalController } from './register.controller'

export async function authRoutes(app: FastifyInstance) {
  // Cadastro
  app.post('/register/student',  registerStudentController)
  app.post('/register/personal', registerPersonalController)

  // Verificações
  app.post('/check-email', checkEmailController)
  app.post('/check-cpf',   checkCpfController)

  // Públicas
  app.post('/login',   loginController)
  app.post('/refresh', refreshController)
  app.post('/logout',  logoutController)

  // Protegidas
  app.get('/me',         { preHandler: [app.authenticate] }, meController)
  app.get('/me/profile', { preHandler: [app.authenticate] }, meProfileController)
}
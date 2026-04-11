import { FastifyRequest, FastifyReply } from 'fastify'
import { registerStudentSchema, registerPersonalSchema } from './register.schema'
import { registerStudentService }  from './register-student.service'
import { registerPersonalService } from './register-personal.service'

export async function registerStudentController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = registerStudentSchema.safeParse(req.body)

  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  try {
    const result = await registerStudentService(req.server, parsed.data)
    return reply.status(201).send(result)
  } catch (err: any) {
    return reply.status(err.statusCode ?? 500).send({
      message: err.message ?? 'Erro interno.',
    })
  }
}

export async function registerPersonalController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = registerPersonalSchema.safeParse(req.body)

  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  try {
    const result = await registerPersonalService(req.server, parsed.data)
    return reply.status(201).send(result)
  } catch (err: any) {
    return reply.status(err.statusCode ?? 500).send({
      message: err.message ?? 'Erro interno.',
    })
  }
}
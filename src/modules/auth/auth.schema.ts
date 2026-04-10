import { z } from 'zod'

export const loginSchema = z.object({
  email:    z.string({ message: 'E-mail é obrigatório' })
              .email('E-mail inválido'),
  password: z.string({ message: 'Senha é obrigatória' })
              .min(6, 'Senha deve ter ao menos 6 caracteres'),
})

export const refreshSchema = z.object({
  refreshToken: z.string({ message: 'Refresh token é obrigatório' }),
})

export type LoginInput   = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
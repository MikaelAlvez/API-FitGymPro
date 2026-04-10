import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const hash = (pwd: string) => bcrypt.hash(pwd, 10)

  // ─── Personal Trainer ────────────────────
  const personal = await prisma.user.upsert({
    where:  { email: 'admPersonal@fitgym.com' },
    update: {},
    create: {
      name:     'Adm Personal',
      email:    'admPersonal@fitgym.com',
      phone:    '11999990001',
      password: await hash('123456'),
      role:     'PERSONAL',
      personalProfile: {
        create: {
          sex:            'Masculino',
          birthDate:      '16/11/1999',
          weight:         '90',
          height:         '179',
          course:         'Educação Física',
          university:     'UERN',
          educationLevel: 'Ensino superior completo',
          cref:           '123456-G/RN',
          classFormat:    'hybrid',
          availableDays:  ['monday','tuesday','wednesday','thursday','friday'],
        },
      },
    },
  })

  // ─── Aluno ───────────────────────────────
  const student = await prisma.user.upsert({
    where:  { email: 'AdmAluno@fitgym.com' },
    update: {},
    create: {
      name:      'Adm Aluno',
      email:     'AdmAluno@fitgym.com',
      phone:     '11999990002',
      password:  await hash('123456'),
      role:      'STUDENT',
      personalId: personal.id,
      studentProfile: {
        create: {
          sex:          'Masculino',
          birthDate:    '16/11/1999',
          weight:       '90',
          height:       '179',
          goal:         'Hipertrofia',
          focusMuscle:  'Peito e costas',
          experience:   'intermediate',
          gymType:      'advanced',
          cardio:       'include',
          trainingDays: ['monday','tuesday','thursday','friday'],
        },
      },
    },
  })

  console.log('   Seed concluído!')
  console.log(`   Personal → ${personal.email} | senha: 123456`)
  console.log(`   Aluno    → ${student.email}  | senha: 123456`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
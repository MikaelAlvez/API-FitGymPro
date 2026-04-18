import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  const password = await bcrypt.hash('123456', 10)

  // ─── Personais ───────────────────────────
  const personalsData = [
    {
      name: 'Carlos Mendes',       email: 'carlos@fitgym.com',   cpf: '11111111101',
      cref: 'CREF-001234-G/SP',   course: 'Educação Física',     university: 'USP',
      educationLevel: 'Graduação', classFormat: 'presential',
      availableDays: ['monday','wednesday','friday'],
      sex: 'Masculino', birthDate: '15/03/1985', weight: '82', height: '178',
    },
    {
      name: 'Fernanda Lima',        email: 'fernanda@fitgym.com',  cpf: '11111111102',
      cref: 'CREF-002345-G/RJ',   course: 'Educação Física',     university: 'UFRJ',
      educationLevel: 'Pós-graduação', classFormat: 'online',
      availableDays: ['tuesday','thursday','saturday'],
      sex: 'Feminino', birthDate: '22/07/1990', weight: '65', height: '165',
    },
    {
      name: 'Rafael Souza',         email: 'rafael@fitgym.com',    cpf: '11111111103',
      cref: 'CREF-003456-G/MG',   course: 'Educação Física',     university: 'UFMG',
      educationLevel: 'Graduação', classFormat: 'hybrid',
      availableDays: ['monday','tuesday','wednesday','thursday','friday'],
      sex: 'Masculino', birthDate: '10/11/1988', weight: '88', height: '182',
    },
    {
      name: 'Juliana Costa',        email: 'juliana@fitgym.com',   cpf: '11111111104',
      cref: 'CREF-004567-G/BA',   course: 'Educação Física',     university: 'UFBA',
      educationLevel: 'Mestrado',  classFormat: 'presential',
      availableDays: ['monday','wednesday','friday','saturday'],
      sex: 'Feminino', birthDate: '05/04/1992', weight: '58', height: '162',
    },
    {
      name: 'Diego Almeida',        email: 'diego@fitgym.com',     cpf: '11111111105',
      cref: 'CREF-005678-G/PR',   course: 'Educação Física',     university: 'UFPR',
      educationLevel: 'Graduação', classFormat: 'online',
      availableDays: ['tuesday','thursday'],
      sex: 'Masculino', birthDate: '18/09/1987', weight: '90', height: '185',
    },
    {
      name: 'Mariana Ferreira',     email: 'mariana@fitgym.com',   cpf: '11111111106',
      cref: 'CREF-006789-G/CE',   course: 'Educação Física',     university: 'UFC',
      educationLevel: 'Pós-graduação', classFormat: 'hybrid',
      availableDays: ['monday','wednesday','friday'],
      sex: 'Feminino', birthDate: '30/01/1993', weight: '60', height: '167',
    },
    {
      name: 'Thiago Rocha',         email: 'thiago@fitgym.com',    cpf: '11111111107',
      cref: 'CREF-007890-G/RS',   course: 'Educação Física',     university: 'UFRGS',
      educationLevel: 'Graduação', classFormat: 'presential',
      availableDays: ['monday','tuesday','wednesday','thursday','friday','saturday'],
      sex: 'Masculino', birthDate: '12/06/1984', weight: '85', height: '180',
    },
    {
      name: 'Camila Nunes',         email: 'camila@fitgym.com',    cpf: '11111111108',
      cref: 'CREF-008901-G/SC',   course: 'Educação Física',     university: 'UFSC',
      educationLevel: 'Mestrado',  classFormat: 'online',
      availableDays: ['tuesday','thursday','saturday'],
      sex: 'Feminino', birthDate: '25/08/1991', weight: '55', height: '160',
    },
    {
      name: 'Bruno Carvalho',       email: 'bruno@fitgym.com',     cpf: '11111111109',
      cref: 'CREF-009012-G/GO',   course: 'Educação Física',     university: 'UFG',
      educationLevel: 'Graduação', classFormat: 'presential',
      availableDays: ['monday','wednesday','friday'],
      sex: 'Masculino', birthDate: '07/02/1986', weight: '78', height: '175',
    },
    {
      name: 'Letícia Barbosa',      email: 'leticia@fitgym.com',   cpf: '11111111110',
      cref: 'CREF-010123-G/PE',   course: 'Educação Física',     university: 'UFPE',
      educationLevel: 'Doutorado', classFormat: 'hybrid',
      availableDays: ['monday','tuesday','wednesday','thursday','friday'],
      sex: 'Feminino', birthDate: '14/12/1989', weight: '62', height: '168',
    },
  ]

  const createdPersonals: any[] = []

  for (const p of personalsData) {
    const existing = await prisma.user.findUnique({ where: { email: p.email } })
    if (existing) {
      console.log(`Personal já existe: ${p.email}`)
      createdPersonals.push(existing)
      continue
    }

    const user = await prisma.user.create({
      data: {
        name:     p.name,
        email:    p.email,
        cpf:      p.cpf,
        phone:    '(11) 99999-0001',
        password,
        role:     'PERSONAL',
        city:     'São Paulo',
        state:    'SP',
        personalProfile: {
          create: {
            sex:            p.sex,
            birthDate:      p.birthDate,
            weight:         p.weight,
            height:         p.height,
            course:         p.course,
            university:     p.university,
            educationLevel: p.educationLevel,
            cref:           p.cref,
            classFormat:    p.classFormat,
            availableDays:  p.availableDays,
          },
        },
      },
    })

    createdPersonals.push(user)
    console.log(`Personal criado: ${p.name}`)
  }

  // ─── Alunos ──────────────────────────────
  const studentsData = [
    {
      name: 'Ana Paula Oliveira',  email: 'ana@fitgym.com',      cpf: '22222222201',
      sex: 'Feminino',   birthDate: '10/05/1995', weight: '62',  height: '163',
      goal: 'Emagrecimento',  focusMuscle: 'Abdômen',    experience: 'beginner',
      gymType: 'basic',  cardio: 'include', trainingDays: ['monday','wednesday','friday'],
    },
    {
      name: 'Pedro Henrique Silva', email: 'pedro@fitgym.com',   cpf: '22222222202',
      sex: 'Masculino',  birthDate: '22/08/1998', weight: '78',  height: '177',
      goal: 'Hipertrofia',    focusMuscle: 'Peito e costas', experience: 'intermediate',
      gymType: 'advanced', cardio: 'exclude', trainingDays: ['monday','tuesday','thursday','friday'],
    },
    {
      name: 'Larissa Mendes',      email: 'larissa@fitgym.com',  cpf: '22222222203',
      sex: 'Feminino',   birthDate: '14/03/1993', weight: '55',  height: '158',
      goal: 'Condicionamento', focusMuscle: 'Pernas',      experience: 'beginner',
      gymType: 'basic',  cardio: 'include', trainingDays: ['tuesday','thursday','saturday'],
    },
    {
      name: 'Gustavo Ribeiro',     email: 'gustavo@fitgym.com',  cpf: '22222222204',
      sex: 'Masculino',  birthDate: '30/11/1990', weight: '92',  height: '183',
      goal: 'Força',          focusMuscle: 'Membros superiores', experience: 'advanced',
      gymType: 'advanced', cardio: 'exclude', trainingDays: ['monday','wednesday','friday','saturday'],
    },
    {
      name: 'Isabela Martins',     email: 'isabela@fitgym.com',  cpf: '22222222205',
      sex: 'Feminino',   birthDate: '07/07/1997', weight: '59',  height: '165',
      goal: 'Flexibilidade',  focusMuscle: 'Core',         experience: 'beginner',
      gymType: 'basic',  cardio: 'include', trainingDays: ['monday','wednesday','friday'],
    },
    {
      name: 'Mateus Cavalcanti',   email: 'mateus@fitgym.com',   cpf: '22222222206',
      sex: 'Masculino',  birthDate: '19/01/1996', weight: '74',  height: '174',
      goal: 'Hipertrofia',    focusMuscle: 'Braços',       experience: 'intermediate',
      gymType: 'advanced', cardio: 'include', trainingDays: ['tuesday','thursday','saturday'],
    },
    {
      name: 'Bianca Freitas',      email: 'bianca@fitgym.com',   cpf: '22222222207',
      sex: 'Feminino',   birthDate: '25/04/1994', weight: '67',  height: '170',
      goal: 'Emagrecimento',  focusMuscle: 'Glúteos',      experience: 'intermediate',
      gymType: 'basic',  cardio: 'include', trainingDays: ['monday','wednesday','friday'],
    },
    {
      name: 'Lucas Pimentel',      email: 'lucas@fitgym.com',    cpf: '22222222208',
      sex: 'Masculino',  birthDate: '03/09/1999', weight: '68',  height: '172',
      goal: 'Resistência',    focusMuscle: 'Pernas',       experience: 'beginner',
      gymType: 'basic',  cardio: 'include', trainingDays: ['monday','tuesday','wednesday','thursday','friday'],
    },
    {
      name: 'Vitória Santos',      email: 'vitoria@fitgym.com',  cpf: '22222222209',
      sex: 'Feminino',   birthDate: '11/12/1992', weight: '53',  height: '155',
      goal: 'Saúde e bem-estar', focusMuscle: 'Corpo todo', experience: 'beginner',
      gymType: 'basic',  cardio: 'include', trainingDays: ['tuesday','thursday'],
    },
    {
      name: 'Felipe Nascimento',   email: 'felipe@fitgym.com',   cpf: '22222222210',
      sex: 'Masculino',  birthDate: '28/06/1991', weight: '85',  height: '180',
      goal: 'Definição muscular', focusMuscle: 'Abdômen e peito', experience: 'advanced',
      gymType: 'advanced', cardio: 'include', trainingDays: ['monday','wednesday','friday','saturday'],
    },
  ]

  // Pega o primeiro personal para vincular os alunos
  const defaultPersonal = createdPersonals[0]

  for (const st of studentsData) {
    const existing = await prisma.user.findUnique({ where: { email: st.email } })
    if (existing) {
      console.log(`  ⚠️  Aluno já existe: ${st.email}`)
      continue
    }

    await prisma.user.create({
      data: {
        name:       st.name,
        email:      st.email,
        cpf:        st.cpf,
        phone:      '(11) 98888-0001',
        password,
        role:       'STUDENT',
        city:       'São Paulo',
        state:      'SP',
        personalId: defaultPersonal.id, //vinculados ao primeiro personal
        studentProfile: {
          create: {
            sex:          st.sex,
            birthDate:    st.birthDate,
            weight:       st.weight,
            height:       st.height,
            goal:         st.goal,
            focusMuscle:  st.focusMuscle,
            experience:   st.experience,
            gymType:      st.gymType,
            cardio:       st.cardio,
            trainingDays: st.trainingDays,
          },
        },
      },
    })

    console.log(`Aluno criado: ${st.name}`)
  }

  console.log('\n🎉 Seed concluído!')
  console.log('─────────────────────────────────────')
  console.log('📧 Login de qualquer usuário:')
  console.log('   Senha: 123456')
  console.log('   Personal: carlos@fitgym.com')
  console.log('   Aluno:    ana@fitgym.com')
  console.log('─────────────────────────────────────')
}

main()
  .catch(e => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })